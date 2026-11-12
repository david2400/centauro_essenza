/** @format */

"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocument,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
  HiOutlineTrash,
} from "react-icons/hi2";
import { DataGrid, type BulkAction, type GridColumn, type GridFilter, type RowAction } from "@/components/data-grid";
import { PageHeader } from "@/components/page-header";
import { StatCards } from "@/components/stat-cards";
import { confirm, notify } from "@/components/notifications";
import type { BulkResult, PageResult } from "@/shared/models/pagination";
import { validationTaxonomy } from "../schemas/taxonomy.schema";
import type { TaxonomyActions, TaxonomyFormValues, TaxonomyItem, TaxonomyStats } from "../models";
import { formatApiDate } from "../utils";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const FormTaxonomy = dynamic(() => import("../scenes/formTaxonomy").then((m) => m.FormTaxonomy), { loading: () => <FormSkeleton /> });

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

export interface TaxonomyManagerProps<T extends TaxonomyItem> {
  /** Clave del grid (preferencias) y nombre base del CSV. */
  gridId: string;
  /** Namespace de textos del recurso, p. ej. `Administre.brand`. */
  namespace: string;
  icon: IconType;
  page: PageResult<T>;
  stats: TaxonomyStats;
  actions: TaxonomyActions<T>;
  /** Columnas adicionales tras el nombre (p. ej. categoría padre). */
  extraColumns?: GridColumn<T>[];
  filters?: GridFilter<T>[];
  /** Solo subcategorías: opciones del selector de categoría. */
  categoryOptions?: Array<{ id: string; value: string; label: string }>;
}

const toFormValues = (item: TaxonomyItem | null, withCategory: boolean) => ({
  name: item?.name ?? "",
  slug: item?.slug ?? "",
  description: item?.description ?? "",
  ...(withCategory ? { category_id: item?.category_id != null ? String(item.category_id) : "" } : {}),
});

/**
 * Gestor común de marcas, categorías y subcategorías: encabezado, KPIs,
 * tabla con búsqueda/orden/paginación en servidor, acciones por fila y en
 * lote, exportación y formulario en modal.
 */
