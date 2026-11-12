/** @format */

import { useTranslations } from "next-intl";
import { z } from "zod";
import { todayIso } from "../constants";

/**
 * El backend valida `estimatedDeliveryDate` con `@FutureOrPresent` y `realDeliveryDate` (opcional: se
 * llena al entregar) con `@PastOrPresent`, al crear y al editar. Se replican aquí para mostrar el error
 * en el campo y no como un 400.
 */
export const validationDispatch = () => {
  const intl = useTranslations("Form");
  const required = () => z.string().trim().min(1, { message: intl("requiredField") });

  return z.object({
    order_id: z.coerce
      .number({ invalid_type_error: intl("requiredField") })
      .int()
      .positive({ message: intl("requiredField") }),
    guide_number: required(),
    address: required(),
    department_origin: required(),
    city_origin: required(),
    department_destination: required(),
    city_destination: required(),
    estimated_delivery_date: required().refine((value) => value >= todayIso(), {
      message: intl("dateNotPast"),
    }),
    real_delivery_date: z
      .string()
      .trim()
      .refine((value) => value === "" || value <= todayIso(), { message: intl("dateNotFuture") }),
  });
};

export type DispatchFormValues = z.infer<ReturnType<typeof validationDispatch>>;
