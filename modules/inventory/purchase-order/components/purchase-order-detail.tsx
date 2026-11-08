/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { HiOutlineArchiveBoxArrowDown, HiOutlineClipboardDocumentList, HiOutlineClock, HiOutlinePencilSquare, HiOutlinePrinter } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatApiDate, formatLocalDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { purchase_order_command_action, receive_purchase_order_action } from "@/server/domains/inventory/purchase-orders/actions";
import { PURCHASE_ORDERS_HREF, PURCHASE_STATUS_VARIANT, type IPurchaseOrderDetail } from "../models/purchase-order.interface";

type Dialog = "RECEIVE" | "CANCEL" | "CLOSE" | null;
const INPUT = "rounded-lg border border-input bg-background px-3 text-sm";

/** Orden de compra: líneas con lo pedido y recibido, recepciones, historial y acciones (las decide draco). */
export const PurchaseOrderDetail = ({ order }: { order: IPurchaseOrderDetail }) => {
  const t = useTranslations("Administre.purchaseOrder");
  const tStatus = useTranslations("Administre.purchaseOrder.statuses");
  const tActions = useTranslations("Administre.purchaseOrder.eventActions");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const router = useRouter();
  const s = order.summary;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<{ reference: string; notes: string; qty: Record<number, string> }>({ reference: "", notes: "", qty: {} });

  const open = (next: Dialog) => {
    setReason("");
    setReceipt({ reference: "", notes: "", qty: Object.fromEntries(order.lines.map((l) => [l.id, String(l.pending)])) });
    setDialog(next);
  };

  const done = async (result: Awaited<ReturnType<typeof purchase_order_command_action>>, message: string) => {
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(message, result.data.summary.number ?? "");
    setDialog(null);
    router.refresh();
  };

  const send = async () => {
    setBusy(true);
    await done(await purchase_order_command_action(s.id, "send", null, order.lock_version), t("done.SEND"));
  };

  const submit = async () => {
    setBusy(true);
    if (dialog === "RECEIVE") {
      const lines = order.lines.map((l) => ({ line_id: l.id, quantity: Number(receipt.qty[l.id] || 0) })).filter((l) => l.quantity > 0);
      await done(await receive_purchase_order_action(s.id, { reference: receipt.reference || null, notes: receipt.notes || null, lines,
        lock_version: order.lock_version }), t("done.RECEIVE"));
    } else if (dialog) {
      await done(await purchase_order_command_action(s.id, dialog === "CANCEL" ? "cancel" : "close", reason, order.lock_version),
        t(`done.${dialog}` as never));
    }
  };

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={PURCHASE_ORDERS_HREF} className='text-sm text-muted-foreground hover:text-foreground print:hidden'>{t("back")}</Link>
      <PageHeader title={s.number ?? `#${s.id}`} description={`${s.supplier_name} · ${s.warehouse_name ?? "—"}`} icon={HiOutlineClipboardDocumentList}
        eyebrow={tCrud("domains.inventory")}
        actions={
          <div className='flex flex-wrap items-center gap-2 print:hidden'>
            <Badge variant={PURCHASE_STATUS_VARIANT[s.status] ?? "outline"}>{tStatus(s.status)}</Badge>
            {s.overdue ? <Badge variant='destructive'>{t("overdue")}</Badge> : null}
            <Buttons type='button' variant='outline' className='rounded-full' onClick={() => window.print()}>
              <HiOutlinePrinter className='h-4 w-4' aria-hidden='true' />{t("print")}
            </Buttons>
            {order.actions.includes("EDIT") ? (
              <Link href={`${PURCHASE_ORDERS_HREF}/${s.id}/edit`}
                className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />{t("edit")}
              </Link>
            ) : null}
            {order.actions.includes("CANCEL") ? <Buttons type='button' variant='outline' className='rounded-full' onClick={() => open("CANCEL")}>{t("actions.CANCEL")}</Buttons> : null}
            {order.actions.includes("CLOSE") ? <Buttons type='button' variant='outline' className='rounded-full' onClick={() => open("CLOSE")}>{t("actions.CLOSE")}</Buttons> : null}
            {order.actions.includes("SEND") ? <Buttons type='button' className='rounded-full' loading={busy} onClick={() => void send()}>{t("actions.SEND")}</Buttons> : null}
            {order.actions.includes("RECEIVE") ? (
              <Buttons type='button' className='rounded-full' onClick={() => open("RECEIVE")}>
                <HiOutlineArchiveBoxArrowDown className='h-4 w-4' aria-hidden='true' />{t("actions.RECEIVE")}
              </Buttons>
            ) : null}
          </div>
        } />

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='grid content-start gap-6'>
          <SectionCard id='po-lines' icon={HiOutlineClipboardDocumentList} title={t("lines", { count: order.lines.length })} contentClassName='p-0'>
            <div className='col-span-12 overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                  <tr>
                    <th className='px-4 py-2'>{t("fields.sku")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.ordered")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.received")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.unitCost")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.id} className='border-t border-border'>
                      <td className='px-4 py-3'>
                        <p className='font-mono'>{line.sku_code ?? `#${line.sku_id}`}</p>
                        <p className='text-xs text-muted-foreground'>{[line.product_name, line.supplier_code].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className='px-4 py-3 text-right tabular-nums'>{formatNumber(line.quantity)}</td>
                      <td className='px-4 py-3 text-right tabular-nums'>
                        {formatNumber(line.received)}
                        {line.pending > 0 && s.status !== "DRAFT" ? <span className='block text-xs text-muted-foreground'>{t("pendingLine", { count: line.pending })}</span> : null}
                      </td>
                      <td className='px-4 py-3 text-right tabular-nums'>{formatMoney(line.unit_cost)}</td>
                      <td className='px-4 py-3 text-right tabular-nums'>{formatMoney(line.line_total)}</td>
                    </tr>
                  ))}
                  <tr className='border-t border-border font-semibold'>
                    <td className='px-4 py-3' colSpan={4}>{t("fields.total")}</td>
                    <td className='px-4 py-3 text-right tabular-nums'>{formatMoney(s.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>
          {order.receipts.length > 0 ? (
            <SectionCard id='po-receipts' icon={HiOutlineArchiveBoxArrowDown} title={t("receipts", { count: order.receipts.length })} contentClassName='p-4'>
              <ul className='col-span-12 grid gap-3 text-sm'>
                {order.receipts.map((r) => (
                  <li key={r.id} className='rounded-xl bg-muted/30 p-3'>
                    <p className='font-medium'>{r.number} · {t("units", { count: r.units })}</p>
                    <p className='text-xs text-muted-foreground'>
                      {[r.reference, r.warehouse_name, r.created_by_name, r.created_at ? formatApiDate(r.created_at) : null].filter(Boolean).join(" · ")}
                    </p>
                    <p className='text-xs text-muted-foreground'>{r.lines.map((l) => `${l.sku_code ?? ""} ×${l.quantity}`).join(", ")}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
        <aside className='grid content-start gap-6'>
          <SectionCard id='po-info' icon={HiOutlineClipboardDocumentList} title={t("data")} contentClassName='p-4'>
            <dl className='col-span-12 grid gap-2 text-sm'>
              {([
                [t("fields.supplier"), s.supplier_name],
                [t("fields.warehouse"), s.warehouse_name],
                [t("fields.expected"), s.expected_date ? formatLocalDate(s.expected_date) : null],
                [t("fields.sentAt"), order.sent_at ? formatApiDate(order.sent_at) : null],
                [t("fields.createdBy"), order.created_by_name],
              ] as [string, string | null][]).map(([label, value]) => (
                <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                  <dt className='text-muted-foreground'>{label}</dt>
                  <dd className='text-right font-medium'>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {order.notes ? <p className='col-span-12 mt-3 whitespace-pre-line text-sm text-muted-foreground'>{order.notes}</p> : null}
            {order.status_reason ? <p className='col-span-12 mt-2 text-sm'>{t("statusReason", { reason: order.status_reason })}</p> : null}
          </SectionCard>
          <SectionCard id='po-history' icon={HiOutlineClock} title={t("history")} contentClassName='p-4'>
            <ol className='col-span-12 grid gap-3 text-sm'>
              {order.events.map((event, index) => (
                <li key={index} className='border-l-2 border-border pl-3'>
                  <p className='font-medium'>{tActions(event.action as never)} · {tStatus(event.to_status as never)}</p>
                  {event.note ? <p className='text-muted-foreground'>{event.note}</p> : null}
                  <p className='text-xs text-muted-foreground'>{[event.actor_name, event.created_at ? formatApiDate(event.created_at) : null].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </aside>
      </div>

      <Modal size={dialog === "RECEIVE" ? "lg" : "md"} title={dialog ? t(`actions.${dialog}` as never) : ""} open={dialog != null}
        onOpenChange={(value) => !value && setDialog(null)} hideDefaultFooter={true}>
        {dialog ? (
          <form className='grid gap-4' onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            {dialog === "RECEIVE" ? (
              <>
                <p className='text-sm text-muted-foreground'>{t("receiveHint", { warehouse: s.warehouse_name ?? "—" })}</p>
                <div className='grid gap-2'>
                  {order.lines.filter((l) => l.pending > 0).map((line) => (
                    <label key={line.id} className='grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 text-sm'>
                      <span className='min-w-0'>
                        <span className='font-mono'>{line.sku_code}</span>
                        <span className='block truncate text-xs text-muted-foreground'>{t("pendingLine", { count: line.pending })}</span>
                      </span>
                      <input type='number' min={0} max={line.pending} step={1} value={receipt.qty[line.id] ?? ""}
                        onChange={(event) => setReceipt({ ...receipt, qty: { ...receipt.qty, [line.id]: event.target.value } })}
                        className={`h-10 text-right tabular-nums ${INPUT}`} />
                    </label>
                  ))}
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <label className='grid gap-1.5 text-sm'>
                    <span className='font-medium'>{t("fields.reference")}</span>
                    <input value={receipt.reference} maxLength={80} onChange={(event) => setReceipt({ ...receipt, reference: event.target.value })}
                      placeholder={t("referencePlaceholder")} className={`h-10 ${INPUT}`} />
                  </label>
                  <label className='grid gap-1.5 text-sm'>
                    <span className='font-medium'>{t("fields.notes")}</span>
                    <input value={receipt.notes} maxLength={500} onChange={(event) => setReceipt({ ...receipt, notes: event.target.value })}
                      className={`h-10 ${INPUT}`} />
                  </label>
                </div>
              </>
            ) : (
              <label className='grid gap-1.5 text-sm'>
                <span className='font-medium'>{t(`dialog.${dialog}` as never)}</span>
                <textarea required minLength={5} maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)}
                  className={`py-2 ${INPUT}`} />
              </label>
            )}
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
