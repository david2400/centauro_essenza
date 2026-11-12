/** @format */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import { CASHIER_STORAGE_KEY, SESSION_STORAGE_KEY, writeLocal, type ICashier, type ICashRegister, type ICashSession } from "../models/cash.interface";
import { listCashiersServerAction, openCashSessionServerAction } from "@/app/[locale]/ventas/cash-registers/actions";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Abre el turno de una caja con la base en efectivo. El cajero sale de access_control: por defecto el usuario de la
 * sesión, o se elige otro usuario de la empresa. draco valida la elección y pone el nombre del turno.
 */
export const OpenSessionDialog = ({
  register,
  onClose,
  onOpened,
}: {
  register: ICashRegister | null;
  onClose: () => void;
  onOpened?: (session: ICashSession) => void;
}) => {
  const t = useTranslations("Administre.cash.open");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [cashiers, setCashiers] = useState<ICashier[] | null>(null);
  const [cashiersError, setCashiersError] = useState<string | null>(null);
  const [cashier, setCashier] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const mode = register?.opening_mode ?? "FREE";
  const fixed = mode === "FIXED";

  const loadCashiers = useCallback(async () => {
    setCashiers(null);
    setCashiersError(null);
    const result = await listCashiersServerAction();
    if (!result.success) {
      setCashiersError(result.error);
      return;
    }
    setCashiers(result.data);
    setCashier(result.data.find((c) => c.current)?.id ?? result.data[0]?.id ?? "");
  }, []);

  useEffect(() => {
    if (register) {
      setAmount(register.default_opening_amount != null ? String(register.default_opening_amount) : "");
      setNotes("");
      void loadCashiers();
    }
  }, [register, loadCashiers]);

  const submit = async () => {
    if (!register?.id || !cashier) return;
    setBusy(true);
    const result = await openCashSessionServerAction({
      cash_register_id: register.id,
      cashier_user_id: cashier,
      // Base fija: la pone el backend; sugerida o libre: la que escribe el cajero.
      opening_amount: fixed ? undefined : Number(amount) || 0,
      notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    // Nombre que puso draco: lo usan los movimientos y el cierre de este navegador como sugerencia.
    if (result.data.opened_by) writeLocal(CASHIER_STORAGE_KEY, result.data.opened_by);
    if (result.data.id != null) writeLocal(SESSION_STORAGE_KEY, String(result.data.id));
    notify.success(t("opened", { register: register.name ?? "" }));
    router.refresh();
    onOpened?.(result.data);
    onClose();
  };

  return (
    <Modal
      size='sm'
      open={register != null}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={t("title", { register: register?.name ?? "" })}
      description={[register?.store_name, register?.device_name, t("description")].filter(Boolean).join(" · ")}
      hideDefaultFooter>
      <form
        className='grid gap-4'
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}>
        <label className='grid gap-1.5 text-sm'>
          <span className='font-medium'>{t("cashier")} *</span>
          {cashiersError ? (
            <span className='flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
              {t("cashierError")}
              <button type='button' className='font-medium underline underline-offset-4' onClick={() => void loadCashiers()}>
                {t("cashierRetry")}
              </button>
            </span>
          ) : (
            <select
              className={`${inputClass} disabled:cursor-wait disabled:opacity-70`}
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              disabled={cashiers == null}
              aria-busy={cashiers == null}
              required>
              {cashiers == null ? <option value=''>{t("cashierLoading")}</option> : null}
              {cashiers?.map((c) => (
                <option key={c.id} value={c.id ?? ""}>
                  {c.current ? t("cashierYou", { name: c.name ?? c.username ?? "" }) : c.name ?? c.username}
                  {!c.current && c.username && c.username !== c.name ? ` · ${c.username}` : ""}
                </option>
              ))}
            </select>
          )}
          <span className='text-xs text-muted-foreground'>{t("cashierHint")}</span>
        </label>
        <label className='grid gap-1.5 text-sm'>
          <span className='font-medium'>{t("openingAmount")}</span>
          <input
            className={inputClass}
            type='number'
            inputMode='numeric'
            min={0}
            step='100'
            value={amount}
            readOnly={fixed}
            aria-readonly={fixed}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className='text-xs text-muted-foreground'>
            {fixed
              ? t("fixedHint", { amount: formatMoney(register?.default_opening_amount) })
              : mode === "SUGGESTED"
                ? t("suggestedHint", { amount: formatMoney(register?.default_opening_amount) })
                : t("openingHint")}
          </span>
        </label>
        <label className='grid gap-1.5 text-sm'>
          <span className='font-medium'>{t("notes")}</span>
          <textarea className={`${inputClass} h-auto py-2`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </label>
        <div className='flex justify-end gap-2'>
          <Buttons type='button' variant='outline' className='rounded-full' onClick={onClose}>
            {tCommon("cancel")}
          </Buttons>
          <Buttons type='submit' loading={busy} disabled={!cashier || cashiers == null} className='rounded-full'>
            {t("submit")}
          </Buttons>
        </div>
      </form>
    </Modal>
  );
};
