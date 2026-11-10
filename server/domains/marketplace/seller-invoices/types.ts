/** Factura mensual de la plataforma al vendedor (draco /marketplace/billing/seller-invoices). */

export interface SellerInvoiceConceptDto {
  code: 'COMMISSIONS' | 'MONTHLY_FEE' | 'STORAGE' | 'DISPUTES';
  description: string;
  total: number;
}

export interface SellerInvoiceRefDto {
  invoice_id: number;
  number: string | null;
  status: 'PENDING' | 'ISSUED' | 'REJECTED' | 'VOIDED';
  total: number;
  detail: string | null;
  created_at: string | null;
}

export interface SellerPeriodDto {
  seller_id: number;
  seller_name: string;
  doc: string;
  concepts: SellerInvoiceConceptDto[];
  total: number;
  collected: number;
  invoice: SellerInvoiceRefDto | null;
  missing: string[];
}

export interface SellerInvoicePreviewDto {
  period: string;
  closed: boolean;
  total: number;
  to_invoice: number;
  invoiced: number;
  sellers: SellerPeriodDto[];
}

export interface SellerInvoiceIssueResultDto {
  period: string;
  issued: number;
  already_invoiced: number;
  skipped: number;
  errors: string[];
  preview: SellerInvoicePreviewDto;
}
