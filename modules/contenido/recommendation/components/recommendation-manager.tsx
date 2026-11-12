/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineCursorArrowRays,
  HiOutlineLightBulb,
  HiOutlineShoppingBag,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { BreakdownList } from "@/components/breakdown-list";
import { RECOMMENDATION_CONTEXTS, RECOMMENDATION_TYPES, formatMoney, formatPercent } from "../constants";
import type { IRecommendation } from "../models/recommendation.interface";
import { deleteRecommendationServerAction } from "@/app/[locale]/contenido/recommendations/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RecommendationForm = dynamic(() => import("./form").then((m) => m.RecommendationForm), { loading: () => <FormSkeleton /> });

interface IRecommendationManagerProps {
  initialData: IRecommendation[];
}

const rate = (part: number, total: number) => (total > 0 ? part / total : 0);

/** Recomendaciones: embudo (clic → compra), desglose por tipo y contexto, filtros y lote. */
export const RecommendationManager = ({ initialData }: IRecommendationManagerProps) => {
  const t = useTranslations("Administre.recommendation");
  const tTypes = useTranslations("Administre.recommendation.types");
  const tContexts = useTranslations("Administre.recommendation.contexts");
  const tCrud = useTranslations("Crud");

  const data = useMemo(() => [...initialData].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)), [initialData]);

  const total = initialData.length;
  const clicked = initialData.filter((item) => item.is_clicked).length;
  const purchased = initialData.filter((item) => item.is_purchased).length;
  const avgScore = total ? initialData.reduce((acc, item) => acc + (item.score ?? 0), 0) / total : 0;

  const typeLabel = (row: IRecommendation) => (row.recommendation_type ? tTypes(row.recommendation_type as never) : "—");
  const contextLabel = (row: IRecommendation) => (row.context ? tContexts(row.context as never) : "—");
  const productLabel = (row: IRecommendation) => row.product_name ?? `#${row.product_id}`;

  const byType = useMemo(
    () =>
      RECOMMENDATION_TYPES.map((type) => {
        const group = initialData.filter((item) => item.recommendation_type === type);
        return {
          key: type,
          label: tTypes(type),
          value: group.length,
          hint: t("ctrHint", { value: formatPercent(rate(group.filter((i) => i.is_clicked).length, group.length)) }),
        };
      }).filter((item) => item.value > 0),
    [initialData, t, tTypes],
  );

  const byContext = useMemo(
    () =>
      RECOMMENDATION_CONTEXTS.map((context) => {
        const group = initialData.filter((item) => item.context === context);
        return {
          key: context,
          label: tContexts(context),
          value: group.length,
          hint: t("conversionHint", {
            value: formatPercent(rate(group.filter((i) => i.is_purchased).length, group.length)),
          }),
        };
      }).filter((item) => item.value > 0),
    [initialData, t, tContexts],
  );

  const columns = useMemo<GridColumn<IRecommendation>[]>(
    () => [
      {
        id: "productName",
        accessorFn: (row) => productLabel(row),
        header: t("fields.productId"),
        meta: { label: t("fields.productId"), hideable: false, exportValue: (row) => productLabel(row) },
        cell: ({ row }) => (
          <div className='flex min-w-0 items-center gap-3'>
            {row.original.product_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.product_image_url}
                alt=''
                className='h-10 w-10 shrink-0 rounded-lg border border-border object-cover'
              />
            ) : null}
            <div className='min-w-0'>
              <p className='truncate font-semibold text-foreground'>{productLabel(row.original)}</p>
              <p className='text-xs text-muted-foreground'>{formatMoney(row.original.product_price)}</p>
            </div>
          </div>
        ),
      },
      {
        id: "customer_id",
        accessorFn: (row) => row.customer_id ?? 0,
        header: t("fields.customerId"),
        meta: { label: t("fields.customerId"), exportValue: (row) => row.customer_id },
        cell: ({ row }) => `#${row.original.customer_id ?? "—"}`,
      },
      {
        id: "recommendation_type",
        header: t("fields.recommendationType"),
        enableSorting: false,
        meta: { label: t("fields.recommendationType"), exportValue: (row) => typeLabel(row) },
        cell: ({ row }) =>
          row.original.recommendation_type ? <Badge variant='secondary'>{typeLabel(row.original)}</Badge> : "—",
      },
      {
        id: "context",
        header: t("fields.context"),
        enableSorting: false,
        meta: { label: t("fields.context"), exportValue: (row) => contextLabel(row) },
        cell: ({ row }) => contextLabel(row.original),
      },
      {
        id: "score",
        accessorFn: (row) => row.score ?? 0,
        header: t("fields.score"),
        meta: { label: t("fields.score"), exportValue: (row) => row.score },
        cell: ({ row }) => {
          const score = row.original.score ?? 0;
          return (
            <div className='flex items-center gap-2'>
              <div
                className='h-2 w-16 overflow-hidden rounded-full bg-muted'
                role='meter'
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={score}
                aria-label={t("fields.score")}>
                <div className='h-full rounded-full bg-primary' style={{ width: `${score * 100}%` }} />
              </div>
              <span className='tabular-nums text-xs text-muted-foreground'>{score.toFixed(2)}</span>
            </div>
          );
        },
      },
      {
        id: "funnel",
        header: t("funnel"),
        enableSorting: false,
        meta: {
          label: t("funnel"),
          exportValue: (row) => (row.is_purchased ? t("purchased") : row.is_clicked ? t("clicked") : "—"),
        },
        cell: ({ row }) => (
          <div className='flex gap-1'>
            <Badge variant={row.original.is_clicked ? "default" : "outline"}>{t("clicked")}</Badge>
            <Badge variant={row.original.is_purchased ? "default" : "outline"}>{t("purchased")}</Badge>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tTypes, tContexts],
  );

  const filters: GridFilter<IRecommendation>[] = [
    {
      id: "type",
      label: t("fields.recommendationType"),
      options: RECOMMENDATION_TYPES.map((type) => ({ value: type, label: tTypes(type) })),
      accessor: (row) => row.recommendation_type,
    },
    {
      id: "context",
      label: t("fields.context"),
      options: RECOMMENDATION_CONTEXTS.map((context) => ({ value: context, label: tContexts(context) })),
      accessor: (row) => row.context,
    },
    {
      id: "funnel",
      label: t("funnel"),
      options: [
        { value: "none", label: t("noInteraction") },
        { value: "clicked", label: t("clicked") },
        { value: "purchased", label: t("purchased") },
      ],
      accessor: (row) => (row.is_purchased ? "purchased" : row.is_clicked ? "clicked" : "none"),
    },
  ];

  return (
    <CrudManager<IRecommendation>
      gridId='recomendaciones'
      namespace='Administre.recommendation'
      icon={HiOutlineLightBulb}
      eyebrow={tCrud("domains.content")}
      data={data}
      columns={columns}
      filters={filters}
      stats={[
        { label: t("total"), value: total, icon: HiOutlineLightBulb },
        { label: t("ctr"), value: formatPercent(rate(clicked, total)), icon: HiOutlineCursorArrowRays },
        {
          label: t("conversion"),
          value: formatPercent(rate(purchased, total)),
          icon: HiOutlineShoppingBag,
          hint: t("clickToPurchase", { value: formatPercent(rate(purchased, clicked)) }),
        },
        { label: t("avgScore"), value: avgScore.toFixed(2), icon: HiOutlineSparkles },
      ]}
      rowLabel={(row) => productLabel(row)}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${productLabel(row)} ${row.customer_id ?? ""}`}
      renderForm={(item, close) => <RecommendationForm item={item} handleClose={close} />}
      onDelete={(id) => deleteRecommendationServerAction(id)}>
      <div className='grid gap-4 lg:grid-cols-2'>
        <BreakdownList title={t("byType")} items={byType} emptyLabel={t("emptyBreakdown")} />
        <BreakdownList title={t("byContext")} items={byContext} emptyLabel={t("emptyBreakdown")} />
      </div>
    </CrudManager>
  );
};
