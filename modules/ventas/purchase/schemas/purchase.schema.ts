/** @format */

import { useTranslations } from "next-intl";
import { z } from "zod";

const MONEY = /^$|^\d+(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,4}$/;

/** Ayuda al usuario: draco vuelve a validar todo (stock, ofertas, cliente y entrega). */
export const validationPurchase = () => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.purchase.validation");
  const text = (max: number) => z.string().trim().max(max, { message: intl("maxLength", { max }) });
  return z
    .object({
      channel: z.string().min(1),
      customer_doc_type: z.string(),
      customer_doc_number: text(30),
      customer_name: text(200).min(1, { message: intl("requiredField") }),
      customer_email: text(160),
      customer_phone: text(40),
      recipient_name: text(160).min(1, { message: intl("requiredField") }),
      recipient_phone: text(40),
      address: text(200).min(1, { message: intl("requiredField") }),
      city: text(120).min(1, { message: intl("requiredField") }),
      shipping_amount: z.string().trim().regex(MONEY, { message: tv("money") }),
      lines: z
        .array(
          z.object({
            sku_id: z.string().min(1, { message: intl("requiredField") }),
            seller: z.string().min(1, { message: intl("requiredField") }),
            quantity: z.string().trim().regex(QUANTITY, { message: tv("quantity") })
              .refine((value) => Number(value) >= 1, { message: tv("quantity") }),
          }),
        )
        .min(1, { message: tv("noLines") })
        .max(100),
    })
    .superRefine((value, ctx) => {
      if (value.customer_email === "" && value.customer_phone === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customer_email"], message: tv("contact") });
      }
    });
};

export type PurchaseFormValues = z.infer<ReturnType<typeof validationPurchase>>;
