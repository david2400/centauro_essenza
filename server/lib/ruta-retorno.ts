/**
 * Ruta a la que se vuelve despues de iniciar sesion. Solo rutas internas de Essenza: empieza por
 * "/" y no por "//" ni "/\\" (evita redirecciones abiertas a otro sitio). Si no es valida, "/".
 */
export const COOKIE_ULTIMA_RUTA = 'essenza_ultima_ruta';

export function rutaRetornoSegura(valor: string | null | undefined): string {
  if (!valor) return '/';
  const ruta = valor.trim();
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\') || ruta.includes('://')) return '/';
  if (/^\/(es|en)?\/?auth\//.test(ruta) || /\/auth\/login/.test(ruta)) return '/';
  return ruta.length > 2000 ? '/' : ruta;
}
