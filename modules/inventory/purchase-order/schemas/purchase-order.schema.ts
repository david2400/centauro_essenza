/** @format */

import { useTranslations } from "next-intl";
import { z } from "zod";

const ID = /^[1-9]\d{0,17}$/;
const QTY = /^[1-9]\d{0,5}$/;
const MONEY = /^$|^\d+(\.\d{1,2})?$/;
const DATE = /^$|^\d{4}-\d{2}-\d{2}$/;

/** Ayuda para el usuario: draco vuelve a validar proveedor, bodega, SKU, costos y estado. */
export const validationPurchaseOrder = () => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.purchaseOrder.validation");
  return z
    .object({
      supplier_id: z.string().regex(ID, { message: intl("requiredField") }),
      warehouse_id: z.string().regex(ID, { message: intl("requiredField") }),
      expected_date: z.string().regex(DATE, { message: tv("date") }),
      notes: z.string().trim().max(1000, { message: intl("maxLength", { max: 1000 }) }),
      lines: z
        .array(z.object({
          sku_id: z.string().regex(ID, { message: intl("requiredField") }),
          quantity: z.string().trim().regex(QTY, { message: tv("quantity") }),
          unit_cost: z.string().trim().regex(MONEY, { message: tv("cost") }),
        }))
        .min(1, { message: tv("lines") })
        .max(200, { message: tv("tooMany") }),
    })
    .superRefine((value, ctx) => {
      const seen = new Set<string>();
      value.lines.forEach((line, index) => {
        if (line.sku_id && seen.has(line.sku_id)) ctx.addIssue({ code: "custom", path: ["lines", index, "sku_id"], message: tv("repeated") });
        seen.add(line.sku_id);
      });
    });
};

export type PurchaseOrderValues = z.infer<ReturnType<typeof validationPurchaseOrder>>;
