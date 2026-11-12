/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineDocumentDuplicate, HiOutlineExclamationTriangle, HiOutlineHashtag } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatLocalDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RESOLUTION_KINDS, isResolutionAlert, type IResolution } from "../models/resolution.interface";
import { deleteResolutionServerAction } from "@/app/[locale]/facturacion/resolutions/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const ResolutionForm = dynamic(() => import("./resolution-form").then((m) => m.ResolutionForm), { loading: () => <FormSkeleton /> });

/** Numeraciones autorizadas: rango, consecutivo, vigencia y avisos (vence, se agota). */
export const ResolutionManager = ({ initialData }: { initialData: IResolution[] }) => {
  const t = useTranslations("Administre.billing.resolution");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IResolution>[]>(
    () => [
      {
        id: "prefix",
        header: t("fields.prefix"),
        meta: { label: t("fields.prefix"), hideable: false, exportValue: (row) => row.prefix },
        cell: ({ row }) => (
          <div>
            <p className='font-mono font-semibold'>{row.original.prefix || "—"}</p>
            <p className='text-xs text-muted-foreground'>{t(`kinds.${row.original.kind === "CREDIT_NOTE" ? "CREDIT_NOTE" : "INVOICE"}`)}</p>
          </div>
        ),
      },
      {
        id: "resolution",
        header: t("fields.resolutionNumber"),
        enableSorting: false,
        meta: { label: t("fields.resolutionNumber"), exportValue: (row) => row.resolution_number },
        cell: ({ row }) => (
          <div>
            <p>{row.original.resolution_number ?? "—"}</p>
            <p className='text-xs text-muted-foreground'>{t(`environments.${row.original.environment === "PRODUCTION" ? "PRODUCTION" : "TEST"}`)}</p>
          </div>
        ),
      },
      {
        id: "range",
        header: t("fields.range"),
        enableSorting: false,
        meta: { label: t("fields.range"), exportValue: (row) => `${row.from_number}-${row.to_number}` },
        cell: ({ row }) => {
          const from = row.original.from_number ?? 0;
          const to = row.original.to_number ?? 0;
          const used = Math.max(0, (row.original.next_number ?? from) - from);
          const total = Math.max(1, to - from + 1);
          return (
            <div className='grid min-w-[10rem] gap-1'>
              <p className='text-xs tabular-nums text-muted-foreground'>
                {formatNumber(from)} – {formatNumber(to)} · {t("next", { number: formatNumber(row.original.next_number ?? 0) })}
              </p>
              <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
                <div className='h-full rounded-full bg-primary' style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
              </div>
              <p className='text-xs tabular-nums text-muted-foreground'>{t("remaining", { count: formatNumber(row.original.remaining ?? 0) })}</p>
            </div>
          );
        },
      },
      {
        id: "validTo",
        header: t("fields.validTo"),
        enableSorting: false,
        meta: { label: t("fields.validTo"), exportValue: (row) => row.valid_to },
        cell: ({ row }) => (
          <div>
            <p className='tabular-nums'>{row.original.valid_to ? formatLocalDate(row.original.valid_to) : "—"}</p>
            {row.original.days_to_expire != null ? (
              <p className={cn("text-xs", (row.original.days_to_expire ?? 0) < 0 ? "text-destructive" : "text-muted-foreground")}>
                {t("days", { count: row.original.days_to_expire })}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "alerts",
        header: t("fields.status"),
        enableSorting: false,
        meta: { label: t("fields.status"), exportValue: (row) => (row.alerts ?? []).join(",") },
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {row.original.active ? <Badge variant='secondary'>{t("active")}</Badge> : <Badge variant='outline'>{t("inactive")}</Badge>}
            {(row.original.alerts ?? []).filter(isResolutionAlert).map((alert) => (
              <Badge key={alert} variant='destructive'>
                {t(`alerts.${alert}`)}
              </Badge>
            ))}
          </div>
        ),
      },
    ],
    [t],
  );

  const filters: GridFilter<IResolution>[] = [
    { id: "kind", label: t("fields.kind"), options: RESOLUTION_KINDS.map((value) => ({ value, label: t(`kinds.${value}`) })), accessor: (row) => row.kind },
  ];
  const withAlerts = initialData.filter((r) => r.active && (r.alerts ?? []).length > 0).length;

  return (
    <CrudManager<IResolution>
      gridId='numeraciones'
      namespace='Administre.billing.resolution'
      icon={HiOutlineHashtag}
      eyebrow={tCrud("domains.billing")}
      data={initialData}
      columns={columns}
      filters={filters}
      stats={[
        { label: t("total"), value: initialData.length, icon: HiOutlineHashtag },
        {
          label: t("activeInvoices"),
          value: initialData.filter((r) => r.active && r.kind === "INVOICE").length,
          icon: HiOutlineDocumentDuplicate,
        },
        {
          label: t("withAlerts"),
          value: withAlerts,
          icon: HiOutlineExclamationTriangle,
          tone: withAlerts > 0 ? "warning" : "success",
        },
      ]}
      rowLabel={(row) => `${row.prefix || ""} ${row.from_number}-${row.to_number}`}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${row.prefix ?? ""} ${row.resolution_number ?? ""}`}
      renderForm={(item, close) => <ResolutionForm item={item} onClose={close} />}
      onDelete={(id) => deleteResolutionServerAction(id)}
    />
  );
};
