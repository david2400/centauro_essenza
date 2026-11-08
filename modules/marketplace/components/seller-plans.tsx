/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { HiOutlineCalendarDays, HiOutlineReceiptPercent } from "react-icons/hi2";
import { EmptyBlock, SectionCard } from "@/components/form-sections";
import { notify, prompt } from "@/components/notifications";
import { formatApiDate, formatLocalDate } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { assign_plan_action, assignable_plans_action, cancel_assignment_action } from "@/server/domains/marketplace/actions";
import {
  PLANS_HREF,
  formatCurrency,
  formatPercent,
  type IAssignment,
  type IMarketplaceAccess,
  type IPlan,
  type ISellerDetail,
} from "../models/marketplace.interface";
import { AssignmentStateBadge } from "./badges";

/** Primer día del mes siguiente (el backend aplica la misma regla y la valida). */
const nextCycle = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
};

/** Planes del vendedor: vigente, programado e historial; asignar, programar y cancelar con motivo. */
export const SellerPlans = ({ seller, access }: { seller: ISellerDetail; access: IMarketplaceAccess }) => {
  const tp = useTranslations("Administre.marketplace.assignments");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current = seller.assignments.find((a) => a.state === "CURRENT");
  const scheduled = seller.assignments.find((a) => a.state === "SCHEDULED");
  const canAssign = access.plansAssign && seller.kind === "EXTERNAL" && !["CLOSED", "SUSPENDED"].includes(seller.status) && !scheduled;

  const cancel = async (assignment: IAssignment) => {
    const reason = await prompt({
      title: tp("cancelTitle", { plan: `${assignment.plan_code} v${assignment.plan_version}` }),
      description: tp("cancelDescription"),
      confirmLabel: tp("cancel"),
      tone: "danger",
      input: { label: tp("reason"), multiline: true, required: true },
    });
    if (reason == null || reason.trim().length < 5) return;
    const result = await cancel_assignment_action(seller.id, assignment.id, reason.trim());
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tp("cancelled"));
    router.refresh();
  };

  if (seller.kind === "OWN") {
    return (
      <SectionCard id='seller-plans' icon={HiOutlineReceiptPercent} title={tp("title")} contentClassName='p-4'>
        <p className='col-span-12 text-sm text-muted-foreground'>{tp("ownSeller")}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard id='seller-plans' icon={HiOutlineReceiptPercent} title={tp("title")} hint={tp("hint")}
      actions={canAssign ? (
        <Buttons type='button' size='sm' className='rounded-full' onClick={() => setOpen(true)}>
          {current ? tp("schedule") : tp("assign")}
        </Buttons>
      ) : undefined}
      contentClassName='p-4'>
      {seller.assignments.length === 0 ? (
        <EmptyBlock icon={HiOutlineReceiptPercent} title={tp("empty")} description={tp("emptyHint")} />
      ) : (
        <ul className='col-span-12 grid gap-3'>
          {seller.assignments.map((a) => (
            <li key={a.id} className='rounded-xl border border-border p-3 text-sm'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='font-medium'>
                  <Link href={`${PLANS_HREF}/${a.plan_id}`} className='hover:text-primary hover:underline'>{a.plan_name}</Link>
                  <span className='text-muted-foreground'> · {a.plan_code} v{a.plan_version}</span>
                </p>
                <div className='flex items-center gap-2'>
                  <AssignmentStateBadge state={a.state} />
                  {a.state === "SCHEDULED" && access.plansAssign ? (
                    <Buttons type='button' size='sm' variant='outline' className='rounded-full' onClick={() => void cancel(a)}>
                      {tp("cancel")}
                    </Buttons>
                  ) : null}
                </div>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                <HiOutlineCalendarDays className='mr-1 inline h-4 w-4' aria-hidden='true' />
                {a.ends_on ? tp("period", { from: formatLocalDate(a.starts_on), to: formatLocalDate(a.ends_on) }) : tp("since", { from: formatLocalDate(a.starts_on) })}
              </p>
              {a.agreed_terms ? <TermsLine terms={a.agreed_terms} /> : null}
              {a.override_reason ? (
                <p className='mt-1 text-xs text-amber-700 dark:text-amber-400'>{tp("exception", { reason: a.override_reason, by: a.override_approved_by ?? "" })}</p>
              ) : null}
              {a.cancel_reason ? <p className='mt-1 text-xs text-muted-foreground'>{tp("cancelledReason", { reason: a.cancel_reason, at: formatApiDate(a.cancelled_at) })}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {open ? <AssignModal seller={seller} hasCurrent={Boolean(current)} access={access} onClose={() => setOpen(false)} /> : null}
    </SectionCard>
  );
};

export const TermsLine = ({ terms }: { terms: NonNullable<IAssignment["agreed_terms"]> }) => {
  const tp = useTranslations("Administre.marketplace.plan");
  const parts: string[] = [tp(`modalities.${terms.modality}` as never)];
  if (terms.monthly_fee > 0) parts.push(tp("feeLine", { fee: formatCurrency(terms.monthly_fee, terms.currency) }));
  if (terms.commission_percent > 0) parts.push(tp("pctLine", { pct: formatPercent(terms.commission_percent) }));
  if (terms.fixed_fee_per_sale > 0) parts.push(tp("fixedLine", { fixed: formatCurrency(terms.fixed_fee_per_sale, terms.currency) }));
  return <p className='mt-1 text-xs text-foreground'>{parts.join(" · ")}</p>;
};

const AssignModal = ({ seller, hasCurrent, access, onClose }: {
  seller: ISellerDetail;
  hasCurrent: boolean;
  access: IMarketplaceAccess;
  onClose: () => void;
}) => {
  const tp = useTranslations("Administre.marketplace.assignments");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<IPlan[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [planId, setPlanId] = useState<number | null>(null);
  const [startsOn, setStartsOn] = useState(hasCurrent ? nextCycle() : "");
  const [exception, setException] = useState(false);
  const [pct, setPct] = useState("");
  const [fee, setFee] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const search = async () => {
    setSearching(true);
    const result = await assignable_plans_action(query.trim());
    setSearching(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setOptions(result.data);
  };

  const save = async () => {
    if (planId == null) return;
    setSaving(true);
    const result = await assign_plan_action(seller.id, {
      plan_id: planId,
      starts_on: startsOn || undefined,
      override_commission_percent: exception && pct.trim() ? Number(pct) : undefined,
      override_monthly_fee: exception && fee.trim() ? Number(fee) : undefined,
      override_reason: exception ? reason.trim() : undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(result.data.state === "SCHEDULED" ? tp("scheduled") : tp("assigned"), `${result.data.plan_code} v${result.data.plan_version}`);
    onClose();
    router.refresh();
  };

  const input = "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm";

  return (
    <Modal size='lg' title={hasCurrent ? tp("schedule") : tp("assign")} open onOpenChange={(value) => !value && onClose()} hideDefaultFooter>
      <div className='grid gap-4'>
        <p className='text-sm text-muted-foreground'>{hasCurrent ? tp("scheduleHint") : tp("assignHint")}</p>
        <div className='flex gap-2'>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tp("searchPlan")} aria-label={tp("searchPlan")}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} className={input} />
          <Buttons type='button' variant='outline' className='rounded-full' loading={searching} onClick={() => void search()}>{tp("searchButton")}</Buttons>
        </div>
        {options != null ? (
          options.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{tp("noPlans")}</p>
          ) : (
            <ul className='grid max-h-60 gap-2 overflow-auto' role='radiogroup' aria-label={tp("plan")}>
              {options.map((plan) => (
                <li key={plan.id}>
                  <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5'>
                    <input type='radio' name='assign-plan' checked={planId === plan.id} onChange={() => setPlanId(plan.id)} className='mt-1' />
                    <span className='min-w-0'>
                      <span className='font-medium'>{plan.name}</span>
                      <span className='text-muted-foreground'> · {plan.code} v{plan.version}</span>
                      <TermsLine terms={plan.terms} />
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )
        ) : null}
        <label className='grid gap-1 text-sm'>
          <span className='font-medium'>{tp("startsOn")}</span>
          <input type='date' value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={input} />
          <span className='text-xs text-muted-foreground'>{hasCurrent ? tp("startsOnCycle") : tp("startsOnToday")}</span>
        </label>
        {access.plansExceptions ? (
          <div className='grid gap-3 rounded-xl border border-border p-3'>
            <label className='inline-flex items-center gap-2 text-sm font-medium'>
              <input type='checkbox' checked={exception} onChange={(event) => setException(event.target.checked)} />
              {tp("exceptionToggle")}
            </label>
            {exception ? (
              <div className='grid gap-3 sm:grid-cols-2'>
                <label className='grid gap-1 text-sm'><span>{tp("overridePct")}</span>
                  <input inputMode='decimal' value={pct} onChange={(event) => setPct(event.target.value)} className={input} /></label>
                <label className='grid gap-1 text-sm'><span>{tp("overrideFee")}</span>
                  <input inputMode='decimal' value={fee} onChange={(event) => setFee(event.target.value)} className={input} /></label>
                <label className='grid gap-1 text-sm sm:col-span-2'><span>{tp("exceptionReason")}</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2}
                    className='w-full rounded-lg border border-input bg-background px-3 py-2 text-sm' /></label>
              </div>
            ) : null}
          </div>
        ) : null}
        <label className='grid gap-1 text-sm'>
          <span className='font-medium'>{tp("notes")}</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={1000}
            className='w-full rounded-lg border border-input bg-background px-3 py-2 text-sm' />
        </label>
        <div className='flex justify-end gap-2'>
          <Buttons type='button' variant='outline' className='rounded-full' onClick={onClose}>{tCommon("cancel")}</Buttons>
          <Buttons type='button' className='rounded-full' disabled={planId == null || (exception && reason.trim().length < 5)} loading={saving}
            onClick={() => void save()}>
            {hasCurrent ? tp("schedule") : tp("assign")}
          </Buttons>
        </div>
      </div>
    </Modal>
  );
};
