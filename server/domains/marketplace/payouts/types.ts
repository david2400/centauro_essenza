/** Pagos a vendedores por lote (draco /marketplace/payouts). Tipos escritos a mano hasta regenerar el OpenAPI. */

export type PayoutBatchStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type PayoutItemStatus = 'PENDING' | 'PAID' | 'REJECTED';
export const BANK_ACCOUNT_TYPES = ['SAVINGS', 'CHECKING', 'DIGITAL_WALLET', 'BRE_B_KEY'] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];
/** Llaves Bre-B (pagos inmediatos del Banco de la República). */
export const BRE_B_KEY_TYPES = ['PHONE', 'DOCUMENT', 'EMAIL', 'ALPHANUMERIC', 'MERCHANT_CODE'] as const;
export const BANK_KINDS = ['BANK', 'DIGITAL_BANK', 'WALLET', 'COOPERATIVE', 'FINANCIAL'] as const;
export type BankKind = (typeof BANK_KINDS)[number];

/** Entidad del catálogo. ach_code: código de banco que pide el archivo del banco pagador (opcional). */
export interface BankDto {
  id: number;
  code: string;
  name: string;
  kind: BankKind;
  ach_code: string | null;
  active: boolean;
  position: number;
  account_types: BankAccountType[];
  /** Id de la entidad en Wompi Pagos a terceros (para la dispersión automática). */
  wompi_bank_id: string | null;
}

export interface SaveBankRequest {
  code?: string | null;
  name?: string | null;
  kind?: BankKind | null;
  ach_code?: string | null;
  active?: boolean | null;
  position?: number | null;
  /** Vacío = quitarlo; null/ausente = no cambiarlo. */
  wompi_bank_id?: string | null;
}
export const HOLDER_DOC_TYPES = ['NIT', 'CC', 'CE', 'PP', 'TI'] as const;

export interface BankAccountDto {
  bank_id: number | null;
  bank_code: string | null;
  bank_name: string;
  account_type: BankAccountType;
  key_type: string | null;
  account_number: string;
  holder_name: string;
  holder_doc_type: string;
  holder_doc_number: string;
  masked: boolean;
  updated_by_name: string | null;
  updated_at: string | null;
}

export interface SaveBankAccountRequest {
  bank_id: number | null;
  account_type: string;
  account_number: string;
  key_type: string | null;
  holder_name: string;
  holder_doc_type: string;
  holder_doc_number: string;
}

export interface PayeeDto {
  seller_id: number;
  seller_name: string;
  seller_doc: string | null;
  owed: number;
  held: number;
  payable: number;
  bank_account: BankAccountDto | null;
  pending_batch_id: number | null;
  pending_batch_number: string | null;
}

export interface PayoutPreviewDto {
  hold_days: number;
  released_through: string;
  total_owed: number;
  total_payable: number;
  payees: PayeeDto[];
}

export interface PayoutItemDto {
  id: number;
  seller_id: number;
  seller_name: string | null;
  seller_doc: string | null;
  amount: number;
  currency: string;
  bank_name: string;
  bank_code: string | null;
  account_type: string;
  key_type: string | null;
  account_number: string;
  holder_name: string;
  holder_doc_type: string;
  holder_doc_number: string;
  status: PayoutItemStatus;
  reference: string | null;
  paid_on: string | null;
  note: string | null;
  actor_name: string | null;
  updated_at: string | null;
  /** Estado del pago en el proveedor de dispersión (APPROVED, PROCESSING, FAILED…). */
  provider_status: string | null;
  provider_detail: string | null;
}

export interface PayoutBatchSummaryDto {
  id: number;
  number: string | null;
  status: PayoutBatchStatus;
  items: number;
  pending: number;
  paid: number;
  total: number;
  paid_total: number;
  created_by_name: string | null;
  created_at: string | null;
  closed_at: string | null;
}

