/** @format */

export type {
  ConsignmentDocumentDto as IConsignmentDocument,
  ConsignmentDocumentKind,
  ConsignmentMovementDto as IConsignmentMovement,
  ConsignmentMovementKind,
  ConsignmentOptionsDto as IConsignmentOptions,
  ConsignmentStatsDto as IConsignmentStats,
  ConsignmentStockRowDto as IConsignmentStockRow,
} from "@/server/domains/marketplace/consignment/types";

export const CONSIGNMENT_HREF = "/marketplace/consignment";
export const CONSIGNMENT_DOCUMENTS_HREF = "/marketplace/consignment/documents";
export const CONSIGNMENT_MOVEMENTS_HREF = "/marketplace/consignment/movements";

export const CONSIGNMENT_DOCUMENT_KINDS = ["RECEIPT", "RETURN_TO_SELLER", "ADJUSTMENT"] as const;
export const CONSIGNMENT_MOVEMENT_KINDS = ["RECEIPT", "RETURN_TO_SELLER", "ADJUSTMENT", "SALE", "SALE_CANCEL", "CUSTOMER_RETURN"] as const;