export function TaxonomyManager<T extends TaxonomyItem>({
  gridId,
  namespace,
  icon,
  page,
  stats,
  actions,
  extraColumns = [],
  filters = [],
  categoryOptions,
}: TaxonomyManagerProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations(namespace);
  const tx = useTranslations("Administre.taxonomy");
  const tCommon = useTranslations("Administre.common");
  const withCategory = Boolean(categoryOptions);
  const validationSchema = validationTaxonomy({ withCategory });

  const [modal, setModal] = useState<{ open: boolean; item: T | null }>({ open: false, item: null });
  const closeModal = () => setModal({ open: false, item: null });

  const label = (item: T) => item.name ?? `#${item.id}`;

  const handleSubmit = async (values: TaxonomyFormValues) => {
    const payload: TaxonomyFormValues = {
      ...values,
      slug: values.slug?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };
    const result =
      modal.item?.id != null ? await actions.update(modal.item.id, payload) : await actions.create(payload);
    if (result.success) {
      notify.success(modal.item ? tCommon("updatedSuccess") : tCommon("createdSuccess"), payload.name);
      closeModal();
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error);
    }
    return result;
  };

  const handleDelete = async (item: T) => {
    if (item.id == null) return;
    const ok = await confirm({
      title: tCommon("deleteConfirmTitle"),
      description: tCommon("deleteConfirmText", { name: label(item) }),
      confirmLabel: tCommon("deleteConfirmButton"),
      tone: "danger",
    });
    if (!ok) return;
    const result = await actions.remove(item.id);
    if (result.success) {
      notify.success(tCommon("deletedSuccess"), label(item));
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error);
    }
  };

  const reportBulk = (result: BulkResult) => {
    if (result.failed.length === 0) {
      notify.success(tx("bulkDeleted", { count: result.succeeded }));
    } else {
      notify.warning(
        tx("bulkPartial", { ok: result.succeeded, failed: result.failed.length }),
        result.failed
          .slice(0, 3)
          .map((failure) => failure.reason)
          .join(" · "),
      );
    }
  };

  const bulkActions: BulkAction<T>[] = [
    {
      label: tx("deleteSelected"),
      icon: HiOutlineTrash,
      tone: "danger",
      onAction: async (rows) => {
        const ids = rows.map((row) => row.id).filter((id): id is number => id != null);
        const ok = await confirm({
          title: tx("bulkConfirmTitle", { count: ids.length }),
          description: tx("bulkConfirmText"),
          confirmLabel: tCommon("deleteConfirmButton"),
          tone: "danger",
        });
        if (!ok) return;
        const result = await actions.bulkRemove(ids);
        if (result.success && result.data) reportBulk(result.data);
        else if (!result.success) notify.error(tCommon("errorTitle"), result.error);
        router.refresh();
      },
    },
  ];

  const rowActions = (item: T): RowAction[] => [
    { label: tCommon("edit"), icon: HiOutlinePencilSquare, onSelect: () => setModal({ open: true, item }) },
    {
      label: tx("copySlug"),
      icon: HiOutlineClipboardDocument,
      disabled: !item.slug,
      onSelect: () => {
        void navigator.clipboard
          ?.writeText(item.slug ?? "")
          .then(() => notify.info(tx("slugCopied"), item.slug));
      },
    },
    { label: tCommon("delete"), icon: HiOutlineTrash, tone: "danger", separated: true, onSelect: () => handleDelete(item) },
  ];

  const columns = useMemo<GridColumn<T>[]>(
    () => [
      {
        id: "name",
        header: t("fields.name"),
        meta: { label: t("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <button
              type='button'
              onClick={() => setModal({ open: true, item: row.original })}
              className='text-left font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
              {row.original.name}
            </button>
            {row.original.slug ? (
              <p className='truncate font-mono text-xs text-muted-foreground'>/{row.original.slug}</p>
            ) : null}
          </div>
        ),
      },
      ...extraColumns,
      {
        id: "description",
        header: t("fields.description"),
        enableSorting: false,
        meta: { label: t("fields.description"), exportValue: (row) => row.description },
        cell: ({ row }) =>
          row.original.description ? (
            <p className='line-clamp-2 max-w-md text-muted-foreground'>{row.original.description}</p>
          ) : (
            <span className='text-xs italic text-muted-foreground'>{tx("noDescription")}</span>
          ),
      },
      {
        id: "slug",
        header: t("fields.slug"),
        meta: { label: t("fields.slug"), defaultHidden: true, exportValue: (row) => row.slug },
        cell: ({ row }) => <span className='font-mono text-xs'>{row.original.slug ?? "—"}</span>,
      },
      {
        id: "createdAt",
        header: tx("createdAt"),
        meta: { label: tx("createdAt"), defaultHidden: true, exportValue: (row) => formatApiDate(row.created_at) },
        cell: ({ row }) => <span className='whitespace-nowrap text-muted-foreground'>{formatApiDate(row.original.created_at)}</span>,
      },
      {
        id: "updatedAt",
        header: tx("updatedAt"),
        meta: { label: tx("updatedAt"), exportValue: (row) => formatApiDate(row.updated_at ?? row.created_at) },
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-muted-foreground'>
            {formatApiDate(row.original.updated_at ?? row.original.created_at)}
          </span>
        ),
      },
    ],
    [extraColumns, t, tx],
  );

  const createButton = (
    <Buttons onClick={() => setModal({ open: true, item: null })} className='rounded-full'>
      <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
      {t("create")}
    </Buttons>
  );

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("title")} description={t("description")} icon={icon} eyebrow={tx("eyebrow")} actions={createButton} />

      <div className='flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6'>
        <StatCards
          items={[
            { label: t("total"), value: stats.total, icon },
            { label: tx("recent"), value: stats.recent, icon: HiOutlineCalendarDays, hint: tx("recentHint") },
            {
              label: tx("withoutDescription"),
              value: stats.withoutDescription,
              icon: HiOutlineDocumentText,
              tone: stats.withoutDescription > 0 ? "warning" : "success",
              hint: tx("withoutDescriptionHint"),
            },
          ]}
        />

        <DataGrid<T>
          mode='server'
          embedded
          id={gridId}
          caption={t("title")}
          data={page.items}
          pagination={{ page: page.page, size: page.size, total: page.total, totalPages: page.totalPages }}
          columns={columns}
          getRowId={(row) => String(row.id)}
          searchPlaceholder={tx("searchPlaceholder")}
          filters={filters}
          rowActions={rowActions}
          bulkActions={bulkActions}
          exportName={gridId}
          onExportAll={async () => {
            const result = await actions.exportAll(Object.fromEntries(searchParams.entries()));
            if (!result.success) throw new Error(result.error);
            if (result.data?.truncated) notify.warning(tx("exportTruncated"));
            return result.data?.items ?? [];
          }}
          emptyState={{ title: t("emptyTitle"), description: t("emptyDescription"), action: createButton }}
        />
      </div>

      <Modal
        size='lg'
        title={modal.item ? t("editTitle") : t("createTitle")}
        open={modal.open}
        onOpenChange={(open) => !open && closeModal()}
        hideDefaultFooter={true}>
        {modal.open ? (
          <FormTaxonomy
            namespace={namespace}
            initialValues={toFormValues(modal.item, withCategory)}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            onCancel={closeModal}
            categoryOptions={categoryOptions}
          />
        ) : null}
      </Modal>
    </section>
  );
}
