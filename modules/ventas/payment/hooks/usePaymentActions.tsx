/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HiOutlineArrowPath,
  HiOutlineArrowUturnLeft,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineNoSymbol,
  HiOutlineXCircle,
} from "react-icons/hi2";
import type { RowAction } from "@/components/data-grid";
import { notify } from "@/components/notifications";
import type { DialogAction } from "../components/payment-action-dialog";
import { isPaymentAction, type IPayment, type PaymentAction } from "../models/payment.interface";
import { runPaymentActionServerAction } from "@/app/[locale]/ventas/payments/actions";
import dynamic from "next/dynamic";
import { useMountedOnce } from "@/lib/use-mounted-once";
const PaymentEventsDialog = dynamic(() => import("../components/payment-events-dialog").then((m) => m.PaymentEventsDialog));

// Se descargan al abrirse (no viajan con la página).
const PaymentActionDialog = dynamic(() => import("../components/payment-action-dialog").then((m) => m.PaymentActionDialog));

const ICONS: Record<PaymentAction, RowAction["icon"]> = {
  confirm: HiOutlineCheckCircle,
  decline: HiOutlineXCircle,
  void: HiOutlineNoSymbol,
  refund: HiOutlineArrowUturnLeft,
  sync: HiOutlineArrowPath,
};

/**
 * Acciones de un pago (las que el backend permite en `actions`), con sus diálogos
 * y el historial. Devuelve las acciones por fila y los diálogos a renderizar una vez.
 */
export function usePaymentActions() {
  const router = useRouter();
  const t = useTranslations("Administre.payment");
  const tCommon = useTranslations("Administre.common");
  const [dialog, setDialog] = useState<{ payment: IPayment; action: DialogAction } | null>(null);
  const [eventsOf, setEventsOf] = useState<IPayment | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const actionMounted = useMountedOnce(dialog != null);
  const eventsMounted = useMountedOnce(eventsOf != null);

  const run = async (payment: IPayment, action: PaymentAction, payload?: { reason?: string; reference?: string; amount?: number }) => {
    if (payment.id == null) return false;
    const result = await runPaymentActionServerAction(payment.id, action, payload);
    if (result.success) {
      notify.success(t(`done.${action}`), result.data.status ? t(`statuses.${result.data.status as "APPROVED"}`) : undefined);
      router.refresh();
      return true;
    }
    notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    return false;
  };

  const start = async (payment: IPayment, action: PaymentAction) => {
    if (action === "sync") {
      setSyncing(payment.id ?? null);
      await run(payment, "sync");
      setSyncing(null);
      return;
    }
    setDialog({ payment, action });
  };

  const copyLink = async (payment: IPayment) => {
    if (!payment.checkout_url) return;
    try {
      await navigator.clipboard.writeText(payment.checkout_url);
      notify.success(t("checkout.copied"));
    } catch {
      notify.info(payment.checkout_url);
    }
  };

  const rowActions = (payment: IPayment): RowAction[] => {
    const allowed = (payment.actions ?? []).filter(isPaymentAction);
    const items: RowAction[] = allowed.map((action) => ({
      label: t(`actions.${action}`),
      icon: ICONS[action],
      tone: action === "void" || action === "decline" ? "danger" : "default",
      disabled: syncing === payment.id,
      onSelect: () => void start(payment, action),
    }));
    if (payment.checkout_url && payment.status === "PENDING") {
      items.unshift({ label: t("checkout.copy"), icon: HiOutlineClipboardDocument, onSelect: () => void copyLink(payment) });
    }
    items.push({ label: t("events.title"), icon: HiOutlineClock, separated: items.length > 0, onSelect: () => setEventsOf(payment) });
    return items;
  };

  const dialogs = (
    <>
      {actionMounted ? (
        <PaymentActionDialog
          payment={dialog?.payment ?? null}
          action={dialog?.action ?? null}
          onClose={() => setDialog(null)}
          onSubmit={(payload) => (dialog ? run(dialog.payment, dialog.action, payload) : Promise.resolve(false))}
        />
      ) : null}
      {eventsMounted ? <PaymentEventsDialog payment={eventsOf} onClose={() => setEventsOf(null)} /> : null}
    </>
  );

  return { rowActions, start, dialogs, syncing };
}
