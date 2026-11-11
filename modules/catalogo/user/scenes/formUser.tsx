/** @format */

"use client";

import type { ComponentType } from "react";
import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { FormField } from "@repo/ui/form/scenes/form-field";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { HiOutlineKey, HiOutlineLockClosed, HiOutlineUser } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";

export type UserFormMode = "create" | "edit";

export const Adornment = ({
  icon: Icon,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
}) => <Icon className='h-4 w-4 text-muted-foreground' aria-hidden='true' />;

/**
 * Sección de credenciales (usuario, contraseña y confirmación). Las contraseñas siempre van enmascaradas
 * (`type='password'`) y con `autoComplete='new-password'` para que el navegador no rellene la del administrador.
 */
export const AccountSection = ({ control, autoFocus }: { control: Control<any>; autoFocus?: boolean }) => {
  const t = useTranslations("Administre.user");
  const tForm = useTranslations("Administre.user.form");

  return (
    <FormSection icon={HiOutlineKey} title={tForm("account.title")} hint={tForm("account.hint")}>
      <FormField
        controller={{ control, name: "username" }}
        label={t("fields.username")}
        required
        autoFocus={autoFocus}
        autoComplete='username'
        autoCapitalize='none'
        spellCheck={false}
        placeholder={tForm("placeholders.username")}
        icon={<Adornment icon={HiOutlineUser} />}
        className='col-span-12'
      />
      <FormField
        controller={{ control, name: "password" }}
        label={t("fields.password")}
        required
        type='password'
        autoComplete='new-password'
        icon={<Adornment icon={HiOutlineLockClosed} />}
        className='col-span-12 md:col-span-6'
      />
      <FormField
        controller={{ control, name: "confirmPassword" }}
        label={t("fields.confirmPassword")}
        required
        type='password'
        autoComplete='new-password'
        icon={<Adornment icon={HiOutlineLockClosed} />}
        className='col-span-12 md:col-span-6'
      />
      <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{tForm("hints.password")}</p>
    </FormSection>
  );
};

/** Alta y edición de las credenciales de un usuario. Los botones quedan fijos al pie del modal. */
export const FormUser = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { mode?: UserFormMode; onCancel?: () => void }) => {
  const tForm = useTranslations("Administre.user.form");
  const tCommon = useTranslations("Administre.common");
  type UserInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<UserInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <AccountSection control={control} autoFocus />

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
