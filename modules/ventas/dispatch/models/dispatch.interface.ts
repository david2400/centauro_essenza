/** @format */

export type {
  DispatchRowDto as IDispatchRow,
  DispatchStatsDto as IDispatchStats,
  DispatchUrgency,
} from "@/server/domains/sales/dispatch/types";

export const DISPATCH_HREF = "/ventas/dispatch";

/** Vistas del tablero (sin valor = por despachar). */
export const DISPATCH_VIEWS = ["OVERDUE", "DUE_TODAY", "IN_TRANSIT", "DELIVERED", "ALL"] as const;
