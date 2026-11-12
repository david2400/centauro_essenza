/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineCreditCard, HiOutlineInformationCircle, HiOutlinePlus, HiOutlineSparkles, HiOutlineTrash } from "react-icons/hi2";
import { notify } from "@/components/notifications";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { KIND_ICONS } from "@/modules/ventas/paymentMethod/scenes/formPaymentMethod";
import { isPaymentKind, type IPaymentMethod } from "@/modules/ventas/paymentMethod/models/paymentMethod.interface";
import { registerSplitPaymentServerAction } from "@/app/[locale]/ventas/payments/actions";

/** Un cobro dividido admite hasta 10 medios (igual que el backend). */
const MAX_LINES = 10;

const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive";

interface SplitLine {
  key: number;
  methodId: string;
  /** Lo que abona este medio. En la última línea (automática) no se usa: toma lo que falta. */
  amount: string;
  tendered: string;
  reference: string;
}

const round = (value: number) => Math.round(value * 100) / 100;
const num = (value: string) => {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : 0;
};

interface SplitPaymentFormProps {
  orderId: number;
  /** Saldo que se puede cobrar ahora (total − pagado − pendiente). */
  collectable: number;
  /** Medios activos que no son pasarela (la pasarela genera un link y va por "Un medio"). */
  methods: IPaymentMethod[];
  onDone: () => void;
  onCancel: () => void;
}

/**
 * Cobro de una orden con varios medios (efectivo + datáfono + transferencia…).
 * Cada medio abona una parte; el último toma automáticamente lo que falta para cubrir el saldo
 * (se puede editar a mano para dejar un abono). El backend registra todo o nada.
 */
