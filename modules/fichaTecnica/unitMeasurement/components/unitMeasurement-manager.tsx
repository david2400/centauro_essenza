/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineCheckCircle, HiOutlineNoSymbol, HiOutlineScale, HiOutlineSquares2X2, HiOutlineStar } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter, RowAction } from "@/components/data-grid";
import { confirm, notify } from "@/components/notifications";
import { formatQuantity, UNIT_DIMENSIONS } from "@/shared/units/units";
import { UnitConverter } from "./unit-converter";
import type { IUnitMeasurement } from "../models/unitMeasurement.interface";
import { deleteUnitServerAction, updateUnitServerAction } from "@/app/[locale]/fichaTecnica/unit-measurements/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const UnitForm = dynamic(() => import("./form").then((m) => m.UnitForm), { loading: () => <FormSkeleton /> });

const DIMENSION_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  LENGTH: "secondary",
  MASS: "secondary",
  VOLUME: "secondary",
  AREA: "secondary",
  COUNT: "secondary",
  OTHER: "outline",
};

/** Catálogo de unidades: magnitud, base, factor, uso y convertidor. */
export const UnitMeasurementManager = ({ initialData }: { initialData: IUnitMeasurement[] }) => {
  const router = useRouter();
  const t = useTranslations("Administre.unitMeasurement");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const equivalence = (row: IUnitMeasurement) => {
    if (row.dimension === "OTHER") return t("noConversion");
    if (row.base) return t("baseOf", { dimension: t(`dimensions.${row.dimension as "LENGTH"}`) });
    return `1 ${row.symbol} = ${formatQuantity(row.factor, { symbol: row.base_symbol, decimals: 10 })}`;
  };

  const save = async (row: IUnitMeasurement, patch: Partial<IUnitMeasurement>, message: string) => {
    if (row.id == null) return;
    const result = await updateUnitServerAction({
      id: row.id,
      name: row.name ?? "",
      symbol: row.symbol,
      code: row.code,
      dimension: row.dimension,
      factor: row.base ? undefined : row.factor,
      decimals: row.decimals,
      active: row.active,
      base: row.base,
      ...patch,
    });
    if (result.success) {
      notify.success(message, row.name);
      router.refresh();
    } else notify.error(tCommon("errorTitle"), result.error);
  };

  const makeBase = async (row: IUnitMeasurement) => {
    const ok = await confirm({
      title: t("makeBaseTitle", { symbol: row.symbol ?? "" }),
      description: t("makeBaseText", { symbol: row.symbol ?? "", base: row.base_symbol ?? "" }),
      confirmLabel: t("makeBase"),
    });
    if (ok) await save(row, { base: true, active: true }, t("baseChanged"));
  };

  const columns = useMemo<GridColumn<IUnitMeasurement>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='flex min-w-0 items-center gap-3'>
            <span className='flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 px-1.5 text-sm font-semibold'>
              {row.original.symbol}
            </span>
            <div className='min-w-0'>
              <p className='truncate font-semibold text-foreground'>{row.original.name}</p>
              <p className='font-mono text-xs text-muted-foreground'>{row.original.code}</p>
            </div>
          </div>
        ),
      },
      {
        id: "dimension",
        accessorFn: (row) => row.dimension,
        header: t("fields.dimension"),
        meta: { label: t("fields.dimension"), exportValue: (row) => t(`dimensions.${row.dimension as "LENGTH"}`) },
        cell: ({ row }) => (
          <Badge variant={DIMENSION_VARIANT[row.original.dimension ?? "OTHER"]}>{t(`dimensions.${row.original.dimension as "LENGTH"}`)}</Badge>
        ),
      },
      {
        id: "equivalence",
        accessorFn: (row) => row.factor,
        header: t("fields.equivalence"),
        meta: { label: t("fields.equivalence"), exportValue: (row) => equivalence(row) },
        cell: ({ row }) =>
          row.original.base ? (
            <span className='inline-flex items-center gap-1.5 text-sm font-medium'>
              <HiOutlineStar className='h-4 w-4 text-warning' aria-hidden='true' />
              {equivalence(row.original)}
            </span>
          ) : (
            <span className='tabular-nums text-sm'>{equivalence(row.original)}</span>
          ),
      },
      {
        id: "decimals",
        accessorFn: (row) => row.decimals,
        header: t("fields.decimals"),
        meta: { label: t("fields.decimals"), align: "right", defaultHidden: true, exportValue: (row) => row.decimals },
      },
      {
        id: "usage",
        accessorFn: (row) => row.usage_count ?? 0,
        header: t("fields.usage"),
        meta: { label: t("fields.usage"), align: "right", exportValue: (row) => row.usage_count },
        cell: ({ row }) =>
          (row.original.usage_count ?? 0) > 0 ? (
            <span className='tabular-nums'>{row.original.usage_count}</span>
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        id: "active",
        accessorFn: (row) => String(row.active),
        header: tCommon("status"),
        meta: { label: tCommon("status"), exportValue: (row) => (row.active ? tCommon("active") : tCommon("inactive")) },
        cell: ({ row }) => (row.original.active ? <Badge>{tCommon("active")}</Badge> : <Badge variant='outline'>{tCommon("inactive")}</Badge>),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tCommon],
  );

  const filters: GridFilter<IUnitMeasurement>[] = [
    {
      id: "dimension",
      label: t("fields.dimension"),
      accessor: (row) => row.dimension,
      options: UNIT_DIMENSIONS.map((value) => ({ value, label: t(`dimensions.${value}`) })),
    },
    {
      id: "active",
      label: tCommon("status"),
      accessor: (row) => String(row.active),
      options: [
        { value: "true", label: tCommon("active") },
        { value: "false", label: tCommon("inactive") },
      ],
    },
  ];

  const extraRowActions = (row: IUnitMeasurement): RowAction[] => {
    const actions: RowAction[] = [];
    if (!row.base && row.dimension !== "OTHER") {
      actions.push({ label: t("makeBase"), icon: HiOutlineStar, onSelect: () => makeBase(row) });
    }
    if (!row.base) {
      actions.push(
        row.active
          ? { label: t("deactivate"), icon: HiOutlineNoSymbol, onSelect: () => save(row, { active: false }, tCommon("updatedSuccess")) }
          : { label: t("activate"), icon: HiOutlineCheckCircle, onSelect: () => save(row, { active: true }, tCommon("updatedSuccess")) },
      );
    }
    return actions;
  };

  const dimensionsInUse = new Set(initialData.map((unit) => unit.dimension)).size;
  const stats = [
    { label: t("total"), value: initialData.filter((unit) => unit.active).length, icon: HiOutlineScale, hint: t("inactiveHint", { count: initialData.filter((unit) => !unit.active).length }) },
    { label: t("dimensionsCount"), value: dimensionsInUse, icon: HiOutlineSquares2X2 },
    { label: t("inUse"), value: initialData.filter((unit) => (unit.usage_count ?? 0) > 0).length, icon: HiOutlineCheckCircle, hint: t("inUseHint") },
  ];

  return (
    <CrudManager<IUnitMeasurement>
      gridId='unidades-medida'
      namespace='Administre.unitMeasurement'
      icon={HiOutlineScale}
      eyebrow={tCrud("domains.specs")}
      data={initialData}
      columns={columns}
      filters={filters}
      stats={stats}
      modalSize='lg'
      rowLabel={(row) => row.name ?? `#${row.id}`}
      searchText={(row) => `${row.name ?? ""} ${row.symbol ?? ""} ${row.code ?? ""}`}
      extraRowActions={extraRowActions}
      renderForm={(item, close) => <UnitForm unit={item} units={initialData} handleClose={close} />}
      onDelete={(id) => deleteUnitServerAction(id)}>
      <UnitConverter units={initialData} />
    </CrudManager>
  );
};
