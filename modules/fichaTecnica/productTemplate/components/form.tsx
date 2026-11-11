/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import { notify } from "@/components/notifications";
import { FormProductTemplate } from "../scenes/formProductTemplate";
import { validationProductTemplate, type ProductTemplateFormValues } from "../schemas/productTemplate.schema";
import type { IAttributeOption, IProductTemplate } from "../models/productTemplate.interface";
import {
  createProductTemplateServerAction,
  updateProductTemplateServerAction,
} from "@/app/[locale]/fichaTecnica/templates/actions";

const toFormValues = (item?: IProductTemplate | null) => ({
  name: item?.name ?? "",
  description: item?.description ?? "",
  attributes: (item?.attributes ?? []).map((attribute) => ({
    attribute_id: attribute.attribute_id,
    required: Boolean(attribute.required),
    variant_axis: Boolean(attribute.variant_axis),
    filterable: Boolean(attribute.filterable),
  })),
});

/** Alta / edición de plantilla: avisa, cierra el modal y refresca la lista. */
export const ProductTemplateForm = ({
  item,
  attributes,
  handleClose,
}: IFormAddProps & { item?: IProductTemplate | null; attributes: IAttributeOption[] }) => {
  const router = useRouter();
  const tCommon = useTranslations("Administre.common");
  const optionIds = new Set(
    attributes.filter((attribute) => attribute.data_type === "OPTION" && attribute.id != null).map((a) => a.id as number),
  );
  const validationSchema = validationProductTemplate(optionIds);

  const handleSubmit = async (values: ProductTemplateFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      attributes: values.attributes.map((attribute, index) => ({ ...attribute, position: index })),
    };
    const result =
      item?.id != null
        ? await updateProductTemplateServerAction(item.id, payload)
        : await createProductTemplateServerAction(payload);
    if (result.success) {
      notify.success(item?.id != null ? tCommon("updatedSuccess") : tCommon("createdSuccess"), values.name);
      handleClose?.(true);
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  return (
    <FormProductTemplate
      initialValues={toFormValues(item)}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      attributes={attributes}
      mode={item?.id != null ? "edit" : "create"}
      onCancel={() => handleClose?.(false)}
    />
  );
};
