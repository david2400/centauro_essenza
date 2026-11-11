/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import { FormDevolution } from "../scenes/formDevolution";
import { FormDevolutionDetail } from "../scenes/formDevolutionDetail";
import { FormEvidence } from "../scenes/formEvidence";
import {
  validationDevolution,
  validationDevolutionDetail,
  validationDevolutionEvidence,
  type DevolutionDetailFormValues,
  type DevolutionEvidenceFormValues,
  type DevolutionFormValues,
} from "../schemas/devolution.schema";
import type {
  IDevolution,
  IDevolutionCatalogs,
  IDevolutionDetail,
  IReturnableLine,
} from "../models/devolution.interface";
import { nowLocalDateTime } from "../constants";
import {
  createDevolutionDetailServerAction,
  createDevolutionEvidenceServerAction,
  updateDevolutionDetailServerAction,
  updateDevolutionServerAction,
} from "@/app/[locale]/postventa/devolutions/actions";

type Result = { success: true } | { success: false; error: string };

const useFeedback = (handleClose?: IFormAddProps["handleClose"]) => {
  const router = useRouter();
  const t = useTranslations("Administre.common");

  return {
    done: (result: Result, successTitle: string) => {
      if (result.success) {
        notify.success(successTitle);
        handleClose?.(true);
        router.refresh();
      } else {
        notify.error(t("errorTitle"), result.error || t("unexpectedError"));
      }
    },
  };
};

const idToString = (value?: number) => (value != null ? String(value) : "");

// ─── Devolución ───────────────────────────────────────────────────────────────

export const UpdateDevolution = ({
  devolution,
  handleClose,
  catalogs,
}: IFormAddProps & { devolution: IDevolution; catalogs: IDevolutionCatalogs }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);
  const validationSchema = validationDevolution();

  if (devolution.id == null) return null;
  const id = devolution.id;

  const handleSubmit = async (values: DevolutionFormValues) => {
    // Solo datos generales: el estado cambia con las acciones del flujo.
    const result = await updateDevolutionServerAction({
      id,
      order_id: devolution.order_id ?? 0,
      ...values,
    });
    await feedback.done(result, t("updatedSuccess"));
  };

  return (
    <FormDevolution
      initialValues={{
        motive_devolution_id: idToString(devolution.motive_devolution_id),
        return_method_id: idToString(devolution.return_method_id),
        refund_method_id: idToString(devolution.refund_method_id),
        observation: devolution.observation ?? "",
        external_reference: devolution.external_reference ?? "",
      }}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      catalogs={catalogs}
      onCancel={() => handleClose?.(false)}
    />
  );
};

// ─── Líneas devueltas ────────────────────────────────────────────────────────

export const DevolutionDetailForm = ({
  devolutionId,
  detail,
  lines,
  handleClose,
}: IFormAddProps & {
  devolutionId: number;
  detail?: IDevolutionDetail | null;
  /** Líneas de la orden con lo que aún se puede devolver (sin contar esta devolución). */
  lines: IReturnableLine[];
}) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);
  const validationSchema = validationDevolutionDetail();

  const handleSubmit = async (values: DevolutionDetailFormValues) => {
    const payload = { ...values, order_devolution_id: devolutionId };
    const result =
      detail?.id != null
        ? await updateDevolutionDetailServerAction({ ...payload, id: detail.id })
        : await createDevolutionDetailServerAction(payload);
    await feedback.done(result, detail?.id != null ? t("updatedSuccess") : t("createdSuccess"));
  };

  const firstLine = lines.find((line) => (line.returnable ?? 0) > 0);

  return (
    <FormDevolutionDetail
      initialValues={{
        product_order_id: idToString(detail?.product_order_id ?? firstLine?.product_order_id),
        quantity: detail?.quantity ?? 1,
        observation: detail?.observation ?? "",
      }}
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      lines={lines}
      editing={detail?.id != null}
      onCancel={() => handleClose?.(false)}
    />
  );
};

// ─── Evidencias ──────────────────────────────────────────────────────────────

export const EvidenceForm = ({
  devolutionId,
  handleClose,
}: IFormAddProps & { devolutionId: number }) => {
  const t = useTranslations("Administre.common");
  const feedback = useFeedback(handleClose);

  const handleSubmit = async (values: DevolutionEvidenceFormValues) => {
    const result = await createDevolutionEvidenceServerAction({
      ...values,
      order_devolution_id: devolutionId,
      recorded_at: nowLocalDateTime(),
    });
    await feedback.done(result, t("createdSuccess"));
  };

  return (
    <FormEvidence
      initialValues={{ evidence_type: "PHOTO", resource_url: "", description: "", recorded_by: "" }}
      onSubmit={handleSubmit}
      validationSchema={validationDevolutionEvidence()}
      onCancel={() => handleClose?.(false)}
    />
  );
};
