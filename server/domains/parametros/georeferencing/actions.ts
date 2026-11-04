'use server';

/**
 * Server actions de georreferenciación para los selectores en cascada
 * país → departamento → ciudad (`components/geo-cascade-fields`).
 *
 * Se componen en el servidor para no exponer el backend de parametros al
 * navegador. Ante un error devuelven [] / null: un catálogo caído no debe
 * romper el formulario (el selector queda vacío).
 */
import { unstable_rethrow } from 'next/navigation';
import { georeferencing_repository } from './repository';
import type { GeoOption, TerritoryPath } from './types';

/** Mensaje corto: "fetch failed (ECONNREFUSED)" en vez del stack completo. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  return cause?.code ? `${error.message} (${cause.code})` : error.message;
}

export async function list_countries_action(): Promise<GeoOption[]> {
  try {
    return await georeferencing_repository.list_countries();
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[georeferencing] No se pudo obtener el catálogo de países (¿está corriendo el servicio parametros en PARAMETROS_API_URL?): ${describe(error)}`);
    return [];
  }
}

export async function list_states_by_country_action(country_id: number): Promise<GeoOption[]> {
  try {
    return await georeferencing_repository.list_states_by_country(country_id);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[georeferencing] Error obteniendo departamentos del país ${country_id}: ${describe(error)}`);
    return [];
  }
}

export async function list_cities_by_state_action(state_id: number): Promise<GeoOption[]> {
  try {
    return await georeferencing_repository.list_cities_by_state(state_id);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[georeferencing] Error obteniendo ciudades del departamento ${state_id}: ${describe(error)}`);
    return [];
  }
}

export async function get_city_path_action(city_id: number): Promise<TerritoryPath | null> {
  try {
    return await georeferencing_repository.get_city_path(city_id);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[georeferencing] Error resolviendo la ciudad ${city_id}: ${describe(error)}`);
    return null;
  }
}
