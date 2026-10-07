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

  // Navegación interna del panel (pedido RSC del router de Next o su prefetch)
  // que llegó sin cookie. Safari en iPhone/iPad a veces omite la cookie en
  // estos fetch aunque la sesión siga viva, y si acá redirigiéramos, el router
  // seguiría la redirección por dentro y la persona terminaría en el inicio.
  // Con un 401 vacío el router hace una carga completa de la página, que sí
  // lleva la cookie: con sesión entra y sin sesión cae en la redirección.
  // (Next le oculta al proxy el header `RSC`, así que se distingue la carga
  // de página del fetch por `Sec-Fetch-Dest`, o por `Accept` si no viene.)
  if (!isPageLoad(request)) {
    return new NextResponse(null, {
      status: 401,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = '/';
  url.search = `?next=${encodeURIComponent(next)}`;
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function isPageLoad(request: NextRequest): boolean {
  const dest = request.headers.get('sec-fetch-dest');
  if (dest) return dest === 'document' || dest === 'iframe';
  return (request.headers.get('accept') ?? '').includes('text/html');
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
