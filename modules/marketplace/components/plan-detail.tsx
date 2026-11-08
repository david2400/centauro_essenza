/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineBeaker, HiOutlineClock, HiOutlineDocumentText, HiOutlinePencilSquare, HiOutlineReceiptPercent } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { confirm, notify } from "@/components/notifications";
import { formatApiDate, formatLocalDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { plan_command_action, plan_events_action, simulate_plan_action } from "@/server/domains/marketplace/actions";
import type { PlanEventDto } from "@/server/domains/marketplace/types";
import { PLANS_HREF, formatCurrency, formatPercent, type IMarketplaceAccess, type IPlan, type ISimulation } from "../models/marketplace.interface";
import { PlanStatusBadge } from "./badges";

/** Versión de plan: condiciones, publicación, nueva versión, retiro, simulador e historial. */
export const PlanDetail = ({ plan, access }: { plan: IPlan; access: IMarketplaceAccess }) => {
  const t = useTranslations("Administre.marketplace.plan");
  const td = useTranslations("Administre.marketplace.plan.detail");
  const tOpt = useTranslations("Administre.marketplace.plan.options");
  const tModalities = useTranslations("Administre.marketplace.plan.modalities");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const terms = plan.terms;

  const command = async (name: "publish" | "versions" | "retire") => {
    const ok = await confirm({
      title: td(`${name}.title`, { plan: `${plan.code} v${plan.version}` }),
      description: td(`${name}.description`),
      confirmLabel: td(`${name}.label`),
      tone: name === "retire" ? "danger" : undefined,
    });
    if (!ok) return;
    setBusy(name);
    const result = await plan_command_action(plan.id, name, plan.lock_version);
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(td(`${name}.done`), `${result.data.code} v${result.data.version}`);
    router.push(`${PLANS_HREF}/${result.data.id}`);
    router.refresh();
  };

  const rows: [string, string][] = [
    [t("fields.modality"), tModalities(terms.modality as never)],
    [t("fields.currency"), terms.currency],
    [t("fields.monthlyFee"), terms.monthly_fee > 0 ? formatCurrency(terms.monthly_fee, terms.currency) : "—"],
    [t("fields.commissionPercent"), terms.commission_percent > 0 ? formatPercent(terms.commission_percent) : "—"],
    [t("fields.fixedFee"), terms.fixed_fee_per_sale > 0 ? formatCurrency(terms.fixed_fee_per_sale, terms.currency) : "—"],
  ];
  if (terms.modality !== "SUBSCRIPTION") {
    rows.push(
      [t("fields.commissionBase"), tOpt(`commissionBases.${terms.commission_base}` as never)],
      [t("fields.includeShipping"), terms.include_shipping ? td("yes") : td("no")],
      [t("fields.includeTaxes"), terms.include_taxes ? td("yes") : td("no")],
      [t("fields.accrualEvent"), tOpt(`accrualEvents.${terms.accrual_event}` as never)
        + (terms.accrual_event === "RETURN_WINDOW_CLOSED" ? ` (${terms.return_window_days} d)` : "")],
      [t("fields.refundPolicy"), tOpt(`refundPolicies.${terms.refund_policy}` as never)],
    );
  }
  if (terms.modality !== "COMMISSION") rows.push([t("fields.feeBilling"), tOpt(`feeBillings.${terms.fee_billing}` as never)]);
  rows.push(
    [t("fields.graceDays"), formatNumber(terms.grace_days)],
    [t("fields.lateInterest"), terms.late_interest_monthly_percent > 0 ? formatPercent(terms.late_interest_monthly_percent) : "—"],
    [t("fields.storageFee"), terms.storage_fee_per_unit_day ? t("storageFeeValue", { amount: formatNumber(terms.storage_fee_per_unit_day) }) : "—"],
    [t("fields.validity"), plan.valid_to ? `${formatLocalDate(plan.valid_from)} – ${formatLocalDate(plan.valid_to)}` : t("validFromOnly", { date: formatLocalDate(plan.valid_from) })],
    [t("fields.openAssignments"), formatNumber(plan.open_assignments)],
  );

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader
        title={plan.name}
        description={`${plan.code} · v${plan.version}${plan.published_at ? ` · ${td("publishedAt", { date: formatApiDate(plan.published_at) })}` : ""}`}
        icon={HiOutlineReceiptPercent}
        eyebrow={tCrud("domains.marketplace")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <PlanStatusBadge status={plan.status} />
            {access.plansManage && plan.status === "DRAFT" ? (
              <>
                <Link href={`${PLANS_HREF}/${plan.id}/edit`}
                  className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                  <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
                  {t("edit")}
                </Link>
                <Buttons size='sm' className='rounded-full' loading={busy === "publish"} disabled={busy != null} onClick={() => void command("publish")}>
                  {td("publish.label")}
                </Buttons>
              </>
            ) : null}
            {access.plansManage && plan.status !== "DRAFT" ? (
              <Buttons size='sm' variant='outline' className='rounded-full' loading={busy === "versions"} disabled={busy != null} onClick={() => void command("versions")}>
                {td("versions.label")}
              </Buttons>
            ) : null}
            {access.plansManage && (plan.status === "ACTIVE" || plan.status === "SUPERSEDED") ? (
              <Buttons size='sm' variant='outline' className='rounded-full' loading={busy === "retire"} disabled={busy != null} onClick={() => void command("retire")}>
                {td("retire.label")}
              </Buttons>
            ) : null}
          </div>
        }
      />
      {plan.status === "SUPERSEDED" ? <p className='rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground'>{td("supersededNotice")}</p> : null}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <div className='grid content-start gap-6'>
          <SectionCard id='plan-terms' icon={HiOutlineDocumentText} title={td("terms")} hint={plan.description ?? undefined} contentClassName='p-4'>
            <dl className='col-span-12 grid gap-2 text-sm sm:grid-cols-2'>
              {rows.map(([label, value]) => (
                <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                  <dt className='text-muted-foreground'>{label}</dt>
                  <dd className='text-right font-medium'>{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <PlanHistory planId={plan.id} />
        </div>
        <PlanSimulator plan={plan} />
      </div>
    </section>
  );
};

const PlanSimulator = ({ plan }: { plan: IPlan }) => {
  const ts = useTranslations("Administre.marketplace.simulator");
  const tCommon = useTranslations("Administre.common");
  const [form, setForm] = useState({ items: "100000", discount: "0", shipping: "0", taxes: "0", sales: "30" });
  const [result, setResult] = useState<ISimulation | null>(null);
  const [loading, setLoading] = useState(false);
  const currency = plan.terms.currency;

  const run = async () => {
    setLoading(true);
    const response = await simulate_plan_action(plan.id, {
      items_subtotal: Number(form.items || 0),
      discount: Number(form.discount || 0),
      shipping: Number(form.shipping || 0),
      taxes: Number(form.taxes || 0),
      sales_per_month: Number(form.sales || 0),
    });
    setLoading(false);
    if (!response.success) {
      notify.error(tCommon("errorTitle"), response.error);
      return;
    }
    setResult(response.data);
  };

  const field = (key: keyof typeof form, label: string) => (
    <label className='grid gap-1 text-sm'>
      <span className='font-medium'>{label}</span>
      <input inputMode='decimal' value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        className='h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums' />
    </label>
  );

  return (
    <SectionCard id='plan-simulator' icon={HiOutlineBeaker} title={ts("title")} hint={ts("hint")} contentClassName='p-4'>
      <div className='col-span-12 grid gap-3 sm:grid-cols-2'>
        {field("items", ts("items", { currency }))}
        {field("discount", ts("discount"))}
        {field("shipping", ts("shipping"))}
        {field("taxes", ts("taxes"))}
        {field("sales", ts("sales"))}
        <div className='flex items-end'>
          <Buttons type='button' className='w-full rounded-full' loading={loading} onClick={() => void run()}>{ts("run")}</Buttons>
        </div>
      </div>
      {result ? (
        <div className='col-span-12 mt-4 grid gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-sm'>
          <p className='text-xs font-semibold uppercase tracking-wide text-primary'>{ts("badge")}</p>
          <SimRow label={ts("basePerSale")} value={formatCurrency(result.commission_base_per_sale, result.currency)} />
          <SimRow label={ts("perSale")} value={formatCurrency(result.commission_per_sale, result.currency)} />
          <SimRow label={ts("gross", { count: result.sales_count })} value={formatCurrency(result.gross_sales, result.currency)} />
          <SimRow label={ts("commissionTotal")} value={formatCurrency(result.commission_total, result.currency)} />
          <SimRow label={ts("monthlyFee")} value={formatCurrency(result.monthly_fee, result.currency)} />
          <SimRow label={ts("platformTotal")} value={formatCurrency(result.platform_total, result.currency)} strong />
          <SimRow label={ts("sellerNet")} value={formatCurrency(result.seller_net, result.currency)} />
          <SimRow label={ts("effectiveRate")} value={formatPercent(result.effective_rate_percent)} />
          <p className='text-xs text-muted-foreground'>{ts("notice")}</p>
        </div>
      ) : null}
    </SectionCard>
  );
};

const SimRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className='flex justify-between gap-3'>
    <span className='text-muted-foreground'>{label}</span>
    <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</span>
  </div>
);

const PlanHistory = ({ planId }: { planId: number }) => {
  const th = useTranslations("Administre.marketplace.history");
  const [events, setEvents] = useState<PlanEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const result = await plan_events_action(planId);
    setLoading(false);
    if (result.success) setEvents(result.data);
    else setError(result.error);
  };
  return (
    <SectionCard id='plan-history' icon={HiOutlineClock} title={th("title")}
      actions={<Buttons type='button' size='sm' variant='outline' className='rounded-full' loading={loading} onClick={() => void load()}>{events ? th("reload") : th("load")}</Buttons>}
      contentClassName='p-4'>
      {error ? <p className='col-span-12 text-sm text-destructive'>{error}</p> : null}
      {events == null ? (
        <p className='col-span-12 text-sm text-muted-foreground'>{th("notLoaded")}</p>
      ) : events.length === 0 ? (
        <p className='col-span-12 text-sm text-muted-foreground'>{th("empty")}</p>
      ) : (
        <ol className='col-span-12 grid gap-2'>
          {events.map((event) => (
            <li key={event.id} className='rounded-lg border border-border px-3 py-2 text-sm'>
              <p className='font-medium'>{th(`types.${event.type}` as never)}</p>
              {event.detail ? <p className='text-xs text-muted-foreground'>{event.detail}</p> : null}
              <p className='text-xs text-muted-foreground'>{[formatApiDate(event.created_at), event.actor_name ?? event.actor_id].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
};
