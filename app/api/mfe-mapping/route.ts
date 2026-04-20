import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScreenMapping = {
  path: string;
  mfePath?: string;
};

type ModuleMapping = {
  remoteName: string;
  basePath: string;
  screens: ScreenMapping[];
};

type MfeMapping = Record<string, ModuleMapping>;

const IS_PROD = process.env.NODE_ENV === 'production';

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const USE_POSTGRES = Boolean(DATABASE_URL);

const MFE_MAPPING_PATH = process.env.MFE_MAPPING_PATH?.trim();
const DATA_PATH = MFE_MAPPING_PATH
  ? path.resolve(MFE_MAPPING_PATH)
  : path.join(process.cwd(), 'data', 'mfe-mapping.json');

declare global {
  var __mfeMappingPool: Pool | undefined;
  var __mfeMappingTableReady: Promise<void> | undefined;
}

function shouldUseSsl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get('sslmode')?.toLowerCase();
    const ssl = url.searchParams.get('ssl')?.toLowerCase();
    const host = url.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (sslmode === 'disable') return false;
    if (sslmode === 'require') return true;
    if (ssl === 'true') return true;

    // Most managed Postgres providers (e.g. Neon) require SSL.
    return !isLocalHost;
  } catch {
    return IS_PROD;
  }
}

function getPool(): Pool {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  if (!globalThis.__mfeMappingPool) {
    const needsSsl = shouldUseSsl(DATABASE_URL);
    globalThis.__mfeMappingPool = new Pool({
      connectionString: DATABASE_URL,
      // Keep pool small for serverless.
      max: IS_PROD ? 5 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
  }

  return globalThis.__mfeMappingPool;
}

function ensureTable(): Promise<void> {
  if (!globalThis.__mfeMappingTableReady) {
    globalThis.__mfeMappingTableReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mfe_mapping_store (
          key text PRIMARY KEY,
          mapping jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `);
    })();
  }

  return globalThis.__mfeMappingTableReady;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Origin, X-Requested-With',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getErrnoCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

function isScreenMapping(value: unknown): value is ScreenMapping {
  return (
    isPlainObject(value) &&
    typeof value.path === 'string' &&
    (value.mfePath === undefined || typeof value.mfePath === 'string')
  );
}

function isModuleMapping(value: unknown): value is ModuleMapping {
  return (
    isPlainObject(value) &&
    typeof value.remoteName === 'string' &&
    typeof value.basePath === 'string' &&
    Array.isArray(value.screens) &&
    value.screens.every(isScreenMapping)
  );
}

function isMfeMapping(value: unknown): value is MfeMapping {
  return isPlainObject(value) && Object.values(value).every(isModuleMapping);
}

function readMappingFromFile(): MfeMapping {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (!isMfeMapping(parsed)) {
    throw new Error('Invalid mapping schema in data file');
  }
  return parsed;
}

async function readMappingFromPostgres(): Promise<MfeMapping> {
  await ensureTable();
  const pool = getPool();

  const result = await pool.query('SELECT mapping FROM mfe_mapping_store WHERE key = $1', ['default']);
  if (result.rowCount === 0) {
    return {};
  }

  const parsed: unknown = result.rows[0]?.mapping;
  if (!isMfeMapping(parsed)) {
    throw new Error('Invalid mapping schema in database');
  }
  return parsed;
}

async function readMapping(): Promise<MfeMapping> {
  if (USE_POSTGRES) {
    return readMappingFromPostgres();
  }
  return readMappingFromFile();
}

function writeMappingToFile(data: MfeMapping) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function writeMappingToPostgres(data: MfeMapping): Promise<void> {
  await ensureTable();
  const pool = getPool();

  await pool.query(
    `
      INSERT INTO mfe_mapping_store (key, mapping)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (key)
      DO UPDATE SET mapping = EXCLUDED.mapping, updated_at = now();
    `,
    ['default', JSON.stringify(data)]
  );
}

async function writeMapping(data: MfeMapping): Promise<void> {
  if (USE_POSTGRES) {
    return writeMappingToPostgres(data);
  }
  return writeMappingToFile(data);
}

export async function GET() {
  try {
    const mapping = await readMapping();
    return NextResponse.json(mapping, { headers: CORS_HEADERS });
  } catch (err) {
    const code = getErrnoCode(err);

    let details: string | undefined;
    if (process.env.NODE_ENV === 'development') {
      details = err instanceof Error ? err.message : String(err);
    }

    const error = code ? `Error reading mapping (${code})` : 'Error reading mapping';

    return NextResponse.json(
      { error, ...(details ? { details } : {}) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function PUT(request: Request) {
  try {
    if (IS_PROD && !USE_POSTGRES && !MFE_MAPPING_PATH) {
      return NextResponse.json(
        {
          error:
            'No se puede guardar en PROD en el filesystem del deploy. Configura la variable MFE_MAPPING_PATH apuntando a una ruta persistente/escribible.',
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const body: unknown = await request.json();

    if (!isMfeMapping(body)) {
      return NextResponse.json(
        { error: 'Mapping inválido: revisa remoteName, basePath y screens[]' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await writeMapping(body);
    return NextResponse.json(body, { headers: CORS_HEADERS });
  } catch (err) {
    const code = getErrnoCode(err);

    let details: string | undefined;
    if (process.env.NODE_ENV === 'development') {
      details = err instanceof Error ? err.message : String(err);
    }

    let error = code ? `Error saving mapping (${code})` : 'Error saving mapping';
    if ((code === 'EROFS' || code === 'EACCES' || code === 'EPERM') && !MFE_MAPPING_PATH) {
      error =
        'No se puede guardar en PROD en el filesystem del deploy. Configura la variable MFE_MAPPING_PATH apuntando a una ruta persistente/escribible.';
    }

    if (!code && USE_POSTGRES) {
      error = 'Error saving mapping to PostgreSQL';
    }

    return NextResponse.json(
      { error, ...(details ? { details } : {}) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}