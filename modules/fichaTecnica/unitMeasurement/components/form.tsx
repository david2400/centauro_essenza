/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type { IUnit } from "@/shared/units/units";
import { FormUnitMeasurement } from "../scenes/formUnitMeasurement";
import { validationUnitMeasurement, type UnitFormValues } from "../schemas/unitMeasurement.schema";
import type { IUnitMeasurement } from "../models/unitMeasurement.interface";
import { createUnitServerAction, updateUnitServerAction } from "@/app/[locale]/fichaTecnica/unit-measurements/actions";

const toFormValues = (unit?: IUnitMeasurement | null): UnitFormValues => ({
  name: unit?.name ?? "",
  symbol: unit?.symbol ?? "",
  code: unit?.code ?? "",
  dimension: (unit?.dimension ?? "VOLUME") as UnitFormValues["dimension"],
  factor: unit?.factor,
  base: Boolean(unit?.base),
  decimals: unit?.decimals ?? 2,
  active: unit?.active ?? true,
});

/** Alta / edición de unidad: avisa, cierra el modal y refresca. */
export const UnitForm = ({
  unit,
  units,
  handleClose,
}: {
  unit: IUnitMeasurement | null;
  units: IUnit[];
  handleClose: () => void;
}) => {
  const router = useRouter();
  const tCommon = useTranslations("Administre.common");

  const handleSubmit = async (values: UnitFormValues) => {
    const payload = {
      name: values.name,
      symbol: values.symbol,
      code: values.code || undefined,
      dimension: values.dimension,
      factor: values.dimension === "OTHER" || values.base ? undefined : values.factor,
      base: values.base,
      decimals: values.decimals,
      active: values.active,
    };
    const result = unit?.id != null ? await updateUnitServerAction({ ...payload, id: unit.id }) : await createUnitServerAction(payload);
    if (result.success) {
      notify.success(unit?.id != null ? tCommon("updatedSuccess") : tCommon("createdSuccess"), values.name);
      handleClose();
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  return (
    <FormUnitMeasurement
      initialValues={toFormValues(unit)}
      validationSchema={validationUnitMeasurement()}
      onSubmit={handleSubmit}
      units={units}
      current={unit}
      mode={unit?.id != null ? "edit" : "create"}
      onCancel={handleClose}
    />
  );
};
