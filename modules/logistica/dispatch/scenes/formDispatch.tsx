/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import {
  HiOutlineCalendarDays,
  HiOutlineMapPin,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import { formatLocalDate } from "@/lib/format";
import type { IDispatchOrder } from "../models/dispatch.interface";
import { daysFromToday } from "../constants";

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** "Ciudad (Departamento)", o lo que haya escrito. */
const place = (city: string, department: string) => (city && department ? `${city} (${department})` : city || department);

/**
 * Alta y edición de despachos, en secciones: orden y guía, ruta (dirección, origen y destino) y fechas de entrega. Un
 * resumen en vivo muestra la ruta y cuándo se espera la entrega. Los botones quedan fijos al pie del modal.
 */
export const FormDispatch = ({
  initialValues,
  validationSchema,
  onSubmit,
  orders,
  mode = "create",
  onCancel,
}: IFormProps<any> & { orders: IDispatchOrder[]; mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.dispatch");
  const tForm = useTranslations("Administre.dispatch.form");
  const tCommon = useTranslations("Administre.common");
  type DispatchInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<DispatchInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const orderOptions = useMemo(
    () =>
      orders
        .filter((order) => order.id != null)
        .map((order) => ({
          id: String(order.id),
          value: String(order.id),
          label: order.name ?? `#${order.id}`,
        })),
    [orders],
  );

  // Solo se observan los campos que alimentan el resumen.
  const [deptOrigin, cityOrigin, deptDestination, cityDestination, estimated] = useWatch({
    control,
    name: ["department_origin", "city_origin", "department_destination", "city_destination", "estimated_delivery_date"] as never,
  });
  const origin = place(asText(cityOrigin), asText(deptOrigin));
  const destination = place(asText(cityDestination), asText(deptDestination));
  const estimatedDate = asText(estimated);
  const days = daysFromToday(estimatedDate);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlinePaperAirplane} title={tForm("shipment.title")} hint={tForm("shipment.hint")}>
        <FormSelectField
          controller={{ control, name: "order_id" }}
          label={t("fields.orderId")}
          required
          data={orderOptions}
          placeholder={tCommon("selectPlaceholder")}
          searchable
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "guide_number" }}
          label={t("fields.guideNumber")}
          required
          autoFocus
          autoComplete='off'
          spellCheck={false}
          placeholder={tForm("placeholders.guideNumber")}
          maxLength={60}
          classNameInput='font-mono tracking-wide'
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <FormSection icon={HiOutlineMapPin} title={tForm("route.title")} hint={tForm("route.hint")}>
        <FormField
          controller={{ control, name: "address" }}
          label={t("fields.address")}
          required
          autoComplete='street-address'
          placeholder={tForm("placeholders.address")}
          className='col-span-12'
        />
        <p className='col-span-12 -mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          {t("originLegend")}
        </p>
        <FormField
          controller={{ control, name: "department_origin" }}
          label={t("fields.departmentOrigin")}
          required
          autoComplete='off'
          placeholder={tForm("placeholders.department")}
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "city_origin" }}
          label={t("fields.cityOrigin")}
          required
          autoComplete='off'
          placeholder={tForm("placeholders.city")}
          className='col-span-12 md:col-span-6'
        />
        <p className='col-span-12 -mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          {t("destinationLegend")}
        </p>
        <FormField
          controller={{ control, name: "department_destination" }}
          label={t("fields.departmentDestination")}
          required
          autoComplete='address-level1'
          placeholder={tForm("placeholders.department")}
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "city_destination" }}
          label={t("fields.cityDestination")}
          required
          autoComplete='address-level2'
          placeholder={tForm("placeholders.city")}
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <FormSection icon={HiOutlineCalendarDays} title={tForm("dates.title")} hint={tForm("dates.hint")}>
        <FormField
          controller={{ control, name: "estimated_delivery_date" }}
          type='date'
          label={t("fields.estimatedDeliveryDate")}
          required
          className='col-span-12 sm:col-span-6'
        />
        <FormField
          controller={{ control, name: "real_delivery_date" }}
          type='date'
          label={t("fields.realDeliveryDate")}
          required
          className='col-span-12 sm:col-span-6'
        />
        {/* Las ayudas van debajo (no como descripción) para que los dos inputs queden alineados. */}
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground sm:col-span-6'>{tForm("hints.estimated")}</p>
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground sm:col-span-6'>{tForm("hints.realDelivery")}</p>

        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <div className='min-w-0 space-y-1 text-foreground'>
            <p>
              {origin && destination
                ? tForm("preview.route", { origin, destination })
                : tForm("preview.routeEmpty")}
            </p>
            {estimatedDate && days != null ? (
              <p className='text-muted-foreground'>
                {tForm("preview.eta", { date: formatLocalDate(estimatedDate), days })}
              </p>
            ) : null}
          </div>
        </div>
      </FormSection>

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
