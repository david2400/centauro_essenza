/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import { FormDispatch } from "../scenes/formDispatch";
import { validationDispatch, type DispatchFormValues } from "../schemas/dispatch.schema";
import type { IDispatch, IDispatchOrder } from "../models/dispatch.interface";
import { todayIso } from "../constants";
import {
  createDispatchServerAction,
  updateDispatchServerAction,
} from "@/app/[locale]/logistica/dispatches/actions";

type Result = { success: true } | { success: false; error: string };

const useFeedback = (handleClose?: IFormAddProps["handleClose"]) => {
  const router = useRouter();
  const t = useTranslations("Administre.common");

  return (result: Result, successTitle: string) => {
    if (result.success) {
      notify.success(successTitle);
      handleClose?.(true);
      router.refresh();
    } else {
      notify.error(t("errorTitle"), result.error || t("unexpectedError"));
    }
  };
};

const toFormValues = (dispatch?: IDispatch | null) => ({
  order_id: dispatch?.order_id != null ? String(dispatch.order_id) : "",
  guide_number: dispatch?.guide_number ?? "",
  address: dispatch?.address ?? "",
  department_origin: dispatch?.department_origin ?? "",
  city_origin: dispatch?.city_origin ?? "",
  department_destination: dispatch?.department_destination ?? "",
  city_destination: dispatch?.city_destination ?? "",
  estimated_delivery_date: dispatch?.estimated_delivery_date?.slice(0, 10) ?? todayIso(),
  real_delivery_date: dispatch?.real_delivery_date?.slice(0, 10) ?? todayIso(),
});

export const RegisterDispatch = ({
  handleClose,
  orders,
}: IFormAddProps & { orders: IDispatchOrder[] }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);

  const handleSubmit = async (values: DispatchFormValues) => {
    feedback(await createDispatchServerAction(values), t("createdSuccess"));
  };

  return (
    <FormDispatch
      mode='create'
      initialValues={toFormValues()}
      onSubmit={handleSubmit}
      validationSchema={validationDispatch()}
      orders={orders}
      onCancel={() => handleClose?.(false)}
    />
  );
};

export const UpdateDispatch = ({
  dispatch,
  handleClose,
  orders,
}: IFormAddProps & { dispatch: IDispatch; orders: IDispatchOrder[] }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);
  const validationSchema = validationDispatch();

  if (dispatch.id == null) return null;
  const id = dispatch.id;

  const handleSubmit = async (values: DispatchFormValues) => {
    feedback(await updateDispatchServerAction({ ...values, id }), t("updatedSuccess"));
  };

  return (
    <FormDispatch
      mode='edit'
      initialValues={toFormValues(dispatch)}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      orders={orders}
      onCancel={() => handleClose?.(false)}
    />
  );
};
