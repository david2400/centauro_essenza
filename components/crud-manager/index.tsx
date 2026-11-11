/** @format */

"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DataGridProps } from "@/components/data-grid";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlinePencilSquare, HiOutlinePlusCircle, HiOutlineTrash } from "react-icons/hi2";
import {
  DataGrid,
  type BulkAction,
  type GridColumn,
  type GridFilter,
  type RowAction,
} from "@/components/data-grid";
import { PageHeader } from "@/components/page-header";
import { StatCards, type StatCardItem } from "@/components/stat-cards";
import { confirm, notify } from "@/components/notifications";
import type { ActionResult, BulkResult, PageResult } from "@/shared/models/pagination";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

interface CrudManagerBase<T extends { id?: number }> {
  /** Clave del grid (preferencias) y nombre base del CSV. */
  gridId: string;
  /**
   * Namespace de textos del recurso. Se leen las claves estándar:
   * title, description, create, createTitle, editTitle, emptyTitle, emptyDescription.
   */
  namespace: string;
  icon: IconType;
  eyebrow?: string;
  columns: GridColumn<T>[];
  stats?: StatCardItem[];
  rowLabel: (row: T) => string;
  /** Formulario de alta/edición (cierra con `close`; avisa y refresca por su cuenta). */
  renderForm?: (item: T | null, close: () => void) => ReactNode;
  /** `false` = solo alta (registros inmutables, p. ej. movimientos de inventario). */
  editable?: boolean;
  /** Sin `onDelete` no se ofrece borrado (p. ej. el API no lo expone). */
  onDelete?: (id: number) => Promise<ActionResult>;
  /** Borrado en lote del backend; si falta, se borra uno a uno (de a 5). */
  onBulkDelete?: (ids: number[]) => Promise<ActionResult<BulkResult>>;
  filters?: GridFilter<T>[];
  extraRowActions?: (row: T) => RowAction[];
  extraBulkActions?: BulkAction<T>[];
  searchPlaceholder?: string;
  /** `false` oculta la búsqueda de la tabla (el backend del recurso aún no busca). */
  searchable?: boolean;
  modalSize?: "sm" | "md" | "lg" | "xl";
  headerActions?: ReactNode;
  toolbarExtra?: ReactNode;
  /** Contenido entre los KPIs y la tabla (gráficas, calculadoras…). */
  children?: ReactNode;
}

interface ClientCrud<T extends { id?: number }> extends CrudManagerBase<T> {
  mode?: "client";
  data: T[];
  searchText?: (row: T) => string;
}

interface ServerCrud<T extends { id?: number }> extends CrudManagerBase<T> {
  mode: "server";
  page: PageResult<T>;
  onExportAll?: (params: Record<string, string>) => Promise<ActionResult<{ items: T[]; truncated: boolean }>>;
}

export type CrudManagerProps<T extends { id?: number }> = ClientCrud<T> | ServerCrud<T>;

async function deleteOneByOne(ids: number[], remove: (id: number) => Promise<ActionResult>): Promise<BulkResult> {
  const failed: BulkResult["failed"] = [];
  let succeeded = 0;
  for (let index = 0; index < ids.length; index += 5) {
    const chunk = ids.slice(index, index + 5);
    const results = await Promise.allSettled(chunk.map((id) => remove(id)));
    results.forEach((result, position) => {
      const id = chunk[position] as number;
      if (result.status === "fulfilled" && result.value.success) succeeded += 1;
      else
        failed.push({
          id,
          reason:
            result.status === "rejected"
              ? String(result.reason)
              : result.value.success
                ? ""
                : result.value.error,
        });
    });
  }
  return { requested: ids.length, succeeded, failed };
}

/**
 * Gestor CRUD estándar: encabezado, KPIs, `DataGrid` (cliente o servidor),
 * formulario en modal, confirmaciones, borrado individual y en lote,
 * exportación. Los módulos solo aportan columnas, KPIs y el formulario.
 */
