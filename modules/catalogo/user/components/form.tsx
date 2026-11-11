/** @format */

"use client";

import { useTranslations } from "next-intl";
import { z } from "zod";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import { FormClient, type ClientFormOptions } from "../scenes/formClient";
import { validationClient } from "../schemas/client.schema";

const PASSWORD_MIN = 4;

/**
 * Schema del registro: datos del cliente (`validationClient`) + contacto y credenciales. Antes era un schema copiado
 * de un formulario de tarjeta cuyas claves (`name`, `lastName`) no coincidían con los campos del formulario.
 */
export const validation = () => {
  const intl = useTranslations("Form");
  const tValidation = useTranslations("Administre.user.validation");
  const required = { message: intl("requiredField") };

  return validationClient()
    .extend({
      email: z.string().trim().min(1, required).email({ message: intl("invalidEmail") }),
      phone: z.string().trim().min(1, required),
      address: z.string().trim().min(1, required),
      username: z.string().trim().min(1, required),
      password: z.string().min(PASSWORD_MIN, { message: tValidation("passwordMin", { min: PASSWORD_MIN }) }),
      confirmPassword: z.string().min(1, required),
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: tValidation("passwordMismatch"),
    });
};

const EMPTY_VALUES = {
  first_name: "",
  second_name: "",
  first_last_name: "",
  second_last_name: "",
  type_id: "",
  card_id: "",
  sex: "",
  gender: "",
  email: "",
  phone: "",
  address: "",
  username: "",
  password: "",
  confirmPassword: "",
};

export const RegisterUser = ({ handleClose, options }: IFormAddProps & { options?: ClientFormOptions } = {}) => {
  // Sin envío conectado todavía: no hay acción de servidor para registrar usuarios.
  const onSubmit = async (values: any) => {};

  return (
    <FormClient
      mode='create'
      initialValues={EMPTY_VALUES}
      onSubmit={onSubmit}
      validationSchema={validation()}
      options={options}
      onCancel={handleClose ? () => handleClose(false) : undefined}
    />
  );
};
