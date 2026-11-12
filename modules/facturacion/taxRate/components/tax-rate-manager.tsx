/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineCheckBadge, HiOutlineReceiptPercent, HiOutlineStar } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatNumber } from "@/lib/format";
import { TAX_KINDS, isTaxKind, type ITaxRate } from "../models/taxRate.interface";
import { deleteTaxRateServerAction } from "@/app/[locale]/facturacion/tax-rates/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const TaxRateForm = dynamic(() => import("./tax-rate-form").then((m) => m.TaxRateForm), { loading: () => <FormSkeleton /> });

/** Tarifas de impuesto: tipo, porcentaje, por defecto, estado y uso. */
export const TaxRateManager = ({ initialData }: { initialData: ITaxRate[] }) => {
  const t = useTranslations("Administre.billing.taxRate");
  const tCrud = useTranslations("Crud");
  const kindLabel = (row: ITaxRate) => (isTaxKind(row.kind) ? t(`kinds.${row.kind}`) : (row.kind ?? "—"));

  const columns = useMemo<GridColumn<ITaxRate>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name ?? "",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='flex items-center gap-2 font-semibold text-foreground'>
              {row.original.name}
              {row.original.is_default ? <Badge variant='secondary'>{t("default")}</Badge> : null}
            </p>
            <p className='font-mono text-xs text-muted-foreground'>{row.original.code}</p>
          </div>
        ),
      },
      {
        id: "kind",
        header: t("fields.kind"),
        enableSorting: false,
        meta: { label: t("fields.kind"), exportValue: (row) => kindLabel(row) },
        cell: ({ row }) => <Badge variant='outline'>{kindLabel(row.original)}</Badge>,
      },
      {
        id: "rate",
        accessorFn: (row) => Number(row.rate ?? 0),
        header: t("fields.rate"),
        meta: { label: t("fields.rate"), align: "right", exportValue: (row) => row.rate },
        cell: ({ row }) => <span className='font-semibold tabular-nums'>{Number(row.original.rate ?? 0)} %</span>,
      },
      {
        id: "usage",
        header: t("fields.usage"),
        enableSorting: false,
        meta: { label: t("fields.usage"), exportValue: (row) => row.products_count },
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground'>
            {t("usageShort", { products: formatNumber(row.original.products_count ?? 0), lines: formatNumber(row.original.lines_count ?? 0) })}
          </span>
        ),
      },
      {
        id: "active",
        header: t("fields.active"),
        enableSorting: false,
        meta: { label: t("fields.active"), exportValue: (row) => (row.active ? t("active") : t("inactive")) },
        cell: ({ row }) =>
          row.original.active ? <Badge variant='secondary'>{t("active")}</Badge> : <Badge variant='outline'>{t("inactive")}</Badge>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const filters: GridFilter<ITaxRate>[] = [
    { id: "kind", label: t("fields.kind"), options: TAX_KINDS.map((value) => ({ value, label: t(`kinds.${value}`) })), accessor: (row) => row.kind },
  ];
  const defaultRate = initialData.find((rate) => rate.is_default);

  return (
    <CrudManager<ITaxRate>
      gridId='tarifas-impuesto'
      namespace='Administre.billing.taxRate'
      icon={HiOutlineReceiptPercent}
      eyebrow={tCrud("domains.billing")}
      data={initialData}
      columns={columns}
      filters={filters}
      modalSize='md'
      stats={[
        { label: t("total"), value: initialData.length, icon: HiOutlineReceiptPercent },
        { label: t("activeCount"), value: initialData.filter((rate) => rate.active).length, icon: HiOutlineCheckBadge },
        { label: t("default"), value: defaultRate ? `${defaultRate.name}` : "—", icon: HiOutlineStar, hint: t("defaultHintShort") },
      ]}
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${row.name ?? ""} ${row.code ?? ""}`}
      renderForm={(item, close) => <TaxRateForm item={item} onClose={close} />}
      onDelete={(id) => deleteTaxRateServerAction(id)}
    />
  );
};
