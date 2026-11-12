/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineTruck,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import { formatApiDate, createdWithin, formatMoney, formatNumber } from "@/lib/format";
import type { ICarrier } from "../models/carrier.interface";
import { deleteCarrierServerAction } from "@/app/[locale]/logistica/carriers/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RegisterCarrier = dynamic(() => import("./form").then((m) => m.RegisterCarrier), { loading: () => <FormSkeleton /> });
const UpdateCarrier = dynamic(() => import("./form").then((m) => m.UpdateCarrier), { loading: () => <FormSkeleton /> });

interface ICarrierManagerProps {
  initialData: ICarrier[];
}

/** Transportadoras con tarifas y tiempos máximos. */
export const CarrierManager = ({ initialData }: ICarrierManagerProps) => {
  const t = useTranslations("Administre.carrier");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<ICarrier>[]>(
    () => [
      {
        id: "name",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => <span className='font-semibold text-foreground'>{row.original.name ?? "—"}</span>,
      },
      {
        id: "code",
        header: t("fields.code"),
        meta: { label: t("fields.code"), exportValue: (row) => row.code },
        cell: ({ row }) => <span className='font-mono text-xs'>{row.original.code || "—"}</span>,
      },
      {
        id: "contact_email",
        header: t("fields.contactEmail"),
        meta: { label: t("fields.contactEmail"), exportValue: (row) => row.contact_email },
        cell: ({ row }) =>
          row.original.contact_email ? (
            <a href={`mailto:${row.original.contact_email}`} className='text-primary underline-offset-4 hover:underline'>
              {row.original.contact_email}
            </a>
          ) : (
            "—"
          ),
      },
      {
        id: "base_rate",
        header: t("fields.baseRate"),
        meta: { label: t("fields.baseRate"), align: "right", exportValue: (row) => row.base_rate },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.base_rate)}</span>,
      },
      {
        id: "rate_per_km",
        header: t("fields.ratePerKm"),
        meta: { label: t("fields.ratePerKm"), align: "right", exportValue: (row) => row.rate_per_km },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.rate_per_km)}</span>,
      },
      {
        id: "max_delivery_days",
        header: t("fields.maxDeliveryDays"),
        meta: { label: t("fields.maxDeliveryDays"), align: "right", exportValue: (row) => row.max_delivery_days },
        cell: ({ row }) => <span className='tabular-nums'>{formatNumber(row.original.max_delivery_days)}</span>,
      },
      {
        id: "is_active",
        header: t("fields.isActive"),
        enableSorting: false,
        meta: { label: t("fields.isActive"), exportValue: (row) => (row.is_active === false ? tCommon("no") : tCommon("yes")) },
        cell: ({ row }) => (
          <Badge variant={row.original.is_active === false ? "outline" : "default"}>
            {row.original.is_active === false ? tCommon("inactive") : tCommon("active")}
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
    { label: t("total"), value: initialData.length, icon: HiOutlineTruck },
      {
        label: tCrud("activeCount"),
        value: initialData.filter((item) => item.is_active !== false).length,
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
    <CrudManager<ICarrier>
      gridId='transportadoras'
      namespace='Administre.carrier'
      icon={HiOutlineTruck}
      eyebrow={tCrud("domains.logistics")}
      data={initialData}
      columns={columns}
      stats={stats}
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchText={(row) => (row.name ?? "") + " " + (row.code ?? "") + " " + (row.contact_email ?? "")}
      renderForm={(item, close) =>
        item ? (
          <UpdateCarrier initialValues={item} handleClose={close} />
        ) : (
          <RegisterCarrier handleClose={close} />
        )}
      onDelete={(id) => deleteCarrierServerAction(id)}
    />
  );
};
