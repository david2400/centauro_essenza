/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  HiOutlineCalendarDays,
  HiOutlineChatBubbleLeftEllipsis,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import { formatApiDate, createdWithin } from "@/lib/format";
import type { IMotiveDevolution } from "../models/motiveDevolution.interface";
import { deleteMotiveDevolutionServerAction } from "@/app/[locale]/postventa/devolution-motives/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RegisterMotiveDevolution = dynamic(() => import("./form").then((m) => m.RegisterMotiveDevolution), { loading: () => <FormSkeleton /> });
const UpdateMotiveDevolution = dynamic(() => import("./form").then((m) => m.UpdateMotiveDevolution), { loading: () => <FormSkeleton /> });

interface IMotiveDevolutionManagerProps {
  initialData: IMotiveDevolution[];
}

/** Motivos de devolución. */
export const MotiveDevolutionManager = ({ initialData }: IMotiveDevolutionManagerProps) => {
  const t = useTranslations("Administre.motiveDevolution");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IMotiveDevolution>[]>(
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
    { label: t("total"), value: initialData.length, icon: HiOutlineChatBubbleLeftEllipsis },
    {
      label: tCrud("recent"),
      value: initialData.filter((item) => createdWithin(item.created_at, 30, now)).length,
      icon: HiOutlineCalendarDays,
      hint: tCrud("recentHint"),
    },
  ];

  return (
    <CrudManager<IMotiveDevolution>
      gridId='motivos-devolucion'
      namespace='Administre.motiveDevolution'
      icon={HiOutlineChatBubbleLeftEllipsis}
      modalSize='md'
      eyebrow={tCrud("domains.aftersales")}
      data={initialData}
      columns={columns}
      stats={stats}
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchText={(row) => (row.name ?? "") + " " + (row.description ?? "")}
      renderForm={(item, close) =>
        item ? (
          <UpdateMotiveDevolution initialValues={item} handleClose={close} />
        ) : (
          <RegisterMotiveDevolution handleClose={close} />
        )}
      onDelete={(id) => deleteMotiveDevolutionServerAction(id)}
    />
  );
};
