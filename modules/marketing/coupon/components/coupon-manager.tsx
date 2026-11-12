/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineTicket,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { notify } from "@/components/notifications";
import { CouponSimulator } from "./coupon-simulator";
import type { CouponStatus, ICoupon, INamedItem } from "../models/coupon.interface";
import { couponStatus, formatDate, formatMoney } from "../utils";
import { deleteCouponServerAction } from "@/app/[locale]/marketing/coupons/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const CouponForm = dynamic(() => import("./form").then((m) => m.CouponForm), { loading: () => <FormSkeleton /> });

interface ICouponManagerProps {
  initialData: ICoupon[];
  categories: INamedItem[];
}

const STATUS_VARIANT: Record<CouponStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  scheduled: "secondary",
  expired: "outline",
  exhausted: "outline",
  inactive: "destructive",
};

const STATUSES: CouponStatus[] = ["active", "scheduled", "expired", "exhausted", "inactive"];

/** Cupones: vigencia, consumo, simulador de descuento y acciones en lote. */
export const CouponManager = ({ initialData, categories }: ICouponManagerProps) => {
  const t = useTranslations("Administre.coupon");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const formatDiscount = (coupon: ICoupon) => {
    if (coupon.discount_type === "FREE_SHIPPING") return t("types.FREE_SHIPPING");
    if (coupon.discount_type === "PERCENTAGE") return `${coupon.discount_value ?? 0}%`;
    return formatMoney(coupon.discount_value);
  };
  const usage = (coupon: ICoupon) =>
    `${coupon.usage_count ?? 0} / ${coupon.usage_limit != null ? coupon.usage_limit : "∞"}`;

  const columns = useMemo<GridColumn<ICoupon>[]>(
    () => [
      {
        id: "code",
        header: t("fields.code"),
        meta: { label: t("fields.code"), hideable: false, exportValue: (row) => row.code },
        cell: ({ row }) => (
          <div className='flex flex-col'>
            <span className='font-mono font-semibold text-foreground'>{row.original.code}</span>
            <span className='text-xs text-muted-foreground'>{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "discount",
        header: t("fields.discount"),
        enableSorting: false,
        meta: { label: t("fields.discount"), exportValue: (row) => formatDiscount(row) },
        cell: ({ row }) => formatDiscount(row.original),
      },
      {
        id: "validity",
        header: t("fields.validity"),
        enableSorting: false,
        meta: {
          label: t("fields.validity"),
          exportValue: (row) => `${formatDate(row.valid_from)} – ${formatDate(row.valid_until)}`,
        },
        cell: ({ row }) => `${formatDate(row.original.valid_from)} – ${formatDate(row.original.valid_until)}`,
      },
      {
        id: "usage",
        header: t("fields.usage"),
        meta: { label: t("fields.usage"), align: "right", exportValue: (row) => usage(row) },
        accessorFn: (row) => row.usage_count ?? 0,
        cell: ({ row }) => {
          const limit = row.original.usage_limit;
          const used = row.original.usage_count ?? 0;
          const ratio = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
          return (
            <div className='flex min-w-24 flex-col items-end gap-1'>
              <span className='tabular-nums'>{usage(row.original)}</span>
              {ratio != null ? (
                <span className='h-1.5 w-full overflow-hidden rounded-full bg-muted' aria-hidden='true'>
                  <span className='block h-full rounded-full bg-primary' style={{ width: `${ratio}%` }} />
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: tCommon("status"),
        enableSorting: false,
        meta: { label: tCommon("status"), exportValue: (row) => t(`status.${couponStatus(row)}`) },
        cell: ({ row }) => {
          const status = couponStatus(row.original);
          return <Badge variant={STATUS_VARIANT[status]}>{t(`status.${status}`)}</Badge>;
        },
      },
      {
        id: "is_public",
        header: t("fields.isPublic"),
        enableSorting: false,
        meta: {
          label: t("fields.isPublic"),
          defaultHidden: true,
          exportValue: (row) => (row.is_public ? tCommon("yes") : tCommon("no")),
        },
        cell: ({ row }) => (row.original.is_public ? tCommon("yes") : tCommon("no")),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tCommon],
  );

  const filters: GridFilter<ICoupon>[] = [
    {
      id: "status",
      label: tCommon("status"),
      options: STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) })),
      accessor: (row) => couponStatus(row),
    },
    {
      id: "is_public",
      label: t("fields.isPublic"),
      options: [
        { value: "true", label: tCommon("yes") },
        { value: "false", label: tCommon("no") },
      ],
      accessor: (row) => String(Boolean(row.is_public)),
    },
  ];

  const statuses = initialData.map((coupon) => couponStatus(coupon));
  const active = statuses.filter((status) => status === "active").length;
  const scheduled = statuses.filter((status) => status === "scheduled").length;
  const uses = initialData.reduce((acc, coupon) => acc + (coupon.usage_count ?? 0), 0);

  const copyCodes = async (rows: ICoupon[]) => {
    const codes = rows.map((row) => row.code).filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(codes);
      notify.success(t("codesCopied", { count: rows.length }));
    } catch {
      notify.error(tCommon("errorTitle"), tCommon("unexpectedError"));
    }
  };

  return (
    <CrudManager<ICoupon>
      gridId='cupones'
      namespace='Administre.coupon'
      icon={HiOutlineTicket}
      eyebrow={tCrud("domains.marketing")}
      data={initialData}
      columns={columns}
      filters={filters}
      modalSize='xl'
      stats={[
        { label: t("total"), value: initialData.length, icon: HiOutlineTicket },
        { label: t("activeNow"), value: active, icon: HiOutlineCheckCircle, tone: "success" },
        { label: t("scheduledCount"), value: scheduled, icon: HiOutlineClock },
        { label: t("usesCount"), value: uses, icon: HiOutlineChartBar },
      ]}
      rowLabel={(row) => row.code ?? `#${row.id}`}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${row.code ?? ""} ${row.name ?? ""}`}
      extraRowActions={(row) => [
        { label: t("copyCode"), icon: HiOutlineClipboardDocument, onSelect: () => void copyCodes([row]) },
      ]}
      extraBulkActions={[{ label: t("copyCodes"), icon: HiOutlineClipboardDocument, onAction: copyCodes }]}
      renderForm={(item, close) => (
        <CouponForm coupon={item} categories={categories} handleClose={close} />
      )}
      onDelete={(id) => deleteCouponServerAction(id)}>
      <CouponSimulator />
    </CrudManager>
  );
};
