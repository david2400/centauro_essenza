import createMiddleware from 'next-intl/middleware';
import {NextResponse, type NextRequest} from 'next/server';
import {routing} from './shared/i18n/routing';
import {auth} from './auth';
import {COOKIE_ULTIMA_RUTA} from './server/lib/ruta-retorno';

const intl = createMiddleware(routing);

/** Rutas que no exigen sesion (sin el prefijo de idioma). */
const RUTAS_PUBLICAS = ['/auth/'];

/**
 * Bypass de sesion SOLO para desarrollo local (DEV_SKIP_AUTH=1 en .env.local).
 * Deja pasar todo sin login. Ojo: las llamadas al backend via server_fetch siguen
 * saliendo sin token; si el backend valida el JWT respondera 401. Para apagarlo
 * del todo hay que quitar la variable, nunca comitearla en true.
 */
const SIN_AUTH = process.env.DEV_SKIP_AUTH === '1';

/**
 * 1) Auth.js envuelve el middleware de idiomas para RENOVAR el token de access_control (dura
 *    10 min): la renovacion solo queda guardada donde se puede escribir la cookie de sesion.
 * 2) Sin sesion (nunca entro, cerro sesion o la renovacion fallo) se manda al login y, al
 *    entrar, se vuelve a la misma pagina.
 */
export default auth((req) => {
  const {pathname} = req.nextUrl;
  const sinIdioma = pathname.replace(/^\/(es|en)(?=\/|$)/, '') || '/';
  const esPublica = SIN_AUTH || RUTAS_PUBLICAS.some((r) => sinIdioma.startsWith(r));
  // Server Actions (POST con cabecera `next-action`): el cliente de Next espera una respuesta RSC; si aqui se
  // redirige, le llega el HTML del login y muestra "An unexpected response was received from the server". Se dejan
  // pasar: sin sesion el backend responde 401 y server_fetch hace redirect() al login, que Next si sabe seguir.
  // No es un hueco: la autorizacion la valida el backend con el token, no este middleware.
  const esServerAction = req.method === 'POST' && req.headers.has('next-action');

  if (!esPublica && !req.auth && !esServerAction) {
    const idioma = pathname.match(/^\/(es|en)(?=\/|$)/)?.[1] ?? routing.defaultLocale;
    const login = new URL(`/${idioma}/auth/login`, req.nextUrl.origin);
    login.searchParams.set('expirada', '1');
    login.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const respuesta = intl(req);
  if (!esPublica && !esServerAction) {
    respuesta.cookies.set(COOKIE_ULTIMA_RUTA, pathname + req.nextUrl.search, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  return respuesta;
// El tipo inferido de auth() referencia AppRouteHandlerFn (interno de next-auth beta):
// se anota el export para que .d.ts no dependa de tipos no portables.
}) as (req: NextRequest) => Promise<Response>;

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
  // auth.ts usa APIs de Node (Buffer, fetch al emisor): el middleware corre en Node, no en Edge.
  runtime: 'nodejs',
};
