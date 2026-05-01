import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Gate de rutas protegidas: si no hay cookie `access_token`, redirige al
 * login (`/`) preservando el destino original en `?next=`.
 *
 * Nota: sólo verifica presencia de cookie, no validez del JWT (eso requeriría
 * crypto en edge). La validez se valida en el backend; si el JWT está vencido
 * o inválido, devuelve 401 y el interceptor en `api.service.ts` se encarga
 * del logout en runtime.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE);
  if (token) return NextResponse.next();

  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = '/';
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
