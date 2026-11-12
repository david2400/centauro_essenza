/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineCube, HiOutlineRectangleStack, HiOutlineSwatch } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import type { IAttributeOption, IProductTemplate } from "../models/productTemplate.interface";
import { deleteProductTemplateServerAction } from "@/app/[locale]/fichaTecnica/templates/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const ProductTemplateForm = dynamic(() => import("./form").then((m) => m.ProductTemplateForm), { loading: () => <FormSkeleton /> });

interface IProductTemplateManagerProps {
  initialData: IProductTemplate[];
  attributes: IAttributeOption[];
}

const attributeName = (item: NonNullable<IProductTemplate["attributes"]>[number]) =>
  item.attribute?.name ?? `#${item.attribute_id}`;

/** Plantillas por tipo de producto: qué atributos pide la ficha y cuáles definen las variantes. */
export const ProductTemplateManager = ({ initialData, attributes }: IProductTemplateManagerProps) => {
  const t = useTranslations("Administre.productTemplate");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IProductTemplate>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name ?? "",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <span className='font-semibold text-foreground'>{row.original.name ?? "—"}</span>
            {row.original.description ? (
              <p className='line-clamp-1 text-xs text-muted-foreground'>{row.original.description}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "sheet",
        header: t("fields.sheet"),
        enableSorting: false,
        meta: {
          label: t("fields.sheet"),
          exportValue: (row) =>
            (row.attributes ?? []).filter((item) => !item.variant_axis).map(attributeName).join(", "),
        },
        cell: ({ row }) => {
          const sheet = (row.original.attributes ?? []).filter((item) => !item.variant_axis);
          if (sheet.length === 0) return "—";
          return (
            <div className='flex flex-wrap gap-1'>
              {sheet.map((item) => (
                <Badge key={item.attribute_id} variant='outline'>
                  {attributeName(item)}
                  {item.required ? " *" : ""}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "axes",
        header: t("fields.axes"),
        enableSorting: false,
        meta: {
          label: t("fields.axes"),
          exportValue: (row) => (row.attributes ?? []).filter((item) => item.variant_axis).map(attributeName).join(", "),
        },
        cell: ({ row }) => {
          const axes = (row.original.attributes ?? []).filter((item) => item.variant_axis);
          if (axes.length === 0) return <span className='text-muted-foreground'>{t("noAxes")}</span>;
          return (
            <div className='flex flex-wrap gap-1'>
              {axes.map((item) => (
                <Badge key={item.attribute_id} variant='secondary'>
                  {attributeName(item)}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "product_count",
        accessorFn: (row) => row.product_count ?? 0,
        header: t("fields.productCount"),
        meta: { label: t("fields.productCount"), align: "right", exportValue: (row) => row.product_count ?? 0 },
        cell: ({ row }) => <span className='tabular-nums'>{row.original.product_count ?? 0}</span>,
      },
    ],
    [t],
  );

  const stats = [
    { label: t("total"), value: initialData.length, icon: HiOutlineRectangleStack },
    {
      label: t("withAxes"),
      value: initialData.filter((item) => (item.attributes ?? []).some((attribute) => attribute.variant_axis)).length,
      icon: HiOutlineSwatch,
      hint: t("withAxesHint"),
    },
    {
      label: t("productsUsing"),
      value: initialData.reduce((sum, item) => sum + (item.product_count ?? 0), 0),
      icon: HiOutlineCube,
    },
  ];

  return (
    <CrudManager<IProductTemplate>
      gridId='plantillas-producto'
      namespace='Administre.productTemplate'
      icon={HiOutlineRectangleStack}
      eyebrow={tCrud("domains.specs")}
      data={initialData}
      columns={columns}
      stats={stats}
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${row.name ?? ""} ${(row.attributes ?? []).map(attributeName).join(" ")}`}
      renderForm={(item, close) => <ProductTemplateForm item={item} attributes={attributes} handleClose={close} />}
      onDelete={(id) => deleteProductTemplateServerAction(id)}
    />
  );
};
