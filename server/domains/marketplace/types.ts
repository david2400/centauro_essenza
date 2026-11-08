/**
 * Contratos del API de marketplace de draco (`/api/shop/marketplace/...`), en snake_case.
 * Escritos a mano a partir de SellerDtos / PlanDtos; al regenerar `essenza-openapi-types.ts`
 * se pueden reemplazar por `components['schemas'][...]`.
 */

export interface ContactDto {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  primary: boolean;
}

export interface SaveSellerRequest {
  code?: string;
  kind: string;
  legal_name: string;
  trade_name?: string;
  doc_type: string;
  doc_number: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  description?: string;
  account_manager_id?: string;
  account_manager_name?: string;
  contacts: ContactDto[];
  version?: number;
}

export interface SellerSummaryDto {
  id: number;
  code: string | null;
  kind: string;
  legal_name: string;
  trade_name: string | null;
  doc_type: string;
  doc_number: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  account_manager_name: string | null;
  current_plan_code: string | null;
  current_plan_name: string | null;
  current_plan_version: number | null;
  scheduled_plan_starts_on: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SellerStatsDto {
  total: number;
  draft: number;
  in_review: number;
  changes_requested: number;
  approved: number;
  suspended: number;
  closed: number;
  external: number;
  own: number;
}

export interface DocumentDto {
  id: number;
  kind: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  review_status: string;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  superseded: boolean;
  uploaded_at: string | null;
  uploaded_by: string | null;
}

export interface TermsDto {
  modality: string;
  currency: string;
  monthly_fee: number;
  commission_percent: number;
  fixed_fee_per_sale: number;
  commission_base: string;
  include_shipping: boolean;
  include_taxes: boolean;
  accrual_event: string;
  return_window_days: number;
  refund_policy: string;
  fee_billing: string;
  grace_days: number;
  late_interest_monthly_percent: number;
  /** Almacenamiento de la consignación por unidad y día (null en condiciones anteriores = sin cobro). */
  storage_fee_per_unit_day: number | null;
}

export interface AssignmentDto {
  id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  plan_version: number;
  starts_on: string;
  ends_on: string | null;
  state: string;
  override_commission_percent: number | null;
  override_monthly_fee: number | null;
  override_reason: string | null;
  override_approved_by: string | null;
  agreed_terms: TermsDto | null;
  notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface SellerDetailDto {
  id: number;
  code: string | null;
  kind: string;
  legal_name: string;
  trade_name: string | null;
  doc_type: string;
  doc_number: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  account_manager_id: string | null;
  account_manager_name: string | null;
  contacts: ContactDto[];
  status: string;
  status_reason: string | null;
  status_changed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  version: number;
  readiness: { for_submit: string[]; for_approval: string[] };
  allowed_actions: string[];
  required_documents: string[];
  documents: DocumentDto[];
  assignments: AssignmentDto[];
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface SellerEventDto {
  id: number;
  type: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  detail: string | null;
  actor_id: string;
  actor_name: string | null;
  created_at: string | null;
}

export interface SavePlanRequest {
  code?: string;
  name: string;
  description?: string;
  modality: string;
  currency: string;
  monthly_fee?: number;
  commission_percent?: number;
  fixed_fee_per_sale?: number;
  commission_base?: string;
  include_shipping?: boolean;
  include_taxes?: boolean;
  accrual_event?: string;
  return_window_days?: number;
  refund_policy?: string;
  fee_billing?: string;
  grace_days?: number;
  late_interest_monthly_percent?: number;
  storage_fee_per_unit_day?: number;
  valid_from?: string;
  valid_to?: string;
  lock_version?: number;
}

export interface PlanDto {
  id: number;
  code: string;
  version: number;
  name: string;
  description: string | null;
  status: string;
  terms: TermsDto;
  valid_from: string;
  valid_to: string | null;
  open_assignments: number;
  published_at: string | null;
  published_by: string | null;
  lock_version: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface PlanEventDto {
  id: number;
  type: string;
  detail: string | null;
  actor_id: string;
  actor_name: string | null;
  created_at: string | null;
}

export interface SimulationRequest {
  items_subtotal?: number;
  discount?: number;
  shipping?: number;
  taxes?: number;
  sales_per_month?: number;
  override_commission_percent?: number;
  override_monthly_fee?: number;
}

export interface SimulationDto {
  simulation: boolean;
  notice: string;
  currency: string;
  sales_count: number;
  commission_base_per_sale: number;
  percent_part_per_sale: number;
  fixed_part_per_sale: number;
  commission_per_sale: number;
  gross_sales: number;
  commission_total: number;
  monthly_fee: number;
  platform_total: number;
  seller_net: number;
  effective_rate_percent: number;
}

export interface AssignPlanRequest {
  plan_id: number;
  starts_on?: string;
  override_commission_percent?: number;
  override_monthly_fee?: number;
  override_reason?: string;
  notes?: string;
}

/** Permisos de access_control que usa el panel solo para mostrar u ocultar acciones (el backend decide). */
export const MARKETPLACE_PERMISSIONS = {
  sellersView: 'VENDEDORES.VER',
  sellersManage: 'VENDEDORES.GESTIONAR',
  sellersApprove: 'VENDEDORES.APROBAR',
  plansView: 'PLANES.VER',
  plansManage: 'PLANES.GESTIONAR',
  plansAssign: 'PLANES.ASIGNAR',
  plansExceptions: 'PLANES.EXCEPCIONES',
  offersView: 'OFERTAS.VER',
  offersManage: 'OFERTAS.GESTIONAR',
  offersModerate: 'OFERTAS.MODERAR',
  billingView: 'COMISIONES.VER',
  billingManage: 'COMISIONES.GESTIONAR',
  billingAdjust: 'COMISIONES.AJUSTAR',
  consignmentView: 'CONSIGNACION.VER',
  consignmentManage: 'CONSIGNACION.GESTIONAR',
  disputesView: 'DISPUTAS.VER',
  disputesManage: 'DISPUTAS.GESTIONAR',
  disputesResolve: 'DISPUTAS.RESOLVER',
} as const;

export interface IMarketplaceAccess {
  sellersManage: boolean;
  sellersApprove: boolean;
  plansView: boolean;
  plansManage: boolean;
  plansAssign: boolean;
  plansExceptions: boolean;
  offersView: boolean;
  offersManage: boolean;
  offersModerate: boolean;
  billingView: boolean;
  billingManage: boolean;
  billingAdjust: boolean;
  consignmentView: boolean;
  consignmentManage: boolean;
  disputesManage: boolean;
  disputesResolve: boolean;
}

export const accessFrom = (permissions: readonly string[] | null | undefined): IMarketplaceAccess => {
  const has = (permission: string) => (permissions ?? []).includes(permission);
  return {
    sellersManage: has(MARKETPLACE_PERMISSIONS.sellersManage),
    sellersApprove: has(MARKETPLACE_PERMISSIONS.sellersApprove),
    plansView: has(MARKETPLACE_PERMISSIONS.plansView),
    plansManage: has(MARKETPLACE_PERMISSIONS.plansManage),
    plansAssign: has(MARKETPLACE_PERMISSIONS.plansAssign),
    plansExceptions: has(MARKETPLACE_PERMISSIONS.plansExceptions),
    offersView: has(MARKETPLACE_PERMISSIONS.offersView),
    offersManage: has(MARKETPLACE_PERMISSIONS.offersManage),
    offersModerate: has(MARKETPLACE_PERMISSIONS.offersModerate),
    billingView: has(MARKETPLACE_PERMISSIONS.billingView),
    billingManage: has(MARKETPLACE_PERMISSIONS.billingManage),
    billingAdjust: has(MARKETPLACE_PERMISSIONS.billingAdjust),
    consignmentView: has(MARKETPLACE_PERMISSIONS.consignmentView) || has(MARKETPLACE_PERMISSIONS.consignmentManage),
    consignmentManage: has(MARKETPLACE_PERMISSIONS.consignmentManage),
    disputesManage: has(MARKETPLACE_PERMISSIONS.disputesManage),
    disputesResolve: has(MARKETPLACE_PERMISSIONS.disputesResolve),
  };
};


// ── Ofertas (fase 2) ─────────────────────────────────────────────────────────

export interface SaveOfferRequest {
  seller_id?: number;
  sku_id?: number;
  currency?: string;
  price: number;
  available_quantity: number;
  handling_days: number;
  condition: string;
  fulfillment?: string;
  seller_sku?: string;
  lock_version?: number;
}

export interface OfferSummaryDto {
  id: number;
  seller_id: number;
  seller_name: string;
  seller_status: string;
  sku_id: number;
  product_id: number | null;
  sku_code: string | null;
  product_name: string | null;
  currency: string;
  price: number;
  available_quantity: number;
  handling_days: number;
  condition: string;
  status: string;
  published_at: string | null;
  updated_at: string | null;
}

export interface CatalogSkuDto {
  sku_id: number;
  product_id: number | null;
  code: string | null;
  name: string | null;
  catalog_price: number | null;
  catalog_currency: string;
  sellable: boolean;
}

export interface OfferDetailDto {
  id: number;
  seller_id: number;
  seller_name: string;
  seller_status: string;
  sku: CatalogSkuDto;
  currency: string;
  price: number;
  available_quantity: number;
  handling_days: number;
  condition: string;
  fulfillment: string;
  seller_sku: string | null;
  status: string;
  status_reason: string | null;
  status_changed_at: string | null;
  published_at: string | null;
  visible: boolean;
  price_deviation_percent: number | null;
  price_alert: boolean;
  allowed_actions: string[];
  editable_fields: string[];
  lock_version: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface OfferEventDto {
  id: number;
  type: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  detail: string | null;
  actor_id: string;
  actor_name: string | null;
  created_at: string | null;
}

export interface OfferStatsDto {
  total: number;
  draft: number;
  pending_review: number;
  active: number;
  rejected: number;
  paused: number;
  closed: number;
}

export interface SellerOptionDto {
  id: number;
  code: string | null;
  name: string;
  kind: string;
  status: string;
}

// ── Comisiones y estado de cuenta (fase 4) ──────────────────────────────────

export interface CommissionDto {
  id: number;
  seller_id: number;
  seller_name: string;
  order_id: number;
  purchase_id: number | null;
  order_number: string | null;
  plan_code: string | null;
  currency: string;
  base: number;
  percent: number;
  percent_part: number;
  fixed_part: number;
  amount: number;
  reversed_amount: number;
  net: number;
  accrual_event: string | null;
  paid_on: string;
  delivered_on: string | null;
  accrue_on: string | null;
  status: string;
  review_reason: string | null;
  created_at: string | null;
}

export interface BillingSummaryDto {
  commissions: { status: string; count: number; amount: number }[];
  receivable: number;
  sellers_with_balance: number;
}

export interface LedgerEntryDto {
  id: number;
  type: string;
  amount: number;
  currency: string;
  entry_date: string;
  due_on: string | null;
  open: number;
  days_overdue: number;
  reference: string | null;
  commission_id: number | null;
  fee_cycle: string | null;
  note: string | null;
  created_by_name: string | null;
  created_at: string | null;
}

export interface SellerAccountDto {
  seller_id: number;
  seller_name: string;
  currency: string;
  as_of: string;
  charges: number;
  credits: number;
  balance: number;
  overdue: number;
  late_interest_estimate: number;
  unapplied_credit: number;
  pending_commissions: number;
  entries: LedgerEntryDto[];
}

export interface SellerPaymentRequest {
  amount: number;
  date?: string;
  reference: string;
  note?: string;
  key: string;
}

export interface AdjustmentRequest {
  amount: number;
  date?: string;
  reason: string;
  key: string;
}

export interface FeeRunDto {
  cycle: string;
  created: number;
  already_charged: number;
  without_fee: number;
  total: number;
  not_chargeable_yet: string[];
  storage_created: number;
  storage_total: number;
}
