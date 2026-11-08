/** @format */

"use client";

import { useTranslations } from "next-intl";
import { HiOutlineArchiveBox } from "react-icons/hi2";
import { formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { CONSIGNMENT_MOVEMENTS_HREF, type IConsignmentMovement } from "../models/consignment.interface";

/**
 * Subpedido vendido desde consignación: de qué bodega salió cada SKU (neto de cancelaciones y
 * devoluciones). Lo prepara y despacha la tienda.
 */
export const OrderConsignmentNotice = ({ orderId, movements }: { orderId: number; movements: IConsignmentMovement[] }) => {
  const t = useTranslations("Administre.marketplace.consignment.order");
  const net = new Map<string, { sku: string; product: string | null; warehouse: string; quantity: number }>();
  for (const move of movements) {
    if (move.kind !== "SALE" && move.kind !== "SALE_CANCEL") continue;
    const key = `${move.sku_id}:${move.warehouse_id}`;
    const current = net.get(key) ?? { sku: move.sku_code, product: move.product_name,
      warehouse: move.warehouse_name ?? `#${move.warehouse_id}`, quantity: 0 };
    current.quantity -= move.quantity;
    net.set(key, current);
  }
  const lines = [...net.values()].filter((line) => line.quantity > 0);
  if (movements.length === 0) return null;
  return (
    <div className='flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm'>
      <HiOutlineArchiveBox className='mt-0.5 h-5 w-5 shrink-0 text-primary' aria-hidden='true' />
      <div className='grid gap-1'>
        <p className='font-medium'>{t("title", { seller: movements[0].seller_name })}</p>
        {lines.length === 0 ? (
          <p className='text-muted-foreground'>{t("nothingOut")}</p>
        ) : (
          <ul className='grid gap-0.5 text-muted-foreground'>
            {lines.map((line) => (
              <li key={`${line.sku}-${line.warehouse}`}>
                {t("line", { sku: line.sku, quantity: formatNumber(line.quantity), warehouse: line.warehouse })}
              </li>
            ))}
          </ul>
        )}
        <Link href={`${CONSIGNMENT_MOVEMENTS_HREF}?orderId=${orderId}`} className='text-xs text-primary hover:underline'>{t("viewMovements")}</Link>
      </div>
    </div>
  );
};
