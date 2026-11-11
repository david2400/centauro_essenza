import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_list } from '@/server/lib/list-response';
import { cash_tags } from '@/server/lib/cache-tags';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type {
  CashMovementDto,
  CashRegisterDto,
  CashierDto,
  CashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  OpenCashSessionDto,
  PosCheckoutDto,
  PosCheckoutResultDto,
  SaveCashRegisterDto,
  SaveStoreDto,
  StoreDto,
} from './types';

const stores_path = '/api/shop/sales/stores';
const registers_path = '/api/shop/sales/cash_registers';
const sessions_path = '/api/shop/sales/cash_sessions';

export const cash_repository = {
  async list_stores(include_inactive = true): Promise<StoreDto[]> {
    const response = await server_fetch.get<unknown>(`${stores_path}?includeInactive=${include_inactive}`, {
      revalidate: 0,
      tags: [cash_tags.stores()],
    });
    return to_list<StoreDto>(response);
  },
  async create_store(payload: SaveStoreDto): Promise<StoreDto> {
    return server_fetch.post<StoreDto>(stores_path, payload, { revalidate: false });
  },
  async update_store(id: number, payload: SaveStoreDto): Promise<StoreDto> {
    return server_fetch.put<StoreDto>(`${stores_path}/${id}`, payload, { revalidate: false });
  },
  async delete_store(id: number): Promise<void> {
    return server_fetch.delete<void>(`${stores_path}/${id}`, { revalidate: false });
  },
  async list_cash_registers(include_inactive = true): Promise<CashRegisterDto[]> {
    const response = await server_fetch.get<unknown>(`${registers_path}?includeInactive=${include_inactive}`, {
      revalidate: 0,
      tags: [cash_tags.registers()],
    });
    return to_list<CashRegisterDto>(response);
  },
  /** Quién puede abrir un turno: el usuario de la sesión primero y los usuarios de la empresa en access_control. */
  async list_cashiers(): Promise<CashierDto[]> {
    const response = await server_fetch.get<unknown>(`${registers_path}/cashiers`, { revalidate: 0 });
    return to_list<CashierDto>(response);
  },
  async create_cash_register(payload: SaveCashRegisterDto): Promise<CashRegisterDto> {
    return server_fetch.post<CashRegisterDto>(registers_path, payload, { revalidate: false });
  },
  async update_cash_register(id: number, payload: SaveCashRegisterDto): Promise<CashRegisterDto> {
    return server_fetch.put<CashRegisterDto>(`${registers_path}/${id}`, payload, { revalidate: false });
  },
  async delete_cash_register(id: number): Promise<void> {
    return server_fetch.delete<void>(`${registers_path}/${id}`, { revalidate: false });
  },
  async search_cash_sessions(query: GridQuery): Promise<PageResult<CashSessionDto>> {
    const response = await server_fetch.get<unknown>(`${sessions_path}?${to_search_params(query)}`, {
      revalidate: 0,
      tags: [cash_tags.sessions()],
    });
    return to_page_result<CashSessionDto>(response, query.size);
  },
  async get_cash_session(id: number): Promise<CashSessionDto> {
    return server_fetch.get<CashSessionDto>(`${sessions_path}/${id}`, { revalidate: 0, tags: [cash_tags.session(id)] });
  },
  async open_cash_session(payload: OpenCashSessionDto): Promise<CashSessionDto> {
    return server_fetch.post<CashSessionDto>(sessions_path, payload, { revalidate: false });
  },
  async close_cash_session(id: number, payload: CloseCashSessionDto): Promise<CashSessionDto> {
    return server_fetch.post<CashSessionDto>(`${sessions_path}/${id}/close`, payload, { revalidate: false });
  },
  async add_cash_movement(id: number, payload: CreateCashMovementDto): Promise<CashMovementDto> {
    return server_fetch.post<CashMovementDto>(`${sessions_path}/${id}/movements`, payload, { revalidate: false });
  },
  async pos_checkout(payload: PosCheckoutDto): Promise<PosCheckoutResultDto> {
    return server_fetch.post<PosCheckoutResultDto>('/api/shop/sales/pos/checkout', payload, { revalidate: false });
  },
} as const;
