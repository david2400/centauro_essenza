/** Reclamos (draco /marketplace/disputes). Tipos escritos a mano hasta regenerar el OpenAPI. */

export type DisputeStatus = 'OPEN' | 'SELLER_RESPONDED' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'CANCELLED';
export type DisputeReason = 'NOT_RECEIVED' | 'DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'WRONG_ITEM' | 'OTHER';
export type DisputeResolution = 'REFUND' | 'REPLACEMENT' | 'REJECTED';

export interface DisputeSummaryDto {
  id: number;
  number: string | null;
  order_id: number;
  order_number: string | null;
  purchase_id: number | null;
  seller_id: number;
  seller_name: string;
  customer_name: string | null;
  reason: DisputeReason;
  status: DisputeStatus;
  claimed_amount: number | null;
  respond_by: string;
  overdue: boolean;
  resolution: DisputeResolution | null;
  resolution_amount: number | null;
  created_at: string | null;
}

export interface DisputeEventDto {
  action: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_name: string;
  created_at: string | null;
}

export interface DisputeDetailDto {
  summary: DisputeSummaryDto;
  description: string;
  seller_response: string | null;
  responded_at: string | null;
  seller_charge: number | null;
  resolution_note: string | null;
  devolution_id: number | null;
  resolved_at: string | null;
  resolved_by: string | null;
  order_total: number;
  order_state: string;
  lock_version: number;
  created_by_name: string | null;
  /** RESPOND, RESOLVE, CANCEL: lo que el usuario puede hacer ahora (lo decide draco). */
  actions: string[];
  events: DisputeEventDto[];
}

export interface DisputeStatsDto {
  open: number;
  overdue: number;
  awaiting_decision: number;
  resolved_buyer30: number;
  resolved_seller30: number;
  charged30: number;
}

export interface OrderDisputeDto {
  id: number;
  number: string | null;
  status: DisputeStatus;
}

export interface OpenDisputeRequest {
  order_id: number;
  reason: DisputeReason;
  description: string;
  claimed_amount?: number | null;
}

export interface ResolveDisputeRequest {
  resolution: DisputeResolution;
  amount?: number | null;
  seller_charge?: number | null;
  note: string;
  devolution_id?: number | null;
  lock_version: number;
}
