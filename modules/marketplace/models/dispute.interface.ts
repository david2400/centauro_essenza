/** @format */

export type {
  DisputeDetailDto as IDisputeDetail,
  DisputeReason,
  DisputeResolution,
  DisputeStatsDto as IDisputeStats,
  DisputeStatus,
  DisputeSummaryDto as IDisputeSummary,
  OrderDisputeDto as IOrderDispute,
} from "@/server/domains/marketplace/disputes/types";

export const DISPUTES_HREF = "/marketplace/disputes";
export const DISPUTE_STATUSES = ["OPEN", "SELLER_RESPONDED", "RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"] as const;
export const DISPUTE_FILTERS = ["ACTIVE", "OVERDUE", ...DISPUTE_STATUSES] as const;
export const DISPUTE_REASONS = ["NOT_RECEIVED", "DEFECTIVE", "NOT_AS_DESCRIBED", "WRONG_ITEM", "OTHER"] as const;
export const DISPUTE_RESOLUTIONS = ["REFUND", "REPLACEMENT", "REJECTED"] as const;

export const DISPUTE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  SELLER_RESPONDED: "secondary",
  RESOLVED_BUYER: "outline",
  RESOLVED_SELLER: "outline",
  CANCELLED: "outline",
};
