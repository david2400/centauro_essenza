/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import { formatApiDate, createdWithin } from "@/lib/format";
import { RegisterRefundMethod, UpdateRefundMethod } from "./form";
import type { IRefundMethod } from "../models/refundMethod.interface";
import { deleteRefundMethodServerAction } from "@/app/[locale]/postventa/refund-methods/actions";

interface IRefundMethodManagerProps {
  initialData: IRefundMethod[];
}

/** Métodos de reembolso. */
export const RefundMethodManager = ({ initialData }: IRefundMethodManagerProps) => {
  const t = useTranslations("Administre.refundMethod");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IRefundMethod>[]>(
    () => [
      {
        id: "name",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => <span className='font-semibold text-foreground'>{row.original.name ?? "—"}</span>,
      },
      {
        id: "description",
        header: t("fields.description"),
        enableSorting: false,
        meta: { label: t("fields.description"), exportValue: (row) => row.description },
        cell: ({ row }) =>
          row.original.description ? <p className='line-clamp-2 max-w-md text-muted-foreground'>{row.original.description}</p> : "—",
      },
      {
        id: "active",
        header: t("fields.active"),
        enableSorting: false,
        meta: { label: t("fields.active"), exportValue: (row) => (row.active === false ? tCommon("no") : tCommon("yes")) },
        cell: ({ row }) => (
          <Badge variant={row.original.active === false ? "outline" : "default"}>
            {row.original.active === false ? tCommon("inactive") : tCommon("active")}
          </Badge>
        ),
      },
      {
        id: "updatedAt",
        header: tCrud("updatedAt"),
        meta: { label: tCrud("updatedAt"), exportValue: (row) => formatApiDate(row.updated_at ?? row.created_at) },
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-muted-foreground'>
            {formatApiDate(row.original.updated_at ?? row.original.created_at)}
          </span>
        ),
      },
    ],
    [t, tCommon, tCrud],
  );

  const now = Date.now();
  const stats = [
    { label: t("total"), value: initialData.length, icon: HiOutlineBanknotes },
    {
      label: tCrud("activeCount"),
      value: initialData.filter((item) => item.active !== false).length,
      icon: HiOutlineCheckCircle,
      tone: "success" as const,
    },
    {
      label: tCrud("recent"),
      value: initialData.filter((item) => createdWithin(item.created_at, 30, now)).length,
      icon: HiOutlineCalendarDays,
      hint: tCrud("recentHint"),
    },
  ];

  return (
    <CrudManager<IRefundMethod>
      gridId='metodos-reembolso'
      namespace='Administre.refundMethod'
      icon={HiOutlineBanknotes}
      modalSize='md'
      eyebrow={tCrud("domains.aftersales")}
      data={initialData}
      columns={columns}
      stats={stats}
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchText={(row) => (row.name ?? "") + " " + (row.description ?? "")}
      renderForm={(item, close) =>
        item ? (
          <UpdateRefundMethod initialValues={item} handleClose={close} />
        ) : (
          <RegisterRefundMethod handleClose={close} />
        )}
      onDelete={(id) => deleteRefundMethodServerAction(id)}
    />
  );
};
