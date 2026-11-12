/** @format */

import NextAuth, { type NextAuthResult } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

/**
 * Login del panel Essenza contra access_control (servidor de autorizacion OAuth 2.1 / OIDC).
 *
 * Essenza es un cliente confidencial ("essenza-web"): authorization code + PKCE. El usuario
 * escribe la contraseña en access_control (nunca aqui), elige empresa y alli recibe un access
 * token RS256 de la aplicacion ESSENZA (aud = essenza) con SOLO sus roles y permisos de ese
 * contexto, mas un refresh token rotativo. Los tokens viven en la cookie cifrada de Auth.js.
 * Misma configuracion que apps/draco (ver su auth.ts).
 */

const ISSUER = (process.env.AUTH_ACCESS_CONTROL_ISSUER ?? 'http://localhost:8000').replace(/\/+$/, '');
const CLIENT_ID = process.env.AUTH_ACCESS_CONTROL_CLIENT_ID ?? 'essenza-web';
const CLIENT_SECRET = process.env.AUTH_ACCESS_CONTROL_SECRET;

/** true si el login va por el servidor de autorizacion de access_control. */
export const OIDC_HABILITADO = Boolean(CLIENT_SECRET);
export const OIDC_PROVIDER_ID = 'access-control';

/** Claims del access token de contexto (ver TokenContextoCustomizer en access_control). */
interface ClaimsContexto {
  sub: string;
  exp: number;
  ctx?: {
    user_application_id?: number;
    company_id?: number;
    company_application_id?: number;
    application?: string;
  };
  roles?: string[];
  permissions?: string[];
  user_type?: string;
}

/**
 * Lee los claims SIN verificar la firma: el token llega directo del endpoint /oauth2/token
 * de access_control por el canal servidor-servidor, no del navegador. Los backends que lo
 * reciben si verifican la firma.
 */
function claimsDe(accessToken: string): ClaimsContexto {
  const payload = accessToken.split('.')[1] ?? '';
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ClaimsContexto;
}

function conTokensDeContexto(token: JWT, accessToken: string, refreshToken?: string): JWT {
  const c = claimsDe(accessToken);
  token.sub = c.sub;
  token.accessToken = accessToken;
  token.refreshToken = refreshToken ?? token.refreshToken;
  token.accessTokenExpiresAt = new Date(c.exp * 1000).toISOString();
  token.companyId = c.ctx?.company_id ?? null;
  token.userApplicationId = c.ctx?.user_application_id ?? null;
  token.application = c.ctx?.application ?? null;
  token.userType = c.user_type;
  // Roles y permisos NO se copian a la cookie: ya vienen dentro del access token y se leen de
  // ahi en session(). Asi la cookie pesa menos (en localhost el navegador manda las cookies de
  // todas las apps a cada puerto y Tomcat rechazaba cabeceras de mas de 8 KB).
  delete token.roles;
  delete token.permissions;
  delete token.error;
  return token;
}

/**
 * Renovaciones en curso por refresh token. El refresh de access_control rota en cada uso:
 * si dos peticiones simultaneas renovaran con el mismo, la segunda fallaria y cerraria la
 * sesion. Se comparte la misma promesa dentro del proceso.
 */
// En globalThis: el middleware y las paginas se compilan por separado (cada uno tendria su
// propio Map) pero corren en el mismo proceso de Node. Asi ambos comparten la misma renovacion
// y la pagina no reusa el refresh token viejo (access_control lo tomaria como robo y cerraria
// la sesion completa).
const globalRenovaciones = globalThis as typeof globalThis & {
  __essenzaRenovaciones?: Map<string, Promise<JWT | null>>;
};
const renovacionesEnCurso = (globalRenovaciones.__essenzaRenovaciones ??= new Map<string, Promise<JWT | null>>());

