/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type {
  IFormAddProps,
  IFormUpdateProps,
} from "@repo/ui/form/models/form.interface";
import { FormRefundMethod, type RefundMethodFormOptions } from "../scenes/formRefundMethod";
import { validationRefundMethod } from "../schemas/refundMethod.schema";
import type {
  IRefundMethod,
  IRefundMethodCreateRequest,
  IRefundMethodUpdateRequest,
} from "../models/refundMethod.interface";
import {
  createRefundMethodServerAction,
  updateRefundMethodServerAction,
} from "@/app/[locale]/postventa/refund-methods/actions";

/** Valores iniciales del formulario de creación. */
const EMPTY_VALUES = {
  name: "",
  active: "true",
  description: "",
  policy: "",
};

/** Convierte el DTO de la API en los valores que espera el formulario. */
const toFormValues = (values: IRefundMethod) => ({
  name: values.name ?? "",
  // Un registro con `active` nulo se muestra como activo en la tabla; el formulario lo precarga igual.
  active: String(values.active !== false),
  description: values.description ?? "",
  policy: values.policy ?? "",
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

export const RegisterRefundMethod = ({
  handleClose,
  options,
}: IFormAddProps & { options?: RefundMethodFormOptions }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);

  const handleSubmit = async (values: IRefundMethodCreateRequest) => {
    const result = await createRefundMethodServerAction(values);
    if (result.success) {
      feedback.success(t("createdSuccess"));
    } else {
      feedback.failure(result.error);
    }
  };

  return (
    <FormRefundMethod
      mode='create'
      initialValues={EMPTY_VALUES}
      onSubmit={handleSubmit}
      validationSchema={validationRefundMethod()}
      options={options}
      onCancel={() => handleClose?.(false)}
    />
  );
};

export const UpdateRefundMethod = ({
  initialValues,
  handleClose,
  options,
}: IFormUpdateProps<IRefundMethod> & { options?: RefundMethodFormOptions }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);
  const validationSchema = validationRefundMethod();
  const id = initialValues?.id;

  if (id == null || !initialValues) {
    return null;
  }

  const handleSubmit = async (values: Omit<IRefundMethodUpdateRequest, "id">) => {
    const result = await updateRefundMethodServerAction({ ...values, id } as IRefundMethodUpdateRequest);
    if (result.success) {
      feedback.success(t("updatedSuccess"));
    } else {
      feedback.failure(result.error);
    }
  };

  return (
    <FormRefundMethod
      mode='edit'
      initialValues={toFormValues(initialValues)}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      options={options}
      onCancel={() => handleClose?.(false)}
    />
  );
};
