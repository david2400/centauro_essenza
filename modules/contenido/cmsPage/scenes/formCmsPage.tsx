/** @format */

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import {
  HiOutlineArrowPath,
  HiOutlineCodeBracket,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineMagnifyingGlass,
  HiOutlinePhoto,
  HiOutlineRocketLaunch,
  HiOutlineSquares2X2,
} from "react-icons/hi2";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { ActionBar, SectionCard, Segmented, SwitchField, type SectionState } from "@/components/form-sections";
import { PAGE_LIMITS, PAGE_STATUSES, PAGE_TYPES, SEO_RECOMMENDED, slugify } from "../constants";

const Counter = ({ value, max, recommended }: { value?: string; max: number; recommended?: number }) => {
  const length = value?.length ?? 0;
  const over = recommended != null && length > recommended;
  return (
    <span className={`text-xs tabular-nums ${over ? "text-warning" : "text-muted-foreground"}`} aria-live='polite'>
      {length}/{recommended ?? max}
    </span>
  );
};

/**
 * Editor de páginas CMS. Es un formulario de página completa (no cabe en un modal por el editor de contenido): tarjetas
 * por sección con su estado, columna lateral de publicación y barra de acciones fija al pie. En el alta el slug sigue al
 * título hasta que el usuario lo edita. `onSubmit` devuelve `true` si guardó, para limpiar el aviso de cambios.
 */
