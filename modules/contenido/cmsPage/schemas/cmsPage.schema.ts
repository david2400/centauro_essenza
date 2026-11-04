/** @format */

import { unstable_rethrow } from 'next/navigation';
import { useTranslations } from "next-intl";
import { z } from "zod";
import { PAGE_LIMITS, PAGE_STATUSES, PAGE_TYPES } from "../constants";

const isJson = (value?: string) => {
  if (!value?.trim()) return true;
  try {
    JSON.parse(value);
    return true;
  } catch (error) {
    unstable_rethrow(error);
    return false;
  }
};

export const validationCmsPage = () => {
  const intl = useTranslations("Form");
  const max = (n: number) => z.string().trim().max(n, { message: intl("maxLength", { max: n }) });

  return z
    .object({
      title: max(PAGE_LIMITS.title).min(1, { message: intl("requiredField") }),
      slug: max(PAGE_LIMITS.slug)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, { message: intl("invalidSlug") })
        .optional(),
      content: z.string().trim().min(1, { message: intl("requiredField") }),
      excerpt: max(PAGE_LIMITS.excerpt).optional(),
      meta_title: max(PAGE_LIMITS.meta_title).optional(),
      meta_description: max(PAGE_LIMITS.meta_description).optional(),
      meta_keywords: max(PAGE_LIMITS.meta_keywords).optional(),
      status: z.enum(PAGE_STATUSES),
      page_type: z.enum(PAGE_TYPES),
      template: max(PAGE_LIMITS.template).optional(),
      is_featured: z
        .union([z.boolean(), z.enum(["true", "false"])])
        .transform((value) => value === true || value === "true"),
      sort_order: z.coerce.number({ invalid_type_error: intl("requiredField") }).int().min(0),
      published_at: z.string().optional(),
      scheduled_at: z.string().optional(),
      author_name: max(PAGE_LIMITS.author_name).optional(),
      featured_image: z
        .union([z.literal(""), max(PAGE_LIMITS.featured_image).url({ message: intl("invalidUrl") })])
        .optional(),
      custom_fields: z.string().optional().refine(isJson, { message: intl("invalidJson") }),
    })
    .refine((values) => values.status !== "SCHEDULED" || !!values.scheduled_at, {
      path: ["scheduled_at"],
      message: intl("requiredField"),
    });
};

export type CmsPageFormValues = z.infer<ReturnType<typeof validationCmsPage>>;
