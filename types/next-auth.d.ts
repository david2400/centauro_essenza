/** @format */

import type { DefaultSession } from 'next-auth';

/**
 * Extiende los tipos de next-auth con lo que agrega el login real contra
 * access_control (ver auth.ts): companyId es la empresa (tenant) del
 * usuario logueado, la pieza que necesitamos para asignarla automaticamente
 * a lo que ese usuario crea.
 */
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: DefaultSession['user'] & {
      id: string;
      companyId?: number | null;
      /** Contexto elegido en access_control (solo con login OIDC). */
      userApplicationId?: number | null;
      application?: string | null;
      /** Usuario de access_control (preferred_username). */
      username?: string | null;
      /** Empresa y aplicacion del contexto elegido (solo con login OIDC). */
      companyName?: string | null;
      applicationName?: string | null;
      userType?: string;
      roles?: string[];
      permissions?: string[];
    };
  }

  interface User {
    accessToken?: string;
    accessTokenExpiresAt?: string;
    companyId?: number | null;
    userType?: string;
    roles?: string[];
    permissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    /** Refresh token rotativo de access_control (solo OIDC). Nunca se copia a la sesion. */
    refreshToken?: string;
    /** id_token de access_control: solo para id_token_hint al cerrar sesion. Nunca va a la sesion. */
    idToken?: string;
    userApplicationId?: number | null;
    application?: string | null;
    username?: string | null;
    companyName?: string | null;
    applicationName?: string | null;
    error?: string;
    accessTokenExpiresAt?: string;
    companyId?: number | null;
    userType?: string;
    roles?: string[];
    permissions?: string[];
  }
}
