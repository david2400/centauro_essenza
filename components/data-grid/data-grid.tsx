/** @format */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Checkbox } from "@repo/ui/inputs/scenes/checkbox";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/menu/scenes/dropdown-menu";
import { cn } from "@repo/ui/utils";
import {
  HiChevronDown,
  HiChevronUp,
  HiChevronUpDown,
  HiEllipsisHorizontal,
  HiOutlineInboxStack,
  HiOutlineMagnifyingGlass,
  HiXMark,
} from "react-icons/hi2";
import { DEFAULT_PAGE_SIZE, type SortState } from "@/shared/models/pagination";
import { downloadText, datedFileName, toCsv } from "@/lib/export/csv";
import { notify } from "@/components/notifications";
import { GridToolbar, type Density } from "./grid-toolbar";
import { GridPagination } from "./grid-pagination";
import { useGridUrl } from "./use-grid-url";
import type {
  BulkAction,
  GridColumn,
  GridEmptyState,
  GridFilter,
  GridPagination as Pagination,
  RowAction,
} from "./types";

interface BaseProps<T> {
  /** Identificador estable: guarda columnas visibles y densidad por usuario. */
  id: string;
  data: T[];
  columns: GridColumn<T>[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  /** `false` oculta la caja de búsqueda (p. ej. el API del recurso aún no busca). */
  searchable?: boolean;
  filters?: GridFilter<T>[];
  rowActions?: (row: T) => RowAction[];
  bulkActions?: BulkAction<T>[];
  /** Nombre base del archivo exportado (sin extensión). */
  exportName?: string;
  emptyState: GridEmptyState;
  toolbarExtra?: ReactNode;
  /** Etiqueta accesible de la tabla. */
  caption: string;
  /**
   * `true` cuando el grid va dentro de una tarjeta contenedora (panel de
   * módulo): la tabla pierde su propio marco y hereda el de la tarjeta.
   */
  embedded?: boolean;
}

interface ServerProps<T> extends BaseProps<T> {
  mode: "server";
  pagination: Pagination;
  /** Devuelve todas las filas que cumplen la consulta actual (exportación). */
  onExportAll?: () => Promise<T[]>;
}

interface ClientProps<T> extends BaseProps<T> {
  mode: "client";
  /** Texto donde buscar en modo cliente; por defecto los valores exportables. */
  searchText?: (row: T) => string;
}

export type DataGridProps<T> = ServerProps<T> | ClientProps<T>;

const SELECT_COLUMN = "__select";
const ACTIONS_COLUMN = "__actions";

const readPrefs = (id: string): { visibility?: VisibilityState; density?: Density } => {
  try {
    return JSON.parse(window.localStorage.getItem(`grid:${id}`) ?? "{}");
  } catch {
    return {};
  }
};

const writePrefs = (id: string, prefs: { visibility: VisibilityState; density: Density }) => {
  try {
    window.localStorage.setItem(`grid:${id}`, JSON.stringify(prefs));
  } catch {
    // Almacenamiento no disponible (modo privado): no es crítico.
  }
};

const compare = (left: unknown, right: unknown) => {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "es", { sensitivity: "base", numeric: true });
};

/**
 * Tabla de datos "enterprise" común a todos los módulos.
 *
 * - `mode="server"`: búsqueda, orden, filtros y paginación viven en la URL
 *   y los resuelve el backend (escala a miles de registros).
 * - `mode="client"`: mismo comportamiento en memoria, para recursos cuyo
 *   API todavía no pagina.
 *
 * Incluye selección múltiple con acciones en lote, menú de acciones por
 * fila, columnas ocultables y densidad (recordadas por usuario), exportación
 * a CSV, estados vacío / sin resultados / cargando y atajo "/" de búsqueda.
 */
export function DataGrid<T>(props: DataGridProps<T>) {
  return props.mode === "server" ? <ServerDataGrid {...props} /> : <GridCore {...props} url={null} />;
}

/** Solo el modo servidor lee la URL (evita exigir Suspense en páginas estáticas). */
function ServerDataGrid<T>(props: ServerProps<T>) {
  const url = useGridUrl(DEFAULT_PAGE_SIZE);
  return <GridCore {...props} url={url} />;
}

type GridUrl = ReturnType<typeof useGridUrl>;

