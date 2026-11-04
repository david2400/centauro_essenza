import { unstable_rethrow } from 'next/navigation';
import 'server-only';

import { cache } from 'react';

import { georeferencing_repository } from './repository';

/**
 * Etiqueta legible ("Medellín, Antioquia, Colombia") de varias ciudades.
 * Para mostrar la ubicación en listados sin pedir la ruta fila por fila
 * desde el cliente. Un fallo de `parametros` no rompe la página: esa ciudad
 * simplemente queda sin etiqueta.
 */
export const get_city_labels = cache(async (city_ids: number[]) => {
  const unique = [...new Set(city_ids.filter((id) => Number.isInteger(id) && id > 0))];
  const entries = await Promise.all(
    unique.map(async (id) => {
      try {
        const path = await georeferencing_repository.get_city_path(id);
        const label =
          path.label ||
          [path.city?.name, path.state?.name, path.country?.name].filter(Boolean).join(', ');
        return [id, label] as const;
      } catch (error) {
        unstable_rethrow(error);
        return [id, ''] as const;
      }
    }),
  );
  return Object.fromEntries(entries.filter(([, label]) => label)) as Record<number, string>;
});
