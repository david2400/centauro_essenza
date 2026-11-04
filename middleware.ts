import createMiddleware from 'next-intl/middleware';
import {NextResponse} from 'next/server';
import {routing} from './shared/i18n/routing';
import {auth} from './auth';
import {COOKIE_ULTIMA_RUTA} from './server/lib/ruta-retorno';

const intl = createMiddleware(routing);

/** Rutas que no exigen sesion (sin el prefijo de idioma). */
const RUTAS_PUBLICAS = ['/auth/'];

/**
 * 1) Auth.js envuelve el middleware de idiomas para RENOVAR el token de access_control (dura
 *    10 min): la renovacion solo queda guardada donde se puede escribir la cookie de sesion.
 * 2) Sin sesion (nunca entro, cerro sesion o la renovacion fallo) se manda al login y, al
 *    entrar, se vuelve a la misma pagina.
 */
export default auth((req) => {
  const {pathname} = req.nextUrl;
  const sinIdioma = pathname.replace(/^\/(es|en)(?=\/|$)/, '') || '/';
  const esPublica = RUTAS_PUBLICAS.some((r) => sinIdioma.startsWith(r));

  if (!esPublica && !req.auth) {
    const idioma = pathname.match(/^\/(es|en)(?=\/|$)/)?.[1] ?? routing.defaultLocale;
    const login = new URL(`/${idioma}/auth/login`, req.nextUrl.origin);
    login.searchParams.set('expirada', '1');
    login.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const respuesta = intl(req);
  if (!esPublica) {
    respuesta.cookies.set(COOKIE_ULTIMA_RUTA, pathname + req.nextUrl.search, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  return respuesta;
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
  // auth.ts usa APIs de Node (Buffer, fetch al emisor): el middleware corre en Node, no en Edge.
  runtime: 'nodejs',
};
