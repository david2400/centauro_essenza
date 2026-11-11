/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import type { ISelectOption } from "@repo/ui/form/models";
import { FormInventoryMovement } from "../scenes/formInventoryMovement";
import { validationInventoryMovement } from "../schemas/inventory-movement.schema";
import type { IInventoryMovement, MovementType } from "../models/inventory-movement.interface";
import { registerMovementServerAction } from "@/app/[locale]/inventory/inventory-movements/actions";

type MovementFormValues = {
  type: MovementType;
  product_id: number;
  sku_id?: number;
  from_warehouse_id?: number;
  to_warehouse_id?: number;
  quantity: number;
  reason?: string;
};

export const RegisterInventoryMovement = ({
  handleClose,
  warehouses,
}: IFormAddProps & {
  warehouses: ISelectOption[];
}) => {
  const router = useRouter();
  const t = useTranslations("Administre.inventoryMovement");
  const tCommon = useTranslations("Administre.common");

  const handleSubmit = async (values: MovementFormValues) => {
    // Sólo se envían las bodegas que aplican al tipo de movimiento.
    const payload: IInventoryMovement = {
      type: values.type,
      product_id: values.product_id,
      sku_id: values.sku_id || undefined,
      quantity: values.quantity,
      reason: values.reason || undefined,
      from_warehouse_id: values.type === "ENTRY" ? undefined : values.from_warehouse_id,
      to_warehouse_id: values.type === "EXIT" ? undefined : values.to_warehouse_id,
    };

    const result = await registerMovementServerAction(payload);
    if (result.success) {
      notify.success(t("registered"));
      handleClose?.(true);
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  return (
    <FormInventoryMovement
      initialValues={{
        type: "ENTRY",
        product_id: "",
        sku_id: "",
        from_warehouse_id: "",
        to_warehouse_id: "",
        quantity: 1,
        reason: "",
      }}
      onSubmit={handleSubmit}
      validationSchema={validationInventoryMovement()}
      warehouses={warehouses}
      onCancel={() => handleClose?.(false)}
    />
  );
};
