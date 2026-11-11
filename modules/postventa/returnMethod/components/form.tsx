/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type {
  IFormAddProps,
  IFormUpdateProps,
} from "@repo/ui/form/models/form.interface";
import { FormReturnMethod, type ReturnMethodFormOptions } from "../scenes/formReturnMethod";
import { validationReturnMethod } from "../schemas/returnMethod.schema";
import type {
  IReturnMethod,
  IReturnMethodCreateRequest,
  IReturnMethodUpdateRequest,
} from "../models/returnMethod.interface";
import {
  createReturnMethodServerAction,
  updateReturnMethodServerAction,
} from "@/app/[locale]/postventa/return-methods/actions";

/** Valores iniciales del formulario de creación. */
const EMPTY_VALUES = {
  name: "",
  active: "true",
  description: "",
  instructions: "",
};

/** Convierte el DTO de la API en los valores que espera el formulario. */
const toFormValues = (values: IReturnMethod) => ({
  name: values.name ?? "",
  // Un registro con `active` nulo se muestra como activo en la tabla; el formulario lo precarga igual.
  active: String(values.active !== false),
  description: values.description ?? "",
  instructions: values.instructions ?? "",
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

export const RegisterReturnMethod = ({
  handleClose,
  options,
}: IFormAddProps & { options?: ReturnMethodFormOptions }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);

  const handleSubmit = async (values: IReturnMethodCreateRequest) => {
    const result = await createReturnMethodServerAction(values);
    if (result.success) {
      feedback.success(t("createdSuccess"));
    } else {
      feedback.failure(result.error);
    }
  };

  return (
    <FormReturnMethod
      mode='create'
      initialValues={EMPTY_VALUES}
      onSubmit={handleSubmit}
      validationSchema={validationReturnMethod()}
      options={options}
      onCancel={() => handleClose?.(false)}
    />
  );
};

export const UpdateReturnMethod = ({
  initialValues,
  handleClose,
  options,
}: IFormUpdateProps<IReturnMethod> & { options?: ReturnMethodFormOptions }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);
  const validationSchema = validationReturnMethod();
  const id = initialValues?.id;

  if (id == null || !initialValues) {
    return null;
  }

  const handleSubmit = async (values: Omit<IReturnMethodUpdateRequest, "id">) => {
    const result = await updateReturnMethodServerAction({ ...values, id } as IReturnMethodUpdateRequest);
    if (result.success) {
      feedback.success(t("updatedSuccess"));
    } else {
      feedback.failure(result.error);
    }
  };

  return (
    <FormReturnMethod
      mode='edit'
      initialValues={toFormValues(initialValues)}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      options={options}
      onCancel={() => handleClose?.(false)}
    />
  );
};
