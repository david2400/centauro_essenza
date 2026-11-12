/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ModalFormFooter } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { selectableOptions, type IDevolution, type IDevolutionOption } from "../../models/devolution.interface";

export type FlowResult = { success: true } | { success: false; error: string };

export interface DialogProps {
  devolution: IDevolution;
  onClose: () => void;
}

export const toOptions = (items: IDevolutionOption[], keep?: number | string | null) => selectableOptions(items, keep);

export const idOrEmpty = (value?: number | null) => (value != null ? String(value) : "");

export const useFlowFeedback = (onClose: () => void) => {
  const router = useRouter();
  const t = useTranslations("Administre.devolution.flow");
  const tCommon = useTranslations("Administre.common");
  return (result: FlowResult, done: string) => {
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t(done as never));
    onClose();
    router.refresh();
  };
};

/**
 * Pie fijo para una acción destructiva (rechazar). Replica el de `ModalFormFooter`, que todavía no acepta la variante
 * `danger` en el botón principal; cuando la tenga, este componente sobra.
 */
/** Pie con la acción principal en rojo (rechazar). Usa el pie común con `submitVariant="danger"`. */
export const DangerModalFooter = (props: {
  note?: string;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  submitting?: boolean;
}) => <ModalFormFooter {...props} submitVariant='danger' />;
