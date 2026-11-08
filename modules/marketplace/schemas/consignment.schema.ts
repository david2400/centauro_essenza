/** @format */

import { useTranslations } from "next-intl";
import { z } from "zod";

const ID = /^[1-9]\d{0,17}$/;
const QTY = /^[1-9]\d{0,5}$/;

/**
 * Recepción o devolución al vendedor. Es una ayuda para el usuario: draco vuelve a validar el
 * vendedor, la bodega, los SKU y los saldos.
 */
export const validationConsignmentDocument = () => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.marketplace.consignment.validation");
  return z
    .object({
      seller_id: z.string().regex(ID, { message: intl("requiredField") }),
      warehouse_id: z.string().regex(ID, { message: intl("requiredField") }),
      reference: z.string().trim().max(80, { message: intl("maxLength", { max: 80 }) }),
      notes: z.string().trim().max(500, { message: intl("maxLength", { max: 500 }) }),
      lines: z
        .array(z.object({
          sku_id: z.string().regex(ID, { message: intl("requiredField") }),
          quantity: z.string().trim().regex(QTY, { message: tv("quantity") }),
        }))
        .min(1, { message: tv("lines") })
        .max(200, { message: tv("tooMany") }),
    })
    .superRefine((value, ctx) => {
      const seen = new Set<string>();
      value.lines.forEach((line, index) => {
        if (line.sku_id && seen.has(line.sku_id)) {
          ctx.addIssue({ code: "custom", path: ["lines", index, "sku_id"], message: tv("repeated") });
        }
        seen.add(line.sku_id);
      });
    });
};

export type ConsignmentDocumentValues = z.infer<ReturnType<typeof validationConsignmentDocument>>;
