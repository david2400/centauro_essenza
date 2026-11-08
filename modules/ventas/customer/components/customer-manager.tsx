/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowDownTray, HiOutlineEye, HiOutlinePencilSquare, HiOutlinePlusCircle, HiOutlineUserGroup } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import { confirm, notify } from "@/components/notifications";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { import_customers_action } from "@/server/domains/sales/customers/actions";
import { CUSTOMERS_HREF, type ICustomerSummary } from "../models/customer.interface";

/** Clientes de la tienda con su actividad resumida. La ficha 360 está en el detalle. */
export const CustomerManager = ({ page, canManage }: { page: PageResult<ICustomerSummary>; canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.customer");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const [importing, setImporting] = useState(false);

  const columns = useMemo<GridColumn<ICustomerSummary>[]>(
    () => [
      {
        id: "name",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${CUSTOMERS_HREF}/${row.original.id}`} className='font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline'>
              {row.original.name}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>{`${row.original.doc_type} ${row.original.doc_number}`}</p>
          </div>
        ),
      },
      {
        id: "contact",
        header: t("fields.contact"),
        meta: { label: t("fields.contact"), exportValue: (row) => row.email ?? row.phone },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <p className='truncate'>{row.original.email ?? "—"}</p>
            <p className='truncate text-xs text-muted-foreground'>{[row.original.phone, row.original.billing_city].filter(Boolean).join(" · ")}</p>
          </div>
        ),
      },
      {
        id: "ordersCount",
        header: t("fields.orders"),
        meta: { label: t("fields.orders"), align: "right", exportValue: (row) => row.orders_count },
        cell: ({ row }) => <span className='tabular-nums'>{formatNumber(row.original.orders_count)}</span>,
      },
      {
        id: "totalSpent",
        header: t("fields.spent"),
        meta: { label: t("fields.spent"), align: "right", exportValue: (row) => row.total_spent },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.total_spent)}</span>,
      },
      {
        id: "lastOrderAt",
        header: t("fields.lastOrder"),
        meta: { label: t("fields.lastOrder"), exportValue: (row) => row.last_order_at },
        cell: ({ row }) => <span className='text-sm'>{row.original.last_order_at ? formatApiDate(row.original.last_order_at) : "—"}</span>,
      },
    ],
    [t],
  );

  const runImport = async () => {
    const ok = await confirm({ title: t("import.title"), description: t("import.description"), confirmLabel: t("import.label") });
    if (!ok) return;
    setImporting(true);
    const result = await import_customers_action();
    setImporting(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("import.done"), t("import.result", { count: result.data.created }));
    router.refresh();
  };

  return (
    <CrudManager<ICustomerSummary>
      mode='server'
      gridId='clientes'
      namespace='Administre.customer'
      icon={HiOutlineUserGroup}
      eyebrow={tCrud("domains.sales")}
      page={page}
      columns={columns}
      searchPlaceholder={t("searchPlaceholder")}
      rowLabel={(row) => row.name}
      headerActions={
        canManage ? (
          <div className='flex flex-wrap gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' loading={importing} onClick={() => void runImport()}>
              <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />
              {t("import.label")}
            </Buttons>
            <Link href={`${CUSTOMERS_HREF}/new`}
              className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
              <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
              {t("create")}
            </Link>
          </div>
        ) : undefined
      }
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${CUSTOMERS_HREF}/${row.id}`) },
        ...(canManage ? [{ label: t("edit"), icon: HiOutlinePencilSquare, onSelect: () => router.push(`${CUSTOMERS_HREF}/${row.id}/edit`) }] : []),
      ]}
    />
  );
};