async function renovar(token: JWT): Promise<JWT | null> {
  const refresh = token.refreshToken;
  if (!refresh || !CLIENT_SECRET) return null;
  const enCurso = renovacionesEnCurso.get(refresh);
  if (enCurso) return enCurso;

  const promesa = (async () => {
    try {
      const respuesta = await fetch(`${ISSUER}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${encodeURIComponent(CLIENT_ID)}:${encodeURIComponent(CLIENT_SECRET)}`).toString('base64')}`,
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
        cache: 'no-store',
      });
      if (!respuesta.ok) {
        // Sesion vencida (7 dias), contexto revocado o refresh reusado: hay que volver a entrar.
        console.warn('access_control rechazo la renovacion del token:', respuesta.status);
        return null;
      }
      const datos = (await respuesta.json()) as { access_token: string; refresh_token?: string };
      return conTokensDeContexto({ ...token }, datos.access_token, datos.refresh_token);
    } catch (error) {
      console.error('No se pudo renovar el token con access_control:', error);
      return null;
    } finally {
      setTimeout(() => renovacionesEnCurso.delete(refresh), 60_000);
    }
  })();
  renovacionesEnCurso.set(refresh, promesa);
  return promesa;
}

const result = NextAuth({
  // Igual que el refresh token de access_control (7 dias): pasado ese tiempo hay que volver a entrar.
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  // Nombres propios: las cookies de localhost no distinguen puerto y draco tambien usa Auth.js.
  cookies: {
    sessionToken: { name: 'essenza.session-token' },
    callbackUrl: { name: 'essenza.callback-url' },
    csrfToken: { name: 'essenza.csrf-token' },
    pkceCodeVerifier: { name: 'essenza.pkce.code_verifier' },
    state: { name: 'essenza.state' },
    nonce: { name: 'essenza.nonce' },
  },
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    ...(OIDC_HABILITADO
      ? [
          {
            id: OIDC_PROVIDER_ID,
            name: 'Essenza',
            type: 'oidc' as const,
            issuer: ISSUER,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            checks: ['pkce' as const, 'state' as const],
            authorization: { params: { scope: 'openid' } },
            profile(perfil: { sub: string }) {
              return { id: perfil.sub };
            },
          },
        ]
      : []),
  ],
  callbacks: {
    /**
     * Por defecto Auth.js solo redirige dentro de draco. Se permite ademas access_control,
     * para que "Cerrar sesion" pueda pasar por /connect/logout y cerrar tambien alla.
     */
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        const destino = new URL(url);
        if (destino.origin === baseUrl || (OIDC_HABILITADO && destino.origin === new URL(ISSUER).origin)) {
          return url;
        }
      } catch {
        // URL invalida: se vuelve al inicio
      }
      return baseUrl;
    },
    async jwt({ token, account, profile }) {
      // Login o cambio de empresa por OIDC: llegan tokens nuevos de access_control.
      if (account?.provider === OIDC_PROVIDER_ID && account.access_token) {
        // El id_token solo se guarda para el cierre de sesion en access_control (id_token_hint).
        token.idToken = account.id_token ?? token.idToken;
        // Datos para el menu de la cuenta (claims del id_token, ver agregarPerfil en access_control).
        if (profile) {
          const p = profile as Record<string, unknown>;
          const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
          token.username = texto(p.preferred_username) ?? token.username ?? null;
          token.name = texto(p.name) ?? token.username ?? token.name ?? null;
          token.companyName = texto(p.company_name);
          token.applicationName = texto(p.application_name);
        }
        return conTokensDeContexto(token, account.access_token, account.refresh_token);
      }

      const vence = token.accessTokenExpiresAt ? Date.parse(token.accessTokenExpiresAt) : undefined;
      // Con OIDC se renueva 30 s antes de vencer; sin refresh token (login viejo) se cierra la sesion.
      if (token.refreshToken) {
        if (vence && vence - 30_000 > Date.now()) return token;
        return renovar(token);
      }
      if (vence && vence <= Date.now()) {
        return null;
      }
      return token;
    },
    async session({ session, token }) {
      const jwtToken = token as JWT;
      if (session.user) {
        session.user.id = jwtToken.sub as string;
        session.user.name = jwtToken.name ?? jwtToken.username ?? null;
        session.user.username = jwtToken.username ?? null;
        session.user.companyName = jwtToken.companyName ?? null;
        session.user.applicationName = jwtToken.applicationName ?? null;
        session.user.companyId = jwtToken.companyId ?? null;
        session.user.userApplicationId = jwtToken.userApplicationId ?? null;
        session.user.application = jwtToken.application ?? null;
        session.user.userType = jwtToken.userType;
        const claims = jwtToken.refreshToken && jwtToken.accessToken ? claimsDe(jwtToken.accessToken) : null;
        session.user.roles = claims?.roles ?? jwtToken.roles ?? [];
        session.user.permissions = claims?.permissions ?? jwtToken.permissions ?? [];
      }
      // El refresh token NUNCA va a la sesion: session() se puede exponer al navegador.
      session.accessToken = jwtToken.accessToken;
      return session;
    },
  },
});

export const handlers: NextAuthResult['handlers'] = result.handlers;
export const auth: NextAuthResult['auth'] = result.auth;
export const signIn: NextAuthResult['signIn'] = result.signIn;
export const signOut: NextAuthResult['signOut'] = result.signOut;
