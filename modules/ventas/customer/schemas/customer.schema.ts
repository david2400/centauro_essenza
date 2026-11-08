/** @format */

import { useTranslations } from "next-intl";
import { z } from "zod";

const EMAIL = /^$|^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const PHONE = /^$|^[+0-9()\s-]{7,20}$/;
const DOC = /^[A-Za-z0-9.\s-]{3,30}$/;

/** Ayuda al usuario: draco vuelve a validar (normaliza el documento y verifica que no se repita). */
export const validationCustomer = () => {
  const intl = useTranslations("Form");
  const tv = useTranslations("Administre.customer.validation");
  const text = (max: number) => z.string().trim().max(max, { message: intl("maxLength", { max }) });
  return z.object({
    kind: z.enum(["PERSON", "COMPANY"]),
    doc_type: z.string().min(1, { message: intl("requiredField") }),
    doc_number: z.string().trim().regex(DOC, { message: tv("document") }),
    name: text(200).min(1, { message: intl("requiredField") }),
    email: text(160).regex(EMAIL, { message: intl("invalidEmail") }),
    phone: text(40).regex(PHONE, { message: tv("phone") }),
    billing_address: text(200),
    billing_city: text(120),
    marketing_consent: z.boolean(),
    notes: text(2000),
  });
};

export type CustomerFormValues = z.infer<ReturnType<typeof validationCustomer>>;
