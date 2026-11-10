/** @format */

export type {
  BankAccountDto as IBankAccount,
  BankDto as IBank,
  BankAccountType,
  BankKind,
  PayeeDto as IPayee,
  PayoutBatchDetailDto as IPayoutBatchDetail,
  PayoutBatchSummaryDto as IPayoutBatchSummary,
  PayoutItemDto as IPayoutItem,
  PayoutPreviewDto as IPayoutPreview,
  PayoutBatchStatus,
  PayoutColumnDto as IPayoutColumn,
  PayoutFileField,
  PayoutFormatDto as IPayoutFormat,
  PayoutLayoutDto as IPayoutLayout,
  PayoutItemStatus,
  PayoutDispatchDto as IPayoutDispatch,
  BankMatchDto as IBankMatch,
} from "@/server/domains/marketplace/payouts/types";
export {
  BANK_ACCOUNT_TYPES,
  BANK_KINDS,
  BRE_B_KEY_TYPES,
  HOLDER_DOC_TYPES,
  PAYOUT_FILE_FIELDS,
  PAYOUT_SUMMARY_FIELDS,
} from "@/server/domains/marketplace/payouts/types";

export const PAYOUTS_HREF = "/marketplace/payouts";

export const PAYOUT_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  CLOSED: "outline",
  CANCELLED: "outline",
  PENDING: "secondary",
  PAID: "outline",
  REJECTED: "destructive",
};
