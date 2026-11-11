import { unstable_rethrow } from 'next/navigation';

/**
 * Datos opcionales de una página: si la consulta falla se usa `fallback` y la página sigue (p. ej. una lista vacía),
 * pero los `redirect()` / `notFound()` de Next se dejan pasar. Conserva el tipo de la consulta, a diferencia de
 * `.catch(() => [])`, que lo vuelve `never[]`.
 */
export function with_fallback<T>(promise: Promise<T>, fallback: NoInfer<T>): Promise<T> {
  return promise.catch((error: unknown) => {
    unstable_rethrow(error);
    return fallback;
  });
}
