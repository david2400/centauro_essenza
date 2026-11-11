/** @format */

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import type { ISelectOption } from "@repo/ui/form/models";
import { HiOutlineEnvelope, HiOutlineIdentification, HiOutlinePhone, HiOutlineUserGroup } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import { AccountSection, Adornment, type UserFormMode } from "./formUser";

/** Catálogos de los selects (tipo de documento, sexo, género). Los entrega quien abre el formulario. */
export type ClientFormOptions = Partial<Record<"type_id" | "sex" | "gender", ISelectOption[]>>;

/**
 * Registro de un cliente con su cuenta, en secciones: identificación, datos personales, contacto y credenciales.
 * Los botones quedan fijos al pie del modal.
 */
export const FormClient = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
  options,
}: IFormProps<any> & { mode?: UserFormMode; onCancel?: () => void; options?: ClientFormOptions }) => {
  const t = useTranslations("Administre.user");
  const tForm = useTranslations("Administre.user.form");
  const tCommon = useTranslations("Administre.common");
  type ClientInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<ClientInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineIdentification} title={tForm("identity.title")} hint={tForm("identity.hint")}>
        <FormField
          controller={{ control, name: "first_name" }}
          label={t("fields.firstName")}
          required
          autoFocus
          autoComplete='given-name'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "second_name" }}
          label={t("fields.secondName")}
          autoComplete='additional-name'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "first_last_name" }}
          label={t("fields.firstLastName")}
          required
          autoComplete='family-name'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "second_last_name" }}
          label={t("fields.secondLastName")}
          autoComplete='off'
          className='col-span-12 md:col-span-6'
        />
        <FormSelectField
          controller={{ control, name: "type_id" }}
          label={t("fields.typeId")}
          required
          data={options?.type_id ?? []}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-5'
        />
        <FormField
          controller={{ control, name: "card_id" }}
          label={t("fields.cardId")}
          required
          autoComplete='off'
          spellCheck={false}
          placeholder={tForm("placeholders.cardId")}
          classNameInput='tabular-nums'
          className='col-span-12 md:col-span-7'
        />
      </FormSection>

      <FormSection icon={HiOutlineUserGroup} title={tForm("personal.title")} hint={tForm("personal.hint")}>
        <FormSelectField
          controller={{ control, name: "sex" }}
          label={t("fields.sex")}
          required
          data={options?.sex ?? []}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormSelectField
          controller={{ control, name: "gender" }}
          label={t("fields.gender")}
          required
          data={options?.gender ?? []}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <FormSection icon={HiOutlineEnvelope} title={tForm("contact.title")} hint={tForm("contact.hint")}>
        <FormField
          controller={{ control, name: "email" }}
          label={t("fields.email")}
          required
          type='email'
          inputMode='email'
          autoComplete='email'
          autoCapitalize='none'
          spellCheck={false}
          placeholder={tForm("placeholders.email")}
          icon={<Adornment icon={HiOutlineEnvelope} />}
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "phone" }}
          label={t("fields.phone")}
          required
          type='tel'
          inputMode='tel'
          autoComplete='tel'
          placeholder={tForm("placeholders.phone")}
          icon={<Adornment icon={HiOutlinePhone} />}
          className='col-span-12 md:col-span-6'
        />
        <FormTextAreaField
          controller={{ control, name: "address" }}
          label={t("fields.address")}
          required
          rows={2}
          autoComplete='street-address'
          placeholder={tForm("placeholders.address")}
          className='col-span-12'
        />
      </FormSection>

      <AccountSection control={control} />

      <ModalFormFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onCancel}
        submitting={isSubmitting}
        submitDisabled={mode === "edit" && !isDirty}
        submitLabel={mode === "edit" ? tForm("submitEdit") : tForm("submitCreate")}
      />
    </form>
  );
};
