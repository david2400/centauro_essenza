/** @format */

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useWatch, type Control } from "react-hook-form";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormCheckboxField } from "@repo/ui/form/scenes/form-checkbox";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { FormSection } from "@/components/form-sections";
import { ProductMultiLookupField } from "@/components/async-combobox";
import { Link } from "@/shared/i18n/routing";
import type { INamedItem } from "../models/coupon.interface";

const CATEGORIES_HREF = "/catalogo/category";
/** A partir de cuántas categorías aparece el buscador de la lista. */
const CATEGORY_SEARCH_FROM = 8;

const toItems = (items: INamedItem[]) =>
  items
    .filter((item) => item.id != null)
    .map((item) => ({ id: item.id as number, value: String(item.id), label: item.name ?? `#${item.id}` }));

const overlap = (a?: string[], b?: string[]) => (a ?? []).filter((value) => (b ?? []).includes(value)).length;

/**
 * Sección "Reglas de aplicación" del formulario de cupones: categorías (lista con buscador y contador) y productos
 * (buscador asíncrono). Avisa si un elemento está a la vez en "Sólo en" y "Excepto".
 */
export const CouponRulesSection = ({
  control,
  categories,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  categories: INamedItem[];
}) => {
  const t = useTranslations("Administre.coupon");
  const tForm = useTranslations("Administre.coupon.form");
  const [categoryQuery, setCategoryQuery] = useState("");

  const [applicableCategories, excludedCategories, applicableProducts, excludedProducts] = useWatch({
    control,
    name: ["applicable_categories", "excluded_categories", "applicable_products", "excluded_products"],
  }) as (string[] | undefined)[];

  const categoryItems = useMemo(() => toItems(categories), [categories]);
  const visibleCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    return query ? categoryItems.filter((item) => item.label.toLowerCase().includes(query)) : categoryItems;
  }, [categoryItems, categoryQuery]);

  const rulesCount =
    (applicableCategories?.length ?? 0) +
    (excludedCategories?.length ?? 0) +
    (applicableProducts?.length ?? 0) +
    (excludedProducts?.length ?? 0);
  const conflicts =
    overlap(applicableCategories, excludedCategories) + overlap(applicableProducts, excludedProducts);

  return (
    <FormSection
      icon={HiOutlineFunnel}
      title={tForm("rules.title")}
      hint={t("rulesHint")}
      badge={rulesCount > 0 ? tForm("rules.count", { count: rulesCount }) : tForm("rules.allCatalog")}>
      <div className='col-span-12 flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm font-semibold text-foreground'>{tForm("rules.categories")}</p>
        {categoryItems.length >= CATEGORY_SEARCH_FROM ? (
          <FormField
            id='coupon-category-search'
            type='search'
            aria-label={tForm("rules.searchCategories")}
            placeholder={tForm("rules.searchCategories")}
            value={categoryQuery}
            onChange={(event) => setCategoryQuery(event.target.value)}
            icon={<HiOutlineMagnifyingGlass className='h-4 w-4 text-muted-foreground' aria-hidden='true' />}
            size='sm'
            className='w-full sm:w-64'
          />
        ) : null}
      </div>

      {categoryItems.length === 0 ? (
        <div className='col-span-12 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground'>
          <span>{tForm("rules.noCategories")}</span>
          <Link
            href={CATEGORIES_HREF}
            target='_blank'
            className='inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline'>
            {tForm("rules.categoriesLink")}
            <HiOutlineArrowTopRightOnSquare className='h-3.5 w-3.5' aria-hidden='true' />
            <span className='sr-only'>{tForm("newTab")}</span>
          </Link>
        </div>
      ) : (
        (["applicable_categories", "excluded_categories"] as const).map((name) => {
          const selected = (name === "applicable_categories" ? applicableCategories : excludedCategories)?.length ?? 0;
          const labelId = `coupon-${name}-label`;
          return (
            <div
              key={name}
              role='group'
              aria-labelledby={labelId}
              className='col-span-12 flex min-w-0 flex-col gap-1.5 md:col-span-6'>
              <div className='flex items-center justify-between gap-2 text-xs'>
                <span id={labelId} className='font-medium text-foreground'>
                  {name === "applicable_categories" ? t("fields.applicableCategories") : t("fields.excludedCategories")}
                </span>
                <span className='tabular-nums text-muted-foreground'>{tForm("rules.selected", { count: selected })}</span>
              </div>
              <div className='max-h-52 overflow-y-auto rounded-lg border border-border bg-background p-2'>
                {visibleCategories.length > 0 ? (
                  <FormCheckboxField controller={{ control, name }} items={visibleCategories} />
                ) : (
                  <p className='p-2 text-xs text-muted-foreground'>{tForm("rules.noMatches")}</p>
                )}
              </div>
            </div>
          );
        })
      )}

      <p className='col-span-12 mt-1 text-sm font-semibold text-foreground'>{tForm("rules.products")}</p>
      {/* Productos: buscador asíncrono (el catálogo puede ser grande). */}
      {(["applicable_products", "excluded_products"] as const).map((name) => (
        <ProductMultiLookupField
          key={name}
          control={control}
          name={name}
          label={name === "applicable_products" ? t("fields.applicableProducts") : t("fields.excludedProducts")}
          className='col-span-12 md:col-span-6'
        />
      ))}

      {conflicts > 0 ? (
        <p
          role='status'
          className='col-span-12 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground'>
          <HiOutlineExclamationTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' aria-hidden='true' />
          {tForm("rules.conflict", { count: conflicts })}
        </p>
      ) : null}
    </FormSection>
  );
};
