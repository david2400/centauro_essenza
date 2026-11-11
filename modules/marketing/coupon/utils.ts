/** @format */

import type { CouponStatus, ICoupon } from "./models/coupon.interface";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatMoney = (value?: number | null) => (value == null ? "—" : money.format(value));

/** El backend guarda las listas de IDs como texto separado por comas. */
export const csvToList = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const listToCsv = (values?: string[]) => (values && values.length ? values.join(",") : undefined);

/** LocalDateTime de Spring ⇄ `<input type="datetime-local">`. */
export const toInputDateTime = (value?: string | null) => (value ? value.slice(0, 16) : "");
export const fromInputDateTime = (value: string) => (value.length === 16 ? `${value}:00` : value);

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
};

export const couponStatus = (coupon: ICoupon, now = new Date()): CouponStatus => {
  if (!coupon.is_active) return "inactive";
  if (coupon.usage_limit != null && (coupon.usage_count ?? 0) >= coupon.usage_limit) return "exhausted";
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return "scheduled";
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return "expired";
  return "active";
};

/**
 * Código de cupón desde un texto: MAYÚSCULAS, sin tildes, solo `A-Z 0-9 _ -` (lo que acepta el backend), 50 máx.
 * ("Black Friday 15 %" → "BLACK_FRIDAY_15"). Con `keepEdges` no recorta el separador final para no estorbar al escribir.
 */
export const normalizeCouponCode = (text: string, { keepEdges = false }: { keepEdges?: boolean } = {}) => {
  const code = (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "_");
  return (keepEdges ? code.replace(/^[_-]+/, "") : code.replace(/^[_-]+|[_-]+$/g, "")).slice(0, 50);
};

/** Sin 0/O ni 1/I para que el cliente no se equivoque al dictarlo o copiarlo. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código único y fácil de leer: prefijo (del nombre o "PROMO") + 5 caracteres aleatorios. */
export const randomCouponCode = (prefix?: string) => {
  const base = normalizeCouponCode(prefix ?? "").slice(0, 20) || "PROMO";
  const suffix = Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  return `${base}-${suffix}`;
};

/** Valor numérico de un input (acepta "", coma decimal y `number`); NaN si no hay número. */
export const toNumber = (value: unknown) => {
  if (value === "" || value == null) return NaN;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/** Monto de la compra de ejemplo de la vista previa (o la compra mínima, si es mayor). */
export const PREVIEW_ORDER_AMOUNT = 100_000;

/**
 * Cálculo aproximado para la vista previa del formulario. El valor real lo da el backend (ver el simulador de la
 * pantalla), que además aplica reglas de categorías y productos.
 */
export const previewCouponDiscount = ({
  type,
  value,
  maxDiscount,
  minOrder,
}: {
  type: string;
  value: number;
  maxDiscount: number;
  minOrder: number;
}) => {
  const amount = minOrder > PREVIEW_ORDER_AMOUNT ? minOrder : PREVIEW_ORDER_AMOUNT;
  let discount = 0;
  if (type === "PERCENTAGE") discount = (amount * value) / 100;
  if (type === "FIXED_AMOUNT") discount = Math.min(value, amount);
  if (type === "PERCENTAGE" && maxDiscount > 0) discount = Math.min(discount, maxDiscount);
  discount = Math.round(discount);
  return { amount, discount, total: amount - discount };
};

/** `datetime-local` → Date en hora local (o null). */
export const parseInputDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Date → `yyyy-MM-ddTHH:mm` en hora local, para `datetime-local`. */
export const toLocalInput = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