export function CrudManager<T extends { id?: number }>(props: CrudManagerProps<T>) {
  const {
    gridId,
    namespace,
    icon,
    eyebrow,
    columns,
    stats,
    rowLabel,
    renderForm,
    editable = true,
    onDelete,
    onBulkDelete,
    filters,
    extraRowActions,
    extraBulkActions = [],
    searchPlaceholder,
    searchable,
    modalSize = "lg",
    headerActions,
    toolbarExtra,
    children,
  } = props;
  const router = useRouter();
  const t = useTranslations(namespace);
  const tc = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");

  const [modal, setModal] = useState<{ open: boolean; item: T | null }>({ open: false, item: null });
  const closeModal = () => setModal({ open: false, item: null });

  const reportBulk = (result: BulkResult) => {
    if (result.failed.length === 0) notify.success(tc("bulkDeleted", { count: result.succeeded }));
    else
      notify.warning(
        tc("bulkPartial", { ok: result.succeeded, failed: result.failed.length }),
        result.failed
          .slice(0, 3)
          .map((failure) => failure.reason)
          .filter(Boolean)
          .join(" · "),
      );
  };

  const handleDelete = async (row: T) => {
    if (row.id == null || !onDelete) return;
    const ok = await confirm({
      title: tCommon("deleteConfirmTitle"),
      description: tCommon("deleteConfirmText", { name: rowLabel(row) }),
      confirmLabel: tCommon("deleteConfirmButton"),
      tone: "danger",
    });
    if (!ok) return;
    const result = await onDelete(row.id);
    if (result.success) {
      notify.success(tCommon("deletedSuccess"), rowLabel(row));
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error);
    }
  };

  const bulkActions = useMemo<BulkAction<T>[]>(() => {
    const actions = [...extraBulkActions];
    if (onDelete || onBulkDelete) {
      actions.push({
        label: tc("deleteSelected"),
        icon: HiOutlineTrash,
        tone: "danger",
        onAction: async (rows) => {
          const ids = rows.map((row) => row.id).filter((id): id is number => id != null);
          const ok = await confirm({
            title: tc("bulkConfirmTitle", { count: ids.length }),
            description: tc("bulkConfirmText"),
            confirmLabel: tCommon("deleteConfirmButton"),
            tone: "danger",
          });
          if (!ok) return;
          if (onBulkDelete) {
            const result = await onBulkDelete(ids);
            if (result.success && result.data) reportBulk(result.data);
            else if (!result.success) notify.error(tCommon("errorTitle"), result.error);
          } else if (onDelete) {
            reportBulk(await deleteOneByOne(ids, onDelete));
          }
          router.refresh();
        },
      });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraBulkActions, onDelete, onBulkDelete, tc, tCommon]);

  const rowActions = (row: T): RowAction[] => {
    const actions: RowAction[] = [];
    if (renderForm && editable) {
      actions.push({ label: tCommon("edit"), icon: HiOutlinePencilSquare, onSelect: () => setModal({ open: true, item: row }) });
    }
    actions.push(...(extraRowActions?.(row) ?? []));
    if (onDelete) {
      actions.push({
        label: tCommon("delete"),
        icon: HiOutlineTrash,
        tone: "danger",
        separated: actions.length > 0,
        onSelect: () => handleDelete(row),
      });
    }
    return actions;
  };

  const createButton = renderForm ? (
    <Buttons onClick={() => setModal({ open: true, item: null })} className='rounded-full'>
      <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
      {t("create")}
    </Buttons>
  ) : null;

  const shared = {
    id: gridId,
    caption: t("title"),
    columns,
    getRowId: (row: T) => String(row.id ?? rowLabel(row)),
    searchPlaceholder,
    searchable,
    filters,
    rowActions,
    bulkActions,
    exportName: gridId,
    toolbarExtra,
    emptyState: { title: t("emptyTitle"), description: t("emptyDescription"), action: createButton },
  };

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={icon}
        eyebrow={eyebrow}
        actions={
          headerActions || createButton ? (
            <>
              {headerActions}
              {createButton}
            </>
          ) : undefined
        }
      />

      <div className='flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6'>
        {stats && stats.length > 0 ? <StatCards items={stats} /> : null}

        {children}

        {props.mode === "server" ? (
          <ServerGrid
            {...shared}
            embedded
            page={props.page}
            onExportAll={props.onExportAll}
            truncatedLabel={tc("exportTruncated")}
          />
        ) : (
          <DataGrid<T> {...shared} embedded mode='client' data={props.data} searchText={props.searchText} />
        )}
      </div>

      {renderForm ? (
        <Modal
          size={modalSize}
          title={modal.item ? t("editTitle") : t("createTitle")}
          open={modal.open}
          onOpenChange={(open) => !open && closeModal()}
          hideDefaultFooter={true}>
          {modal.open ? renderForm(modal.item, closeModal) : null}
        </Modal>
      ) : null}
    </section>
  );
}

type SharedGridProps<T> = Omit<DataGridProps<T>, "mode" | "data" | "pagination" | "onExportAll" | "searchText">;

/** Solo el modo servidor lee la URL (evita exigir Suspense en páginas estáticas). */
function ServerGrid<T extends { id?: number }>({
  page,
  onExportAll,
  truncatedLabel,
  ...shared
}: SharedGridProps<T> & {
  page: PageResult<T>;
  onExportAll?: ServerCrud<T>["onExportAll"];
  truncatedLabel: string;
}) {
  const searchParams = useSearchParams();
  return (
    <DataGrid<T>
      {...shared}
      mode='server'
      data={page.items}
      pagination={{ page: page.page, size: page.size, total: page.total, totalPages: page.totalPages }}
      onExportAll={
        onExportAll
          ? async () => {
              const result = await onExportAll(Object.fromEntries(searchParams.entries()));
              if (!result.success) throw new Error(result.error);
              if (result.data?.truncated) notify.warning(truncatedLabel);
              return result.data?.items ?? [];
            }
          : undefined
      }
    />
  );
}
