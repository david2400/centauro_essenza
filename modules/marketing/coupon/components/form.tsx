/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import { FormCoupon } from "../scenes/formCoupon";
import { validationCoupon } from "../schemas/coupon.schema";
import type { DiscountType, ICoupon, ICouponCreateRequest, INamedItem } from "../models/coupon.interface";
import { csvToList, fromInputDateTime, listToCsv, toInputDateTime } from "../utils";
import {
  createCouponServerAction,
  updateCouponServerAction,
} from "@/app/[locale]/marketing/coupons/actions";

type CouponFormValues = {
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_public: boolean;
  applicable_categories?: string[];
  applicable_products?: string[];
  excluded_categories?: string[];
  excluded_products?: string[];
};

/** Valores del formulario → contrato del backend (fechas ISO, listas como CSV). */
const toPayload = (values: CouponFormValues): ICouponCreateRequest => ({
  ...values,
  description: values.description || undefined,
  valid_from: fromInputDateTime(values.valid_from),
  valid_until: fromInputDateTime(values.valid_until),
  applicable_categories: listToCsv(values.applicable_categories),
  applicable_products: listToCsv(values.applicable_products),
  excluded_categories: listToCsv(values.excluded_categories),
  excluded_products: listToCsv(values.excluded_products),
});

const toFormValues = (coupon?: ICoupon | null) => {
  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const local = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return {
    code: coupon?.code ?? "",
    name: coupon?.name ?? "",
    description: coupon?.description ?? "",
    discount_type: (coupon?.discount_type as DiscountType) ?? "PERCENTAGE",
    discount_value: coupon?.discount_value ?? "",
    minimum_order_amount: coupon?.minimum_order_amount ?? "",
    maximum_discount_amount: coupon?.maximum_discount_amount ?? "",
    usage_limit: coupon?.usage_limit ?? "",
    valid_from: coupon ? toInputDateTime(coupon.valid_from) : local(now),
    valid_until: coupon ? toInputDateTime(coupon.valid_until) : local(inThirtyDays),
    is_active: String(coupon?.is_active ?? true),
    is_public: String(coupon?.is_public ?? false),
    applicable_categories: csvToList(coupon?.applicable_categories),
    applicable_products: csvToList(coupon?.applicable_products),
    excluded_categories: csvToList(coupon?.excluded_categories),
    excluded_products: csvToList(coupon?.excluded_products),
  };
};

export const CouponForm = ({
  coupon,
  categories,
  handleClose,
}: IFormAddProps & { coupon?: ICoupon | null; categories: INamedItem[] }) => {
  const router = useRouter();
  const tCommon = useTranslations("Administre.common");
  const validationSchema = validationCoupon();

  const handleSubmit = async (values: CouponFormValues) => {
    const payload = toPayload(values);
    const result =
      coupon?.id != null
        ? await updateCouponServerAction({ ...payload, id: coupon.id })
        : await createCouponServerAction(payload);

    if (result.success) {
      notify.success(coupon?.id != null ? tCommon("updatedSuccess") : tCommon("createdSuccess"));
      handleClose?.(true);
      router.refresh();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  return (
    <FormCoupon
      initialValues={toFormValues(coupon)}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      categories={categories}
      mode={coupon?.id != null ? "edit" : "create"}
      onCancel={() => handleClose?.(false)}
    />
  );
};
