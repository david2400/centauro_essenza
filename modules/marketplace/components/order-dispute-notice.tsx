/** @format */

"use client";

import { useTranslations } from "next-intl";
import { HiOutlineScale } from "react-icons/hi2";
import { Link } from "@/shared/i18n/routing";
import { DISPUTES_HREF, type IOrderDispute } from "../models/dispute.interface";

/** En la ficha de una orden de vendedor externo: su reclamo o el enlace para abrir uno. */
export const OrderDisputeNotice = ({ orderId, dispute, canOpen }: { orderId: number; dispute: IOrderDispute | null; canOpen: boolean }) => {
  const t = useTranslations("Administre.marketplace.dispute.order");
  const tStatus = useTranslations("Administre.marketplace.dispute.statuses");
  const active = dispute && (dispute.status === "OPEN" || dispute.status === "SELLER_RESPONDED");
  if (!dispute && !canOpen) return null;
  return (
    <div className='flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm'>
      <HiOutlineScale className='h-5 w-5 text-primary' aria-hidden='true' />
      {dispute ? (
        <Link href={`${DISPUTES_HREF}/${dispute.id}`} className='font-medium hover:text-primary hover:underline'>
          {t(active ? "active" : "last", { number: dispute.number ?? `#${dispute.id}`, status: tStatus(dispute.status) })}
        </Link>
      ) : null}
      {canOpen && !active ? (
        <Link href={`${DISPUTES_HREF}/new?orderId=${orderId}`} className='text-primary hover:underline'>{t("open")}</Link>
      ) : null}
    </div>
  );
};
