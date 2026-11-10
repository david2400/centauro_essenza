/** @format */

export const INPUT = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

/** Número escrito en un campo (acepta coma decimal); vacío = null. */
export const num = (value: string) => {
  const raw = value.trim();
  // "12.500,50" (es-CO) → 12500.50; "12.5" se deja igual.
  const v = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export const text = (value: number | null | undefined) => (value == null ? "" : String(value));

/** Trayectos automáticos: misma ciudad, mismo departamento o resto del país. */
export const ROUTE_KEYS = ["LOCAL", "REGIONAL", "NATIONAL"] as const;