function GridCore<T>(props: DataGridProps<T> & { url: GridUrl | null }) {
  const { id, data, columns, getRowId, filters = [], rowActions, bulkActions = [], emptyState, caption } = props;
  const t = useTranslations("Grid");
  const isServer = props.mode === "server" && props.url !== null;
  // En modo servidor `url` siempre existe; el alias evita "!" repetidos.
  const url = (props.url ?? null) as GridUrl;

  // ── Estado local (modo cliente) ───────────────────────────────────────────
  const [local, setLocal] = useState({
    q: "",
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    sort: null as SortState | null,
    filters: {} as Record<string, string>,
  });

  const query = isServer
    ? { q: url.q, page: url.page, size: url.size, sort: url.sort }
    : { q: local.q, page: local.page, size: local.size, sort: local.sort };
  const filterValue = useCallback(
    (key: string) => (isServer ? url.get(key) : (local.filters[key] ?? "")),
    [isServer, url, local.filters],
  );

  const setSearch = useCallback(
    (value: string) => (isServer ? url.update({ q: value }) : setLocal((prev) => ({ ...prev, q: value, page: 0 }))),
    [isServer, url],
  );
  const setFilter = useCallback(
    (key: string, value: string) => {
      const cleared = Object.fromEntries(
        (filters.find((filter) => filter.id === key)?.resets ?? []).map((reset) => [reset, ""]),
      );
      return isServer
        ? url.update({ ...cleared, [key]: value })
        : setLocal((prev) => ({ ...prev, page: 0, filters: { ...prev.filters, ...cleared, [key]: value } }));
    },
    [isServer, url, filters],
  );
  const setSort = (sort: SortState | null) =>
    isServer ? url.setSort(sort) : setLocal((prev) => ({ ...prev, sort, page: 0 }));
  const setPage = (page: number) =>
    isServer ? url.update({ page: page + 1 }) : setLocal((prev) => ({ ...prev, page }));
  const setSize = (size: number) =>
    isServer ? url.update({ size }) : setLocal((prev) => ({ ...prev, size, page: 0 }));
  const reset = () =>
    isServer ? url.reset() : setLocal((prev) => ({ ...prev, q: "", page: 0, sort: null, filters: {} }));

  const hasActiveQuery = Boolean(query.q) || filters.some((filter) => Boolean(filterValue(filter.id)));

  // ── Preferencias por usuario ──────────────────────────────────────────────
  const defaultVisibility = useMemo<VisibilityState>(
    () =>
      Object.fromEntries(
        columns
          .filter((column) => column.meta?.defaultHidden)
          .map((column) => [column.id ?? (column as { accessorKey?: string }).accessorKey ?? "", false]),
      ),
    [columns],
  );
  const [visibility, setVisibility] = useState<VisibilityState>(defaultVisibility);
  const [density, setDensity] = useState<Density>("comfortable");
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    const prefs = readPrefs(id);
    if (prefs.visibility) setVisibility({ ...defaultVisibility, ...prefs.visibility });
    if (prefs.density) setDensity(prefs.density);
    setPrefsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (prefsLoaded) writePrefs(id, { visibility, density });
  }, [id, visibility, density, prefsLoaded]);

  // ── Datos visibles ────────────────────────────────────────────────────────
  const exportable = useMemo(
    () => columns.filter((column) => column.meta?.exportValue),
    [columns],
  );

  const clientProcessed = useMemo(() => {
    if (isServer) return { rows: data, total: data.length };
    const searchText =
      (props as ClientProps<T>).searchText ??
      ((row: T) => exportable.map((column) => column.meta?.exportValue?.(row) ?? "").join(" "));
    const needle = local.q.toLocaleLowerCase("es");
    let rows = data.filter((row) => {
      if (needle && !searchText(row).toLocaleLowerCase("es").includes(needle)) return false;
      return filters.every((filter) => {
        const value = local.filters[filter.id];
        return !value || !filter.accessor || String(filter.accessor(row) ?? "") === value;
      });
    });
    if (local.sort) {
      const column = columns.find((item) => (item.id ?? (item as { accessorKey?: string }).accessorKey) === local.sort?.field);
      const accessor = column?.meta?.exportValue ?? ((row: T) => (row as Record<string, unknown>)[local.sort!.field] as string);
      const factor = local.sort.direction === "desc" ? -1 : 1;
      rows = [...rows].sort((a, b) => compare(accessor(a), accessor(b)) * factor);
    }
    return { rows, total: rows.length };
  }, [isServer, data, props, exportable, local, filters, columns]);

  const pagination: Pagination = isServer
    ? (props as ServerProps<T>).pagination
    : {
        page: Math.min(local.page, Math.max(Math.ceil(clientProcessed.total / local.size) - 1, 0)),
        size: local.size,
        total: clientProcessed.total,
        totalPages: Math.ceil(clientProcessed.total / local.size),
      };

  const pageRows = isServer
    ? data
    : clientProcessed.rows.slice(pagination.page * pagination.size, (pagination.page + 1) * pagination.size);

  // ── Selección ─────────────────────────────────────────────────────────────
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  useEffect(() => setRowSelection({}), [data, pagination.page, pagination.size]);

  // Las pantallas pasan `rowActions` como función nueva en cada render. Se guarda en una ref para no
  // reconstruir todas las columnas (y re-renderizar cada celda) por eso; la celda lee siempre la última.
  const rowActionsRef = useRef(rowActions);
  rowActionsRef.current = rowActions;
  const hasRowActions = Boolean(rowActions);

  const allColumns = useMemo<GridColumn<T>[]>(() => {
    const result: GridColumn<T>[] = [];
    if (bulkActions.length > 0) {
      result.push({
        id: SELECT_COLUMN,
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label={t("selectPage")}
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={t("selectRow")}
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          />
        ),
        meta: { hideable: false, className: "w-10" },
      });
    }
    result.push(...columns);
    if (hasRowActions) {
      result.push({
        id: ACTIONS_COLUMN,
        enableSorting: false,
        enableHiding: false,
        header: () => <span className='sr-only'>{t("actions")}</span>,
        cell: ({ row }) => {
          const actions = rowActionsRef.current?.(row.original) ?? [];
          if (actions.length === 0) return null;
          // Con pocas acciones se muestran como píldoras inline (más rápidas);
          // con muchas, un menú compacto evita saturar la fila.
          if (actions.length <= 3) {
            return (
              <div className='flex items-center justify-end gap-2'>
                {actions.map((action) => (
                  <Buttons
                    key={action.label}
                    size='sm'
                    variant={action.tone === "danger" ? "ghost" : "outline"}
                    disabled={action.disabled}
                    aria-label={action.label}
                    onClick={action.onSelect}
                    className={cn("rounded-full", action.tone === "danger" && "text-destructive hover:text-destructive")}>
                    {action.icon ? <action.icon className='h-4 w-4' aria-hidden='true' /> : null}
                    {action.label}
                  </Buttons>
                ))}
              </div>
            );
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Buttons variant='outline' size='icon-sm' aria-label={t("rowActions")} className='size-8 rounded-full'>
                  <HiEllipsisHorizontal className='h-4 w-4' aria-hidden='true' />
                </Buttons>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='min-w-44'>
                {actions.map((action) => (
                  <div key={action.label}>
                    {action.separated ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      variant={action.tone === "danger" ? "destructive" : "default"}
                      disabled={action.disabled}
                      onSelect={action.onSelect}>
                      {action.icon ? <action.icon className='h-4 w-4' aria-hidden='true' /> : null}
                      {action.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        meta: { hideable: false, align: "right", className: "w-14" },
      });
    }
    return result;
  }, [bulkActions.length, columns, hasRowActions, t]);

  const table = useReactTable({
    data: pageRows,
    columns: allColumns,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    // @repo/ui/table amplía FilterFns (fuzzy); aquí no se filtra en la tabla.
    filterFns: {},
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: bulkActions.length > 0,
    state: { rowSelection, columnVisibility: visibility },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setVisibility,
  });

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

  // ── Exportación ───────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const exportName = props.exportName ?? id;
  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = isServer
        ? ((await (props as ServerProps<T>).onExportAll?.()) ?? data)
        : clientProcessed.rows;
      const visibleColumns = exportable.filter((column) => {
        const key = column.id ?? (column as { accessorKey?: string }).accessorKey ?? "";
        return visibility[key] !== false;
      });
      downloadText(
        toCsv(
          rows,
          visibleColumns.map((column) => ({
            header: column.meta?.label ?? column.id ?? "",
            value: (row: T) => column.meta?.exportValue?.(row),
          })),
        ),
        datedFileName(exportName),
      );
      notify.success(t("exportDone", { count: rows.length }));
    } catch (error) {
      notify.error(t("exportFailed"), error instanceof Error ? error.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  const [runningBulk, setRunningBulk] = useState<string | null>(null);
  const runBulk = async (action: BulkAction<T>) => {
    setRunningBulk(action.label);
    try {
      await action.onAction(selectedRows);
    } finally {
      setRunningBulk(null);
    }
  };

  const toggleSort = (field: string) => {
    const current = query.sort;
    if (!current || current.field !== field) setSort({ field, direction: "asc" });
    else if (current.direction === "asc") setSort({ field, direction: "desc" });
    else setSort(null);
  };

  const cellPadding = density === "compact" ? "px-3 py-1.5" : "px-3 py-3";
  const loading = isServer && url.isPending;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const noData = pageRows.length === 0;

  return (
    <section aria-label={caption} className='flex flex-col gap-4'>
      <GridToolbar
        table={table}
        search={query.q}
        onSearch={setSearch}
        searchPlaceholder={props.searchPlaceholder}
        searchable={props.searchable}
        filters={filters}
        filterValue={filterValue}
        onFilter={setFilter}
        density={density}
        onDensity={setDensity}
        onExport={exportable.length > 0 ? handleExport : undefined}
        exporting={exporting}
        onRefresh={isServer ? url.refresh : undefined}
        hasActiveQuery={hasActiveQuery}
        onReset={reset}
        extra={props.toolbarExtra}
      />

      {selectedRows.length > 0 ? (
        <div
          role='region'
          aria-label={t("bulkRegion")}
          className='flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm font-medium text-foreground'>{t("selectedCount", { count: selectedRows.length })}</p>
          <div className='flex flex-wrap items-center gap-2'>
            {bulkActions.map((action) => (
              <Buttons
                key={action.label}
                size='sm'
                variant={action.tone === "danger" ? "danger" : "outline"}
                loading={runningBulk === action.label}
                disabled={runningBulk !== null}
                onClick={() => runBulk(action)}
                className='rounded-full'>
                {action.icon ? <action.icon className='h-4 w-4' aria-hidden='true' /> : null}
                {action.label}
              </Buttons>
            ))}
            <Buttons size='sm' variant='link' onClick={() => setRowSelection({})}>
              <HiXMark className='h-4 w-4' aria-hidden='true' />
              {t("clearSelection")}
            </Buttons>
          </div>
        </div>
      ) : null}

      <div
        className={
          props.embedded
            ? "relative overflow-hidden rounded-xl border border-border/60"
            : "relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
        }>
        {loading ? (
          <div className='absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/10' aria-hidden='true'>
            <div className='h-full w-1/3 animate-[grid-progress_1.1s_ease-in-out_infinite] bg-primary' />
          </div>
        ) : null}
        <div className='max-h-[70vh] overflow-auto'>
          <table className='w-full min-w-[44rem] border-collapse text-sm' aria-busy={loading || undefined}>
            <caption className='sr-only'>{caption}</caption>
            <thead className='sticky top-0 z-[1] bg-muted/80 backdrop-blur'>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className='border-b border-border/70'>
                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const field = header.column.id;
                    const sortable = header.column.getCanSort() && field !== SELECT_COLUMN && field !== ACTIONS_COLUMN;
                    const sortedDir = query.sort?.field === field ? query.sort.direction : null;
                    return (
                      <th
                        key={header.id}
                        scope='col'
                        aria-sort={sortedDir ? (sortedDir === "asc" ? "ascending" : "descending") : undefined}
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          meta?.align === "right" && "text-right",
                          meta?.align === "center" && "text-center",
                          meta?.className,
                        )}>
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type='button'
                            onClick={() => toggleSort(field)}
                            className='-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 uppercase transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortedDir === "asc" ? (
                              <HiChevronUp className='h-3.5 w-3.5 text-foreground' aria-hidden='true' />
                            ) : sortedDir === "desc" ? (
                              <HiChevronDown className='h-3.5 w-3.5 text-foreground' aria-hidden='true' />
                            ) : (
                              <HiChevronUpDown className='h-3.5 w-3.5 opacity-50' aria-hidden='true' />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className={cn("transition-opacity", loading && "opacity-60")}>
              {noData ? (
                <tr>
                  <td colSpan={visibleColumnCount} className='px-6 py-14'>
                    <div className='mx-auto flex max-w-md flex-col items-center gap-3 text-center'>
                      <span className='rounded-full bg-muted p-3 text-muted-foreground'>
                        {hasActiveQuery ? (
                          <HiOutlineMagnifyingGlass className='h-6 w-6' aria-hidden='true' />
                        ) : (
                          <HiOutlineInboxStack className='h-6 w-6' aria-hidden='true' />
                        )}
                      </span>
                      <p className='text-sm font-semibold text-foreground'>
                        {hasActiveQuery ? t("noResultsTitle") : emptyState.title}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {hasActiveQuery ? t("noResultsDescription") : emptyState.description}
                      </p>
                      {hasActiveQuery ? (
                        <Buttons size='sm' variant='outline' onClick={reset} className='rounded-full'>
                          {t("clearFilters")}
                        </Buttons>
                      ) : (
                        emptyState.action
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className='border-b border-border/50 transition-colors last:border-0 hover:bg-muted/40 data-[state=selected]:bg-primary/5'>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            cellPadding,
                            "align-middle text-foreground",
                            meta?.align === "right" && "text-right",
                            meta?.align === "center" && "text-center",
                            meta?.className,
                          )}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className='px-3 pb-3'>
          <GridPagination pagination={pagination} onPage={setPage} onSize={setSize} selected={selectedRows.length} />
        </div>
      </div>
    </section>
  );
}
