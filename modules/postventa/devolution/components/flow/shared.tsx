/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { notify } from "@/components/notifications";
import type { IDevolution, IDevolutionOption } from "../../models/devolution.interface";

export type FlowResult = { success: true } | { success: false; error: string };

export interface DialogProps {
  devolution: IDevolution;
  onClose: () => void;
}

export const toOptions = (items: IDevolutionOption[]) =>
  items.filter((item) => item.id != null).map((item) => ({ value: String(item.id), label: item.name ?? `#${item.id}` }));

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
export const DangerModalFooter = ({
  note,
  submitLabel,
  cancelLabel,
  onCancel,
  submitting,
}: {
  note?: string;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  submitting?: boolean;
}) => (
  <div className='sticky bottom-0 z-10 -mx-6 mt-1 flex flex-col-reverse gap-2 border-t border-border bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:flex-row sm:items-center sm:justify-between dark:bg-background/95'>
    <div className='min-w-0 text-xs text-muted-foreground'>{note}</div>
    <div className='flex flex-col-reverse gap-2 sm:flex-row'>
      <Buttons type='button' variant='outline' className='rounded-full' onClick={onCancel} disabled={submitting}>
        {cancelLabel}
      </Buttons>
      <Buttons type='submit' variant='danger' loading={submitting} className='rounded-full sm:min-w-40'>
        {submitLabel}
      </Buttons>
    </div>
  </div>
);
