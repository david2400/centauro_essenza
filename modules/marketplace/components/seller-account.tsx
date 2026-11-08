/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineBanknotes } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatLocalDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { adjust_seller_account_action, register_seller_payment_action, register_seller_settlement_action } from "@/server/domains/marketplace/actions";
import { BILLING_HREF, formatCurrency, operationKey, type IMarketplaceAccess, type ISellerAccount } from "../models/marketplace.interface";

type Mode = "payment" | "settlement" | "adjustment" | null;

/**
 * Estado de cuenta del vendedor con la plataforma: comisiones exigibles, mensualidades, pagos
 * recibidos y ajustes. El vencido y el interés de mora son a la fecha; el interés es una
 * estimación (no se asienta solo). Nada se cobra automáticamente.
 */
export const SellerAccount = ({ sellerId, account: initial, access }: { sellerId: number; account: ISellerAccount; access: IMarketplaceAccess }) => {
  const t = useTranslations("Administre.marketplace.account");
  const tTypes = useTranslations("Administre.marketplace.account.types");
  const tCommon = useTranslations("Administre.common");
  const [account, setAccount] = useState(initial);
  const [mode, setMode] = useState<Mode>(null);
  const [form, setForm] = useState({ amount: "", reference: "", note: "", sign: "+" });
  const [key, setKey] = useState(operationKey);
  const [busy, setBusy] = useState(false);
  const money = (value: number) => formatCurrency(value, account.currency);

  const open = (next: Mode) => {
    setMode(next);
    setForm({ amount: "", reference: "", note: "", sign: "+" });
    setKey(operationKey());
  };

  const submit = async () => {
    const amount = Number(form.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.error(tCommon("errorTitle"), t("invalidAmount"));
      return;
    }
    setBusy(true);
    const withReference = { amount, reference: form.reference, note: form.note || undefined, key };
    const result = mode === "payment"
      ? await register_seller_payment_action(sellerId, withReference)
      : mode === "settlement"
      ? await register_seller_settlement_action(sellerId, withReference)
      : await adjust_seller_account_action(sellerId, { amount: form.sign === "-" ? -amount : amount, reason: form.note, key });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setAccount(result.data);
    notify.success(mode === "payment" ? t("paymentDone") : mode === "settlement" ? t("settlementDone") : t("adjustmentDone"), money(amount));
    setMode(null);
  };

  // Saldo negativo: la tienda le debe al vendedor (ventas en consignación cobradas por la tienda).
  const payable = account.balance < 0 ? -account.balance : 0;
  const kpis: [string, number, string?][] = [
    payable > 0 ? [t("payable"), payable, "text-amber-600"] : [t("balance"), account.balance, account.balance > 0 ? "text-foreground" : "text-emerald-600"],
    [t("overdue"), account.overdue, account.overdue > 0 ? "text-destructive" : undefined],
    [t("interest"), account.late_interest_estimate],
    [t("pending"), account.pending_commissions],
  ];

  return (
    <SectionCard id='seller-account' icon={HiOutlineBanknotes} title={t("title")} hint={t("hint", { date: formatLocalDate(account.as_of) })}
      actions={
        <div className='flex flex-wrap gap-2'>
          {access.billingManage ? (
            <Buttons type='button' size='sm' className='rounded-full' onClick={() => open("payment")}>{t("registerPayment")}</Buttons>
          ) : null}
          {access.billingManage && payable > 0 ? (
            <Buttons type='button' size='sm' variant='outline' className='rounded-full' onClick={() => open("settlement")}>
              {t("registerSettlement")}
            </Buttons>
          ) : null}
          {access.billingAdjust ? (
            <Buttons type='button' size='sm' variant='outline' className='rounded-full' onClick={() => open("adjustment")}>{t("adjust")}</Buttons>
          ) : null}
        </div>
      }
      contentClassName='p-4'>
      <dl className='col-span-12 grid gap-2 sm:grid-cols-4'>
        {kpis.map(([label, value, tone]) => (
          <div key={label} className='rounded-xl bg-muted/30 px-3 py-2'>
            <dt className='text-xs text-muted-foreground'>{label}</dt>
            <dd className={cn("text-base font-semibold tabular-nums", tone)}>{money(value)}</dd>
          </div>
        ))}
      </dl>
      {account.unapplied_credit > 0 ? <p className='col-span-12 mt-2 text-xs text-muted-foreground'>{t("unapplied", { amount: money(account.unapplied_credit) })}</p> : null}

      {mode ? (
        <div className='col-span-12 mt-4 grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-4'>
          <p className='text-sm font-semibold sm:col-span-4'>
            {mode === "payment" ? t("paymentTitle") : mode === "settlement" ? t("settlementTitle", { amount: money(payable) }) : t("adjustmentTitle")}
          </p>
          {mode === "adjustment" ? (
            <label className='grid gap-1 text-sm'>
              <span className='font-medium'>{t("direction")}</span>
              <select value={form.sign} onChange={(event) => setForm({ ...form, sign: event.target.value })}
                className='h-9 rounded-lg border border-input bg-background px-2 text-sm'>
                <option value='+'>{t("charge")}</option>
                <option value='-'>{t("credit")}</option>
              </select>
            </label>
          ) : null}
          <label className='grid gap-1 text-sm'>
            <span className='font-medium'>{t("amount", { currency: account.currency })}</span>
            <input inputMode='decimal' value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className='h-9 rounded-lg border border-input bg-background px-3 text-sm tabular-nums' />
          </label>
          {mode === "payment" || mode === "settlement" ? (
            <label className='grid gap-1 text-sm'>
              <span className='font-medium'>{t("reference")}</span>
              <input value={form.reference} maxLength={80} onChange={(event) => setForm({ ...form, reference: event.target.value })}
                placeholder={t("referencePlaceholder")} className='h-9 rounded-lg border border-input bg-background px-3 text-sm' />
            </label>
          ) : null}
          <label className={cn("grid gap-1 text-sm", mode === "adjustment" ? "sm:col-span-2" : "")}>
            <span className='font-medium'>{mode === "adjustment" ? t("reason") : t("note")}</span>
            <input value={form.note} maxLength={500} onChange={(event) => setForm({ ...form, note: event.target.value })}
              className='h-9 rounded-lg border border-input bg-background px-3 text-sm' />
          </label>
          <div className='flex items-end gap-2 sm:col-span-4'>
            <Buttons type='button' size='sm' className='rounded-full' loading={busy} onClick={() => void submit()}>{tCommon("save")}</Buttons>
            <Buttons type='button' size='sm' variant='outline' className='rounded-full' disabled={busy} onClick={() => setMode(null)}>
              {tCommon("cancel")}
            </Buttons>
          </div>
        </div>
      ) : null}

      <div className='col-span-12 mt-4 overflow-x-auto'>
        {account.entries.length === 0 ? (
          <p className='text-sm text-muted-foreground'>{t("empty")}</p>
        ) : (
          <table className='w-full text-sm'>
            <thead className='text-left text-xs uppercase tracking-wide text-muted-foreground'>
              <tr>
                <th className='py-2 pr-3'>{t("date")}</th>
                <th className='py-2 pr-3'>{t("concept")}</th>
                <th className='py-2 pr-3 text-right'>{t("value")}</th>
                <th className='py-2 pr-3 text-right'>{t("open")}</th>
                <th className='py-2'>{t("dueOn")}</th>
              </tr>
            </thead>
            <tbody>
              {account.entries.map((entry) => (
                <tr key={entry.id} className='border-t border-border align-top'>
                  <td className='py-2 pr-3 whitespace-nowrap'>{formatLocalDate(entry.entry_date)}</td>
                  <td className='py-2 pr-3'>
                    <p>{tTypes(entry.type as never)}</p>
                    <p className='text-xs text-muted-foreground'>{[entry.reference, entry.note, entry.created_by_name].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className={cn("py-2 pr-3 text-right tabular-nums", entry.amount < 0 ? "text-emerald-600" : undefined)}>{money(entry.amount)}</td>
                  <td className='py-2 pr-3 text-right tabular-nums'>{entry.open > 0 ? money(entry.open) : "—"}</td>
                  <td className={cn("py-2 whitespace-nowrap", entry.days_overdue > 0 ? "text-destructive" : undefined)}>
                    {entry.due_on ? formatLocalDate(entry.due_on) : "—"}
                    {entry.days_overdue > 0 ? <span className='block text-xs'>{t("daysOverdue", { count: entry.days_overdue })}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className='col-span-12 mt-3 text-xs text-muted-foreground'>
        {t("footer")}{" "}
        <Link href={`${BILLING_HREF}?sellerId=${sellerId}`} className='font-medium text-primary hover:underline'>{t("viewCommissions")}</Link>
      </p>
    </SectionCard>
  );
};
