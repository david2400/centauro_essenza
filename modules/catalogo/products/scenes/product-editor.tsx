/** @format */

"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { TabsContent } from "@repo/ui/tabs/scenes/tabs";
import {
  HiOutlineArchiveBox,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentList,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlinePhoto,
  HiOutlineRectangleStack,
  HiOutlineSwatch,
} from "react-icons/hi2";
import { formatMoney, formatNumber } from "@/lib/format";
import { KpiStrip } from "@/components/form-sections";
import { statusOf, type IProduct, type ProductStatus } from "../models/product.interface";
import type { IAttributeDefinition, IProductTemplateDefinition } from "../models/product-attributes.interface";
import {
  isEditorTab,
  type EditorTab,
  type IComboItem,
  type INamedItem,
  type IProductImage,
  type IProductVariant,
  type IStockLevel,
  type IStockReservation,
  type IVariantMatrix,
} from "../models/product-editor.interface";
import type { IUnit } from "@/shared/units/units";
import type { ITaxRateOption } from "../models/product.interface";
import { UpdateProduct } from "../components/form";
import { ProductEditorLayout, type EditorTabItem } from "../components/editor/product-editor-layout";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";
const ComboTab = dynamic(() => import("../components/editor/combo-tab").then((m) => m.ComboTab), { loading: () => <FormSkeleton /> });
const StockTab = dynamic(() => import("../components/editor/stock-tab").then((m) => m.StockTab), { loading: () => <FormSkeleton /> });
const ImagesTab = dynamic(() => import("../components/editor/images-tab").then((m) => m.ImagesTab), { loading: () => <FormSkeleton /> });
const VariantsTab = dynamic(() => import("../components/editor/variants-tab").then((m) => m.VariantsTab), { loading: () => <FormSkeleton /> });

// Se descargan al abrirse (no viajan con la página).
const ProductAttributesEditor = dynamic(() => import("../components/product-attributes-editor").then((m) => m.ProductAttributesEditor), { loading: () => <FormSkeleton /> });

const STATUS_VARIANT: Record<ProductStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  INACTIVE: "outline",
  ARCHIVED: "destructive",
};

export interface IProductEditorProps {
  product: IProduct;
  variants: IProductVariant[];
  images: IProductImage[];
  levels: IStockLevel[];
  reservations: IStockReservation[];
  warehouses: INamedItem[];
  templates: IProductTemplateDefinition[];
  attributes: IAttributeDefinition[];
  comboItems: IComboItem[];
  /** Unidades activas (medidas y contenido neto). */
  units?: IUnit[];
  /** Tarifas de impuesto activas (pestaña General). */
  taxRates?: ITaxRateOption[];
  /** Matriz del asistente de variantes (null en combos o si no se pudo cargar). */
  variantMatrix?: IVariantMatrix | null;
}

/**
 * Editor de producto por pestañas (Fase 6): datos generales, variantes y SKUs, ficha
 * técnica, imágenes, stock por bodega y, si es combo, sus componentes. La pestaña
 * activa vive en la URL (`?tab=`) para poder enlazarla y conservarla al refrescar.
 */
