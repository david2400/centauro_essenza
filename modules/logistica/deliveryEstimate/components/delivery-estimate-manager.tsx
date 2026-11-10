/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineCalendarDays, HiOutlineClock, HiOutlineTruck } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { Link } from "@/shared/i18n/routing";
import type { IDeliveryCarrier, IDeliveryEstimate } from "../models/deliveryEstimate.interface";
import { deleteDeliveryEstimateServerAction } from "@/app/[locale]/logistica/delivery-estimates/actions";

const dateFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

/** Formatea `LocalDate` (YYYY-MM-DD) sin desfase de zona horaria. */
const formatDate = (value?: string) => {
  if (!value) return "—";
  const [datePart] = value.split("T");
  const [y, m, d] = (datePart ?? "").split("-").map(Number);
  if (!y || !m || !d) return value;
  return dateFormatter.format(new Date(y, m - 1, d));
};

interface IDeliveryEstimateManagerProps {
  initialData: IDeliveryEstimate[];
  carriers: IDeliveryCarrier[];
}

/**
 * Histórico de estimaciones de entrega (solo lectura y depuración). Las fechas de entrega ahora salen del tarifario de
 * envíos: días hábiles por zona y transportadora.
 */
export const DeliveryEstimateManager = ({ initialData, carriers }: IDeliveryEstimateManagerProps) => {
  const t = useTranslations("Administre.deliveryEstimate");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const carrierNames = useMemo(
    () => new Map(carriers.map((carrier) => [carrier.id ?? -1, carrier.name ?? `#${carrier.id}`])),
    [carriers],
  );
  const carrierName = (row: IDeliveryEstimate) => carrierNames.get(row.carrier_id ?? -1) ?? "—";
  const route = (row: IDeliveryEstimate) => `${row.origin_address ?? "—"} → ${row.destination_address ?? "—"}`;

  const data = useMemo(() => [...initialData].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)), [initialData]);
  const days = initialData.map((item) => item.estimated_days).filter((value): value is number => value != null);
  const averageDays = days.length ? (days.reduce((acc, value) => acc + value, 0) / days.length).toFixed(1) : "—";
  const activeCarriers = carriers.filter((carrier) => carrier.is_active !== false).length;

  const columns = useMemo<GridColumn<IDeliveryEstimate>[]>(
    () => [
      {
        id: "carrier_id",
        accessorFn: (row) => carrierName(row),
        header: t("fields.carrierId"),
        meta: { label: t("fields.carrierId"), hideable: false, exportValue: (row) => carrierName(row) },
        cell: ({ row }) => <span className='font-semibold text-foreground'>{carrierName(row.original)}</span>,
      },
      {
        id: "route",
        header: t("fields.route"),
        enableSorting: false,
        meta: { label: t("fields.route"), exportValue: (row) => route(row) },
        cell: ({ row }) => route(row.original),
      },
      {
        id: "shipment_date",
        accessorFn: (row) => row.shipment_date ?? "",
        header: t("fields.shipmentDate"),
        meta: { label: t("fields.shipmentDate"), exportValue: (row) => row.shipment_date },
        cell: ({ row }) => formatDate(row.original.shipment_date),
      },
      {
        id: "estimatedDeliveryDate",
        accessorFn: (row) => row.estimated_delivery_date ?? "",
        header: t("fields.estimatedDeliveryDate"),
        meta: { label: t("fields.estimatedDeliveryDate"), exportValue: (row) => row.estimated_delivery_date },
        cell: ({ row }) => (
          <span className='font-semibold text-foreground'>{formatDate(row.original.estimated_delivery_date)}</span>
        ),
      },
      {
        id: "window",
        header: t("fields.window"),
        enableSorting: false,
        meta: {
          label: t("fields.window"),
          defaultHidden: true,
          exportValue: (row) => `${row.min_delivery_date ?? ""} – ${row.max_delivery_date ?? ""}`,
        },
        cell: ({ row }) => `${formatDate(row.original.min_delivery_date)} – ${formatDate(row.original.max_delivery_date)}`,
      },
      {
        id: "estimatedDays",
        accessorFn: (row) => row.estimated_days ?? 0,
        header: t("fields.estimatedDays"),
        meta: { label: t("fields.estimatedDays"), align: "right", exportValue: (row) => row.estimated_days },
        cell: ({ row }) => row.original.estimated_days ?? "—",
      },
      {
        id: "is_business_days_only",
        header: t("fields.isBusinessDaysOnly"),
        enableSorting: false,
        meta: {
          label: t("fields.isBusinessDaysOnly"),
          exportValue: (row) => (row.is_business_days_only ? tCommon("yes") : tCommon("no")),
        },
        cell: ({ row }) => (
          <Badge variant={row.original.is_business_days_only ? "default" : "outline"}>
            {row.original.is_business_days_only ? tCommon("yes") : tCommon("no")}
          </Badge>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carrierNames, t, tCommon],
  );

  const filters: GridFilter<IDeliveryEstimate>[] = [
    {
      id: "carrier_id",
      label: t("fields.carrierId"),
      options: carriers
        .filter((carrier) => carrier.id != null)
        .map((carrier) => ({ value: String(carrier.id), label: carrier.name ?? `#${carrier.id}` })),
      accessor: (row) => row.carrier_id,
    },
    {
      id: "is_business_days_only",
      label: t("fields.isBusinessDaysOnly"),
      options: [
        { value: "true", label: tCommon("yes") },
        { value: "false", label: tCommon("no") },
      ],
      accessor: (row) => String(Boolean(row.is_business_days_only)),
    },
  ];

  return (
    <CrudManager<IDeliveryEstimate>
      gridId='estimaciones-entrega'
      namespace='Administre.deliveryEstimate'
      icon={HiOutlineCalendarDays}
      eyebrow={tCrud("domains.logistics")}
      data={data}
      columns={columns}
      filters={filters}
      stats={[
        { label: t("total"), value: initialData.length, icon: HiOutlineCalendarDays },
        { label: t("averageDays"), value: averageDays, icon: HiOutlineClock },
        {
          label: t("carriersCount"),
          value: activeCarriers,
          icon: HiOutlineTruck,
          tone: activeCarriers === 0 ? "warning" : "default",
        },
      ]}
      rowLabel={(row) => `#${row.id}`}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${carrierName(row)} ${route(row)}`}
      onDelete={(id) => deleteDeliveryEstimateServerAction(id)}>
      <p className='rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground'>
        {t("movedToTariff")}{" "}
        <Link href='/logistica/shipping-costs' className='font-medium text-primary underline-offset-4 hover:underline'>
          {t("goToTariff")}
        </Link>
      </p>
    </CrudManager>
  );
};
