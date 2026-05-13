import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy genérico hacia el backend.
 *
 * Por qué existe (y no una `rewrite()` en next.config):
 *  - Next 16.1.x con path-to-regexp v8 explota si la destination de un
 *    rewrite tiene `:NNNN` (puerto) literal — lo trata como param name
 *    inválido. Las URLs privadas de Railway tienen puerto explícito
 *    (`http://service.railway.internal:3000/api`), así que el rewrite
 *    queda inutilizable.
 *  - Este Route Handler hace fetch programático → no toca path-to-regexp
 *    para nada → funciona con cualquier URL.
 *
 * URL del backend:
 *  - `BACKEND_URL` (server-only) → soporta private domain Railway
 *  - `http://localhost:3000/api` → dev
 *
 * Nota: el match `/api/:path*` lo hace este catch-all en `app/api/[...path]`.
 * Si en el futuro se agregan rutas Next propias en `app/api/<x>/route.ts`,
 * esas ganan precedencia sobre este catch-all (regla de Next routing).
 */

function resolveBackendUrl(): string {
  const raw = process.env.BACKEND_URL || 'http://localhost:3000';
  const trimmed = raw.replace(/\/+$/, '');
  // El backend monta sus controllers bajo `/api`. Si ya viene incluido en
  // BACKEND_URL no lo duplicamos.
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const BACKEND_URL = resolveBackendUrl();

const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'accept-encoding',
]);

const RESPONSE_SKIP_HEADERS = new Set([
  'transfer-encoding',
  'content-encoding',
  'connection',
  'keep-alive',
]);

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetPath = path.join('/');
  const search = request.nextUrl.search;
  const url = `${BACKEND_URL}/${targetPath}${search}`;

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers[key] = value;
    }
  });

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: 'manual',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[api-proxy] fetch failed for ${request.method} ${url}:`, err);
    return NextResponse.json(
      {
        success: false,
        message: `No se pudo contactar al backend (${url}): ${message}`,
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!RESPONSE_SKIP_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
      responseHeaders.set(key, value);
    }
  });
  // Set-Cookie puede venir múltiples veces; `forEach` colapsa duplicados,
  // así que las copiamos aparte con `getSetCookie()`.
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
