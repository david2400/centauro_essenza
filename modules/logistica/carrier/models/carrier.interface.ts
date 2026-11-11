/** @format */

import type {
  CarrierDto,
  CreateCarrierDto,
  UpdateCarrierPayload,
} from "@/server/domains/shipping_logistics/product_distribution/carriers/types";

/**
 * Tipos del módulo. Se reutilizan los DTO generados desde `endpoint.json`
 * (import de solo tipos: no arrastra código de servidor al cliente).
 */
export type ICarrier = CarrierDto;
export type ICarrierCreateRequest = CreateCarrierDto;
export type ICarrierUpdateRequest = UpdateCarrierPayload;

/**
 * Código sugerido desde el nombre: MAYÚSCULAS, sin tildes, con guion bajo ("Inter Rapidísimo" → "INTER_RAPIDISIMO").
 * Con `keepEdges` conserva un guion bajo al final para no estorbar mientras se escribe.
 */
export const codeFromName = (name: string, { keepEdges = false }: { keepEdges?: boolean } = {}) => {
  const code = (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
  return (keepEdges ? code.replace(/^_+/, "") : code.replace(/^_+|_+$/g, "")).slice(0, 30);
};
