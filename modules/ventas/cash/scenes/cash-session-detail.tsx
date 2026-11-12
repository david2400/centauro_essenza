/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowLeft,
  HiOutlineArrowUpTray,
  HiOutlineBanknotes,
  HiOutlineCalculator,
  HiOutlineEyeSlash,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlineScale,
  HiOutlineShoppingCart,
} from "react-icons/hi2";
import { KpiStrip } from "@/components/form-sections";
import { PageHeader } from "@/components/page-header";
import { notify } from "@/components/notifications";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { cn } from "@/lib/utils";
import { CASHIER_STORAGE_KEY, CASH_KINDS, readLocal, type ICashSession } from "../models/cash.interface";
import { addCashMovementServerAction, closeCashSessionServerAction } from "@/app/[locale]/ventas/cash-registers/actions";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Billetes y monedas colombianos para contar el efectivo. */
const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50];

/**
 * Turno de caja: cobrado por medio, ventas, entradas y salidas de efectivo y efectivo
 * esperado. Cerrar pide el conteo (con ayuda por denominaciones) y deja el arqueo congelado.
 */
export const CashSessionDetail = ({ session }: { session: ICashSession }) => {
  const t = useTranslations("Administre.cash.session");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const open = session.status === "OPEN";
  /** Arqueo ciego: mientras el turno está abierto no se muestra lo esperado. */
  const blind = open && Boolean(session.blind_close);
  const tolerance = session.difference_tolerance ?? 0;
  const [movement, setMovement] = useState<"IN" | "OUT" | null>(null);
  const [closing, setClosing] = useState(false);

  // Movimiento
  const [mvAmount, setMvAmount] = useState("");
  const [mvReason, setMvReason] = useState("");
  const [mvBusy, setMvBusy] = useState(false);
  const submitMovement = async () => {
    if (!movement || session.id == null) return;
    setMvBusy(true);
    const result = await addCashMovementServerAction(session.id, {
      type: movement,
      amount: Number(mvAmount),
      reason: mvReason.trim(),
      created_by: readLocal(CASHIER_STORAGE_KEY) ?? undefined,
    });
    setMvBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t(movement === "IN" ? "movementIn" : "movementOut"), formatMoney(result.data.amount));
    setMovement(null);
    setMvAmount("");
    setMvReason("");
    router.refresh();
  };

  // Cierre
  const nonCash = (session.methods ?? []).filter((m) => !CASH_KINDS.includes(m.kind ?? ""));
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [denoms, setDenoms] = useState<Record<number, string>>({});
  const [counted, setCounted] = useState("");
  const [closer, setCloser] = useState("");
  const [notes, setNotes] = useState("");
  const [closeBusy, setCloseBusy] = useState(false);
  const denomTotal = useMemo(
    () => DENOMINATIONS.reduce((sum, value) => sum + value * (Number(denoms[value]) || 0), 0),
    [denoms],
  );
  const countedCash = counted !== "" ? Number(counted) : denomTotal;
  const diff = countedCash - (session.expected_cash ?? 0);
  const openClose = () => {
    setCloser(readLocal(CASHIER_STORAGE_KEY) ?? session.opened_by ?? "");
    setCounts(Object.fromEntries(nonCash.map((m) => [m.payment_method_id ?? 0, blind ? "" : String(m.expected_amount ?? 0)])));
    setDenoms({});
    setCounted("");
    setNotes("");
    setClosing(true);
  };
  const needsNotes = !blind && Math.abs(diff) > tolerance;
  const submitClose = async () => {
    if (session.id == null || !closer.trim() || (needsNotes && !notes.trim())) return;
    setCloseBusy(true);
    const result = await closeCashSessionServerAction(session.id, {
      closed_by: closer.trim(),
      counted_cash: countedCash,
      counts: nonCash.map((m) => ({ payment_method_id: m.payment_method_id ?? 0, counted_amount: Number(counts[m.payment_method_id ?? 0]) || 0 })),
      notes: notes.trim() || undefined,
    });
    setCloseBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    const d = result.data.cash_difference ?? 0;
    notify.success(t("closed"), d === 0 ? t("noDifference") : t("difference", { amount: formatMoney(d) }));
    setClosing(false);
    router.refresh();
  };

  const difference = session.cash_difference;

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href='/ventas/cash-registers' className='inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'>
        <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
        {t("back")}
      </Link>
      <PageHeader
        title={t("title", { id: session.id ?? "", register: session.register_name ?? "" })}
        description={[
          session.store_name,
          t("subtitle", { name: session.opened_by ?? "", date: formatApiDate(session.opened_at) }),
        ]
          .filter(Boolean)
          .join(" · ")}
        icon={HiOutlineCalculator}
        eyebrow={tCrud("domains.sales")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={open ? "default" : "outline"}>{t(`statuses.${open ? "OPEN" : "CLOSED"}`)}</Badge>
            {open ? (
              <>
                <Link
                  href={`/ventas/pos?session=${session.id}`}
                  className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                  <HiOutlineShoppingCart className='h-4 w-4' aria-hidden='true' />
                  {t("goPos")}
                </Link>
                <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setMovement("IN")}>
                  <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />
                  {t("addIn")}
                </Buttons>
                <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setMovement("OUT")}>
                  <HiOutlineArrowUpTray className='h-4 w-4' aria-hidden='true' />
                  {t("addOut")}
                </Buttons>
                <Buttons type='button' className='rounded-full' onClick={openClose}>
                  <HiOutlineLockClosed className='h-4 w-4' aria-hidden='true' />
                  {t("close")}
                </Buttons>
              </>
            ) : null}
          </div>
        }
      />

      <KpiStrip
        items={[
          { label: t("opening"), value: formatMoney(session.opening_amount), icon: HiOutlineBanknotes },
          {
            label: t("collected"),
            value: formatMoney(session.collected_total),
            icon: HiOutlineShoppingCart,
            hint: t("sales", { count: formatNumber(session.sales_count ?? 0), total: formatMoney(session.sales_total) }),
          },
          {
            label: t("expectedCash"),
            value: blind ? "—" : formatMoney(session.expected_cash),
            icon: blind ? HiOutlineEyeSlash : HiOutlineCalculator,
            tone: session.over_cash_limit ? "warn" : undefined,
            hint: blind ? t("blindKpi") : t("movementsHint", { in: formatMoney(session.cash_in), out: formatMoney(session.cash_out) }),
          },
          open
            ? {
                label: t("pending"),
                value: formatNumber(session.pending_payments ?? 0),
                icon: HiOutlineScale,
                tone: (session.pending_payments ?? 0) > 0 ? "warn" : undefined,
                hint: t("pendingHint"),
              }
            : {
                label: t("cashDifference"),
                value: formatMoney(difference ?? 0),
                icon: HiOutlineScale,
                tone: (difference ?? 0) === 0 ? "good" : (difference ?? 0) < 0 ? "bad" : "warn",
                hint: t("countedHint", { counted: formatMoney(session.counted_cash) }),
              },
        ]}
      />

      {open && session.over_cash_limit ? (
        <div role='status' className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm'>
          <p className='flex items-center gap-2 text-amber-900 dark:text-amber-200'>
            <HiOutlineExclamationTriangle className='h-5 w-5 shrink-0' aria-hidden='true' />
            {t("overLimit", { limit: formatMoney(session.cash_limit) })}
          </p>
          <Buttons type='button' size='sm' className='rounded-full' onClick={() => setMovement("OUT")}>
            {t("withdraw")}
          </Buttons>
        </div>
      ) : null}
      {!open && session.exceeds_tolerance ? (
        <p role='status' className='rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm'>
          {t("exceededTolerance", { tolerance: formatMoney(tolerance) })}
        </p>
      ) : null}

      <div className='grid gap-6 lg:grid-cols-2'>
        <section className='grid content-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
          <h3 className='text-sm font-semibold'>{t("byMethod")}</h3>
          {(session.methods ?? []).length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t("noPayments")}</p>
          ) : (
            <table className='w-full text-sm'>
              <caption className='sr-only'>{t("byMethod")}</caption>
              <thead className='text-xs text-muted-foreground'>
                <tr>
                  <th scope='col' className='py-1 text-left'>{t("method")}</th>
                  {!blind ? <th scope='col' className='py-1 text-right'>{t("expected")}</th> : null}
                  {!open ? <th scope='col' className='py-1 text-right'>{t("counted")}</th> : null}
                  {!open ? <th scope='col' className='py-1 text-right'>{t("diff")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {(session.methods ?? []).map((m) => (
                  <tr key={m.payment_method_id} className='border-t border-border'>
                    <td className='py-2'>
                      <p className='font-medium'>{m.name}</p>
                      <p className='text-xs text-muted-foreground'>{t("paymentsCount", { count: m.payments_count ?? 0 })}</p>
                    </td>
                    {!blind ? <td className='py-2 text-right tabular-nums'>{formatMoney(m.expected_amount)}</td> : null}
                    {!open ? <td className='py-2 text-right tabular-nums'>{formatMoney(m.counted_amount)}</td> : null}
                    {!open ? (
                      <td className={cn("py-2 text-right tabular-nums", (m.difference ?? 0) < 0 ? "text-destructive" : "")}>
                        {formatMoney(m.difference)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!open ? (
            <dl className='grid gap-1 rounded-lg bg-muted/40 p-3 text-sm'>
              <div className='flex justify-between'>
                <dt>{t("closedBy")}</dt>
                <dd>
                  {session.closed_by} · {formatApiDate(session.closed_at)}
                </dd>
              </div>
              {session.closing_notes ? <p className='text-muted-foreground'>{session.closing_notes}</p> : null}
            </dl>
          ) : null}
        </section>

        <section className='grid content-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
          <h3 className='text-sm font-semibold'>{t("movements")}</h3>
          {(session.movements ?? []).length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t("noMovements")}</p>
          ) : (
            <ul className='grid gap-2'>
              {(session.movements ?? []).map((m) => (
                <li key={m.id} className='flex items-start justify-between gap-3 border-b border-border pb-2 text-sm last:border-0'>
                  <div>
                    <p className='font-medium'>{m.reason}</p>
                    <p className='text-xs text-muted-foreground'>
                      {formatApiDate(m.created_at)}
                      {m.created_by ? ` · ${m.created_by}` : ""}
                    </p>
                  </div>
                  <span className={cn("font-semibold tabular-nums", m.type === "OUT" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
                    {m.type === "OUT" ? "−" : "+"}
                    {formatMoney(m.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal
        size='sm'
        open={movement != null}
        onOpenChange={(value) => {
          if (!value) setMovement(null);
        }}
        title={movement === "OUT" ? t("addOut") : t("addIn")}
        description={movement === "OUT" ? (blind ? t("outHintBlind") : t("outHint", { amount: formatMoney(session.expected_cash) })) : t("inHint")}
        hideDefaultFooter>
        <form
          className='grid gap-4'
          onSubmit={(event) => {
            event.preventDefault();
            void submitMovement();
          }}>
          <label className='grid gap-1.5 text-sm'>
            <span className='font-medium'>{t("amount")} *</span>
            <input className={inputClass} type='number' inputMode='numeric' min={1} step='100' value={mvAmount} onChange={(e) => setMvAmount(e.target.value)} required />
          </label>
          <label className='grid gap-1.5 text-sm'>
            <span className='font-medium'>{t("reason")} *</span>
            <input className={inputClass} value={mvReason} onChange={(e) => setMvReason(e.target.value)} maxLength={255} required />
          </label>
          <div className='flex justify-end gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setMovement(null)}>
              {tCommon("cancel")}
            </Buttons>
            <Buttons type='submit' loading={mvBusy} disabled={!(Number(mvAmount) > 0) || !mvReason.trim()} className='rounded-full'>
              {tCommon("save")}
            </Buttons>
          </div>
        </form>
      </Modal>

      <Modal
        size='lg'
        open={closing}
        onOpenChange={setClosing}
        title={t("closeTitle")}
        description={blind ? t("closeDescriptionBlind") : t("closeDescription")}
        hideDefaultFooter>
        <form
          className='grid gap-5'
          onSubmit={(event) => {
            event.preventDefault();
            void submitClose();
          }}>
          <section className='grid gap-3'>
            <h4 className='text-sm font-semibold'>{t("cashCount")}</h4>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              {DENOMINATIONS.map((value) => (
                <label key={value} className='grid gap-1 text-xs'>
                  <span className='text-muted-foreground'>{formatMoney(value)}</span>
                  <input
                    className={cn(inputClass, "h-9")}
                    type='number'
                    min={0}
                    step='1'
                    inputMode='numeric'
                    value={denoms[value] ?? ""}
                    onChange={(e) => setDenoms((current) => ({ ...current, [value]: e.target.value }))}
                    aria-label={t("denomination", { value: formatMoney(value) })}
                  />
                </label>
              ))}
            </div>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>{t("countedCash")}</span>
              <input
                className={inputClass}
                type='number'
                inputMode='decimal'
                min={0}
                step='50'
                placeholder={String(denomTotal)}
                value={counted}
                onChange={(e) => setCounted(e.target.value)}
              />
              <span className='text-xs text-muted-foreground'>{t("countedCashHint")}</span>
            </label>
            {blind ? (
              <div className='grid gap-1 rounded-lg bg-muted/40 p-3 text-sm'>
                <p className='text-xs text-muted-foreground'>{t("countedCash")}</p>
                <p className='font-semibold tabular-nums'>{formatMoney(countedCash)}</p>
                <p className='text-xs text-muted-foreground'>{t("blindToleranceHint", { tolerance: formatMoney(tolerance) })}</p>
              </div>
            ) : (
            <div className='grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-sm'>
              <div>
                <p className='text-xs text-muted-foreground'>{t("expectedCash")}</p>
                <p className='font-semibold tabular-nums'>{formatMoney(session.expected_cash)}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{t("countedCash")}</p>
                <p className='font-semibold tabular-nums'>{formatMoney(countedCash)}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{t("cashDifference")}</p>
                <p className={cn("font-semibold tabular-nums", diff < 0 ? "text-destructive" : diff > 0 ? "text-amber-700" : "text-emerald-700")}>
                  {diff > 0 ? "+" : ""}
                  {formatMoney(diff)}
                </p>
              </div>
            </div>
            )}
          </section>

          {nonCash.length > 0 ? (
            <section className='grid gap-3'>
              <h4 className='text-sm font-semibold'>{t("otherMethods")}</h4>
              {nonCash.map((m) => (
                <label key={m.payment_method_id} className='grid grid-cols-[minmax(0,1fr)_10rem] items-center gap-3 text-sm'>
                  <span>
                    {m.name}
                    {!blind ? (
                      <span className='block text-xs text-muted-foreground'>{t("expectedValue", { amount: formatMoney(m.expected_amount) })}</span>
                    ) : null}
                  </span>
                  <input
                    className={inputClass}
                    type='number'
                    inputMode='decimal'
                    min={0}
                    value={counts[m.payment_method_id ?? 0] ?? ""}
                    onChange={(e) => setCounts((current) => ({ ...current, [m.payment_method_id ?? 0]: e.target.value }))}
                  />
                </label>
              ))}
            </section>
          ) : null}

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>{t("closedBy")} *</span>
              <input className={inputClass} value={closer} onChange={(e) => setCloser(e.target.value)} maxLength={120} required />
            </label>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>
                {t("notes")}
                {needsNotes ? " *" : ""}
              </span>
              <input
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                required={needsNotes}
                aria-invalid={needsNotes && !notes.trim()}
              />
            </label>
          </div>
          {needsNotes ? (
            <p role='status' className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm'>
              {t("toleranceExceeded", { tolerance: formatMoney(tolerance) })}
            </p>
          ) : null}
          {(session.pending_payments ?? 0) > 0 ? (
            <p className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300'>
              {t("pendingWarning", { count: session.pending_payments ?? 0 })}
            </p>
          ) : null}
          <div className='flex justify-end gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setClosing(false)}>
              {tCommon("cancel")}
            </Buttons>
            <Buttons type='submit' loading={closeBusy} disabled={!closer.trim() || (needsNotes && !notes.trim())} className='rounded-full'>
              <HiOutlineLockClosed className='h-4 w-4' aria-hidden='true' />
              {t("confirmClose")}
            </Buttons>
          </div>
        </form>
      </Modal>
    </section>
  );
};
