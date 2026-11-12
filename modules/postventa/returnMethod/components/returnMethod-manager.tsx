/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineArrowUturnLeft,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import { formatApiDate, createdWithin } from "@/lib/format";
import type { IReturnMethod } from "../models/returnMethod.interface";
import { deleteReturnMethodServerAction } from "@/app/[locale]/postventa/return-methods/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RegisterReturnMethod = dynamic(() => import("./form").then((m) => m.RegisterReturnMethod), { loading: () => <FormSkeleton /> });
const UpdateReturnMethod = dynamic(() => import("./form").then((m) => m.UpdateReturnMethod), { loading: () => <FormSkeleton /> });

interface IReturnMethodManagerProps {
  initialData: IReturnMethod[];
}

/** Métodos de devolución. */
export const ReturnMethodManager = ({ initialData }: IReturnMethodManagerProps) => {
  const t = useTranslations("Administre.returnMethod");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IReturnMethod>[]>(
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
    { label: t("total"), value: initialData.length, icon: HiOutlineArrowUturnLeft },
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
    <CrudManager<IReturnMethod>
      gridId='metodos-devolucion'
      namespace='Administre.returnMethod'
      icon={HiOutlineArrowUturnLeft}
      modalSize='md'
      eyebrow={tCrud("domains.aftersales")}
      data={initialData}
      columns={columns}
      stats={stats}
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchText={(row) => (row.name ?? "") + " " + (row.description ?? "")}
      renderForm={(item, close) =>
        item ? (
          <UpdateReturnMethod initialValues={item} handleClose={close} />
        ) : (
          <RegisterReturnMethod handleClose={close} />
        )}
      onDelete={(id) => deleteReturnMethodServerAction(id)}
    />
  );
};
