import 'server-only';

import { cookies, headers as next_headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { COOKIE_ULTIMA_RUTA, rutaRetornoSegura } from './ruta-retorno';

import { env } from './env';
import { ServerApiError, type ServerFetchOptions } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function build_url(
  path: string,
  params?: Record<string, unknown>,
  base_url: string = env.api_base_url,
): string {
  const url = new URL(path, base_url);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Access token de access_control de la sesion (aud = essenza). Vive en la cookie cifrada de
 * Auth.js y solo se lee del lado del servidor. Antes se mandaba la cookie de sesion cruda,
 * que no es un token valido para el backend.
 */
async function get_auth_headers(): Promise<Record<string, string>> {
  try {
    const session = await auth();
    if (session?.accessToken) {
      return { Authorization: `Bearer ${session.accessToken}` };
    }
  } catch {
    // Fuera de un request (p. ej. en el build): sin token.
  }
  return {};
}

/**
 * Manda al login conservando la pagina actual (cookie essenza_ultima_ruta). Lanza NEXT_REDIRECT:
 * en los try/catch hay que dejarlo pasar con unstable_rethrow(error).
 */
export async function redirigirAlLogin(): Promise<never> {
  let volver_a = '/';
  try {
    volver_a = rutaRetornoSegura((await cookies()).get(COOKIE_ULTIMA_RUTA)?.value);
  } catch {
    // fuera de un request: se vuelve al inicio
  }
  redirect(`/auth/login?expirada=1&callbackUrl=${encodeURIComponent(volver_a)}`);
}

async function forwarded_headers(): Promise<Record<string, string>> {
  try {
    const req_headers = await next_headers();
    const forwarded: Record<string, string> = {};
    const accept_lang = req_headers.get('accept-language');
    if (accept_lang) forwarded['Accept-Language'] = accept_lang;
    return forwarded;
  } catch {
    return {};
  }
}

async function handle_response<T>(response: Response): Promise<T> {
  // 401: el backend no acepto el token (vencido, revocado o ausente) -> al login y de vuelta aqui.
  if (response.status === 401) {
    await redirigirAlLogin();
  }
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }

    const message =
      (body as any)?.message ??
      (body as any)?.error ??
      `API request failed with status ${response.status}`;

    throw new ServerApiError({
      message,
      status: response.status,
      code: (body as any)?.code,
      details: body,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Core fetch wrapper ─────────────────────────────────────────────────────

async function server_request<T>(
  method: string,
  path: string,
  opts: ServerFetchOptions & {
    body?: unknown;
    params?: Record<string, unknown>;
    /** Backend destino; por defecto el de Essenza (`API_BASE_URL`). */
    base_url?: string;
  } = {},
): Promise<T> {
  const { body, params, revalidate, tags, signal, headers: extra_headers, base_url } = opts;

  const [auth_headers, fwd_headers] = await Promise.all([
    get_auth_headers(),
    forwarded_headers(),
  ]);

  const url = build_url(path, params, base_url);

  const fetch_options: RequestInit & { next?: Record<string, unknown> } = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...auth_headers,
      ...fwd_headers,
      ...extra_headers,
    },
    signal,
    next: {},
  };

  if (revalidate !== undefined) {
    fetch_options.next!.revalidate = revalidate;
  }
  if (tags?.length) {
    fetch_options.next!.tags = tags;
  }

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    fetch_options.body = JSON.stringify(body);
  }

  if (env.is_dev) {
    console.log(`[server-fetch] ${method} ${url}`);
  }

  const response = await fetch(url, fetch_options);

  try {
    return await handle_response<T>(response);
  } catch (error) {
    // En desarrollo se añade la URL al mensaje: un 404 suele significar que
    // API_BASE_URL no apunta al backend (sin esa variable, `env` cae en el
    // propio servidor de Next en localhost:3000).
    if (env.is_dev && error instanceof ServerApiError) {
      throw new ServerApiError({
        message: `${error.message} (${method} ${url})`,
        status: error.status,
        code: error.code,
        details: error.details,
      });
    }
    throw error;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const server_fetch = {
  get<T>(path: string, opts?: ServerFetchOptions & { params?: Record<string, unknown> }) {
    return server_request<T>('GET', path, opts);
  },

  post<T>(path: string, body?: unknown, opts?: ServerFetchOptions) {
    return server_request<T>('POST', path, { ...opts, body });
  },

  put<T>(path: string, body?: unknown, opts?: ServerFetchOptions) {
    return server_request<T>('PUT', path, { ...opts, body });
  },

  patch<T>(path: string, body?: unknown, opts?: ServerFetchOptions) {
    return server_request<T>('PATCH', path, { ...opts, body });
  },

  delete<T>(path: string, opts?: ServerFetchOptions) {
    return server_request<T>('DELETE', path, opts);
  },
} as const;

// ─── parametros client ──────────────────────────────────────────────────────
// Mismo wrapper apuntando al servicio `parametros` (catálogos compartidos:
// países, departamentos, ciudades…). Solo lectura desde este frontend.

export const parametros_fetch = {
  get<T>(path: string, opts?: ServerFetchOptions & { params?: Record<string, unknown> }) {
    return server_request<T>('GET', path, { ...opts, base_url: env.parametros_base_url });
  },
} as const;
