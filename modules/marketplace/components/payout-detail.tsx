/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { HiOutlineArrowDownTray, HiOutlineArrowPath, HiOutlineBanknotes, HiOutlinePaperAirplane } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatApiDate, formatLocalDate } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import {
  cancel_payout_batch_action,
  dispatch_payout_batch_action,
  export_payout_batch_action,
  pay_payout_action,
  reject_payout_item_action,
  sync_payout_batch_action,
} from "@/server/domains/marketplace/payouts/actions";
import { formatCurrency } from "../models/marketplace.interface";
import { PAYOUTS_HREF, PAYOUT_STATUS_VARIANT, type IPayoutBatchDetail, type IPayoutFormat, type IPayoutItem } from "../models/payout.interface";

const INPUT = "h-10 rounded-lg border border-input bg-background px-3 text-sm";
type Kind = "PAY" | "REJECT" | "CANCEL" | "DISPATCH";
type Dialog = { kind: Kind; item: IPayoutItem | null } | null;
const DISPATCH_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = { SENT: "secondary", FAILED: "destructive", DONE: "outline" };

/** Lote de pagos: descarga para el banco, marcar pagos hechos (asienta la liquidación) o rechazados, y anular. */
export const PayoutDetail = ({ batch: initial, formats = [] }: { batch: IPayoutBatchDetail; formats?: IPayoutFormat[] }) => {
  const t = useTranslations("Administre.marketplace.payout");
  const tStatus = useTranslations("Administre.marketplace.payout.statuses");
  const tAccount = useTranslations("Administre.marketplace.payout.accountTypes");
  const tKey = useTranslations("Administre.marketplace.payout.keyTypes");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const [batch, setBatch] = useState(initial);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState({ reference: "", paid_on: "", note: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [formatId, setFormatId] = useState(String(formats.find((f) => !f.built_in)?.id ?? 0));
  const [applyOn, setApplyOn] = useState("");
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const tDispatch = useTranslations("Administre.marketplace.payout.dispatch");
  const money = (value: number) => formatCurrency(value, "COP");
  const can = (action: IPayoutBatchDetail["actions"][number]) => batch.actions.includes(action);

  const open = (kind: Kind, item: IPayoutItem | null) => {
    setForm({ reference: "", paid_on: "", note: "", reason: "" });
    setDialog({ kind, item });
  };

  const submit = async () => {
    if (!dialog) return;
    setBusy(true);
    const id = batch.summary.id;
    const result = dialog.kind === "DISPATCH"
      ? await dispatch_payout_batch_action(id)
      : dialog.kind === "PAY"
      ? await pay_payout_action(id, dialog.item?.id ?? null, { reference: form.reference, paid_on: form.paid_on || null, note: form.note || null })
      : dialog.kind === "REJECT" && dialog.item
      ? await reject_payout_item_action(id, dialog.item.id, form.reason)
      : await cancel_payout_batch_action(id, form.reason);
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setBatch(result.data);
    setDialog(null);
    if (dialog.kind === "DISPATCH") {
      const status = result.data.dispatch?.status;
      if (status === "FAILED") notify.error(tCommon("errorTitle"), result.data.dispatch?.detail ?? "");
      else notify.success(tDispatch(status === "SENT" && result.data.dispatch?.provider_batch_id ? "sent" : "uncertain"));
      return;
    }
    notify.success(t(`done.${dialog.kind}` as never));
  };

  const sync = async () => {
    setSyncing(true);
    const result = await sync_payout_batch_action(batch.summary.id);
    setSyncing(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setBatch(result.data);
    notify.success(tDispatch("synced"));
  };

  const download = async () => {
    setExporting(true);
    const result = await export_payout_batch_action(batch.summary.id, Number(formatId) || null, applyOn || null);
    setExporting(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    // Bytes tal cual (la codificación la define el formato del banco: UTF-8, ISO-8859-1…).
    const bytes = Uint8Array.from(atob(result.data.base64), (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: result.data.content_type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.file_name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pending = batch.items.filter((i) => i.status === "PENDING");

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={PAYOUTS_HREF} className='text-sm text-muted-foreground hover:text-foreground'>{t("back")}</Link>
      <PageHeader title={batch.summary.number ?? `#${batch.summary.id}`} icon={HiOutlineBanknotes} eyebrow={tCrud("domains.marketplace")}
        description={[batch.summary.created_by_name, batch.summary.created_at ? formatApiDate(batch.summary.created_at) : null,
          t("holdDays", { days: batch.hold_days })].filter(Boolean).join(" · ")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={PAYOUT_STATUS_VARIANT[batch.summary.status] ?? "outline"}>{tStatus(batch.summary.status)}</Badge>
            {can("EXPORT") ? (
              <div className='flex flex-wrap items-center gap-2'>
                <select value={formatId} onChange={(e) => setFormatId(e.target.value)} aria-label={t("fileFormat")}
                  className='h-10 rounded-lg border border-input bg-background px-3 text-sm'>
                  {(formats.length ? formats : [{ id: 0, name: t("genericFormat") } as IPayoutFormat]).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input type='date' value={applyOn} onChange={(e) => setApplyOn(e.target.value)} aria-label={t("applyOn")} title={t("applyOn")}
                  className='h-10 rounded-lg border border-input bg-background px-3 text-sm' />
                <Buttons type='button' variant='outline' className='rounded-full' loading={exporting} onClick={() => void download()}>
                  <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />{t("export")}
                </Buttons>
              </div>
            ) : null}
            {can("CANCEL") ? <Buttons type='button' variant='outline' className='rounded-full' onClick={() => open("CANCEL", null)}>{t("actions.CANCEL")}</Buttons> : null}
            {can("PAY") && pending.length > 0 ? (
              <Buttons type='button' className='rounded-full' onClick={() => open("PAY", null)}>{t("actions.PAY_ALL", { count: pending.length })}</Buttons>
            ) : null}
          </div>
        } />

      {batch.note || batch.status_reason ? (
        <p className='rounded-2xl border border-border bg-muted/30 p-4 text-sm'>{[batch.note, batch.status_reason].filter(Boolean).join(" · ")}</p>
      ) : null}

      {batch.dispatch ? (
        <SectionCard id='payout-dispatch' icon={HiOutlinePaperAirplane} title={tDispatch("title", { provider: batch.dispatch.provider })}
          hint={batch.dispatch.configured ? tDispatch("hint") : tDispatch("notConfigured")}>
          <div className='col-span-12 flex flex-wrap items-center gap-2 text-sm'>
            <Badge variant={batch.dispatch.environment === "production" ? "destructive" : "secondary"}>
              {tDispatch(`environments.${batch.dispatch.environment}` as never)}
            </Badge>
            <Badge variant={batch.dispatch.status ? DISPATCH_VARIANT[batch.dispatch.status] ?? "outline" : "outline"}>
              {tDispatch(`statuses.${batch.dispatch.status ?? "NONE"}` as never)}
            </Badge>
            {batch.dispatch.provider_batch_id ? (
              <span className='font-mono text-xs text-muted-foreground'>{batch.dispatch.provider_batch_id}</span>
            ) : null}
            {batch.dispatch.dispatched_at ? (
              <span className='text-xs text-muted-foreground'>{formatApiDate(batch.dispatch.dispatched_at)}</span>
            ) : null}
            <div className='ml-auto flex flex-wrap gap-2'>
              {can("SYNC") ? (
                <Buttons type='button' variant='outline' className='rounded-full' loading={syncing} onClick={() => void sync()}>
                  <HiOutlineArrowPath className='h-4 w-4' aria-hidden='true' />{tDispatch("sync")}
                </Buttons>
              ) : null}
              {can("DISPATCH") ? (
                <Buttons type='button' className='rounded-full' onClick={() => open("DISPATCH", null)}>
                  <HiOutlinePaperAirplane className='h-4 w-4' aria-hidden='true' />{tDispatch("send", { count: pending.length })}
                </Buttons>
              ) : null}
            </div>
          </div>
          {batch.dispatch.detail ? <p className='col-span-12 text-sm text-muted-foreground'>{batch.dispatch.detail}</p> : null}
          {batch.dispatch.problems.length > 0 ? (
            <div className='col-span-12 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm'>
              <p className='font-medium'>{tDispatch("problems")}</p>
              <ul className='mt-1 list-disc pl-5 text-muted-foreground'>
                {batch.dispatch.problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard id='payout-items' icon={HiOutlineBanknotes} title={t("items", { count: batch.items.length })}
        hint={t("itemsHint", { total: money(batch.summary.total), paid: money(batch.summary.paid_total) })} contentClassName='p-0'>
        <div className='col-span-12 overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
              <tr>
                <th className='px-4 py-2'>{t("fields.seller")}</th>
                <th className='px-4 py-2'>{t("fields.bank")}</th>
                <th className='px-4 py-2 text-right'>{t("fields.amount")}</th>
                <th className='px-4 py-2'>{t("fields.status")}</th>
                <th className='px-4 py-2' />
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {batch.items.map((item) => (
                <tr key={item.id}>
                  <td className='px-4 py-2'>
                    <Link href={`/marketplace/sellers/${item.seller_id}`} className='font-medium hover:text-primary hover:underline'>{item.seller_name}</Link>
                    <p className='text-xs text-muted-foreground'>{item.seller_doc ?? ""}</p>
                  </td>
                  <td className='px-4 py-2 text-xs'>
                    <p>
                      {item.bank_name}{item.bank_code ? ` (${item.bank_code})` : ""} · {tAccount(item.account_type as never)}
                      {item.key_type ? ` · ${tKey(item.key_type as never)}` : ""} · <span className='font-mono'>{item.account_number}</span>
                    </p>
                    <p className='text-muted-foreground'>{item.holder_name} · {item.holder_doc_type} {item.holder_doc_number}</p>
                  </td>
                  <td className='px-4 py-2 text-right font-semibold tabular-nums'>{money(item.amount)}</td>
                  <td className='px-4 py-2'>
                    <Badge variant={PAYOUT_STATUS_VARIANT[item.status] ?? "outline"}>{tStatus(item.status)}</Badge>
                    {item.provider_status ? (
                      <p className='mt-1 text-xs text-muted-foreground' title={item.provider_detail ?? undefined}>
                        {tDispatch("providerStatus", { status: item.provider_status })}
                      </p>
                    ) : null}
                    {item.reference || item.note ? (
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {[item.reference, item.paid_on ? formatLocalDate(item.paid_on) : null, item.note].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </td>
                  <td className='px-4 py-2 text-right'>
                    {item.status === "PENDING" && can("PAY") ? (
                      <div className='flex justify-end gap-2'>
                        <Buttons type='button' variant='outline' className='h-8 rounded-full px-3 text-xs' onClick={() => open("REJECT", item)}>{t("actions.REJECT")}</Buttons>
                        <Buttons type='button' className='h-8 rounded-full px-3 text-xs' onClick={() => open("PAY", item)}>{t("actions.PAY")}</Buttons>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal size='md' open={dialog != null} onOpenChange={(value) => !value && setDialog(null)} hideDefaultFooter={true}
        title={dialog ? (dialog.kind === "DISPATCH" ? tDispatch("send", { count: pending.length })
          : dialog.kind === "PAY" && !dialog.item ? t("actions.PAY_ALL", { count: pending.length }) : t(`actions.${dialog.kind}` as never)) : ""}>
        {dialog ? (
          <form className='grid gap-4 text-sm' onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <p className='text-muted-foreground'>
              {dialog.kind === "DISPATCH"
                ? tDispatch(batch.dispatch?.environment === "production" ? "confirmProduction" : "confirmSandbox", {
                    count: pending.length, amount: money(pending.reduce((s, i) => s + i.amount, 0)) })
                : dialog.kind === "PAY" ? t("payHint", { amount: money(dialog.item ? dialog.item.amount : pending.reduce((s, i) => s + i.amount, 0)) })
                : dialog.kind === "REJECT" ? t("rejectHint") : t("cancelHint")}
            </p>
            {dialog.kind === "PAY" ? (
              <>
                <label className='grid gap-1.5'>
                  <span className='font-medium'>{t("fields.reference")}</span>
                  <input required maxLength={60} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={INPUT} />
                </label>
                <label className='grid gap-1.5'>
                  <span className='font-medium'>{t("fields.paidOn")}</span>
                  <input type='date' value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} className={INPUT} />
                </label>
                <label className='grid gap-1.5'>
                  <span className='font-medium'>{t("fields.note")}</span>
                  <input maxLength={500} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={INPUT} />
                </label>
              </>
            ) : dialog.kind === "DISPATCH" ? null : (
              <label className='grid gap-1.5'>
                <span className='font-medium'>{t("fields.reason")}</span>
                <textarea required minLength={5} maxLength={500} rows={3} value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })} className='rounded-lg border border-input bg-background p-3 text-sm' />
              </label>
            )}
            <div className='flex justify-end gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setDialog(null)}>{tCommon("cancel")}</Buttons>
              <Buttons type='submit' className='rounded-full' loading={busy}>{t("confirm")}</Buttons>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
};
