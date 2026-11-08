import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type {
  AdjustmentRequest,
  BillingSummaryDto,
  CommissionDto,
  FeeRunDto,
  SellerAccountDto,
  SellerPaymentRequest,
  AssignPlanRequest,
  AssignmentDto,
  OfferDetailDto,
  OfferEventDto,
  OfferStatsDto,
  OfferSummaryDto,
  SaveOfferRequest,
  SellerOptionDto,
  DocumentDto,
  PlanDto,
  PlanEventDto,
  SavePlanRequest,
  SaveSellerRequest,
  SellerDetailDto,
  SellerEventDto,
  SellerStatsDto,
  SellerSummaryDto,
  SimulationDto,
  SimulationRequest,
} from './types';

const SELLERS = '/api/shop/marketplace/sellers';
const PLANS = '/api/shop/marketplace/plans';
const OFFERS = '/api/shop/marketplace/offers';
const BILLING = '/api/shop/marketplace/billing';

/**
 * Sin caché compartida (`revalidate: 0`): los datos dependen de la empresa y los permisos del
 * token de cada usuario, así que no se guardan en la caché de datos de Next entre usuarios.
 */
const NO_CACHE = { revalidate: 0 } as const;

export const marketplace_repository = {
  // ── Vendedores ──────────────────────────────────────────────────────────
  async search_sellers(query: GridQuery): Promise<PageResult<SellerSummaryDto>> {
    const response = await server_fetch.get<unknown>(`${SELLERS}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<SellerSummaryDto>(response, query.size);
  },
  lookup_sellers: (q: string, kind?: string) =>
    server_fetch.get<SellerOptionDto[]>(`${SELLERS}/lookup`, { ...NO_CACHE, params: { q, kind } }),
  seller_stats: () => server_fetch.get<SellerStatsDto>(`${SELLERS}/stats`, NO_CACHE),
  get_seller: (id: number) => server_fetch.get<SellerDetailDto>(`${SELLERS}/${id}`, NO_CACHE),
  seller_events: (id: number) => server_fetch.get<SellerEventDto[]>(`${SELLERS}/${id}/events`, NO_CACHE),
  create_seller: (payload: SaveSellerRequest) => server_fetch.post<SellerDetailDto>(SELLERS, payload, NO_CACHE),
  update_seller: (id: number, payload: SaveSellerRequest) => server_fetch.put<SellerDetailDto>(`${SELLERS}/${id}`, payload, NO_CACHE),
  transition_seller: (id: number, payload: { action: string; reason?: string; version: number }) =>
    server_fetch.post<SellerDetailDto>(`${SELLERS}/${id}/transitions`, payload, NO_CACHE),
  upload_document: (id: number, form: FormData) => server_fetch.upload<DocumentDto>(`${SELLERS}/${id}/documents`, form),
  review_document: (id: number, documentId: number, payload: { status: string; note?: string }) =>
    server_fetch.post<DocumentDto>(`${SELLERS}/${id}/documents/${documentId}/review`, payload, NO_CACHE),
  document_file: (id: number, documentId: number, signal?: AbortSignal) =>
    server_fetch.raw(`${SELLERS}/${id}/documents/${documentId}/file`, signal),
  assign_plan: (id: number, payload: AssignPlanRequest) => server_fetch.post<AssignmentDto>(`${SELLERS}/${id}/plans`, payload, NO_CACHE),
  cancel_assignment: (id: number, assignmentId: number, reason: string) =>
    server_fetch.post<void>(`${SELLERS}/${id}/plans/${assignmentId}/cancel`, { reason }, NO_CACHE),

  // ── Planes ──────────────────────────────────────────────────────────────
  async search_plans(query: GridQuery): Promise<PageResult<PlanDto>> {
    const response = await server_fetch.get<unknown>(`${PLANS}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<PlanDto>(response, query.size);
  },
  assignable_plans: (q: string) => server_fetch.get<PlanDto[]>(`${PLANS}/assignable`, { ...NO_CACHE, params: { q } }),
  get_plan: (id: number) => server_fetch.get<PlanDto>(`${PLANS}/${id}`, NO_CACHE),
  plan_events: (id: number) => server_fetch.get<PlanEventDto[]>(`${PLANS}/${id}/events`, NO_CACHE),
  create_plan: (payload: SavePlanRequest) => server_fetch.post<PlanDto>(PLANS, payload, NO_CACHE),
  update_plan: (id: number, payload: SavePlanRequest) => server_fetch.put<PlanDto>(`${PLANS}/${id}`, payload, NO_CACHE),
  plan_command: (id: number, command: 'publish' | 'versions' | 'retire', lock_version: number) =>
    server_fetch.post<PlanDto>(`${PLANS}/${id}/${command}`, { lock_version }, NO_CACHE),
  // ── Ofertas ─────────────────────────────────────────────────────────────
  async search_offers(query: GridQuery): Promise<PageResult<OfferSummaryDto>> {
    const response = await server_fetch.get<unknown>(`${OFFERS}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<OfferSummaryDto>(response, query.size);
  },
  offer_stats: (seller_id?: number) =>
    server_fetch.get<OfferStatsDto>(`${OFFERS}/stats`, { ...NO_CACHE, params: { sellerId: seller_id } }),
  get_offer: (id: number) => server_fetch.get<OfferDetailDto>(`${OFFERS}/${id}`, NO_CACHE),
  offer_events: (id: number) => server_fetch.get<OfferEventDto[]>(`${OFFERS}/${id}/events`, NO_CACHE),
  create_offer: (payload: SaveOfferRequest) => server_fetch.post<OfferDetailDto>(OFFERS, payload, NO_CACHE),
  update_offer: (id: number, payload: SaveOfferRequest) => server_fetch.put<OfferDetailDto>(`${OFFERS}/${id}`, payload, NO_CACHE),
  transition_offer: (id: number, payload: { action: string; reason?: string; lock_version: number }) =>
    server_fetch.post<OfferDetailDto>(`${OFFERS}/${id}/transitions`, payload, NO_CACHE),

  // ── Comisiones y estado de cuenta ─────────────────────────────────────────
  async search_commissions(query: GridQuery): Promise<PageResult<CommissionDto>> {
    const response = await server_fetch.get<unknown>(`${BILLING}/commissions/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<CommissionDto>(response, query.size);
  },
  recalculate_commission: (id: number) =>
    server_fetch.post<CommissionDto>(`${BILLING}/commissions/${id}/recalculate`, {}, NO_CACHE),
  billing_summary: () => server_fetch.get<BillingSummaryDto>(`${BILLING}/summary`, NO_CACHE),
  accrue_due: () => server_fetch.post<{ accrued: number }>(`${BILLING}/accrue`, {}, NO_CACHE),
  generate_fees: (cycle: string) => server_fetch.post<FeeRunDto>(`${BILLING}/fees/${encodeURIComponent(cycle)}`, {}, NO_CACHE),
  seller_account: (id: number, as_of?: string) =>
    server_fetch.get<SellerAccountDto>(`${SELLERS}/${id}/account`, { ...NO_CACHE, params: { asOf: as_of } }),
  register_seller_payment: (id: number, payload: SellerPaymentRequest) =>
    server_fetch.post<SellerAccountDto>(`${SELLERS}/${id}/account/payments`, payload, NO_CACHE),
  /** Liquidación al vendedor (la tienda le paga lo cobrado en consignación). */
  register_seller_settlement: (id: number, payload: SellerPaymentRequest) =>
    server_fetch.post<SellerAccountDto>(`${SELLERS}/${id}/account/settlements`, payload, NO_CACHE),
  adjust_seller_account: (id: number, payload: AdjustmentRequest) =>
    server_fetch.post<SellerAccountDto>(`${SELLERS}/${id}/account/adjustments`, payload, NO_CACHE),

  simulate: (id: number, payload: SimulationRequest) => server_fetch.post<SimulationDto>(`${PLANS}/${id}/simulate`, payload, NO_CACHE),
};
