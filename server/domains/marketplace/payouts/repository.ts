import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import type {
  BankAccountDto,
  BankDto,
  SaveBankRequest,
  CreatePayoutBatchRequest,
  PayoutBatchDetailDto,
  PayoutBatchSummaryDto,
  PayoutPayRequest,
  PayoutExportFile,
  PayoutFormatDto,
  PayoutLayoutDto,
  PayoutPreviewDto,
  SaveBankAccountRequest,
  SavePayoutFormatRequest,
  BankMatchDto,
} from './types';

const BASE = '/api/shop/marketplace/payouts';
/** Sin caché: depende de la empresa y los permisos del token, y cambia con cada pago. */
const NO_CACHE = { revalidate: 0 } as const;

export const payouts_repository = {
  preview: () => server_fetch.get<PayoutPreviewDto>(`${BASE}/preview`, NO_CACHE),
  async recent(): Promise<PayoutBatchSummaryDto[]> {
    const response = await server_fetch.get<{ content?: PayoutBatchSummaryDto[] }>(`${BASE}/search?page=0&size=30`, NO_CACHE);
    return response?.content ?? [];
  },
  get: (id: number) => server_fetch.get<PayoutBatchDetailDto>(`${BASE}/${id}`, NO_CACHE),
  create: (payload: CreatePayoutBatchRequest) => server_fetch.post<PayoutBatchDetailDto>(BASE, payload, NO_CACHE),
  pay_all: (id: number, payload: PayoutPayRequest) => server_fetch.post<PayoutBatchDetailDto>(`${BASE}/${id}/pay`, payload, NO_CACHE),
  pay: (id: number, itemId: number, payload: PayoutPayRequest) =>
    server_fetch.post<PayoutBatchDetailDto>(`${BASE}/${id}/items/${itemId}/pay`, payload, NO_CACHE),
  reject: (id: number, itemId: number, reason: string) =>
    server_fetch.post<PayoutBatchDetailDto>(`${BASE}/${id}/items/${itemId}/reject`, { reason }, NO_CACHE),
  cancel: (id: number, reason: string) => server_fetch.post<PayoutBatchDetailDto>(`${BASE}/${id}/cancel`, { reason }, NO_CACHE),
  /** format 0/vacío = genérico; date = fecha de aplicación (yyyy-MM-dd). */
  async export_file(id: number, format?: number | null, date?: string | null): Promise<PayoutExportFile> {
    const params = new URLSearchParams();
    if (format) params.set('format', String(format));
    if (date) params.set('date', date);
    const response = await server_fetch.raw(`${BASE}/${id}/export${params.size ? `?${params}` : ''}`);
    const disposition = response.headers.get('content-disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      file_name: match?.[1] ?? `lote-${id}.txt`,
      content_type: response.headers.get('content-type') ?? 'text/plain',
      base64: buffer.toString('base64'),
    };
  },
  formats: (all = false) => server_fetch.get<PayoutFormatDto[]>(`${BASE}/formats?all=${all}`, NO_CACHE),
  save_format: (id: number | null, payload: SavePayoutFormatRequest) =>
    id == null
      ? server_fetch.post<PayoutFormatDto>(`${BASE}/formats`, payload, NO_CACHE)
      : server_fetch.put<PayoutFormatDto>(`${BASE}/formats/${id}`, payload, NO_CACHE),
  preview_format: (layout: PayoutLayoutDto) => server_fetch.post<{ content: string }>(`${BASE}/formats/preview`, { layout }, NO_CACHE),
  /** Activas; con all=true también las inactivas (draco exige COMISIONES.GESTIONAR para verlas). */
  banks: (all = false) => server_fetch.get<BankDto[]>(`${BASE}/banks?all=${all}`, NO_CACHE),
  /** Envía los pagos pendientes a la dispersión automática (draco exige COMISIONES.GESTIONAR). */
  dispatch: (id: number) => server_fetch.post<PayoutBatchDetailDto>(`${BASE}/${id}/dispatch`, {}, NO_CACHE),
  sync: (id: number) => server_fetch.post<PayoutBatchDetailDto>(`${BASE}/${id}/sync`, {}, NO_CACHE),
  match_provider_banks: () => server_fetch.post<BankMatchDto>(`${BASE}/banks/provider/match`, {}, NO_CACHE),
  create_bank: (payload: SaveBankRequest) => server_fetch.post<BankDto>(`${BASE}/banks`, payload, NO_CACHE),
  update_bank: (id: number, payload: SaveBankRequest) => server_fetch.put<BankDto>(`${BASE}/banks/${id}`, payload, NO_CACHE),
  /** null si el vendedor no tiene cuenta (204). */
  async bank_account(sellerId: number): Promise<BankAccountDto | null> {
    const result = await server_fetch.get<BankAccountDto | null | ''>(`${BASE}/sellers/${sellerId}/bank-account`, NO_CACHE);
    return result && typeof result === 'object' ? result : null;
  },
  save_bank_account: (sellerId: number, payload: SaveBankAccountRequest) =>
    server_fetch.put<BankAccountDto>(`${BASE}/sellers/${sellerId}/bank-account`, payload, NO_CACHE),
};
