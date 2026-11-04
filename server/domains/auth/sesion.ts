'use server';

import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { auth, signIn, signOut, OIDC_HABILITADO, OIDC_PROVIDER_ID } from '@/auth';
import { rutaRetornoSegura } from '@/server/lib/ruta-retorno';

/** Datos de la persona logueada para el menu de la cuenta (nunca incluye tokens). */
export interface IUsuarioActual {
  nombre: string;
  usuario: string | null;
  empresa: string | null;
  aplicacion: string | null;
  roles: string[];
}

export async function usuarioActual(): Promise<IUsuarioActual | null> {
  const session = await auth();
  const u = session?.user;
  if (!u) return null;
  return {
    nombre: u.name ?? u.username ?? 'Usuario',
    usuario: u.username ?? null,
    empresa: u.companyName ?? null,
    aplicacion: u.applicationName ?? null,
    roles: u.roles ?? [],
  };
}

/** Inicia el login (boton de la pagina de login): va a access_control y vuelve a callbackUrl. */
export async function iniciarSesionOidc(formData?: FormData): Promise<void> {
  const volverA = rutaRetornoSegura(formData?.get('callbackUrl')?.toString());
  await signIn(OIDC_PROVIDER_ID, { redirectTo: volverA });
}

/**
 * Cierra la sesion de Essenza y tambien la de access_control (si no, el siguiente
 * "Iniciar sesion" entraria sin pedir contraseña).
 */
export async function cerrarSesion(): Promise<void> {
  const issuer = (process.env.AUTH_ACCESS_CONTROL_ISSUER ?? 'http://localhost:8000').replace(/\/+$/, '');
  const volver = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  if (OIDC_HABILITADO) {
    const jwt = await getToken({
      req: { headers: await headers() },
      secret: process.env.AUTH_SECRET,
      cookieName: 'essenza.session-token',
      secureCookie: volver.startsWith('https://'),
    });
    if (jwt?.idToken) {
      await signOut({
        redirectTo:
          `${issuer}/connect/logout?id_token_hint=${encodeURIComponent(jwt.idToken)}` +
          `&post_logout_redirect_uri=${encodeURIComponent(`${volver}/auth/login`)}`,
      });
      return;
    }
  }
  await signOut({ redirectTo: '/auth/login' });
}
