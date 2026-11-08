/** @format */

import { useTranslations } from "next-intl";
import { z } from "zod";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const CODE = /^$|^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$/;
const DOC = /^[0-9A-Za-z][0-9A-Za-z.\s-]{2,35}$/;
const MONEY = /^$|^\d+(\.\d{1,2})?$/;
const PERCENT = /^$|^\d{1,3}(\.\d{1,4})?$/;
const INT = /^$|^\d+$/;
const DATE = /^$|^\d{4}-\d{2}-\d{2}$/;

/**
 * Validación del panel. Es una ayuda para el usuario: las mismas reglas (y más) las vuelve a
 * aplicar draco, que es quien decide.
 */
export const validationSeller = () => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.marketplace.validation");
  const optionalEmail = z.string().trim().max(160, { message: intl("maxLength", { max: 160 }) })
    .refine((value) => value === "" || EMAIL.test(value), { message: intl("invalidEmail") });

  return z
    .object({
      code: z.string().trim().regex(CODE, { message: tv("code") }),
      kind: z.enum(["EXTERNAL", "OWN"]),
      legal_name: z.string().trim().min(1, { message: intl("requiredField") }).max(200, { message: intl("maxLength", { max: 200 }) }),
      trade_name: z.string().trim().max(200, { message: intl("maxLength", { max: 200 }) }),
      doc_type: z.string().min(1, { message: intl("requiredField") }),
      doc_number: z.string().trim().regex(DOC, { message: tv("docNumber") }),
      email: optionalEmail,
      phone: z.string().trim().max(40, { message: intl("maxLength", { max: 40 }) }),
      website: z.string().trim().max(200, { message: intl("maxLength", { max: 200 }) }),
      address: z.string().trim().max(250, { message: intl("maxLength", { max: 250 }) }),
      city: z.string().trim().max(120, { message: intl("maxLength", { max: 120 }) }),
      description: z.string().trim().max(2000, { message: intl("maxLength", { max: 2000 }) }),
      account_manager_name: z.string().trim().max(160, { message: intl("maxLength", { max: 160 }) }),
      contacts: z
        .array(
          z
            .object({
              name: z.string().trim().min(1, { message: intl("requiredField") }).max(160, { message: intl("maxLength", { max: 160 }) }),
              role: z.string().trim().max(80, { message: intl("maxLength", { max: 80 }) }),
              email: optionalEmail,
              phone: z.string().trim().max(40, { message: intl("maxLength", { max: 40 }) }),
              primary: z.boolean(),
            })
            .refine((contact) => contact.email !== "" || contact.phone !== "", { message: tv("contactReach"), path: ["email"] }),
        )
        .max(20)
        .refine((list) => list.filter((contact) => contact.primary).length <= 1, { message: tv("onePrimary") }),
    });
};

export type SellerFormValues = z.infer<ReturnType<typeof validationSeller>>;

export const validationPlan = () => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.marketplace.validation");
  return z
    .object({
      code: z.string().trim().min(2, { message: tv("code") }).regex(CODE, { message: tv("code") }),
      name: z.string().trim().min(1, { message: intl("requiredField") }).max(120, { message: intl("maxLength", { max: 120 }) }),
      description: z.string().trim().max(1000, { message: intl("maxLength", { max: 1000 }) }),
      modality: z.enum(["COMMISSION", "SUBSCRIPTION", "MIXED"]),
      currency: z.string().min(3),
      monthly_fee: z.string().trim().regex(MONEY, { message: tv("money") }),
      commission_percent: z.string().trim().regex(PERCENT, { message: tv("percent") })
        .refine((value) => value === "" || Number(value) <= 100, { message: tv("percent") }),
      fixed_fee_per_sale: z.string().trim().regex(MONEY, { message: tv("money") }),
      commission_base: z.string(),
      include_shipping: z.boolean(),
      include_taxes: z.boolean(),
      accrual_event: z.string(),
      return_window_days: z.string().trim().regex(INT, { message: tv("integer") }),
      refund_policy: z.string(),
      fee_billing: z.string(),
      grace_days: z.string().trim().regex(INT, { message: tv("integer") }),
      late_interest_monthly_percent: z.string().trim().regex(PERCENT, { message: tv("percent") }),
      storage_fee_per_unit_day: z.string().trim().regex(MONEY, { message: tv("money") }),
      valid_from: z.string().regex(DATE),
      valid_to: z.string().regex(DATE),
    })
    .superRefine((value, ctx) => {
      const fee = Number(value.monthly_fee || 0);
      const commission = Number(value.commission_percent || 0) > 0 || Number(value.fixed_fee_per_sale || 0) > 0;
      if (value.modality !== "COMMISSION" && fee <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["monthly_fee"], message: tv("feeRequired") });
      }
      if (value.modality !== "SUBSCRIPTION" && !commission) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["commission_percent"], message: tv("commissionRequired") });
      }
      if (value.accrual_event === "RETURN_WINDOW_CLOSED" && Number(value.return_window_days || 0) < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["return_window_days"], message: tv("windowRequired") });
      }
      if (value.valid_to && value.valid_from && value.valid_to < value.valid_from) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valid_to"], message: tv("validRange") });
      }
    });
};

export type PlanFormValues = z.infer<ReturnType<typeof validationPlan>>;

const PRICE = /^\d+(\.\d{1,2})?$/;
const SELLER_SKU = /^$|^[A-Za-z0-9._/-]{1,60}$/;

/** Oferta: vendedor y SKU solo se piden al crear (después quedan fijos). */
export const validationOffer = (isNew: boolean) => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.marketplace.validation");
  const required = z.string().min(1, { message: intl("requiredField") });
  return z.object({
    seller_id: isNew ? required : z.string(),
    sku_id: isNew ? required : z.string(),
    currency: z.string().min(3),
    price: z.string().trim().regex(PRICE, { message: tv("money") })
      .refine((value) => Number(value) > 0, { message: tv("pricePositive") }),
    available_quantity: z.string().trim().regex(INT, { message: tv("integer") })
      .refine((value) => Number(value || 0) <= 1_000_000, { message: tv("quantityMax") }),
    handling_days: z.string().trim().regex(INT, { message: tv("integer") })
      .refine((value) => Number(value || 0) <= 60, { message: tv("handlingMax") }),
    condition: z.enum(["NEW", "USED", "REFURBISHED"]),
    fulfillment: z.enum(["SELLER", "PLATFORM"]),
    seller_sku: z.string().trim().regex(SELLER_SKU, { message: tv("sellerSku") }),
  });
};

export type OfferFormValues = z.infer<ReturnType<typeof validationOffer>>;
