/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { PURCHASE_STATUSES, type PurchaseStatus } from "../models/purchase.interface";

const VARIANT: Record<PurchaseStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PARTIALLY_PAID: "secondary",
  PAID: "secondary",
  IN_DELIVERY: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

export const PurchaseStatusBadge = ({ status }: { status?: string | null }) => {
  const t = useTranslations("Administre.purchase.statuses");
  if (!(PURCHASE_STATUSES as readonly string[]).includes(status ?? "")) return <Badge variant='outline'>{status || "—"}</Badge>;
  const value = status as PurchaseStatus;
  return <Badge variant={VARIANT[value]}>{t(value)}</Badge>;
};
