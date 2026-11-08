/** @format */

import type {
  AssignmentDto,
  ContactDto,
  DocumentDto,
  PlanDto,
  SellerDetailDto,
  SellerEventDto,
  SellerStatsDto,
  SellerSummaryDto,
  SimulationDto,
  TermsDto,
} from "@/server/domains/marketplace/types";

export type ISellerSummary = SellerSummaryDto;
export type ISellerDetail = SellerDetailDto;
export type ISellerStats = SellerStatsDto;
export type ISellerEvent = SellerEventDto;
export type ISellerContact = ContactDto;
export type ISellerDocument = DocumentDto;
export type IAssignment = AssignmentDto;
export type IPlan = PlanDto;
export type IPlanTerms = TermsDto;
export type ISimulation = SimulationDto;

export const SELLERS_HREF = "/marketplace/sellers";
export const PLANS_HREF = "/marketplace/plans";

export const SELLER_STATUSES = ["DRAFT", "IN_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SUSPENDED", "CLOSED"] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];
export const SELLER_KINDS = ["EXTERNAL", "OWN"] as const;
export const SELLER_DOC_TYPES = ["NIT", "CC", "CE", "PP"] as const;
export const SELLER_ACTIONS = ["SUBMIT", "REQUEST_CHANGES", "APPROVE", "SUSPEND", "REACTIVATE", "CLOSE"] as const;
export type SellerAction = (typeof SELLER_ACTIONS)[number];
/** Acciones que exigen motivo (igual que SellerWorkflow en draco). */
export const REASON_REQUIRED: readonly SellerAction[] = ["REQUEST_CHANGES", "SUSPEND", "REACTIVATE", "CLOSE"];
export const DOCUMENT_KINDS = ["RUT", "CAMARA_COMERCIO", "CEDULA_REPRESENTANTE", "CERTIFICACION_BANCARIA", "OTRO"] as const;
export const DOCUMENT_REVIEWS = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export const ASSIGNMENT_STATES = ["CURRENT", "SCHEDULED", "ENDED", "CANCELLED"] as const;

export const PLAN_STATUSES = ["DRAFT", "ACTIVE", "SUPERSEDED", "RETIRED"] as const;
export const PLAN_MODALITIES = ["COMMISSION", "SUBSCRIPTION", "MIXED"] as const;
export type PlanModality = (typeof PLAN_MODALITIES)[number];
export const COMMISSION_BASES = ["ITEMS_NET_OF_DISCOUNTS", "ITEMS_GROSS"] as const;
export const ACCRUAL_EVENTS = ["PAYMENT_CONFIRMED", "ORDER_DELIVERED", "RETURN_WINDOW_CLOSED"] as const;
export const REFUND_POLICIES = ["REVERSE_PROPORTIONAL", "KEEP_FIXED_FEE", "NO_REVERSAL"] as const;
export const FEE_BILLINGS = ["IN_ADVANCE", "IN_ARREARS"] as const;
export const PLAN_CURRENCIES = ["COP", "USD"] as const;

export { MARKETPLACE_PERMISSIONS, accessFrom, type IMarketplaceAccess } from "@/server/domains/marketplace/types";

export const pick = <T extends string>(list: readonly T[], value: string | null | undefined, fallback: T): T =>
  (list as readonly string[]).includes(value ?? "") ? (value as T) : fallback;

/** Importe con su moneda explícita (COP sin decimales visibles si son .00). */
export const formatCurrency = (value: number | null | undefined, currency: string) => {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 2 })
      .format(Number(value))
      .replace(/[  ]/g, " ");
  } catch {
    return `${currency} ${value}`;
  }
};

export const formatPercent = (value: number | null | undefined) =>
  value == null ? "—" : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(Number(value))} %`;

// ── Ofertas (fase 2) ─────────────────────────────────────────────────────────

export type {
  OfferDetailDto as IOfferDetail,
  OfferEventDto as IOfferEvent,
  OfferStatsDto as IOfferStats,
  OfferSummaryDto as IOfferSummary,
  SellerOptionDto as ISellerOption,
} from "@/server/domains/marketplace/types";

export const OFFERS_HREF = "/marketplace/offers";
export const OFFER_STATUSES = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "PAUSED", "CLOSED"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export const OFFER_ACTIONS = ["SUBMIT", "APPROVE", "REJECT", "PAUSE", "RESUME", "CLOSE"] as const;
export type OfferAction = (typeof OFFER_ACTIONS)[number];
/** Acciones que exigen motivo (igual que OfferWorkflow en draco). */
export const OFFER_REASON_REQUIRED: readonly OfferAction[] = ["REJECT", "CLOSE"];
export const OFFER_CONDITIONS = ["NEW", "USED", "REFURBISHED"] as const;

// ── Comisiones y estado de cuenta (fase 4) ──────────────────────────────────

export type {
  BillingSummaryDto as IBillingSummary,
  CommissionDto as ICommission,
  FeeRunDto as IFeeRun,
  LedgerEntryDto as ILedgerEntry,
  SellerAccountDto as ISellerAccount,
} from "@/server/domains/marketplace/types";

export const BILLING_HREF = "/marketplace/billing";
export const COMMISSION_STATUSES = ["PENDING", "ACCRUED", "VOIDED", "REVIEW"] as const;
export const LEDGER_TYPES = ["COMMISSION", "COMMISSION_REVERSAL", "MONTHLY_FEE", "PAYMENT", "ADJUSTMENT"] as const;

/** Clave de operación para que un doble clic o un reintento no registre dos veces lo mismo. */
export const operationKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
