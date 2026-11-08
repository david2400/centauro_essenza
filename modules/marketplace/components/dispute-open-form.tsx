/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineScale } from "react-icons/hi2";
import { ActionBar, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { open_dispute_action } from "@/server/domains/marketplace/disputes/actions";
import { DISPUTES_HREF, DISPUTE_REASONS, type DisputeReason } from "../models/dispute.interface";

interface IOrderInfo {
  id: number;
  number: string | null;
  sellerName: string | null;
  customerName: string | null;
  total: number;
}

/** Abre un reclamo del comprador sobre el subpedido de un vendedor externo. */
export const DisputeOpenForm = ({ order }: { order: IOrderInfo }) => {
  const t = useTranslations("Administre.marketplace.dispute");
  const tReason = useTranslations("Administre.marketplace.dispute.reasons");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [form, setForm] = useState({ reason: "DEFECTIVE" as DisputeReason, description: "", claimed: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const claimed = form.claimed.trim() === "" ? null : Number(form.claimed.replace(",", "."));
    if (claimed != null && (!Number.isFinite(claimed) || claimed < 0)) {
      setError(t("form.invalidAmount"));
      return;
    }
    setBusy(true);
    const result = await open_dispute_action({ order_id: order.id, reason: form.reason, description: form.description, claimed_amount: claimed });
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("form.opened"), result.data.summary.number ?? "");
    router.push(`${DISPUTES_HREF}/${result.data.summary.id}`);
    router.refresh();
  };

  return (
    <form className='grid gap-6' onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <SectionCard id='dispute-open' icon={HiOutlineScale} title={t("form.title")}
        hint={t("form.hint", { order: order.number ?? `#${order.id}`, seller: order.sellerName ?? "—", total: formatMoney(order.total) })}>
        <label className='col-span-12 grid gap-1.5 text-sm md:col-span-6'>
          <span className='font-medium'>{t("fields.reason")}</span>
          <select value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value as DisputeReason })}
            className='h-10 rounded-lg border border-input bg-background px-3 text-sm'>
            {DISPUTE_REASONS.map((reason) => <option key={reason} value={reason}>{tReason(reason)}</option>)}
          </select>
        </label>
        <label className='col-span-12 grid gap-1.5 text-sm md:col-span-6'>
          <span className='font-medium'>{t("fields.claimed")}</span>
          <input inputMode='decimal' value={form.claimed} onChange={(event) => setForm({ ...form, claimed: event.target.value })}
            placeholder={t("form.claimedPlaceholder")} className='h-10 rounded-lg border border-input bg-background px-3 text-sm tabular-nums' />
        </label>
        <label className='col-span-12 grid gap-1.5 text-sm'>
          <span className='font-medium'>{t("fields.description")}</span>
          <textarea required minLength={10} maxLength={1000} rows={4} value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder={t("form.descriptionPlaceholder", { customer: order.customerName ?? "—" })}
            className='rounded-lg border border-input bg-background px-3 py-2 text-sm' />
        </label>
      </SectionCard>
      <ActionBar message={error ?? undefined}>
        <Link href={`/ventas/orders/${order.id}`} className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={busy}>{t("open")}</Buttons>
      </ActionBar>
    </form>
  );
};