export const SplitPaymentForm = ({ orderId, collectable, methods, onDone, onCancel }: SplitPaymentFormProps) => {
  const t = useTranslations("Administre.payment");
  const ts = useTranslations("Administre.payment.register.split");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();

  const cash = methods.find((m) => m.kind === "CASH");
  const other = methods.find((m) => m.id !== cash?.id) ?? cash;
  const newLine = (key: number, methodId = ""): SplitLine => ({ key, methodId, amount: "", tendered: "", reference: "" });

  // Dos medios: el primero se escribe y el segundo completa el saldo.
  const [lines, setLines] = useState<SplitLine[]>(() => [
    newLine(1, cash?.id != null ? String(cash.id) : ""),
    newLine(2, other?.id != null ? String(other.id) : ""),
  ]);
  /** La última línea deja de ser automática cuando el usuario quiere registrar solo un abono. */
  const [lastManual, setLastManual] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Lleva el foco al monto de una línea después del render que la cambia. */
  const focusAmount = (key: number) =>
    requestAnimationFrame(() => (document.getElementById(`split-${key}-amount`) as HTMLInputElement | null)?.select());

  const lastIndex = lines.length - 1;
  const methodOf = (line: SplitLine) => methods.find((m) => String(m.id) === line.methodId);
  const update = (key: number, patch: Partial<SplitLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const othersSum = round(lines.slice(0, lastIndex).reduce((sum, line) => sum + num(line.amount), 0));
  const autoAmount = round(Math.max(collectable - othersSum, 0));
  const isAuto = (index: number) => index === lastIndex && !lastManual;
  const amountAt = (index: number) => {
    const line = lines[index];
    if (!line) return 0;
    return isAuto(index) ? autoAmount : num(line.amount);
  };

  const amounts = lines.map((_, index) => amountAt(index));
  const assigned = round(amounts.reduce((sum, value) => sum + value, 0));
  const remaining = round(collectable - assigned);
  const change = round(
    lines.reduce((sum, line, index) => {
      const tendered = num(line.tendered);
      const amount = amounts[index] ?? 0;
      return methodOf(line)?.allows_change && tendered > amount ? sum + tendered - amount : sum;
    }, 0),
  );

  /** Primer problema de cada línea (o null). Se muestran después del primer intento. */
  const lineErrors = lines.map((line, index) => {
    const method = methodOf(line);
    const amount = amounts[index] ?? 0;
    if (!method) return ts("errors.method");
    if (amount <= 0) return isAuto(index) ? ts("errors.autoZero") : ts("errors.amount");
    if (method.requires_reference && !line.reference.trim()) return ts("errors.reference");
    if (method.allows_change && line.tendered.trim() !== "" && num(line.tendered) < amount) return ts("errors.tendered");
    return null;
  });
  const overBalance = remaining < 0;
  const valid = lineErrors.every((error) => error == null) && !overBalance && assigned > 0;

  /** El medio nuevo pasa a ser el automático; el que lo era queda para escribir cuánto abona. */
  const addLine = () => {
    if (lines.length >= MAX_LINES) return;
    const used = new Set(lines.map((line) => line.methodId));
    const next = methods.find((m) => !used.has(String(m.id))) ?? methods[0];
    const previous = lines[lastIndex];
    const line = newLine(Date.now(), next?.id != null ? String(next.id) : "");
    setLines((current) =>
      [...current.map((item, index) => (index === current.length - 1 && !lastManual ? { ...item, amount: "" } : item)), line],
    );
    setLastManual(false);
    if (previous) focusAmount(previous.key);
  };

  const removeLine = (key: number) => {
    setLines((current) => current.filter((line) => line.key !== key));
    if (lines[lastIndex]?.key === key) setLastManual(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!valid || busy) return;
    setBusy(true);
    const result = await registerSplitPaymentServerAction({
      order_id: orderId,
      notes: notes.trim() || undefined,
      lines: lines.map((line, index) => {
        const method = methodOf(line);
        return {
          payment_method_id: Number(line.methodId),
          amount: amounts[index] ?? 0,
          tendered_amount: method?.allows_change && line.tendered.trim() !== "" ? num(line.tendered) : undefined,
          reference: line.reference.trim() || undefined,
        };
      }),
    });
    setBusy(false);
    if (result.success) {
      const total = result.data.reduce((sum, payment) => sum + (payment.amount ?? 0), 0);
      notify.success(ts("registered", { count: result.data.length }), formatMoney(total));
      const given = result.data.reduce((sum, payment) => sum + (payment.change_amount ?? 0), 0);
      if (given > 0) notify.info(t("register.changeToGive", { amount: formatMoney(given) }));
      router.refresh();
      onDone();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  return (
    <form onSubmit={submit} noValidate className='grid gap-4'>
      <p className='flex gap-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground'>
        <HiOutlineInformationCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
        {ts("hint")}
      </p>

      <ol className='grid gap-3'>
        {lines.map((line, index) => {
          const method = methodOf(line);
          const Icon = isPaymentKind(method?.kind) ? KIND_ICONS[method.kind] : HiOutlineCreditCard;
          const error = submitted ? lineErrors[index] : null;
          const amount = amounts[index] ?? 0;
          const tendered = num(line.tendered);
          const auto = isAuto(index);
          const id = `split-${line.key}`;
          const tenderedLow = Boolean(method?.allows_change) && line.tendered.trim() !== "" && tendered < amount;
          return (
            <li key={line.key} className={cn("grid gap-3 rounded-xl border p-3", error ? "border-destructive/60" : "border-border")}>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='flex min-w-0 items-center gap-2 text-sm'>
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
                    <Icon className='h-4 w-4' aria-hidden='true' />
                  </span>
                  <span className='font-semibold'>{ts("line", { index: index + 1 })}</span>
                  <span className='truncate text-muted-foreground'>
                    {ts("share", { method: method?.name ?? "—", amount: formatMoney(amount), total: formatMoney(collectable) })}
                  </span>
                </span>
                {lines.length > 2 ? (
                  <button
                    type='button'
                    onClick={() => removeLine(line.key)}
                    className='inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-destructive hover:bg-destructive/10'>
                    <HiOutlineTrash className='h-3.5 w-3.5' aria-hidden='true' />
                    {ts("remove")}
                  </button>
                ) : null}
              </div>

              <div className='flex flex-wrap gap-1.5' role='radiogroup' aria-label={ts("line", { index: index + 1 })}>
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type='button'
                    role='radio'
                    aria-checked={String(m.id) === line.methodId}
                    onClick={() => update(line.key, { methodId: String(m.id), tendered: m.allows_change ? line.tendered : "" })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      String(m.id) === line.methodId ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                    )}>
                    {m.name}
                  </button>
                ))}
              </div>

              <div className='grid grid-cols-12 gap-3'>
                <div className='col-span-12 grid gap-1 sm:col-span-6'>
                  <label className='text-xs font-medium text-muted-foreground' htmlFor={`${id}-amount`}>
                    {ts("amountLabel")} *
                  </label>
                  <span className='relative'>
                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>$</span>
                    <input
                      id={`${id}-amount`}
                      className={cn(inputClass, "pl-7", auto && "cursor-default bg-muted/50 font-semibold")}
                      type='number'
                      inputMode='decimal'
                      min={0}
                      step='1'
                      readOnly={auto}
                      autoFocus={index === 0}
                      aria-readonly={auto}
                      aria-invalid={Boolean(error) && amount <= 0}
                      placeholder={auto ? undefined : "0"}
                      value={auto ? String(autoAmount) : line.amount}
                      onChange={(e) => update(line.key, { amount: e.target.value })}
                    />
                  </span>
                  {index === lastIndex ? (
                    auto ? (
                      <span className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground'>
                        <span className='inline-flex items-center gap-1'>
                          <HiOutlineSparkles className='h-3.5 w-3.5' aria-hidden='true' />
                          {ts("auto")}
                        </span>
                        <button
                          type='button'
                          className='font-medium text-primary underline-offset-4 hover:underline'
                          onClick={() => {
                            update(line.key, { amount: String(autoAmount) });
                            setLastManual(true);
                            focusAmount(line.key);
                          }}>
                          {ts("editAmount")}
                        </button>
                      </span>
                    ) : (
                      <button
                        type='button'
                        className='justify-self-start text-xs font-medium text-primary underline-offset-4 hover:underline'
                        onClick={() => setLastManual(false)}>
                        {ts("useRemaining")}
                      </button>
                    )
                  ) : null}
                </div>

                {method?.allows_change ? (
                  <div className='col-span-12 grid gap-1 sm:col-span-6'>
                    <label className='text-xs font-medium text-muted-foreground' htmlFor={`${id}-tendered`}>
                      {ts("tenderedLabel")}
                    </label>
                    <span className='relative'>
                      <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>$</span>
                      <input
                        id={`${id}-tendered`}
                        className={cn(inputClass, "pl-7")}
                        type='number'
                        inputMode='decimal'
                        min={0}
                        step='1'
                        placeholder={ts("tenderedPlaceholder")}
                        aria-invalid={tenderedLow}
                        value={line.tendered}
                        onChange={(e) => update(line.key, { tendered: e.target.value })}
                      />
                    </span>
                    {tenderedLow ? (
                      <span className='text-xs text-amber-700 dark:text-amber-400'>{ts("errors.tendered")}</span>
                    ) : tendered > amount && amount > 0 ? (
                      <span className='text-xs font-semibold text-emerald-700 dark:text-emerald-400'>
                        {ts("lineChange", { amount: formatMoney(tendered - amount) })}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {method && (!method.allows_change || method.requires_reference) ? (
                  <div className='col-span-12 grid gap-1 sm:col-span-6'>
                    <label className='text-xs font-medium text-muted-foreground' htmlFor={`${id}-reference`}>
                      {t("fields.reference")}
                      {method.requires_reference ? " *" : ` (${ts("optional")})`}
                    </label>
                    <input
                      id={`${id}-reference`}
                      className={inputClass}
                      maxLength={120}
                      autoComplete='off'
                      placeholder={ts("referencePlaceholder")}
                      aria-invalid={Boolean(error) && method.requires_reference && !line.reference.trim()}
                      value={line.reference}
                      onChange={(e) => update(line.key, { reference: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>

              {method?.kind === "CASH_ON_DELIVERY" ? <p className='text-xs text-muted-foreground'>{t("register.codPending")}</p> : null}
              {method &&
              amount > 0 &&
              ((method.min_amount != null && amount < method.min_amount) || (method.max_amount != null && amount > method.max_amount)) ? (
                <p className='text-xs text-amber-700 dark:text-amber-400'>
                  {t("register.outOfLimits", {
                    min: method.min_amount != null ? formatMoney(method.min_amount) : "—",
                    max: method.max_amount != null ? formatMoney(method.max_amount) : "—",
                  })}
                </p>
              ) : null}
              {error ? (
                <p role='alert' className='text-xs font-medium text-destructive'>
                  {error}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <Buttons type='button' variant='outline' className='justify-self-start rounded-full' disabled={lines.length >= MAX_LINES} onClick={addLine}>
        <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
        {ts("add")}
      </Buttons>

      <label className='grid gap-1 text-sm font-medium' htmlFor='split-notes'>
        {t("fields.notes")}
        <textarea
          id='split-notes'
          rows={2}
          maxLength={500}
          className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <dl aria-live='polite' className='grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-4'>
        <div>
          <dt className='text-xs text-muted-foreground'>{ts("toCollect")}</dt>
          <dd className='font-semibold tabular-nums'>{formatMoney(collectable)}</dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{ts("assigned")}</dt>
          <dd className='font-semibold tabular-nums'>{formatMoney(assigned)}</dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{overBalance ? ts("over") : ts("missing")}</dt>
          <dd
            className={cn(
              "font-semibold tabular-nums",
              overBalance ? "text-destructive" : remaining > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
            )}>
            {formatMoney(Math.abs(remaining))}
          </dd>
        </div>
        <div>
          <dt className='text-xs text-muted-foreground'>{t("register.change")}</dt>
          <dd className='font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'>{formatMoney(change)}</dd>
        </div>
      </dl>
      {overBalance ? (
        <p role='alert' className='text-sm text-destructive'>
          {ts("errors.overBalance", { max: formatMoney(collectable) })}
        </p>
      ) : remaining > 0 && assigned > 0 ? (
        <p className='text-xs text-muted-foreground'>{ts("partial")}</p>
      ) : null}

      <div className='flex justify-end gap-2'>
        <Buttons type='button' variant='outline' className='rounded-full' onClick={onCancel}>
          {tCommon("cancel")}
        </Buttons>
        <Buttons type='submit' loading={busy} disabled={assigned <= 0 || overBalance} className='rounded-full'>
          {ts("submit", { count: lines.length, amount: formatMoney(assigned) })}
        </Buttons>
      </div>
    </form>
  );
};
