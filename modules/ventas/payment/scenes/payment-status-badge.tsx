/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  ORDER_PAYMENT_VARIANT,
  PAYMENT_STATUS_VARIANT,
  isOrderPaymentStatus,
  isPaymentStatus,
} from "../models/payment.interface";

export const PaymentStatusBadge = ({ status }: { status?: string }) => {
  const t = useTranslations("Administre.payment.statuses");
  if (!isPaymentStatus(status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={PAYMENT_STATUS_VARIANT[status]}>{t(status)}</Badge>;
};

export const OrderPaymentStatusBadge = ({ status }: { status?: string }) => {
  const t = useTranslations("Administre.payment.orderStatuses");
  if (!isOrderPaymentStatus(status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={ORDER_PAYMENT_VARIANT[status]}>{t(status)}</Badge>;
};
