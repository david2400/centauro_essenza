/** Centro de operaciones (draco /operations/alerts). Tipos escritos a mano hasta regenerar el OpenAPI. */

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertRefType = 'ORDER' | 'SELLER' | 'INVOICE' | 'RETURN' | 'OFFER' | 'WAREHOUSE' | 'COMMISSION' | 'DISPUTE' | 'PURCHASE_ORDER';

export interface AlertItemDto {
  ref_type: AlertRefType;
  ref_id: number | null;
  label: string;
  detail: string | null;
  amount: number | null;
  at: string | null;
  days: number | null;
}

export interface AlertDto {
  key: string;
  area: string;
  severity: AlertSeverity;
  count: number;
  amount: number | null;
  /** false si no se pudo calcular (módulo no instalado o error): la alerta se muestra como no disponible. */
  available: boolean;
  items: AlertItemDto[];
}

export interface AlertsDto {
  generated_at: string;
  critical: number;
  warning: number;
  info: number;
  consignment_aged_days: number;
  returns_stalled_days: number;
  alerts: AlertDto[];
}