export const FormCmsPage = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.cmsPage");
  const tForm = useTranslations("Administre.cmsPage.form");
  const tCommon = useTranslations("Administre.common");
  type CmsPageInputs = z.infer<typeof validationSchema>;

  const [contentMode, setContentMode] = useState<"edit" | "preview">("edit");
  const [slugTouched, setSlugTouched] = useState(mode === "edit" || Boolean(initialValues?.slug));

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<CmsPageInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const [title, slug, content, excerpt, metaTitle, metaDescription, featuredImage, status] = useWatch({
    control,
    name: ["title", "slug", "content", "excerpt", "meta_title", "meta_description", "featured_image", "status"],
  }) as string[];

  // Aviso del navegador al salir con cambios sin guardar.
  useEffect(() => {
    if (!isDirty || isSubmitting) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, isSubmitting]);

  const submit = async (values: CmsPageInputs) => {
    const saved = await onSubmit(values);
    // Tras guardar, lo escrito pasa a ser el estado limpio del formulario.
    if (saved === true) reset(getValues());
  };

  const regenerateSlug = () => {
    setValue("slug" as never, slugify(title ?? "") as never, { shouldValidate: true, shouldDirty: true });
  };

  const statusOptions = PAGE_STATUSES.map((value) => ({ id: value, value, label: t(`statuses.${value}`) }));
  const typeOptions = PAGE_TYPES.map((value) => ({ id: value, value, label: t(`types.${value}`) }));

  const serpTitle = metaTitle || title || t("seo.placeholderTitle");
  const serpDescription = metaDescription || excerpt || t("seo.placeholderDescription");

  const has = (...names: string[]) => names.some((name) => name in (errors ?? {}));
  const sectionState = (error: boolean, complete: boolean): SectionState =>
    error ? "error" : complete ? "complete" : "pending";
  const stateLabel = (state: SectionState) => tForm(`state.${state}`);
  const basicsState = sectionState(has("title", "slug", "excerpt"), Boolean(title?.trim()));
  const contentState = sectionState(has("content"), Boolean(content?.trim()));
  const publishingState = sectionState(has("status", "scheduled_at", "published_at", "author_name"), true);
  const seoError = has("meta_title", "meta_description", "meta_keywords");
  const imageError = has("featured_image");
  const customError = has("custom_fields");

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-6'>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='min-w-0 space-y-6 lg:col-span-2'>
          <SectionCard
            id='cms-basics'
            icon={HiOutlineIdentification}
            title={tForm("basics.title")}
            hint={tForm("basics.hint")}
            state={basicsState}
            stateLabel={stateLabel(basicsState)}>
            <div className='col-span-12'>
              <FormField
                controller={{ control, name: "title" }}
                label={t("fields.title")}
                required
                autoFocus
                maxLength={PAGE_LIMITS.title}
                placeholder={tForm("placeholders.title")}
                onChange={(event) => {
                  if (!slugTouched) {
                    setValue("slug" as never, slugify(event.target.value) as never, { shouldDirty: true });
                  }
                }}
              />
              <div className='mt-1 flex justify-end'>
                <Counter value={title} max={PAGE_LIMITS.title} />
              </div>
            </div>

            <div className='col-span-12 flex items-end gap-2'>
              <FormField
                controller={{ control, name: "slug" }}
                label={`${t("fields.slug")} (${tForm("optionalLower")})`}
                maxLength={PAGE_LIMITS.slug}
                spellCheck={false}
                autoCapitalize='none'
                autoComplete='off'
                placeholder={tForm("placeholders.slug")}
                classNameInput='font-mono'
                onChange={() => setSlugTouched(true)}
                className='min-w-0 flex-1'
              />
              <Buttons
                type='button'
                variant='outline'
                onClick={regenerateSlug}
                aria-label={t("regenerateSlug")}
                title={t("regenerateSlug")}>
                <HiOutlineArrowPath className='h-4 w-4' aria-hidden='true' />
              </Buttons>
            </div>
            {/* La ayuda va debajo para que el input y el botón queden alineados. */}
            <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>
              {t("slugHint", { slug: slug || "…" })} · {slugTouched ? tForm("hints.slug") : tForm("hints.slugAuto")}
            </p>

            <div className='col-span-12'>
              <FormTextAreaField
                controller={{ control, name: "excerpt" }}
                label={`${t("fields.excerpt")} (${tForm("optionalLower")})`}
                placeholder={tForm("placeholders.excerpt")}
                rows={2}
              />
              <div className='mt-1 flex justify-end'>
                <Counter value={excerpt} max={PAGE_LIMITS.excerpt} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id='cms-content'
            icon={HiOutlineDocumentText}
            title={t("fields.content")}
            hint={t("contentHint")}
            state={contentState}
            stateLabel={stateLabel(contentState)}
            actions={
              <Segmented
                label={t("contentMode")}
                value={contentMode}
                options={(["edit", "preview"] as const).map((value) => ({ value, label: t(`modes.${value}`) }))}
                onChange={setContentMode}
              />
            }>
            <div className={contentMode === "edit" ? "col-span-12" : "hidden"}>
              <FormTextAreaField
                controller={{ control, name: "content" }}
                label={`${t("fields.content")} (HTML)`}
                required
                rows={18}
                spellCheck={false}
                classNameInput='font-mono text-sm'
              />
            </div>
            {contentMode === "preview" ? (
              <iframe
                title={t("previewTitle")}
                sandbox=''
                srcDoc={`<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;line-height:1.6;padding:16px;color:#111}img{max-width:100%}</style>${content ?? ""}`}
                className='col-span-12 h-[480px] w-full rounded-xl border border-border bg-white'
              />
            ) : null}
          </SectionCard>

          <SectionCard
            id='cms-seo'
            icon={HiOutlineMagnifyingGlass}
            title={t("seo.title")}
            hint={tForm("seo.hint")}
            badge={tForm("optional")}
            state={seoError ? "error" : undefined}
            stateLabel={seoError ? stateLabel("error") : undefined}>
            <div
              aria-label={t("seo.preview")}
              className='col-span-12 rounded-xl border border-dashed border-border bg-muted/40 p-4'>
              <p className='mb-1 text-xs font-medium text-muted-foreground'>{t("seo.preview")}</p>
              <p className='truncate text-xs text-muted-foreground'>essenza.com › {slug || "…"}</p>
              <p className='truncate text-lg text-primary'>{serpTitle}</p>
              <p className='line-clamp-2 text-sm text-muted-foreground'>{serpDescription}</p>
            </div>
            <div className='col-span-12'>
              <FormField
                controller={{ control, name: "meta_title" }}
                label={t("fields.metaTitle")}
                maxLength={PAGE_LIMITS.meta_title}
                placeholder={tForm("placeholders.metaTitle")}
              />
              <div className='mt-1 flex justify-end'>
                <Counter value={metaTitle} max={PAGE_LIMITS.meta_title} recommended={SEO_RECOMMENDED.meta_title} />
              </div>
            </div>
            <div className='col-span-12'>
              <FormTextAreaField
                controller={{ control, name: "meta_description" }}
                label={t("fields.metaDescription")}
                placeholder={tForm("placeholders.metaDescription")}
                rows={3}
              />
              <div className='mt-1 flex justify-end'>
                <Counter
                  value={metaDescription}
                  max={PAGE_LIMITS.meta_description}
                  recommended={SEO_RECOMMENDED.meta_description}
                />
              </div>
            </div>
            <FormField
              controller={{ control, name: "meta_keywords" }}
              label={t("fields.metaKeywords")}
              maxLength={PAGE_LIMITS.meta_keywords}
              placeholder={tForm("placeholders.metaKeywords")}
              className='col-span-12'
            />
            <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{t("keywordsHint")}</p>
          </SectionCard>
        </div>

        <aside className='min-w-0 space-y-6'>
          <SectionCard
            id='cms-publishing'
            icon={HiOutlineRocketLaunch}
            title={t("publishing")}
            hint={tForm("publishing.hint")}
            state={publishingState === "error" ? "error" : undefined}
            stateLabel={publishingState === "error" ? stateLabel("error") : undefined}>
            <FormSelectField
              controller={{ control, name: "status" }}
              label={t("fields.status")}
              data={statusOptions}
              triggerClassName='!w-full'
              className='col-span-12'
            />
            {status === "SCHEDULED" ? (
              <FormField
                controller={{ control, name: "scheduled_at" }}
                type='datetime-local'
                label={t("fields.scheduledAt")}
                required
                className='col-span-12'
              />
            ) : null}
            <FormField
              controller={{ control, name: "published_at" }}
              type='datetime-local'
              label={t("fields.publishedAt")}
              className='col-span-12'
            />
            <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{t("publishedAtHint")}</p>
            <FormField
              controller={{ control, name: "author_name" }}
              label={t("fields.authorName")}
              autoComplete='name'
              maxLength={PAGE_LIMITS.author_name}
              placeholder={tForm("placeholders.authorName")}
              className='col-span-12'
            />
          </SectionCard>

          <SectionCard
            id='cms-organization'
            icon={HiOutlineSquares2X2}
            title={t("organization")}
            hint={tForm("organization.hint")}>
            <FormSelectField
              controller={{ control, name: "page_type" }}
              label={t("fields.pageType")}
              data={typeOptions}
              triggerClassName='!w-full'
              className='col-span-12'
            />
            <FormField
              controller={{ control, name: "template" }}
              label={`${t("fields.template")} (${tForm("optionalLower")})`}
              maxLength={PAGE_LIMITS.template}
              spellCheck={false}
              placeholder={tForm("placeholders.template")}
              className='col-span-12'
            />
            <FormField
              controller={{ control, name: "sort_order" }}
              type='number'
              inputMode='numeric'
              step='1'
              min={0}
              label={t("fields.sortOrder")}
              classNameInput='tabular-nums'
              className='col-span-12'
            />
            <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{tForm("hints.sortOrder")}</p>
            <div className='col-span-12'>
              <SwitchField
                control={control}
                name={"is_featured" as never}
                id='cms-page-is-featured'
                label={tForm("featured.label")}
                description={tForm("featured.description")}
              />
            </div>
          </SectionCard>

          <SectionCard
            id='cms-image'
            icon={HiOutlinePhoto}
            title={t("fields.featuredImage")}
            hint={tForm("image.hint")}
            badge={tForm("optional")}
            state={imageError ? "error" : undefined}
            stateLabel={imageError ? stateLabel("error") : undefined}>
            <FormField
              controller={{ control, name: "featured_image" }}
              type='url'
              inputMode='url'
              autoComplete='url'
              spellCheck={false}
              placeholder='https://'
              label={tForm("image.url")}
              className='col-span-12'
            />
            {featuredImage && /^https?:\/\//.test(featuredImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredImage}
                alt={t("featuredImageAlt")}
                className='col-span-12 aspect-video w-full rounded-xl border border-border object-cover'
              />
            ) : null}
          </SectionCard>

          <SectionCard
            id='cms-custom'
            icon={HiOutlineCodeBracket}
            title={t("fields.customFields")}
            hint={t("customFieldsHint")}
            badge={tForm("optional")}
            state={customError ? "error" : undefined}
            stateLabel={customError ? stateLabel("error") : undefined}>
            <FormTextAreaField
              controller={{ control, name: "custom_fields" }}
              label={t("fields.customFields")}
              placeholder={tForm("placeholders.customFields")}
              rows={5}
              spellCheck={false}
              classNameInput='font-mono text-xs'
              className='col-span-12'
            />
          </SectionCard>
        </aside>
      </div>

      <ActionBar message={isDirty ? tForm("unsaved") : tForm("requiredHint")}>
        {onCancel ? (
          <Buttons type='button' variant='outline' className='rounded-full' onClick={onCancel} disabled={isSubmitting}>
            {tCommon("cancel")}
          </Buttons>
        ) : null}
        <Buttons
          type='submit'
          loading={isSubmitting}
          disabled={mode === "edit" && !isDirty}
          className='rounded-full sm:min-w-40'>
          {mode === "edit" ? tForm("submitEdit") : tForm("submitCreate")}
        </Buttons>
      </ActionBar>
    </form>
  );
};
