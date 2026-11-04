/** @format */

/** Estados de una orden en el orden del flujo (un valor desconocido se muestra tal cual). */
export const ORDER_STATES = ["PENDING", "PAID", "PROCESSING", "READY", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export const ORDER_STATE_VARIANT: Record<OrderState, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "secondary",
  PROCESSING: "secondary",
  READY: "secondary",
  SHIPPED: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

export const isOrderState = (value?: string): value is OrderState =>
  !!value && (ORDER_STATES as readonly string[]).includes(value);

/** Canales de venta. POS solo lo crea la caja. */
export const ORDER_CHANNELS = ["BACKOFFICE", "ONLINE", "PHONE", "WHATSAPP", "MARKETPLACE", "POS"] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];
export const EDITABLE_CHANNELS = ORDER_CHANNELS.filter((channel) => channel !== "POS");

export const ORDER_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const DELIVERY_METHODS = ["SHIPPING", "PICKUP"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DISCOUNT_TYPES = ["NONE", "PERCENT", "AMOUNT", "COUPON"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID", "OVERPAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PERIODS = ["TODAY", "LAST_7", "LAST_30", "THIS_MONTH"] as const;

export const CUSTOMER_DOC_TYPES = ["CC", "NIT", "CE", "PP", "TI", "PEP"] as const;

/**
 * Empresa de la tienda en el registro central (id_company de access_control). La consulta de
 * clientes por documento solo devuelve los usuarios asignados a esta empresa.
 */
export const ORDER_COMPANY_ID = 2;
export const CUSTOMER_KINDS = ["PERSON", "COMPANY"] as const;

/** Tipos de evento de la línea de tiempo. */
export const ORDER_EVENT_TYPES = ["CREATED", "STATUS", "EDITED", "LINES", "DISCOUNT", "PICKED", "SHIPPED", "DELIVERED", "NOTE"] as const;
export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

/** Secciones que reporta un evento EDITED. */
export const EDITED_SECTIONS = ["customer", "delivery", "origin", "notes", "reference"] as const;

export const pick = <T extends string>(list: readonly T[], value: string | null | undefined, fallback: T): T =>
  value != null && (list as readonly string[]).includes(value) ? (value as T) : fallback;

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export const formatMoney = (value?: number | null) => (value == null ? "—" : moneyFormatter.format(value));
