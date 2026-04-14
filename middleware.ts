import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Origin, X-Requested-With',
};

export async function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};