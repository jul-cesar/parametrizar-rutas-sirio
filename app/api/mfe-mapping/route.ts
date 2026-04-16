import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

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

const DATA_PATH = process.env.MFE_MAPPING_PATH
  ? path.resolve(process.env.MFE_MAPPING_PATH)
  : path.join(process.cwd(), 'data', 'mfe-mapping.json');

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

function readMapping(): MfeMapping {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  if (!isMfeMapping(parsed)) {
    throw new Error('Invalid mapping schema in data file');
  }
  return parsed;
}

function writeMapping(data: MfeMapping) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const mapping = readMapping();
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
    const body: unknown = await request.json();

    if (!isMfeMapping(body)) {
      return NextResponse.json(
        { error: 'Mapping inválido: revisa remoteName, basePath y screens[]' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    writeMapping(body);
    return NextResponse.json(body, { headers: CORS_HEADERS });
  } catch (err) {
    const code = getErrnoCode(err);

    let details: string | undefined;
    if (process.env.NODE_ENV === 'development') {
      details = err instanceof Error ? err.message : String(err);
    }

    let error = code ? `Error saving mapping (${code})` : 'Error saving mapping';
    if ((code === 'EROFS' || code === 'EACCES' || code === 'EPERM') && !process.env.MFE_MAPPING_PATH) {
      error =
        'No se puede guardar en PROD en el filesystem del deploy. Configura la variable MFE_MAPPING_PATH apuntando a una ruta persistente/escribible.';
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