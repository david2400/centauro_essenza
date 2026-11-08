/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { HiOutlineChatBubbleLeftRight, HiOutlineClock, HiOutlineScale } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatApiDate, formatLocalDate, formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { cancel_dispute_action, resolve_dispute_action, respond_dispute_action } from "@/server/domains/marketplace/disputes/actions";
import { SELLERS_HREF } from "../models/marketplace.interface";
import { DISPUTES_HREF, DISPUTE_RESOLUTIONS, DISPUTE_STATUS_VARIANT, type DisputeResolution, type IDisputeDetail } from "../models/dispute.interface";

type Dialog = "RESPOND" | "RESOLVE" | "CANCEL" | null;

const INPUT = "rounded-lg border border-input bg-background px-3 text-sm";

/**
 * Ficha del reclamo: lo que reclama el comprador, la respuesta del vendedor, la decisión y el
 * historial. Las acciones disponibles las dice draco según el estado, el plazo y los permisos.
 */
export const DisputeDetail = ({ dispute }: { dispute: IDisputeDetail }) => {
  const t = useTranslations("Administre.marketplace.dispute");
  const tStatus = useTranslations("Administre.marketplace.dispute.statuses");
  const tReason = useTranslations("Administre.marketplace.dispute.reasons");
  const tResolution = useTranslations("Administre.marketplace.dispute.resolutions");
  const tActions = useTranslations("Administre.marketplace.dispute.eventActions");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const router = useRouter();
  const s = dispute.summary;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [decision, setDecision] = useState({ resolution: "REFUND" as DisputeResolution, amount: "", charge: "", devolution: "" });

  const open = (next: Dialog) => {
    setText("");
    setDecision({ resolution: "REFUND", amount: s.claimed_amount != null ? String(s.claimed_amount) : "", charge: "", devolution: "" });
    setDialog(next);
  };

  const number = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")));

  const submit = async () => {
    setBusy(true);
    const result = dialog === "RESPOND"
      ? await respond_dispute_action(s.id, text, dispute.lock_version)
      : dialog === "CANCEL"
      ? await cancel_dispute_action(s.id, text, dispute.lock_version)
      : await resolve_dispute_action(s.id, {
          resolution: decision.resolution,
          amount: decision.resolution === "REJECTED" ? null : number(decision.amount),
          seller_charge: decision.resolution === "REJECTED" ? null : number(decision.charge),
          note: text,
          devolution_id: number(decision.devolution),
          lock_version: dispute.lock_version,
        });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t(`done.${dialog}` as never), result.data.summary.number ?? "");
    setDialog(null);
    router.refresh();
  };

  const info: [string, string | null][] = [
    [t("fields.reason"), tReason(s.reason)],
    [t("fields.claimed"), s.claimed_amount != null ? formatMoney(s.claimed_amount) : null],
    [t("fields.order"), s.order_number ?? `#${s.order_id}`],
    [t("fields.orderTotal"), formatMoney(dispute.order_total)],
    [t("fields.customer"), s.customer_name],
    [t("fields.seller"), s.seller_name],
    [t("fields.respondBy"), formatLocalDate(s.respond_by)],
    [t("fields.openedBy"), dispute.created_by_name],
  ];

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={DISPUTES_HREF} className='text-sm text-muted-foreground hover:text-foreground'>{t("back")}</Link>
      <PageHeader title={s.number ?? `#${s.id}`} description={`${tReason(s.reason)} · ${s.seller_name}`} icon={HiOutlineScale}
        eyebrow={tCrud("domains.marketplace")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={DISPUTE_STATUS_VARIANT[s.status] ?? "outline"}>{tStatus(s.status)}</Badge>
            {s.overdue ? <Badge variant='destructive'>{t("overdue")}</Badge> : null}
            {dispute.actions.includes("RESPOND") ? (
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => open("RESPOND")}>{t("actions.RESPOND")}</Buttons>
            ) : null}
            {dispute.actions.includes("CANCEL") ? (
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => open("CANCEL")}>{t("actions.CANCEL")}</Buttons>
            ) : null}
            {dispute.actions.includes("RESOLVE") ? (
              <Buttons type='button' className='rounded-full' onClick={() => open("RESOLVE")}>{t("actions.RESOLVE")}</Buttons>
            ) : null}
          </div>
        } />

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='grid content-start gap-6'>
          <SectionCard id='dispute-claim' icon={HiOutlineChatBubbleLeftRight} title={t("claim")} contentClassName='p-4'>
            <p className='col-span-12 whitespace-pre-line text-sm'>{dispute.description}</p>
            <div className='col-span-12 mt-4 rounded-xl bg-muted/30 p-3 text-sm'>
              <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{t("sellerResponse")}</p>
              {dispute.seller_response ? (
                <>
                  <p className='mt-1 whitespace-pre-line'>{dispute.seller_response}</p>
                  {dispute.responded_at ? <p className='mt-1 text-xs text-muted-foreground'>{formatApiDate(dispute.responded_at)}</p> : null}
                </>
              ) : (
                <p className='mt-1 text-muted-foreground'>{s.overdue ? t("noResponseOverdue") : t("noResponse", { date: formatLocalDate(s.respond_by) })}</p>
              )}
            </div>
            {s.resolution || s.status === "CANCELLED" ? (
              <div className='col-span-12 mt-4 rounded-xl border border-border p-3 text-sm'>
                <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{t("decision")}</p>
                {s.resolution ? <p className='mt-1 font-medium'>{tResolution(s.resolution)}</p> : null}
                {s.resolution_amount ? <p className='text-muted-foreground'>{t("refundLine", { amount: formatMoney(s.resolution_amount) })}</p> : null}
                {dispute.seller_charge ? <p className='text-muted-foreground'>{t("chargeLine", { amount: formatMoney(dispute.seller_charge) })}</p> : null}
                {dispute.resolution_note ? <p className='mt-1 whitespace-pre-line'>{dispute.resolution_note}</p> : null}
                {dispute.devolution_id ? (
                  <Link href={`/postventa/devolutions/${dispute.devolution_id}`} className='mt-1 inline-block text-primary hover:underline'>
                    {t("devolutionLink", { id: dispute.devolution_id })}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </SectionCard>
          <SectionCard id='dispute-history' icon={HiOutlineClock} title={t("history")} contentClassName='p-4'>
            <ol className='col-span-12 grid gap-3 text-sm'>
              {dispute.events.map((event, index) => (
                <li key={index} className='border-l-2 border-border pl-3'>
                  <p className='font-medium'>{tActions(event.action as never)} · {tStatus(event.to_status as never)}</p>
                  {event.note ? <p className='text-muted-foreground'>{event.note}</p> : null}
                  <p className='text-xs text-muted-foreground'>{[event.actor_name, event.created_at ? formatApiDate(event.created_at) : null].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
        <aside className='grid content-start gap-6'>
          <SectionCard id='dispute-info' icon={HiOutlineScale} title={t("data")} contentClassName='p-4'>
            <dl className='col-span-12 grid gap-2 text-sm'>
              {info.map(([label, value]) => (
                <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                  <dt className='text-muted-foreground'>{label}</dt>
                  <dd className='text-right font-medium'>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className='col-span-12 mt-3 grid gap-1 text-sm'>
              <Link href={`/ventas/orders/${s.order_id}`} className='text-primary hover:underline'>{t("viewOrder")}</Link>
              <Link href={`${SELLERS_HREF}/${s.seller_id}`} className='text-primary hover:underline'>{t("viewSeller")}</Link>
            </div>
          </SectionCard>
        </aside>
      </div>

      <Modal size='md' title={dialog ? t(`actions.${dialog}` as never) : ""} open={dialog != null} onOpenChange={(value) => !value && setDialog(null)}
        hideDefaultFooter={true}>
        {dialog ? (
          <form className='grid gap-4' onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            {dialog === "RESOLVE" ? (
              <>
                <label className='grid gap-1.5 text-sm'>
                  <span className='font-medium'>{t("fields.resolution")}</span>
                  <select value={decision.resolution} onChange={(event) => setDecision({ ...decision, resolution: event.target.value as DisputeResolution })}
                    className={`h-10 ${INPUT}`}>
                    {DISPUTE_RESOLUTIONS.map((value) => <option key={value} value={value}>{tResolution(value)}</option>)}
                  </select>
                </label>
                {decision.resolution !== "REJECTED" ? (
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <label className='grid gap-1.5 text-sm'>
                      <span className='font-medium'>{t("fields.refund")}</span>
                      <input inputMode='decimal' value={decision.amount} onChange={(event) => setDecision({ ...decision, amount: event.target.value })}
                        className={`h-10 tabular-nums ${INPUT}`} />
                    </label>
                    <label className='grid gap-1.5 text-sm'>
                      <span className='font-medium'>{t("fields.sellerCharge")}</span>
                      <input inputMode='decimal' value={decision.charge} onChange={(event) => setDecision({ ...decision, charge: event.target.value })}
                        className={`h-10 tabular-nums ${INPUT}`} />
                      <span className='text-xs text-muted-foreground'>{t("form.chargeHint")}</span>
                    </label>
                    <label className='grid gap-1.5 text-sm sm:col-span-2'>
                      <span className='font-medium'>{t("fields.devolution")}</span>
                      <input inputMode='numeric' value={decision.devolution} onChange={(event) => setDecision({ ...decision, devolution: event.target.value })}
                        placeholder={t("form.devolutionPlaceholder")} className={`h-10 ${INPUT}`} />
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium'>{t(`dialog.${dialog}` as never)}</span>
              <textarea required minLength={5} maxLength={1000} rows={3} value={text} onChange={(event) => setText(event.target.value)}
                className={`py-2 ${INPUT}`} />
            </label>
            <div className='flex justify-end gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setDialog(null)}>{tCommon("cancel")}</Buttons>
              <Buttons type='submit' className='rounded-full' loading={busy}>{t(`actions.${dialog}` as never)}</Buttons>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
};
