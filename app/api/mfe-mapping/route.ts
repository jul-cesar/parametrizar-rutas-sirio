import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'mfe-mapping.json');
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Origin, X-Requested-With',
};

function readMapping() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeMapping(data: unknown) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const mapping = readMapping();
    return NextResponse.json(mapping, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Error reading mapping' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    writeMapping(body);
    return NextResponse.json(body, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Error saving mapping' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}