export const ProductEditor = ({
  product,
  variants,
  images,
  levels,
  reservations,
  warehouses,
  templates,
  attributes,
  comboItems,
  units = [],
  taxRates = [],
  variantMatrix = null,
}: IProductEditorProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Administre.productEditor");
  const tProduct = useTranslations("Administre.product");

  const isCombo = Boolean(product.is_combo);
  const requested = searchParams.get("tab");
  const initial: EditorTab = isEditorTab(requested) && (requested !== "combo" || isCombo) ? requested : "general";
  const [tab, setTab] = useState<EditorTab>(initial);

  const changeTab = (value: string) => {
    if (!isEditorTab(value)) return;
    setTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "general") params.delete("tab");
    else params.set("tab", value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const status = statusOf(product);
  const available = levels.reduce((sum, level) => sum + (level.available ?? 0), 0);
  const reservedUnits = levels.reduce((sum, level) => sum + (level.reserved ?? 0), 0);
  const galleryCount = images.filter((image) => image.sku_id == null).length;
  const tabs: EditorTabItem[] = [
    { id: "general", label: t("tabs.general"), icon: HiOutlineDocumentText },
    { id: "variants", label: t("tabs.variants"), icon: HiOutlineSwatch, count: variants.length || undefined },
    { id: "specs", label: t("tabs.specs"), icon: HiOutlineClipboardDocumentList },
    {
      id: "images",
      label: t("tabs.images"),
      icon: HiOutlinePhoto,
      count: galleryCount || undefined,
      alert: galleryCount === 0 ? "warn" : undefined,
      alertLabel: galleryCount === 0 ? t("tabAlerts.noImages") : undefined,
    },
    {
      id: "stock",
      label: t("tabs.stock"),
      icon: HiOutlineArchiveBox,
      alert: available <= 0 ? "danger" : levels.some((level) => level.below_threshold) ? "warn" : undefined,
      alertLabel:
        available <= 0 ? t("tabAlerts.noStock") : levels.some((level) => level.below_threshold) ? t("tabAlerts.lowStock") : undefined,
    },
    ...(isCombo
      ? [
          {
            id: "combo" as const,
            label: t("tabs.combo"),
            icon: HiOutlineRectangleStack,
            count: comboItems.length || undefined,
            alert: comboItems.length === 0 ? ("warn" as const) : undefined,
            alertLabel: comboItems.length === 0 ? t("tabAlerts.noComponents") : undefined,
          },
        ]
      : []),
  ];


  return (
    <ProductEditorLayout
      title={product.name ?? `#${product.id}`}
      description={[`#${product.id}`, product.slug ? `/${product.slug}` : null, t(`types.${product.product_type ?? "SIMPLE"}`)]
        .filter(Boolean)
        .join(" · ")}
      icon={HiOutlineCube}
      actions={<Badge variant={STATUS_VARIANT[status]}>{tProduct(`statuses.${status}`)}</Badge>}
      tabs={tabs}
      tab={tab}
      plain
      summary={
        <KpiStrip
          items={[
            { label: tProduct("fields.unitPrice"), value: formatMoney(product.unit_price), icon: HiOutlineBanknotes },
            {
              label: t("summaryAvailable"),
              value: formatNumber(available),
              icon: HiOutlineArchiveBox,
              tone: available > 0 ? "good" : "bad",
              hint: reservedUnits > 0 ? t("summaryReserved", { count: reservedUnits }) : undefined,
            },
            {
              label: t("summaryVariants"),
              value: variants.length > 0 ? formatNumber(variants.length) : t(`types.${product.product_type ?? "SIMPLE"}`),
              icon: HiOutlineSwatch,
            },
            { label: t("summaryImages"), value: formatNumber(galleryCount), icon: HiOutlinePhoto, tone: galleryCount === 0 ? "warn" : undefined },
          ]}
        />
      }
      onTabChange={changeTab}>
      <TabsContent value='general'>
        <UpdateProduct product={product} units={units} taxRates={taxRates} />
      </TabsContent>
      <TabsContent value='variants'>
        <VariantsTab
          product={product}
          variants={variants}
          units={units}
          generator={variantMatrix && !isCombo ? { matrix: variantMatrix, attributes, warehouses } : undefined}
        />
      </TabsContent>
      <TabsContent value='specs'>
        {product.id != null && tab === "specs" ? (
          <ProductAttributesEditor productId={product.id} templates={templates} attributes={attributes} />
        ) : null}
      </TabsContent>
      <TabsContent value='images'>
        {product.id != null ? (
          <ImagesTab key={images.map((image) => image.id).join(",")} productId={product.id} images={images} variants={variants} />
        ) : null}
      </TabsContent>
      <TabsContent value='stock'>
        <StockTab product={product} levels={levels} reservations={reservations} warehouses={warehouses} />
      </TabsContent>
      {isCombo && product.id != null ? (
        <TabsContent value='combo'>
          <ComboTab comboId={product.id} items={comboItems} />
        </TabsContent>
      ) : null}
    </ProductEditorLayout>
  );
};
