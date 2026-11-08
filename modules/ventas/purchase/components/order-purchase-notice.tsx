/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/routing";
import { PURCHASES_HREF, type IOrderPurchase } from "../models/purchase.interface";

/** Aviso en la ficha de una orden que es subpedido de una compra multivendedor. */
export const OrderPurchaseNotice = ({ link }: { link: IOrderPurchase }) => {
  const t = useTranslations("Administre.purchase.notice");
  return (
    <div className={link.external
      ? "rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm"
      : "rounded-2xl border border-border bg-muted/30 p-4 text-sm"}>
      <p>
        {t("subOrderOf", { count: link.sub_orders })}{" "}
        <Link href={`${PURCHASES_HREF}/${link.purchase_id}`} className='font-semibold text-primary hover:underline'>{link.purchase_number}</Link>
        {" · "}
        {link.external ? t("externalSeller", { name: link.seller_name ?? "—" }) : t("ownSeller")}
      </p>
      {link.external ? <p className='mt-1 text-muted-foreground'>{t("externalRules")}</p> : null}
    </div>
  );
};
