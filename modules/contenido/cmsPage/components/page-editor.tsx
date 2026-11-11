/** @format */

"use client";

import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { Link, useRouter } from "@/shared/i18n/routing";
import { FormCmsPage } from "../scenes/formCmsPage";
import { validationCmsPage, type CmsPageFormValues } from "../schemas/cmsPage.schema";
import type { ICmsPage, ICmsPageCreateRequest } from "../models/cmsPage.interface";
import { PageStatusBadge } from "./page-status-badge";
import {
  formatDateTime,
  fromInputDateTime,
  nowLocalDateTime,
  toInputDateTime,
} from "../constants";
import {
  createPageServerAction,
  updatePageServerAction,
} from "@/app/[locale]/contenido/pages/actions";

const toFormValues = (page?: ICmsPage | null) => ({
  title: page?.title ?? "",
  slug: page?.slug ?? "",
  content: page?.content ?? "",
  excerpt: page?.excerpt ?? "",
  meta_title: page?.meta_title ?? "",
  meta_description: page?.meta_description ?? "",
  meta_keywords: page?.meta_keywords ?? "",
  status: page?.status || "DRAFT",
  page_type: page?.page_type || "STATIC",
  template: page?.template ?? "",
  is_featured: String(Boolean(page?.is_featured)),
  sort_order: page?.sort_order ?? 0,
  published_at: toInputDateTime(page?.published_at),
  scheduled_at: toInputDateTime(page?.scheduled_at),
  author_name: page?.author_name ?? "",
  featured_image: page?.featured_image ?? "",
  custom_fields: page?.custom_fields ?? "",
});

/**
 * Formulario → payload con fechas en `LocalDateTime`.
 * El PUT ignora los `null` (MapStruct `IGNORE`), así que al editar los textos
 * vaciados se envían como `""` para poder borrarlos. El slug vacío se omite
 * para que el backend lo regenere desde el título.
 */
const toPayload = (values: CmsPageFormValues, isUpdate: boolean): ICmsPageCreateRequest => {
  const blank = (value?: string) => (value?.trim() ? value.trim() : isUpdate ? "" : undefined);
  return {
    title: values.title,
    slug: values.slug?.trim() || undefined,
    content: values.content,
    excerpt: blank(values.excerpt),
    meta_title: blank(values.meta_title),
    meta_description: blank(values.meta_description),
    meta_keywords: blank(values.meta_keywords),
    status: values.status,
    page_type: values.page_type,
    template: blank(values.template),
    is_featured: values.is_featured,
    sort_order: values.sort_order,
    // Al publicar sin fecha se registra el momento actual.
    published_at:
      fromInputDateTime(values.published_at) ??
      (values.status === "PUBLISHED" ? nowLocalDateTime() : undefined),
    scheduled_at: values.status === "SCHEDULED" ? fromInputDateTime(values.scheduled_at) : undefined,
    author_name: blank(values.author_name),
    featured_image: blank(values.featured_image),
    custom_fields: blank(values.custom_fields),
  };
};

export const CmsPageEditor = ({ page }: { page?: ICmsPage | null }) => {
  const router = useRouter();
  const t = useTranslations("Administre.cmsPage");
  const tCommon = useTranslations("Administre.common");
  const validationSchema = validationCmsPage();
  const pageId = page?.id;
  const isNew = pageId == null;

  /** Devuelve `true` si guardó, para que el formulario limpie el aviso de cambios sin guardar. */
  const handleSubmit = async (values: CmsPageFormValues): Promise<boolean> => {
    const payload = toPayload(values, !isNew);
    const result = isNew
      ? await createPageServerAction(payload)
      : await updatePageServerAction({ ...payload, id: pageId });

    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
      return false;
    }

    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"));

    const createdId = "data" in result ? result.data?.id : undefined;
    if (isNew && createdId != null) {
      router.replace(`/contenido/pages/${createdId}`);
    } else {
      router.refresh();
    }
    return true;
  };

  return (
    <section className='flex w-full flex-col gap-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='space-y-2'>
          <Link
            href='/contenido/pages'
            className='inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground'>
            <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
            {t("backToList")}
          </Link>
          <h2 className='text-xl font-semibold tracking-tight text-foreground'>
            {isNew ? t("createTitle") : t("editTitle")}
          </h2>
        </div>
        {!isNew ? (
          <div className='flex items-center gap-3 text-sm text-muted-foreground'>
            <PageStatusBadge status={page?.status} />
            <span>{t("lastUpdated", { date: formatDateTime(page?.updated_at ?? page?.created_at) })}</span>
          </div>
        ) : null}
      </div>

      <FormCmsPage
        key={page?.id ?? "new"}
        initialValues={toFormValues(page)}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        mode={isNew ? "create" : "edit"}
        onCancel={() => router.push("/contenido/pages")}
      />
    </section>
  );
};
