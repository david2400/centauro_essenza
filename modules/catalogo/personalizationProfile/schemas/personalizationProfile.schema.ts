/** @format */

import { unstable_rethrow } from 'next/navigation';
import { useTranslations } from "next-intl";
import { z } from "zod";
import { JSON_MAX, SEGMENTS } from "../constants";

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

export const validationPersonalizationProfile = () => {
  const intl = useTranslations("Form");
  const json = () =>
    z
      .string()
      .max(JSON_MAX, { message: intl("maxLength", { max: JSON_MAX }) })
      .optional()
      .refine(isJson, { message: intl("invalidJson") });

  return z.object({
    customer_id: z.coerce
      .number({ invalid_type_error: intl("requiredField") })
      .int()
      .positive({ message: intl("requiredField") }),
    session_id: z.string().trim().max(100, { message: intl("maxLength", { max: 100 }) }).optional(),
    segment: z.enum(SEGMENTS),
    status: z.string().trim().max(50, { message: intl("maxLength", { max: 50 }) }).optional(),
    personalization_score: z
      .union([z.literal(""), z.coerce.number().min(0).max(1, { message: intl("range", { min: 0, max: 1 }) })])
      .optional()
      .transform((value) => (value === "" || value == null ? undefined : value)),
    context_metadata_json: json(),
    recommended_products_json: json(),
    dynamic_pricing_json: json(),
    personalized_content_json: json(),
    personalized_offers_json: json(),
    ui_personalization_json: json(),
    purchase_intent_json: json(),
  });
};

export type PersonalizationProfileFormValues = z.infer<ReturnType<typeof validationPersonalizationProfile>>;
