'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { orders_repository } from './repository';
import { orders_resource } from './search';
import type { OrderDto } from './types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';
import type {
  CreateOrderPayload,
  UpdateOrderPayload,
  DeleteOrderPayload,
  ChangeOrderStatusDto,
  SaveOrderDetailsDto,
  CreateFullOrderDto,
  PickOrderDto,
  ShipOrderDto,
  OrderActionDto,
  OrderEventDto,
  BulkOrderStatusDto,
  CustomerLookupDto,
  CustomerByDocumentDto,
  OrderNumberingDto,
} from './types';
import { inventory_movements_tags, billing_tags, orders_tags, payments_tags, product_orders_tags, products_tags, stock_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';
import { field_errors_from } from '@/server/lib/pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; field_errors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status, field_errors: field_errors_from(error) };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { success: false, error: message };
}

function revalidate_orders(id?: number) {
  revalidateTag(orders_tags.list());
  if (id != null) {
    revalidateTag(orders_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_order_action(
  payload: CreateOrderPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await orders_repository.create_order(payload);
    revalidate_orders(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_order_action(payload: UpdateOrderPayload): Promise<ActionResult> {
  try {
    await orders_repository.update_order(payload);
    revalidate_orders(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_order_action(payload: DeleteOrderPayload): Promise<ActionResult> {
  try {
    await orders_repository.delete_order(payload);
    revalidate_orders(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

/** Cambia el estado. Pagar o cancelar mueve stock: se refrescan kardex y productos. */
export async function change_order_status_action(id: number, payload: ChangeOrderStatusDto): Promise<ActionResult> {
  try {
    await orders_repository.change_order_status(id, payload);
    revalidate_orders(id);
    revalidateTag(product_orders_tags.list());
    revalidateTag(inventory_movements_tags.list());
    revalidateTag(products_tags.list());
    revalidateTag(stock_tags.all());
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulk_delete_orders_action(ids: number[]): Promise<ActionResult<BulkResult>> {
  try {
    const result = await orders_resource.bulk_delete(ids);
    revalidateTag(orders_tags.list());
    for (const id of ids) revalidateTag(orders_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_orders_action(
  query: GridQuery,
): Promise<ActionResult<{ items: OrderDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await orders_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── V16: orden empresarial ──────────────────────────────────────────────────

/** Cambios que mueven stock, totales o cobros: refresca orden, líneas, stock y pagos. */
function revalidate_operation(id?: number) {
  revalidate_orders(id);
  revalidateTag(product_orders_tags.list());
  revalidateTag(inventory_movements_tags.list());
  revalidateTag(products_tags.list());
  revalidateTag(stock_tags.all());
  revalidateTag(payments_tags.all());
  if (id != null) revalidateTag(payments_tags.order(id));
}

async function run<T>(id: number | undefined, call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await call();
    revalidate_operation(id ?? (data as { id?: number } | undefined)?.id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function create_full_order_action(payload: CreateFullOrderDto) {
  return run(undefined, () => orders_repository.create_full(payload));
}

export async function save_order_details_action(id: number, payload: SaveOrderDetailsDto) {
  return run(id, () => orders_repository.save_details(id, payload));
}

export async function pick_order_action(id: number, payload: PickOrderDto) {
  return run(id, () => orders_repository.pick(id, payload));
}

export async function pick_all_order_action(id: number, payload: OrderActionDto) {
  return run(id, () => orders_repository.pick_all(id, payload));
}

export async function ready_order_action(id: number, payload: OrderActionDto) {
  return run(id, () => orders_repository.ready(id, payload));
}

export async function ship_order_action(id: number, payload: ShipOrderDto) {
  return run(id, () => orders_repository.ship(id, payload));
}

export async function deliver_order_action(id: number, payload: OrderActionDto) {
  return run(id, () => orders_repository.deliver(id, payload));
}

export async function add_order_note_action(id: number, payload: OrderActionDto): Promise<ActionResult<OrderEventDto>> {
  try {
    const data = await orders_repository.add_note(id, payload);
    revalidateTag(orders_tags.item(id));
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function bulk_order_status_action(payload: BulkOrderStatusDto): Promise<ActionResult<BulkResult>> {
  try {
    const data = await orders_repository.bulk_status(payload);
    revalidate_operation();
    for (const id of payload.ids) revalidateTag(orders_tags.item(id));
    revalidateTag(billing_tags.invoices());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function search_order_customers_action(q: string): Promise<CustomerLookupDto[]> {
  if (q.trim().length < 2) return [];
  try {
    return await orders_repository.customers(q.trim());
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}

export async function lookup_customer_by_document_action(
  doc_type: string | undefined,
  doc_number: string,
  company_id: number,
): Promise<ActionResult<CustomerByDocumentDto>> {
  try {
    return { success: true, data: await orders_repository.customer_by_document(doc_type, doc_number, company_id) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function save_order_numbering_action(payload: OrderNumberingDto): Promise<ActionResult<OrderNumberingDto>> {
  try {
    return { success: true, data: await orders_repository.save_numbering(payload) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
