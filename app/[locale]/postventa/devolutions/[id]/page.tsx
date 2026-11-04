/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_order_devolution_by_id, get_returnable_order } from "@/server/domains/devolution/order-devolutions/queries";
import { list_order_devolution_evidences } from "@/server/domains/devolution/order-devolution-evidences/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { get_order_invoices } from "@/server/domains/billing/invoices/queries";
import { ServerApiError } from "@/server/lib/types";
import { load_devolution_catalogs } from "../catalogs";
import { DevolutionDetail } from "@/modules/postventa/devolution";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.devolution" });
  return { title: t("devolutionLabel", { id }) };
}

/**
 * Detalle de la devolución: el backend trae las líneas y las acciones del flujo. Se suma lo
 * que aún se puede devolver de la orden (para agregar productos y estimar valores), las bodegas
 * para el reingreso y las notas crédito emitidas por esta devolución.
 */
const DevolutionDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const devolutionId = Number(id);
  if (!Number.isInteger(devolutionId) || devolutionId <= 0) notFound();

  const devolution = await get_order_devolution_by_id({ id: devolutionId }).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.is_not_found) notFound();
    throw error;
  });
  const orderId = devolution.order_id ?? 0;

  const [evidences, catalogs, returnable, warehouses, invoices] = await Promise.all([
    list_order_devolution_evidences(),
    load_devolution_catalogs(),
    get_returnable_order({ order_id: orderId, exclude_devolution_id: devolutionId }).catch((error) => { unstable_rethrow(error); return null; }),
    list_all_warehouses().catch((error) => { unstable_rethrow(error); return []; }),
    devolution.state === "F" ? get_order_invoices({ order_id: orderId }).catch((error) => { unstable_rethrow(error); return []; }) : Promise.resolve([]),
  ]);

  return (
    <DevolutionDetail
      devolution={devolution}
      evidences={evidences.filter((evidence) => evidence.order_devolution_id === devolutionId)}
      catalogs={catalogs}
      returnable={returnable}
      warehouses={warehouses.map(({ id: warehouseId, name }) => ({ id: warehouseId, name }))}
      creditNotes={invoices
        .filter((invoice) => invoice.kind === "CREDIT_NOTE" && invoice.devolution_id === devolutionId)
        .map(({ id: noteId, full_number, status, total }) => ({ id: noteId, full_number, status, total }))}
    />
  );
};

export default DevolutionDetailPage;
