/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import {
  HiOutlineArchiveBox,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineCube,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlusCircle,
  HiOutlineSwatch,
  HiOutlineTrash,
} from "react-icons/hi2";
import { DataGrid, type GridColumn, type RowAction } from "@/components/data-grid";
import { confirm, notify } from "@/components/notifications";
import { formatMoney, formatNumber } from "@/lib/format";
import { formatQuantity, unitById, unitsOf, type IUnit } from "@/shared/units/units";
import type { IProduct } from "../../models/product.interface";
import { EmptyBlock, KpiStrip, SectionCard, Segmented } from "@/components/form-sections";
import type { IAttributeDefinition } from "../../models/product-attributes.interface";
import type { INamedItem, IProductSku, IProductVariant, IVariantMatrix } from "../../models/product-editor.interface";
import { validationVariant, type VariantFormValues } from "../../schemas/product-editor.schema";
import {
  createVariantServerAction,
  deleteVariantServerAction,
  updateVariantServerAction,
} from "@/app/[locale]/catalogo/products/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const VariantGenerator = dynamic(() => import("./variant-generator/variant-generator").then((m) => m.VariantGenerator), { loading: () => <FormSkeleton /> });

type VariantRow = IProductVariant & { sku?: IProductSku };

const VariantForm = ({
  productId,
  variant,
  onDone,
  onCancel,
  units,
}: {
  productId: number;
  variant: IProductVariant | null;
  onDone: () => void;
  onCancel: () => void;
  units: IUnit[];
}) => {
  const tForm = useTranslations("Administre.productChild");
  const tCommon = useTranslations("Administre.common");
  const schema = validationVariant();
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<VariantFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: variant?.name ?? "",
      description: variant?.description ?? "",
      stock: variant?.stock ?? 0,
      unit_price: variant?.unit_price ?? ("" as unknown as number),
      image_url: variant?.image_url ?? "",
      available: String(variant?.available ?? true) as unknown as boolean,
      net_content: (variant?.net_content ?? "") as unknown as number,
      net_content_unit_id: variant?.net_content_unit_id != null ? String(variant.net_content_unit_id) : "none",
    },
  });
  const tEditor = useTranslations("Administre.productEditor.form");
  const tEditorRoot = useTranslations("Administre.productEditor");
  const contentUnits = unitsOf(units, "VOLUME", "MASS", "COUNT", "LENGTH", "AREA");
  const imageUrl = useWatch({ control, name: "image_url" });
  const showPreview = Boolean(imageUrl && /^https?:\/\//i.test(imageUrl));

  const submit = async (values: VariantFormValues) => {
    const payload = {
      ...values,
      product_id: productId,
      description: values.description || undefined,
      image_url: values.image_url || undefined,
      net_content: values.net_content ?? undefined,
      net_content_unit_id:
        values.net_content != null && values.net_content_unit_id && values.net_content_unit_id !== "none"
          ? Number(values.net_content_unit_id)
          : undefined,
    };
    const result =
      variant?.id != null
        ? await updateVariantServerAction({ ...payload, id: variant.id })
        : await createVariantServerAction(payload);
    if (result.success) {
      notify.success(variant?.id != null ? tCommon("updatedSuccess") : tCommon("createdSuccess"), values.name);
      onDone();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  const booleanOptions = [
    { id: "true", value: "true", label: tCommon("yes") },
    { id: "false", value: "false", label: tCommon("no") },
  ];

  const group = (title: string) => (
    <p className='col-span-12 border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>{title}</p>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6'>
      <div className='grid grid-cols-12 gap-4'>
        {group(tEditorRoot("variantGroups.identity"))}
        <FormField
          controller={{ control, name: "name" }}
          label={tForm("fields.name")}
          description={tForm("nameHint")}
          required
          className='col-span-12 md:col-span-8'
        />
        <FormSelectField
          controller={{ control, name: "available" }}
          label={tForm("fields.available")}
          data={booleanOptions}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-4'
        />

        {group(tEditorRoot("variantGroups.commercial"))}
        <FormField
          controller={{ control, name: "unit_price" }}
          type='number'
          inputMode='decimal'
          step='0.01'
          min={0}
          prefix='$'
          required
          label={tForm("fields.unitPrice")}
          className='col-span-12 sm:col-span-6 md:col-span-4'
        />
        <FormField
          controller={{ control, name: "stock" }}
          type='number'
          inputMode='numeric'
          step='1'
          min={0}
          suffix={tEditor("unitsSuffix")}
          label={tForm("fields.stock")}
          className='col-span-12 sm:col-span-6 md:col-span-4'
        />
        <div className='hidden md:col-span-4 md:block' />
        <FormField
          controller={{ control, name: "net_content" }}
          type='number'
          inputMode='decimal'
          step='any'
          min={0}
          label={tEditor("netContent")}
          description={tEditor("variantNetContentHint")}
          className='col-span-7 md:col-span-4'
        />
        <FormSelectField
          controller={{ control, name: "net_content_unit_id" }}
          label={tEditor("netContentUnit")}
          data={[
            { id: "none", value: "none", label: tEditor("noUnit") },
            ...contentUnits.map((unit) => ({ id: String(unit.id), value: String(unit.id), label: `${unit.symbol} · ${unit.name}` })),
          ]}
          searchable
          triggerClassName='!w-full'
          className='col-span-5 md:col-span-4'
        />

        {group(tEditorRoot("variantGroups.media"))}
        <div className='col-span-12 flex gap-4'>
          {showPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={tForm("imagePreview")} className='h-24 w-24 shrink-0 rounded-xl border border-border object-cover' />
          ) : (
            <div className='flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-center text-[10px] text-muted-foreground'>
              <HiOutlinePhoto className='h-6 w-6' aria-hidden='true' />
              {tForm("noImage")}
            </div>
          )}
          <FormField controller={{ control, name: "image_url" }} label={tForm("fields.imageUrl")} placeholder='https://' className='min-w-0 flex-1' />
        </div>
        <FormTextAreaField controller={{ control, name: "description" }} label={tForm("fields.description")} className='col-span-12' />
      </div>
      <div className='flex justify-end gap-2 border-t border-border pt-4'>
        <Buttons type='button' variant='outline' className='rounded-full' onClick={onCancel}>
          {tCommon("cancel")}
        </Buttons>
        <Buttons type='submit' loading={isSubmitting} className='rounded-full px-6'>
          {variant ? tCommon("save") : tForm("create")}
        </Buttons>
      </div>
    </form>
  );
};

/** Variantes del producto y sus SKUs (código, precio, stock físico). */
export const VariantsTab = ({
  product,
  variants,
  units = [],
  generator,
}: {
  product: IProduct;
  variants: IProductVariant[];
  units?: IUnit[];
  /** Datos del asistente de variantes (no aplica a combos). */
  generator?: { matrix: IVariantMatrix; attributes: IAttributeDefinition[]; warehouses: INamedItem[] };
}) => {
  const router = useRouter();
  const t = useTranslations("Administre.productEditor");
  const tVariant = useTranslations("Administre.productChild");
  const tCommon = useTranslations("Administre.common");
  const [modal, setModal] = useState<{ open: boolean; variant: IProductVariant | null }>({ open: false, variant: null });
  const canGenerate = generator != null && product.id != null && !product.is_combo;
  const [view, setView] = useState<"generator" | "list">(canGenerate && variants.length === 0 ? "generator" : "list");
  // Remonta el asistente cuando el servidor devuelve otra matriz (tras guardar o refrescar).
  const matrixKey = useMemo(() => (generator ? JSON.stringify(generator.matrix) : ""), [generator]);

  const skus = product.skus ?? [];
  const rows = useMemo<VariantRow[]>(
    () => variants.map((variant) => ({ ...variant, sku: skus.find((sku) => sku.variant_id === variant.id) })),
    [variants, skus],
  );
  const defaultSku = skus.find((sku) => sku.variant_id == null && sku.is_default) ?? skus.find((sku) => sku.variant_id == null);

  const remove = async (variant: IProductVariant) => {
    if (variant.id == null) return;
    const ok = await confirm({
      title: tCommon("deleteConfirmTitle"),
      description: tCommon("deleteConfirmText", { name: variant.name ?? `#${variant.id}` }),
      confirmLabel: tCommon("deleteConfirmButton"),
      tone: "danger",
    });
    if (!ok) return;
    const result = await deleteVariantServerAction(variant.id);
    if (result.success) {
      notify.success(tCommon("deletedSuccess"), variant.name);
      router.refresh();
    } else notify.error(tCommon("errorTitle"), result.error);
  };

  const columns = useMemo<GridColumn<VariantRow>[]>(
    () => [
      {
        id: "name",
        header: tVariant("fields.name"),
        meta: { label: tVariant("fields.name"), hideable: false, exportValue: (row) => row.name },
        cell: ({ row }) => (
          <div className='flex min-w-0 items-center gap-3'>
            {row.original.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.original.image_url} alt='' loading='lazy' className='h-9 w-9 shrink-0 rounded-lg border border-border object-cover' />
            ) : (
              <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground'>
                <HiOutlineCube className='h-4 w-4' aria-hidden='true' />
              </span>
            )}
            <span className='truncate font-semibold text-foreground'>{row.original.name}</span>
          </div>
        ),
      },
      {
        id: "sku",
        header: t("sku"),
        enableSorting: false,
        meta: { label: t("sku"), exportValue: (row) => row.sku?.code },
        cell: ({ row }) => <span className='font-mono text-xs text-muted-foreground'>{row.original.sku?.code ?? "—"}</span>,
      },
      {
        id: "unit_price",
        accessorFn: (row) => row.unit_price ?? 0,
        header: tVariant("fields.unitPrice"),
        meta: { label: tVariant("fields.unitPrice"), align: "right", exportValue: (row) => row.unit_price },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.unit_price)}</span>,
      },
      {
        id: "stock",
        accessorFn: (row) => row.sku?.stock ?? row.stock ?? 0,
        header: tVariant("fields.stock"),
        meta: { label: tVariant("fields.stock"), align: "right", exportValue: (row) => row.sku?.stock ?? row.stock },
        cell: ({ row }) => <span className='tabular-nums'>{formatNumber(row.original.sku?.stock ?? row.original.stock ?? 0)}</span>,
      },
      {
        id: "net_content",
        accessorFn: (row) => row.net_content ?? 0,
        header: t("netContentColumn"),
        meta: {
          label: t("netContentColumn"),
          align: "right",
          exportValue: (row) => (row.net_content != null ? formatQuantity(row.net_content, unitById(units, row.net_content_unit_id)) : ""),
        },
        cell: ({ row }) =>
          row.original.net_content != null ? (
            <span className='tabular-nums'>{formatQuantity(row.original.net_content, unitById(units, row.original.net_content_unit_id))}</span>
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        id: "available",
        header: tVariant("fields.available"),
        enableSorting: false,
        meta: { label: tVariant("fields.available"), exportValue: (row) => (row.available ? tCommon("yes") : tCommon("no")) },
        cell: ({ row }) =>
          row.original.available ? <Badge>{tCommon("active")}</Badge> : <Badge variant='outline'>{tCommon("inactive")}</Badge>,
      },
    ],
    [t, tVariant, tCommon, units],
  );

  const rowActions = (row: VariantRow): RowAction[] => [
    { label: tCommon("edit"), icon: HiOutlinePencilSquare, onSelect: () => setModal({ open: true, variant: row }) },
    { label: tCommon("delete"), icon: HiOutlineTrash, tone: "danger", separated: true, onSelect: () => remove(row) },
  ];

  const addButton = (
    <Buttons onClick={() => setModal({ open: true, variant: null })} className='rounded-full'>
      <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
      {tVariant("create")}
    </Buttons>
  );

  const activeCount = rows.filter((row) => row.available).length;
  const totalStock = rows.reduce((sum, row) => sum + (row.sku?.stock ?? row.stock ?? 0), 0);
  const prices = rows.map((row) => row.unit_price).filter((value): value is number => value != null);
  const priceRange =
    prices.length === 0
      ? "—"
      : Math.min(...prices) === Math.max(...prices)
        ? formatMoney(prices[0])
        : `${formatMoney(Math.min(...prices))} – ${formatMoney(Math.max(...prices))}`;

  const viewSwitch = canGenerate ? (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <p className='text-sm text-muted-foreground'>{view === "generator" ? t("generator.viewHint") : t("generator.listHint")}</p>
      <Segmented
        label={t("generator.viewLabel")}
        value={view}
        onChange={setView}
        options={[
          { value: "generator", label: t("generator.viewGenerator") },
          { value: "list", label: t("generator.viewList") },
        ]}
      />
    </div>
  ) : null;

  if (canGenerate && view === "generator" && generator && product.id != null) {
    return (
      <div className='grid gap-6'>
        {viewSwitch}
        <VariantGenerator
          key={matrixKey}
          productId={product.id}
          matrix={generator.matrix}
          attributes={generator.attributes}
          warehouses={generator.warehouses}
        />
      </div>
    );
  }

  return (
    <div className='grid gap-6'>
      {viewSwitch}
      {rows.length > 0 ? (
        <KpiStrip
          items={[
            { label: t("variantsCount"), value: formatNumber(rows.length), icon: HiOutlineSwatch },
            {
              label: t("variantsActive"),
              value: formatNumber(activeCount),
              icon: HiOutlineCheckCircle,
              tone: activeCount === 0 ? "bad" : undefined,
            },
            { label: t("variantsStock"), value: formatNumber(totalStock), icon: HiOutlineArchiveBox, tone: totalStock === 0 ? "warn" : undefined },
            { label: t("variantsPriceRange"), value: priceRange, icon: HiOutlineBanknotes },
          ]}
        />
      ) : null}

      {rows.length === 0 && defaultSku ? (
        <SectionCard id='product-default-sku' icon={HiOutlineCube} title={t("defaultSku")} hint={t("simpleHint")}>
          <dl className='col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-4'>
            <div className='rounded-xl bg-muted/30 p-3'>
              <dt className='text-xs text-muted-foreground'>{t("sku")}</dt>
              <dd className='mt-1 font-mono text-sm font-semibold'>{defaultSku.code}</dd>
            </div>
            <div className='rounded-xl bg-muted/30 p-3'>
              <dt className='text-xs text-muted-foreground'>{tVariant("fields.unitPrice")}</dt>
              <dd className='mt-1 text-sm font-semibold tabular-nums'>{formatMoney(defaultSku.price)}</dd>
            </div>
            <div className='rounded-xl bg-muted/30 p-3'>
              <dt className='text-xs text-muted-foreground'>{tVariant("fields.stock")}</dt>
              <dd className='mt-1 text-sm font-semibold tabular-nums'>{formatNumber(defaultSku.stock ?? 0)}</dd>
            </div>
            <div className='rounded-xl bg-muted/30 p-3'>
              <dt className='text-xs text-muted-foreground'>{tVariant("fields.available")}</dt>
              <dd className='mt-1'>
                {defaultSku.active ? <Badge>{tCommon("active")}</Badge> : <Badge variant='outline'>{tCommon("inactive")}</Badge>}
              </dd>
            </div>
          </dl>
          <EmptyBlock icon={HiOutlineSwatch} title={t("noVariantsYet")} description={t("noVariantsYetHint")} action={addButton} />
        </SectionCard>
      ) : (
        <SectionCard
          id='product-variants'
          icon={HiOutlineSwatch}
          title={tVariant("title")}
          hint={t("variantsHint")}
          actions={addButton}
          contentClassName='p-4'>
          <DataGrid<VariantRow>
            mode='client'
            embedded
            id='product-variants'
            caption={tVariant("title")}
            data={rows}
            columns={columns}
            getRowId={(row) => String(row.id)}
            searchText={(row) => `${row.name ?? ""} ${row.sku?.code ?? ""}`}
            rowActions={rowActions}
            emptyState={{ title: tVariant("emptyTitle"), description: tVariant("emptyDescription"), action: addButton }}
          />
        </SectionCard>
      )}

      <Modal
        size='lg'
        title={modal.variant ? tVariant("editTitle") : tVariant("createTitle")}
        open={modal.open}
        onOpenChange={(open) => !open && setModal({ open: false, variant: null })}
        hideDefaultFooter={true}>
        {modal.open && product.id != null ? (
          <VariantForm
            productId={product.id}
            units={units}
            variant={modal.variant}
            onCancel={() => setModal({ open: false, variant: null })}
            onDone={() => {
              setModal({ open: false, variant: null });
              router.refresh();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
};
