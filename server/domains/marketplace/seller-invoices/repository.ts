import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import type { SellerInvoiceIssueResultDto, SellerInvoicePreviewDto } from './types';

const BASE = '/api/shop/marketplace/billing/seller-invoices';
const NO_CACHE = { revalidate: 0 } as const;

export const seller_invoices_repository = {
  preview: (period: string) => server_fetch.get<SellerInvoicePreviewDto>(`${BASE}?period=${encodeURIComponent(period)}`, NO_CACHE),
  issue: (period: string, seller_ids: number[] | null) =>
    server_fetch.post<SellerInvoiceIssueResultDto>(BASE, { period, seller_ids }, NO_CACHE),
};
