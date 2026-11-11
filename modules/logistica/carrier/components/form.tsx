/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type {
  IFormAddProps,
  IFormUpdateProps,
} from "@repo/ui/form/models/form.interface";
import { FormCarrier, type CarrierFormOptions } from "../scenes/formCarrier";
import { validationCarrier } from "../schemas/carrier.schema";
import type {
  ICarrier,
  ICarrierCreateRequest,
  ICarrierUpdateRequest,
} from "../models/carrier.interface";
import {
  createCarrierServerAction,
  updateCarrierServerAction,
} from "@/app/[locale]/logistica/carriers/actions";

/** Valores iniciales del formulario de creación. */
const EMPTY_VALUES = {
  name: "",
  code: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  base_rate: "",
  rate_per_km: "",
  max_delivery_days: 1,
  is_active: "true",
};

/** Convierte el DTO de la API en los valores que espera el formulario. */
const toFormValues = (values: ICarrier) => ({
  name: values.name ?? "",
  code: values.code ?? "",
  contact_email: values.contact_email ?? "",
  contact_phone: values.contact_phone ?? "",
  website: values.website ?? "",
  base_rate: values.base_rate ?? 0,
  rate_per_km: values.rate_per_km ?? 0,
  max_delivery_days: values.max_delivery_days ?? 0,
  is_active: String(values.is_active !== false),
});

const useFeedback = (handleClose?: IFormAddProps["handleClose"]) => {
  const router = useRouter();
  const t = useTranslations("Administre.common");

  return {
    success: (title: string) => {
      notify.success(title);
      handleClose?.(true);
      router.refresh();
    },
    failure: (message?: string) => notify.error(t("errorTitle"), message || t("unexpectedError")),
  };
};

export const RegisterCarrier = ({
  handleClose,
  options,
}: IFormAddProps & { options?: CarrierFormOptions }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);

  const handleSubmit = async (values: ICarrierCreateRequest) => {
    const result = await createCarrierServerAction(values);
    if (result.success) {
      feedback.success(t("createdSuccess"));
    } else {
      feedback.failure(result.error);
    }
  };

  return (
    <FormCarrier
      mode='create'
      initialValues={EMPTY_VALUES}
      onSubmit={handleSubmit}
      validationSchema={validationCarrier()}
      options={options}
      onCancel={() => handleClose?.(false)}
    />
  );
};

export const UpdateCarrier = ({
  initialValues,
  handleClose,
  options,
}: IFormUpdateProps<ICarrier> & { options?: CarrierFormOptions }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);
  const validationSchema = validationCarrier();
  const id = initialValues?.id;

  if (id == null || !initialValues) {
    return null;
  }

  const handleSubmit = async (values: Omit<ICarrierUpdateRequest, "id">) => {
    const result = await updateCarrierServerAction({ ...values, id } as ICarrierUpdateRequest);
    if (result.success) {
      feedback.success(t("updatedSuccess"));
    } else {
      feedback.failure(result.error);
    }
  };

  return (
    <FormCarrier
      mode='edit'
      initialValues={toFormValues(initialValues)}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      options={options}
      onCancel={() => handleClose?.(false)}
    />
  );
};