export interface PayoutBatchDetailDto {
  summary: PayoutBatchSummaryDto;
  hold_days: number;
  note: string | null;
  status_reason: string | null;
  items: PayoutItemDto[];
  actions: ('PAY' | 'REJECT' | 'CANCEL' | 'EXPORT' | 'DISPATCH' | 'SYNC')[];
  /** null si el servidor no tiene proveedor de dispersión. */
  dispatch: PayoutDispatchDto | null;
}

export type PayoutDispatchStatus = 'SENT' | 'FAILED' | 'DONE';

/** Dispersión automática del lote (Wompi Pagos a terceros). */
export interface PayoutDispatchDto {
  provider: string;
  environment: 'sandbox' | 'production';
  configured: boolean;
  status: PayoutDispatchStatus | null;
  provider_batch_id: string | null;
  detail: string | null;
  dispatched_at: string | null;
  /** Qué le falta a cada pago para enviarlo. */
  problems: string[];
}

export interface ProviderBankDto {
  id: string;
  name: string | null;
  code: string | null;
  linked_bank_id: number | null;
}

export interface BankMatchDto {
  matched: number;
  unmatched: string[];
  provider_banks: ProviderBankDto[];
}

export interface CreatePayoutBatchRequest {
  items: { seller_id: number; amount?: number | null }[];
  note?: string | null;
}

export interface PayoutPayRequest {
  reference: string;
  paid_on?: string | null;
  note?: string | null;
}

// ── Formatos del archivo de pagos (banco pagador) ──

export const PAYOUT_FILE_FIELDS = [
  'CONSTANT', 'BATCH_NUMBER', 'PAYMENT_DATE', 'TOTAL_AMOUNT', 'COUNT', 'SEQUENCE', 'REFERENCE', 'SELLER_NAME', 'SELLER_DOC', 'HOLDER_NAME',
  'HOLDER_DOC_TYPE', 'HOLDER_DOC_NUMBER', 'BANK_NAME', 'BANK_CODE', 'ACCOUNT_TYPE', 'KEY_TYPE', 'ACCOUNT_NUMBER', 'AMOUNT', 'CURRENCY',
] as const;
export type PayoutFileField = (typeof PAYOUT_FILE_FIELDS)[number];
/** Datos que admiten el encabezado y el control (totales, fecha, lote y constantes). */
export const PAYOUT_SUMMARY_FIELDS: PayoutFileField[] = ['CONSTANT', 'BATCH_NUMBER', 'PAYMENT_DATE', 'TOTAL_AMOUNT', 'COUNT'];

export interface PayoutColumnDto {
  field: PayoutFileField;
  title?: string | null;
  width?: number | null;
  align?: 'LEFT' | 'RIGHT' | null;
  pad?: ' ' | '0' | null;
  value?: string | null;
}

export interface PayoutLayoutDto {
  type: 'DELIMITED' | 'FIXED';
  delimiter?: string | null;
  title_row?: boolean | null;
  line_ending?: 'CRLF' | 'LF' | null;
  amount_decimals?: number | null;
  amount_separator?: string | null;
  date_pattern?: string | null;
  ascii_only?: boolean | null;
  account_type_codes?: Record<string, string> | null;
  key_type_codes?: Record<string, string> | null;
  doc_type_codes?: Record<string, string> | null;
  header?: PayoutColumnDto[] | null;
  detail: PayoutColumnDto[];
  footer?: PayoutColumnDto[] | null;
}

export interface PayoutFormatDto {
  id: number;
  name: string;
  extension: 'csv' | 'txt' | 'prn' | 'dat';
  encoding: 'UTF-8' | 'ISO-8859-1' | 'windows-1252';
  active: boolean;
  built_in: boolean;
  layout: PayoutLayoutDto;
  updated_by_name: string | null;
  updated_at: string | null;
}

export interface SavePayoutFormatRequest {
  name: string;
  extension: string;
  encoding: string;
  active?: boolean | null;
  layout: PayoutLayoutDto;
}

/** Archivo descargado (base64 para conservar la codificación que pide el banco). */
export interface PayoutExportFile {
  file_name: string;
  content_type: string;
  base64: string;
}
