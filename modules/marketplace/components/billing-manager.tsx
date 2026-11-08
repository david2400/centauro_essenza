/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowPath, HiOutlineBanknotes, HiOutlineCalendarDays, HiOutlineCheckBadge, HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { notify, prompt } from "@/components/notifications";
import { formatLocalDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { accrue_due_action, generate_fees_action, recalculate_commission_action } from "@/server/domains/marketplace/actions";
import {
  BILLING_HREF,
  COMMISSION_STATUSES,
  SELLERS_HREF,
  formatCurrency,
  formatPercent,
  type IBillingSummary,
  type ICommission,
  type IMarketplaceAccess,
} from "../models/marketplace.interface";
import { CommissionStatusBadge } from "./badges";

interface IBillingManagerProps {
  page: PageResult<ICommission>;
  summary: IBillingSummary | null;
  access: IMarketplaceAccess;
  sellerName?: string | null;
}

/**
 * Comisiones por venta de los vendedores externos y acciones del ciclo: devengar lo exigible y
 * generar mensualidades. Solo asientan en el estado de cuenta; ningún cobro es automático.
 */
export const BillingManager = ({ page, summary, access, sellerName }: IBillingManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.billing");
  const tStatuses = useTranslations("Administre.marketplace.billing.statuses");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const [busy, setBusy] = useState<string | null>(null);

  const columns = useMemo<GridColumn<ICommission>[]>(
    () => [
      {
        id: "createdAt",
        header: t("fields.order"),
        meta: { label: t("fields.order"), hideable: false, exportValue: (row) => row.order_number },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`/ventas/orders/${row.original.order_id}`} className='font-semibold hover:text-primary hover:underline'>
              {row.original.order_number ?? `#${row.original.order_id}`}
            </Link>
            <p className='text-xs text-muted-foreground'>{t("paidOn", { date: formatLocalDate(row.original.paid_on) })}</p>
          </div>
        ),
      },
      {
        id: "sellerName",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => row.seller_name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${SELLERS_HREF}/${row.original.seller_id}`} className='truncate hover:text-primary hover:underline'>{row.original.seller_name}</Link>
            <p className='text-xs text-muted-foreground'>{row.original.plan_code ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "base",
        header: t("fields.base"),
        meta: { label: t("fields.base"), align: "right", exportValue: (row) => row.base },
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            <p>{formatCurrency(row.original.base, row.original.currency)}</p>
            <p className='text-xs text-muted-foreground'>
              {[row.original.percent > 0 ? formatPercent(row.original.percent) : null,
                row.original.fixed_part > 0 ? `+ ${formatCurrency(row.original.fixed_part, row.original.currency)}` : null]
                .filter(Boolean).join(" ")}
            </p>
          </div>
        ),
      },
      {
        id: "amount",
        header: t("fields.net"),
        meta: { label: t("fields.net"), align: "right", exportValue: (row) => row.net },
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            <p className='font-medium'>{formatCurrency(row.original.net, row.original.currency)}</p>
            {row.original.reversed_amount > 0 ? (
              <p className='text-xs text-muted-foreground'>{t("reversed", { amount: formatCurrency(row.original.reversed_amount, row.original.currency) })}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "accrueOn",
        header: t("fields.accrueOn"),
        meta: { label: t("fields.accrueOn"), exportValue: (row) => row.accrue_on },
        cell: ({ row }) => (
          <span className='text-sm'>
            {row.original.accrue_on ? formatLocalDate(row.original.accrue_on)
              : row.original.status === "PENDING" ? t("waitingDelivery") : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatuses(row.status as never) },
        cell: ({ row }) => (
          <div className='grid gap-1'>
            <CommissionStatusBadge status={row.original.status} />
            {row.original.review_reason ? <p className='max-w-56 text-xs text-destructive'>{row.original.review_reason}</p> : null}
          </div>
        ),
      },
    ],
    [t, tStatuses],
  );

  const filters: GridFilter<ICommission>[] = [
    { id: "status", label: t("fields.status"), options: COMMISSION_STATUSES.map((status) => ({ value: status, label: tStatuses(status) })) },
  ];

  const totals = (status: string) => summary?.commissions.find((item) => item.status === status);

  const runFees = async () => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cycle = await prompt({
      title: t("fees.title"),
      description: t("fees.description"),
      confirmLabel: t("fees.label"),
      input: { label: t("fees.cycle"), required: true, defaultValue: current, placeholder: "AAAA-MM" },
    });
    if (!cycle) return;
    setBusy("fees");
    const result = await generate_fees_action(cycle.trim());
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("fees.done", { cycle: result.data.cycle }), [t("fees.result", {
      created: result.data.created, existing: result.data.already_charged, notYet: result.data.not_chargeable_yet.length,
    }), result.data.storage_created > 0
      ? t("fees.storage", { count: result.data.storage_created, amount: formatCurrency(result.data.storage_total, "COP") })
      : null].filter(Boolean).join(" · "));
    router.refresh();
  };

  const recalculate = async (row: ICommission) => {
    const result = await recalculate_commission_action(row.id);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    if (result.data.status === "REVIEW") notify.error(t("recalculate.still"), result.data.review_reason ?? "");
    else notify.success(t("recalculate.done"), tStatuses(result.data.status as never));
    router.refresh();
  };

  const runAccrual = async () => {
    setBusy("accrue");
    const result = await accrue_due_action();
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("accrue.done"), t("accrue.result", { count: result.data.accrued }));
    router.refresh();
  };

  return (
    <CrudManager<ICommission>
      mode='server'
      gridId='comisiones'
      namespace='Administre.marketplace.billing'
      icon={HiOutlineBanknotes}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={
        summary
          ? [
              { label: t("stats.receivable"), value: formatCurrency(summary.receivable, "COP"), icon: HiOutlineBanknotes },
              { label: t("stats.pending"), value: formatCurrency(totals("PENDING")?.amount ?? 0, "COP"), icon: HiOutlineClock },
              { label: t("stats.accrued"), value: formatCurrency(totals("ACCRUED")?.amount ?? 0, "COP"), icon: HiOutlineCheckBadge, tone: "success" },
              {
                label: t("stats.review"),
                value: formatNumber(totals("REVIEW")?.count ?? 0),
                icon: HiOutlineExclamationTriangle,
                tone: (totals("REVIEW")?.count ?? 0) > 0 ? "warning" : "default",
              },
            ]
          : undefined
      }
      rowLabel={(row) => row.order_number ?? `#${row.order_id}`}
      toolbarExtra={sellerName ? (
        <span className='inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs'>
          {t("filteredBySeller", { name: sellerName })}
          <Link href={BILLING_HREF} className='font-medium text-primary hover:underline'>{t("clearSeller")}</Link>
        </span>
      ) : undefined}
      headerActions={
        access.billingManage ? (
          <div className='flex flex-wrap gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' loading={busy === "accrue"} disabled={busy != null}
              onClick={() => void runAccrual()}>
              {t("accrue.label")}
            </Buttons>
            <Buttons type='button' className='rounded-full' loading={busy === "fees"} disabled={busy != null} onClick={() => void runFees()}>
              <HiOutlineCalendarDays className='h-4 w-4' aria-hidden='true' />
              {t("fees.label")}
            </Buttons>
          </div>
        ) : undefined
      }
      extraRowActions={(row) => [
        { label: t("viewSeller"), icon: HiOutlineBanknotes, onSelect: () => router.push(`${SELLERS_HREF}/${row.seller_id}`) },
        ...(access.billingManage && row.status === "REVIEW"
          ? [{ label: t("recalculate.label"), icon: HiOutlineArrowPath, onSelect: () => void recalculate(row) }]
          : []),
      ]}
    />
  );
};
