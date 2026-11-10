/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineBanknotes, HiOutlineClock, HiOutlineQueueList, HiOutlineWallet } from "react-icons/hi2";
import { SectionCard, EmptyBlock } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { PageHeader } from "@/components/page-header";
import { StatCards } from "@/components/stat-cards";
import { formatApiDate, formatLocalDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { create_payout_batch_action } from "@/server/domains/marketplace/payouts/actions";
import { formatCurrency } from "../models/marketplace.interface";
import { PAYOUTS_HREF, PAYOUT_STATUS_VARIANT, type IBank, type IPayoutBatchSummary, type IPayoutFormat, type IPayoutPreview } from "../models/payout.interface";
import { BankCatalog } from "./bank-catalog";
import { PayoutFormatEditor } from "./payout-format-editor";

const INPUT = "h-9 w-32 rounded-lg border border-input bg-background px-2 text-right text-sm tabular-nums";
const money = (value: number | null | undefined) => formatCurrency(value, "COP");

/**
 * Pagos a vendedores: lo que la tienda les debe por lo que cobró por ellos, lo retenido por órdenes
 * sin entregar (o entregadas hace pocos días) y lo pagable hoy. Se arma un lote con los elegidos, se
 * descarga para el banco y se marca cada pago como hecho.
 */
export const PayoutManager = ({ preview, batches, banks = [], formats = [], canManage }: { preview: IPayoutPreview;
  batches: IPayoutBatchSummary[]; banks?: IBank[]; formats?: IPayoutFormat[]; canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.payout");
  const tStatus = useTranslations("Administre.marketplace.payout.statuses");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const selectable = (p: IPayoutPreview["payees"][number]) => p.payable > 0 && p.bank_account != null && p.pending_batch_id == null;
  const [selected, setSelected] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(preview.payees.filter(selectable).map((p) => [p.seller_id, true])));
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const chosen = preview.payees.filter((p) => selectable(p) && selected[p.seller_id]);
  const amountOf = (sellerId: number, payable: number) => {
    const raw = amounts[sellerId];
    return raw == null || raw.trim() === "" ? payable : Number(raw.replace(",", "."));
  };
  const total = chosen.reduce((sum, p) => sum + (Number.isFinite(amountOf(p.seller_id, p.payable)) ? amountOf(p.seller_id, p.payable) : 0), 0);

  const create = async () => {
    if (chosen.length === 0) return;
    const items = chosen.map((p) => ({ seller_id: p.seller_id, amount: amounts[p.seller_id]?.trim() ? amountOf(p.seller_id, p.payable) : null }));
    if (items.some((i) => i.amount != null && (!Number.isFinite(i.amount) || i.amount <= 0))) {
      notify.error(tCommon("errorTitle"), t("invalidAmount"));
      return;
    }
    setBusy(true);
    const result = await create_payout_batch_action({ items, note: note.trim() || null });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("created"), result.data.summary.number ?? "");
    router.push(`${PAYOUTS_HREF}/${result.data.summary.id}`);
  };

  const missingBank = preview.payees.filter((p) => p.payable > 0 && p.bank_account == null).length;

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("title")} description={t("description", { days: preview.hold_days })} icon={HiOutlineBanknotes}
        eyebrow={tCrud("domains.marketplace")} />

      <StatCards items={[
        { label: t("stats.owed"), value: money(preview.total_owed), icon: HiOutlineWallet },
        { label: t("stats.payable"), value: money(preview.total_payable), icon: HiOutlineBanknotes, tone: preview.total_payable > 0 ? "warning" : "default",
          hint: t("stats.releasedThrough", { date: formatLocalDate(preview.released_through) }) },
        { label: t("stats.sellers"), value: formatNumber(preview.payees.length), icon: HiOutlineQueueList,
          hint: missingBank > 0 ? t("stats.missingBank", { count: missingBank }) : undefined },
        { label: t("stats.openBatches"), value: formatNumber(batches.filter((b) => b.status === "OPEN").length), icon: HiOutlineClock },
      ]} />

      <SectionCard id='payout-preview' icon={HiOutlineWallet} title={t("payees")} hint={t("payeesHint")} contentClassName='p-0'>
        <div className='col-span-12 overflow-x-auto'>
          {preview.payees.length === 0 ? (
            <div className='grid grid-cols-12 p-4'><EmptyBlock icon={HiOutlineWallet} title={t("emptyTitle")} description={t("emptyDescription")} /></div>
          ) : (
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  {canManage ? <th className='w-10 px-4 py-2' /> : null}
                  <th className='px-4 py-2'>{t("fields.seller")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.owed")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.held")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.payable")}</th>
                  <th className='px-4 py-2'>{t("fields.bank")}</th>
                  {canManage ? <th className='px-4 py-2 text-right'>{t("fields.amount")}</th> : null}
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {preview.payees.map((p) => {
                  const can = selectable(p);
                  return (
                    <tr key={p.seller_id}>
                      {canManage ? (
                        <td className='px-4 py-2'>
                          <input type='checkbox' aria-label={p.seller_name} disabled={!can} checked={can && Boolean(selected[p.seller_id])}
                            onChange={(event) => setSelected((s) => ({ ...s, [p.seller_id]: event.target.checked }))} />
                        </td>
                      ) : null}
                      <td className='px-4 py-2'>
                        <Link href={`/marketplace/sellers/${p.seller_id}`} className='font-medium hover:text-primary hover:underline'>{p.seller_name}</Link>
                        <p className='text-xs text-muted-foreground'>{p.seller_doc ?? ""}</p>
                        {p.pending_batch_id != null ? (
                          <Link href={`${PAYOUTS_HREF}/${p.pending_batch_id}`} className='text-xs text-primary hover:underline'>
                            {t("inBatch", { number: p.pending_batch_number ?? "" })}
                          </Link>
                        ) : null}
                      </td>
                      <td className='px-4 py-2 text-right tabular-nums'>{money(p.owed)}</td>
                      <td className='px-4 py-2 text-right tabular-nums text-muted-foreground'>{money(p.held)}</td>
                      <td className='px-4 py-2 text-right font-semibold tabular-nums'>{money(p.payable)}</td>
                      <td className='px-4 py-2 text-xs'>
                        {p.bank_account ? (
                          <span>{p.bank_account.bank_name} · {p.bank_account.account_number}</span>
                        ) : (
                          <Link href={`/marketplace/sellers/${p.seller_id}`} className='text-destructive hover:underline'>{t("noBank")}</Link>
                        )}
                      </td>
                      {canManage ? (
                        <td className='px-4 py-2 text-right'>
                          <input inputMode='decimal' disabled={!can || !selected[p.seller_id]} placeholder={String(p.payable)}
                            aria-label={t("fields.amount")} value={amounts[p.seller_id] ?? ""} className={INPUT}
                            onChange={(event) => setAmounts((a) => ({ ...a, [p.seller_id]: event.target.value }))} />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {canManage && preview.payees.length > 0 ? (
          <div className='col-span-12 flex flex-wrap items-center gap-3 border-t border-border p-4'>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("notePlaceholder")} maxLength={500}
              className='h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm' />
            <span className='text-sm text-muted-foreground'>{t("selection", { count: chosen.length, amount: money(total) })}</span>
            <Buttons type='button' className='rounded-full' loading={busy} disabled={chosen.length === 0} onClick={() => void create()}>
              {t("createBatch")}
            </Buttons>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard id='payout-batches' icon={HiOutlineQueueList} title={t("batches")} contentClassName='p-0'>
        <div className='col-span-12 overflow-x-auto'>
          {batches.length === 0 ? (
            <p className='p-4 text-sm text-muted-foreground'>{t("noBatches")}</p>
          ) : (
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='px-4 py-2'>{t("fields.batch")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.items")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.total")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.paid")}</th>
                  <th className='px-4 py-2'>{t("fields.status")}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className='px-4 py-2'>
                      <Link href={`${PAYOUTS_HREF}/${b.id}`} className='font-mono font-semibold hover:text-primary hover:underline'>{b.number ?? `#${b.id}`}</Link>
                      <p className='text-xs text-muted-foreground'>{[b.created_by_name, b.created_at ? formatApiDate(b.created_at) : null].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(b.items)}</td>
                    <td className='px-4 py-2 text-right tabular-nums'>{money(b.total)}</td>
                    <td className='px-4 py-2 text-right tabular-nums'>{money(b.paid_total)}</td>
                    <td className='px-4 py-2'><Badge variant={PAYOUT_STATUS_VARIANT[b.status] ?? "outline"}>{tStatus(b.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>

      {canManage ? <PayoutFormatEditor formats={formats} /> : null}
      {canManage ? <BankCatalog banks={banks} /> : null}
    </section>
  );
};
