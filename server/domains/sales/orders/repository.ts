import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_list } from '@/server/lib/list-response';
import { orders_tags } from '@/server/lib/cache-tags';
import type { BulkResult } from '@/shared/models/pagination';
import type {
  OrderDto,
  CreateOrderPayload,
  UpdateOrderPayload,
  DeleteOrderPayload,
  ChangeOrderStatusDto,
  OrderReservationDto,
  SaveOrderDetailsDto,
  CreateFullOrderDto,
  OrderSummaryDto,
  OrderEventDto,
  CustomerLookupDto,
  CustomerByDocumentDto,
  OrderNumberingDto,
  PickOrderDto,
  ShipOrderDto,
  OrderActionDto,
  BulkOrderStatusDto,
  OrderFilterParams,
} from './types';

const orders_base_path = '/api/shop/sales/orders';
const order_by_id_path = (id: number) => `${orders_base_path}/${id}`;

export const orders_repository = {
  async list_orders(): Promise<OrderDto[]> {
    const response = await server_fetch.get<unknown>(orders_base_path, {
      revalidate: 30,
      tags: [orders_tags.list()],
    });
    return to_list<OrderDto>(response);
  },

  async get_order_by_id(id: number): Promise<OrderDto> {
    return server_fetch.get<OrderDto>(order_by_id_path(id), {
      revalidate: 30,
      tags: [orders_tags.item(id)],
    });
  },

  async create_order(payload: CreateOrderPayload): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(orders_base_path, payload, { revalidate: false });
  },

  async update_order(payload: UpdateOrderPayload): Promise<OrderDto> {
    return server_fetch.put<OrderDto>(order_by_id_path(payload.id), payload, { revalidate: false });
  },

  /** Cambio de estado: pagar descuenta el stock; cancelar lo libera o lo devuelve. */
  async change_order_status(id: number, payload: ChangeOrderStatusDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${order_by_id_path(id)}/status`, payload, { revalidate: false });
  },

  async list_order_reservations(id: number): Promise<OrderReservationDto[]> {
    const response = await server_fetch.get<unknown>(`${order_by_id_path(id)}/reservations`, {
      revalidate: false,
      tags: [orders_tags.item(id)],
    });
    return to_list<OrderReservationDto>(response);
  },

  async delete_order(payload: DeleteOrderPayload): Promise<void> {
    return server_fetch.delete<void>(order_by_id_path(payload.id), { revalidate: false });
  },

  // ── V16 ────────────────────────────────────────────────────────────────────

  async create_full(payload: CreateFullOrderDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${orders_base_path}/full`, payload, { revalidate: false });
  },

  async save_details(id: number, payload: SaveOrderDetailsDto): Promise<OrderDto> {
    return server_fetch.put<OrderDto>(`${order_by_id_path(id)}/details`, payload, { revalidate: false });
  },

  async pick(id: number, payload: PickOrderDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${order_by_id_path(id)}/picking`, payload, { revalidate: false });
  },

  async pick_all(id: number, payload: OrderActionDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${order_by_id_path(id)}/pick-all`, payload, { revalidate: false });
  },

  async ready(id: number, payload: OrderActionDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${order_by_id_path(id)}/ready`, payload, { revalidate: false });
  },

  async ship(id: number, payload: ShipOrderDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${order_by_id_path(id)}/ship`, payload, { revalidate: false });
  },

  async deliver(id: number, payload: OrderActionDto): Promise<OrderDto> {
    return server_fetch.post<OrderDto>(`${order_by_id_path(id)}/deliver`, payload, { revalidate: false });
  },

  async timeline(id: number): Promise<OrderEventDto[]> {
    const response = await server_fetch.get<unknown>(`${order_by_id_path(id)}/timeline`, {
      revalidate: 0,
      tags: [orders_tags.item(id)],
    });
    return to_list<OrderEventDto>(response);
  },

  async add_note(id: number, payload: OrderActionDto): Promise<OrderEventDto> {
    return server_fetch.post<OrderEventDto>(`${order_by_id_path(id)}/notes`, payload, { revalidate: false });
  },

  async bulk_status(payload: BulkOrderStatusDto): Promise<BulkResult> {
    return server_fetch.post<BulkResult>(`${orders_base_path}/bulk-status`, payload, { revalidate: false });
  },

  async summary(params: OrderFilterParams): Promise<OrderSummaryDto> {
    return server_fetch.get<OrderSummaryDto>(`${orders_base_path}/summary`, {
      params,
      revalidate: 30,
      tags: [orders_tags.list()],
    });
  },

  async customers(q: string): Promise<CustomerLookupDto[]> {
    const response = await server_fetch.get<unknown>(`${orders_base_path}/customers`, { params: { q }, revalidate: 0 });
    return to_list<CustomerLookupDto>(response);
  },

  /** Persona del registro central (access_control) por documento, con su última orden. */
  /** Solo usuarios asignados a la empresa `company_id` (id_company de access_control). */
  async customer_by_document(doc_type: string | undefined, doc_number: string, company_id: number): Promise<CustomerByDocumentDto> {
    return server_fetch.get<CustomerByDocumentDto>(`${orders_base_path}/customers/by-document`, {
      params: { docType: doc_type, docNumber: doc_number, companyId: company_id },
      revalidate: 0,
    });
  },

  async numbering(): Promise<OrderNumberingDto> {
    return server_fetch.get<OrderNumberingDto>(`${orders_base_path}/numbering`, { revalidate: 0 });
  },

  async save_numbering(payload: OrderNumberingDto): Promise<OrderNumberingDto> {
    return server_fetch.put<OrderNumberingDto>(`${orders_base_path}/numbering`, payload, { revalidate: false });
  },
} as const;
