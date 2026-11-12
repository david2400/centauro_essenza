/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineComputerDesktop,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineLockOpen,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
  HiOutlineShoppingCart,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import { DataGrid, type GridColumn, type RowAction } from "@/components/data-grid";
import { formatApiDate, formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { cn } from "@/lib/utils";
import { REGISTERS_HREF, STORES_HREF, type ICashRegister, type ICashSession } from "../models/cash.interface";
import { deleteCashRegisterServerAction } from "@/app/[locale]/ventas/cash-registers/actions";
import dynamic from "next/dynamic";
import { useMountedOnce } from "@/lib/use-mounted-once";

// Se descargan al abrirse (no viajan con la página).
const OpenSessionDialog = dynamic(() => import("./open-session-dialog").then((m) => m.OpenSessionDialog));

/**
 * Cajas y turnos: estado de cada caja (abierta por quién, efectivo esperado), abrir turno,
 * ir al punto de venta o al arqueo, y el historial de turnos con sus diferencias.
 */
export const CashRegisterManager = ({ registers, sessions }: { registers: ICashRegister[]; sessions: ICashSession[] }) => {
  const t = useTranslations("Administre.cash.register");
  const ts = useTranslations("Administre.cash.session");
  const tCrud = useTranslations("Crud");
  const router = useRouter();
  const [opening, setOpening] = useState<ICashRegister | null>(null);
  const openMounted = useMountedOnce(opening != null);

  const open = registers.filter((register) => register.open_session_id != null);
  const overLimit = open.filter((register) => register.over_cash_limit).length;
  const expected = open.reduce((sum, register) => sum + (register.expected_cash ?? 0), 0);

  const columns = useMemo<GridColumn<ICashRegister>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name ?? "",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                row.original.open_session_id ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground",
              )}>
              <HiOutlineComputerDesktop className='h-5 w-5' aria-hidden='true' />
            </span>
            <div>
              <Link href={`${REGISTERS_HREF}/${row.original.id}`} className='font-semibold underline-offset-4 hover:underline'>
                {row.original.name}
              </Link>
              <p className='font-mono text-xs text-muted-foreground'>
                {row.original.code}
                {row.original.location ? ` · ${row.original.location}` : ""}
              </p>
              <div className='mt-1 flex flex-wrap gap-1'>
                {row.original.blind_close ? <Badge variant='outline'>{t("badges.blind")}</Badge> : null}
                {row.original.auto_invoice ? <Badge variant='outline'>{t("badges.invoice")}</Badge> : null}
                {(row.original.allowed_method_ids ?? []).length > 0 ? (
                  <Badge variant='outline'>{t("badges.methods", { count: (row.original.allowed_method_ids ?? []).length })}</Badge>
                ) : null}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "store",
        accessorFn: (row) => row.store_name ?? "",
        header: t("fields.store"),
        meta: { label: t("fields.store"), exportValue: (row) => row.store_name },
        cell: ({ row }) => (
          <span className='inline-flex items-center gap-1.5 text-sm'>
            <HiOutlineBuildingStorefront className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
            {row.original.store_name ?? "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: t("fields.status"),
        enableSorting: false,
        meta: { label: t("fields.status"), exportValue: (row) => (row.open_session_id ? t("open") : t("closed")) },
        cell: ({ row }) =>
          row.original.open_session_id ? (
            <div>
              <Badge variant='default'>{t("open")}</Badge>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {t("openedBy", { name: row.original.opened_by ?? "", date: formatApiDate(row.original.opened_at) })}
              </p>
            </div>
          ) : (
            <Badge variant={row.original.active ? "outline" : "secondary"}>{row.original.active ? t("closed") : t("inactive")}</Badge>
          ),
      },
      {
        id: "expected",
        header: t("fields.expectedCash"),
        enableSorting: false,
        meta: { label: t("fields.expectedCash"), align: "right", exportValue: (row) => row.expected_cash },
        cell: ({ row }) =>
          row.original.open_session_id ? (
            <span className='inline-flex items-center gap-1 tabular-nums'>
              {formatMoney(row.original.expected_cash)}
              {row.original.over_cash_limit ? (
                <HiOutlineExclamationTriangle
                  className='h-4 w-4 text-amber-600'
                  aria-label={t("overLimit", { amount: formatMoney(row.original.cash_limit) })}
                />
              ) : null}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { label: t("fields.actions"), hideable: false },
        cell: ({ row }) =>
          row.original.open_session_id ? (
            <div className='flex justify-end gap-2'>
              <Link
                href={`/ventas/pos?session=${row.original.open_session_id}`}
                className='inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
                <HiOutlineShoppingCart className='h-4 w-4' aria-hidden='true' />
                {t("goPos")}
              </Link>
              <Link
                href={`/ventas/cash-sessions/${row.original.open_session_id}`}
                className='inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium hover:bg-muted'>
                {t("closeSession")}
              </Link>
            </div>
          ) : row.original.active ? (
            <div className='flex justify-end'>
              <Buttons type='button' size='sm' className='rounded-full' onClick={() => setOpening(row.original)}>
                <HiOutlineLockOpen className='h-4 w-4' aria-hidden='true' />
                {t("openSession")}
              </Buttons>
            </div>
          ) : null,
      },
    ],
    [t],
  );

  const sessionColumns: GridColumn<ICashSession>[] = [
    {
      id: "id",
      header: ts("fields.session"),
      meta: { label: ts("fields.session"), hideable: false },
      cell: ({ row }) => (
        <Link href={`/ventas/cash-sessions/${row.original.id}`} className='font-semibold text-primary underline-offset-4 hover:underline'>
          {ts("label", { id: row.original.id ?? "" })}
        </Link>
      ),
    },
    {
      id: "register",
      header: ts("fields.register"),
      meta: { label: ts("fields.register") },
      cell: ({ row }) => row.original.register_name ?? "—",
    },
    {
      id: "opened",
      header: ts("fields.opened"),
      meta: { label: ts("fields.opened") },
      cell: ({ row }) => (
        <div className='text-xs'>
          <p>{formatApiDate(row.original.opened_at)}</p>
          <p className='text-muted-foreground'>{row.original.opened_by}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: ts("fields.status"),
      meta: { label: ts("fields.status") },
      cell: ({ row }) => (
        <Badge variant={row.original.status === "OPEN" ? "default" : "outline"}>{ts(`statuses.${row.original.status === "OPEN" ? "OPEN" : "CLOSED"}`)}</Badge>
      ),
    },
    {
      id: "sales",
      header: ts("fields.collected"),
      meta: { label: ts("fields.collected"), align: "right" },
      cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.collected_total)}</span>,
    },
    {
      id: "difference",
      header: ts("fields.difference"),
      meta: { label: ts("fields.difference"), align: "right" },
      cell: ({ row }) => {
        const diff = row.original.cash_difference;
        if (diff == null) return <span className='text-muted-foreground'>—</span>;
        return (
          <span className={cn("font-medium tabular-nums", diff < 0 ? "text-destructive" : diff > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
            {diff > 0 ? "+" : ""}
            {formatMoney(diff)}
          </span>
        );
      },
    },
  ];

  const rowActions = (row: ICashRegister): RowAction[] => [
    { label: t("edit"), icon: HiOutlinePencilSquare, onSelect: () => router.push(`${REGISTERS_HREF}/${row.id}`) },
    ...(row.open_session_id
      ? [{ label: t("viewSession"), icon: HiOutlineEye, onSelect: () => router.push(`/ventas/cash-sessions/${row.open_session_id}`) }]
      : []),
  ];

  return (
    <>
      <CrudManager<ICashRegister>
        gridId='cajas'
        namespace='Administre.cash.register'
        icon={HiOutlineComputerDesktop}
        eyebrow={tCrud("domains.sales")}
        data={registers}
        columns={columns}
        modalSize='md'
        stats={[
          { label: t("total"), value: registers.length, icon: HiOutlineComputerDesktop },
          { label: t("openCount"), value: open.length, icon: HiOutlineLockOpen, tone: open.length > 0 ? "success" : "default" },
          { label: t("expectedTotal"), value: formatMoney(expected), icon: HiOutlineBanknotes, hint: t("expectedHint") },
          {
            label: t("overLimitCount"),
            value: overLimit,
            icon: HiOutlineExclamationTriangle,
            tone: overLimit > 0 ? "warning" : "default",
            hint: t("overLimitHint"),
          },
        ]}
        rowLabel={(row) => row.name ?? `#${row.id}`}
        searchPlaceholder={t("searchPlaceholder")}
        searchText={(row) => `${row.name ?? ""} ${row.code ?? ""} ${row.store_name ?? ""}`}
        headerActions={
          <div className='flex flex-wrap gap-2'>
            <Link
              href={STORES_HREF}
              className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              <HiOutlineBuildingStorefront className='h-4 w-4' aria-hidden='true' />
              {t("stores")}
            </Link>
            <Link
              href='/ventas/pos'
              className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              <HiOutlineShoppingCart className='h-4 w-4' aria-hidden='true' />
              {t("goPos")}
            </Link>
            <Link
              href={`${REGISTERS_HREF}/new`}
              className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
              <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
              {t("create")}
            </Link>
          </div>
        }
        extraRowActions={rowActions}
        onDelete={(id) => deleteCashRegisterServerAction(id)}>
        <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
          <div className='flex flex-wrap items-baseline justify-between gap-2'>
            <h3 className='text-sm font-semibold text-foreground'>{ts("history")}</h3>
            <p className='text-xs text-muted-foreground'>{ts("historyHint")}</p>
          </div>
          <DataGrid<ICashSession>
            mode='client'
            embedded
            id='cash-sessions'
            caption={ts("history")}
            data={sessions}
            columns={sessionColumns}
            getRowId={(session) => String(session.id)}
            searchText={(session) => `${session.register_name ?? ""} ${session.opened_by ?? ""} ${session.id}`}
            rowActions={(session) => [
              { label: ts("view"), icon: HiOutlineEye, onSelect: () => router.push(`/ventas/cash-sessions/${session.id}`) },
            ]}
            emptyState={{ title: ts("emptyTitle"), description: ts("emptyDescription") }}
          />
        </section>
      </CrudManager>
      {openMounted ? <OpenSessionDialog register={opening} onClose={() => setOpening(null)} /> : null}
    </>
  );
};
