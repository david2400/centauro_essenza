/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { HiOutlineArrowUturnLeft, HiOutlineChatBubbleBottomCenterText } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import type { IDevolutionCatalogs, IDevolutionOption } from "../models/devolution.interface";

const toOptions = (items: IDevolutionOption[]) =>
  items
    .filter((item) => item.id != null)
    .map((item) => ({
      id: String(item.id),
      value: String(item.id),
      label: item.name ?? `#${item.id}`,
    }));

/**
 * Datos generales de una devolución (pendiente o aprobada), en dos secciones: motivo y métodos, y observaciones. El
 * estado no se edita aquí: cambia con las acciones del flujo. Guardar se habilita cuando hay cambios.
 */
export const FormDevolution = ({
  initialValues,
  validationSchema,
  onSubmit,
  catalogs,
  onCancel,
}: IFormProps<any> & { catalogs: IDevolutionCatalogs; onCancel?: () => void }) => {
  const t = useTranslations("Administre.devolution");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  type DevolutionInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<DevolutionInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const options = useMemo(
    () => ({
      motives: toOptions(catalogs.motives),
      returnMethods: toOptions(catalogs.returnMethods),
      refundMethods: toOptions(catalogs.refundMethods),
    }),
    [catalogs],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineArrowUturnLeft} title={tForm("general.title")} hint={tForm("general.hint")}>
        <FormSelectField
          controller={{ control, name: "motive_devolution_id" }}
          label={t("fields.motiveDevolutionId")}
          required
          data={options.motives}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12'
        />
        <FormSelectField
          controller={{ control, name: "return_method_id" }}
          label={t("fields.returnMethodId")}
          data={options.returnMethods}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormSelectField
          controller={{ control, name: "refund_method_id" }}
          label={t("fields.refundMethodId")}
          data={options.refundMethods}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <FormSection icon={HiOutlineChatBubbleBottomCenterText} title={tForm("notes.title")} hint={tForm("notes.hint")}>
        <FormTextAreaField
          controller={{ control, name: "observation" }}
          label={t("fields.observation")}
          required
          maxLength={255}
          showCounter
          placeholder={tForm("placeholders.observation")}
          className='col-span-12'
        />
        <FormField
          controller={{ control, name: "external_reference" }}
          label={t("fields.externalReference")}
          maxLength={50}
          spellCheck={false}
          placeholder={tForm("placeholders.externalReference")}
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <ModalFormFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onCancel}
        submitting={isSubmitting}
        submitDisabled={!isDirty}
        submitLabel={tForm("submitEdit")}
      />
    </form>
  );
};
