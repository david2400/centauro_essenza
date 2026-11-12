/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { formatMoney } from "@/lib/format";
import type { IPayment, PaymentAction } from "../models/payment.interface";

export type DialogAction = Exclude<PaymentAction, "sync">;

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Confirmar (referencia), rechazar (motivo), anular (motivo obligatorio) o reembolsar
 * (monto y motivo) un pago. Valida lo mínimo; el backend aplica las reglas.
 */
export const PaymentActionDialog = ({
  payment,
  action,
  onClose,
  onSubmit,
}: {
  payment: IPayment | null;
  action: DialogAction | null;
  onClose: () => void;
  onSubmit: (payload: { reason?: string; reference?: string; amount?: number }) => Promise<boolean>;
}) => {
  const t = useTranslations("Administre.payment");
  const tCommon = useTranslations("Administre.common");
  const open = payment != null && action != null;
  const refundable = Math.max((payment?.settled_amount ?? 0), 0);

  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<string | null>(null);

  // Reinicia los campos cada vez que se abre para otro pago o acción.
  const current = open ? `${payment?.id}-${action}` : null;
  if (current !== key) {
    setKey(current);
    setReference(payment?.reference ?? "");
    setReason("");
    setAmount(refundable ? String(refundable) : "");
    setError(null);
  }

  const submit = async () => {
    if (!action) return;
    const payload: { reason?: string; reference?: string; amount?: number } = {};
    if (action === "confirm") payload.reference = reference.trim() || undefined;
    if (action === "void" && !reason.trim()) {
      setError(t("dialog.reasonRequired"));
      return;
    }
    if (action === "refund") {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0 || value > refundable) {
        setError(t("dialog.refundRange", { max: formatMoney(refundable) }));
        return;
      }
      payload.amount = value;
    }
    if (action !== "confirm") payload.reason = reason.trim() || undefined;
    setBusy(true);
    const ok = await onSubmit(payload);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      size='sm'
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={action ? t(`actions.${action}`) : ""}
      description={payment ? `${payment.method_name ?? ""} · ${formatMoney(payment.amount)} · ${payment.payment_reference ?? ""}` : undefined}
      hideDefaultFooter>
      {open ? (
        <form
          className='grid gap-4'
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}>
          <p className='text-sm text-muted-foreground'>{t(`dialog.${action}Hint`)}</p>

          {action === "confirm" ? (
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>{t("fields.reference")}</span>
              <input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} />
            </label>
          ) : null}

          {action === "refund" ? (
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>{t("dialog.refundAmount")}</span>
              <input
                className={inputClass}
                type='number'
                inputMode='numeric'
                min={0}
                max={refundable}
                step='1'
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <span className='text-xs text-muted-foreground'>{t("dialog.refundable", { amount: formatMoney(refundable) })}</span>
              {payment?.provider === "MERCADO_PAGO" ? (
                <span className='text-xs text-muted-foreground'>{t("dialog.refundGateway")}</span>
              ) : payment?.provider ? (
                <span className='flex gap-1.5 text-xs text-amber-700 dark:text-amber-400'>
                  <HiOutlineExclamationTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
                  {t("dialog.refundManual")}
                </span>
              ) : null}
            </label>
          ) : null}

          {action !== "confirm" ? (
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>
                {t("dialog.reason")}
                {action === "void" ? " *" : ""}
              </span>
              <textarea className={inputClass} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
            </label>
          ) : null}

          {error ? (
            <p className='text-sm text-destructive' role='alert'>
              {error}
            </p>
          ) : null}

          <div className='flex justify-end gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={onClose}>
              {tCommon("cancel")}
            </Buttons>
            <Buttons
              type='submit'
              loading={busy}
              variant={action === "void" || action === "decline" ? "danger" : "default"}
              className='rounded-full'>
              {action ? t(`actions.${action}`) : ""}
            </Buttons>
          </div>
        </form>
      ) : null}
    </Modal>
  );
};
