/** @format */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocument,
  HiOutlineCreditCard,
  HiOutlineInformationCircle,
} from "react-icons/hi2";
import { Segmented, ToggleRow } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { KIND_ICONS } from "@/modules/ventas/paymentMethod/scenes/formPaymentMethod";
import {
  isPaymentKind,
  type IPaymentMethod,
  type PaymentChannel,
} from "@/modules/ventas/paymentMethod/models/paymentMethod.interface";
import {
  buildRegisterPaymentSchema,
  type RegisterPaymentFormInput,
  type RegisterPaymentFormValues,
  type RegisterPaymentRules,
} from "../schemas/payment.schema";
import type { ICheckout } from "../models/payment.interface";
import { registerPaymentServerAction, startCheckoutServerAction } from "@/app/[locale]/ventas/payments/actions";
import { SplitPaymentForm } from "./split-payment-form";

type PayMode = "single" | "split";

/** Tipos que quedan aprobados al registrarlos (igual que el backend). */
const SETTLES_ON_REGISTER = ["CASH", "CARD_TERMINAL", "BANK_TRANSFER", "DIGITAL_WALLET", "OTHER"];

const toNumber = (value: unknown) => {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Billetes sugeridos para el efectivo recibido (redondeos hacia arriba). */
const cashSuggestions = (amount: number) => {
  if (amount <= 0) return [];
  const steps = [1_000, 5_000, 10_000, 20_000, 50_000, 100_000];
  const values = new Set<number>([amount]);
  steps.forEach((step) => values.add(Math.ceil(amount / step) * step));
  return [...values].sort((a, b) => a - b).slice(0, 4);
};

interface RegisterPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
  /** Saldo que se puede cobrar ahora (total − pagado − pendiente). */
  collectable: number;
  methods: IPaymentMethod[];
}

/**
 * Cobro de una orden: medio por canal (físico o virtual), monto (por defecto el saldo),
 * efectivo recibido con cálculo del cambio, referencia, pendiente de confirmar y notas.
 * Con una pasarela genera el link de pago y lo muestra para copiar o abrir.
 * "Varios medios" reparte el cobro entre medios que no son pasarela (efectivo + datáfono…).
 */
export const RegisterPaymentDialog = ({ open, onClose, orderId, collectable, methods }: RegisterPaymentDialogProps) => {
  const t = useTranslations("Administre.payment");
  const tr = useTranslations("Administre.payment.register");
  const tm = useTranslations("Administre.paymentMethod");
  const tv = useTranslations("Administre.payment.validation");
  const intl = useTranslations("Form");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();

  const available = useMemo(() => methods.filter((method) => method.active !== false), [methods]);
  const firstChannel: PaymentChannel = available.some((method) => method.channel === "PHYSICAL") ? "PHYSICAL" : "VIRTUAL";
  const [channel, setChannel] = useState<PaymentChannel>(firstChannel);
  const [checkout, setCheckout] = useState<ICheckout | null>(null);
  const [mode, setMode] = useState<PayMode>("single");
  const splitMethods = useMemo(() => available.filter((method) => method.kind !== "GATEWAY"), [available]);

  const defaults: RegisterPaymentFormInput = {
    payment_method_id: "",
    amount: collectable > 0 ? collectable : "",
    tendered_amount: "",
    reference: "",
    notes: "",
    pending: false,
    payer_email: "",
  };

  // El esquema depende del medio elegido: el resolver lee las reglas vigentes.
  const rulesRef = useRef<RegisterPaymentRules>({ collectable, requiresReference: false, allowsChange: false, gateway: false });
  const messages = {
    required: intl("requiredField"),
    email: tv("email"),
    amount: tv("amount"),
    overBalance: tv("overBalance", { max: formatMoney(collectable) }),
    reference: tv("reference"),
    tenderedLow: tv("tenderedLow"),
    noChange: tv("noChange"),
  };
  const resolver: Resolver<RegisterPaymentFormInput, unknown, RegisterPaymentFormValues> = (values, context, options) =>
    (zodResolver(buildRegisterPaymentSchema(rulesRef.current, messages)) as unknown as Resolver<
      RegisterPaymentFormInput,
      unknown,
      RegisterPaymentFormValues
    >)(values, context, options);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<RegisterPaymentFormInput, unknown, RegisterPaymentFormValues>({ resolver, defaultValues: defaults });

  // Cada apertura parte del saldo vigente (pudo cambiar con otros pagos).
  useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collectable]);

  const values = useWatch({ control }) as RegisterPaymentFormInput;
  const method = available.find((item) => String(item.id) === values.payment_method_id);
  const kind = isPaymentKind(method?.kind) ? method.kind : null;
  const gateway = kind === "GATEWAY";
  const settles = kind != null && SETTLES_ON_REGISTER.includes(kind);
  rulesRef.current = {
    collectable,
    requiresReference: Boolean(method?.requires_reference),
    allowsChange: Boolean(method?.allows_change),
    gateway,
  };

  const amount = toNumber(values.amount) ?? (gateway ? collectable : 0);
  const tendered = toNumber(values.tendered_amount);
  const change = tendered != null && tendered >= amount ? tendered - amount : null;
  const fee = method ? Math.round(amount * ((method.fee_percent ?? 0) / 100) + (method.fee_fixed ?? 0)) : 0;
  const outOfLimits =
    method != null &&
    ((method.min_amount != null && amount < method.min_amount) || (method.max_amount != null && amount > method.max_amount));

  const close = () => {
    setCheckout(null);
    setChannel(firstChannel);
    setMode("single");
    onClose();
  };

  const chooseMethod = (item: IPaymentMethod) => {
    setValue("payment_method_id", String(item.id), { shouldValidate: false });
    if (!item.allows_change) setValue("tendered_amount", "");
    if (item.kind === "GATEWAY" || item.kind === "CASH_ON_DELIVERY") setValue("pending", false);
  };

  const onSubmit = async (form: RegisterPaymentFormValues) => {
    if (!method?.id) return;
    if (gateway) {
      const result = await startCheckoutServerAction({
        order_id: orderId,
        payment_method_id: method.id,
        amount: form.amount,
        payer_email: form.payer_email || undefined,
      });
      if (result.success) {
        setCheckout(result.data);
        router.refresh();
      } else {
        notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
      }
      return;
    }
    const result = await registerPaymentServerAction({
      order_id: orderId,
      payment_method_id: method.id,
      amount: form.amount ?? 0,
      tendered_amount: method.allows_change ? form.tendered_amount : undefined,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
      pending: settles ? form.pending : undefined,
    });
    if (result.success) {
      const status = result.data.status === "APPROVED" ? tr("registeredApproved") : tr("registeredPending");
      notify.success(status, `${method.name} · ${formatMoney(result.data.amount)}`);
      if ((result.data.change_amount ?? 0) > 0) notify.info(tr("changeToGive", { amount: formatMoney(result.data.change_amount) }));
      router.refresh();
      close();
    } else {
      notify.error(tCommon("errorTitle"), result.error || tCommon("unexpectedError"));
    }
  };

  const copyLink = async () => {
    if (!checkout?.checkout_url) return;
    try {
      await navigator.clipboard.writeText(checkout.checkout_url);
      notify.success(t("checkout.copied"));
    } catch {
      notify.info(checkout.checkout_url);
    }
  };

  const channelMethods = available.filter((item) => item.channel === channel);
  const countBy = (value: PaymentChannel) => available.filter((item) => item.channel === value).length;
  const err = (name: keyof RegisterPaymentFormInput) => (errors[name] as { message?: string } | undefined)?.message;

  return (
    <Modal
      size='lg'
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
      title={checkout ? t("checkout.title") : tr("title")}
      description={checkout ? undefined : tr("subtitle", { amount: formatMoney(collectable) })}
      hideDefaultFooter>
      {!checkout && splitMethods.length > 0 && collectable > 0 ? (
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2'>
          <span className='text-sm font-medium text-foreground'>{tr("split.mode")}</span>
          <Segmented<PayMode>
            label={tr("split.mode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "single", label: tr("split.single") },
              { value: "split", label: tr("split.multiple"), title: tr("split.multipleTitle") },
            ]}
          />
        </div>
      ) : null}
      {checkout ? (
        <div className='grid gap-4'>
          <div className='flex gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4'>
            <HiOutlineCheckCircle className='mt-0.5 h-5 w-5 shrink-0 text-emerald-600' aria-hidden='true' />
            <div className='grid gap-1 text-sm'>
              <p className='font-semibold text-foreground'>
                {t("checkout.ready", { amount: formatMoney(checkout.payment?.amount), method: checkout.payment?.method_name ?? "" })}
              </p>
              <p className='text-muted-foreground'>{t("checkout.hint")}</p>
            </div>
          </div>
          <div className='grid gap-1.5'>
            <span className='text-sm font-medium'>{t("checkout.link")}</span>
            <code className='break-all rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs'>{checkout.checkout_url}</code>
            <span className='text-xs text-muted-foreground'>
              {t("fields.paymentReference")}: <span className='font-mono'>{checkout.payment?.payment_reference}</span>
            </span>
          </div>
          <div className='flex flex-wrap justify-end gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={close}>
              {tr("done")}
            </Buttons>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={copyLink}>
              <HiOutlineClipboardDocument className='h-4 w-4' aria-hidden='true' />
              {t("checkout.copy")}
            </Buttons>
            <a
              href={checkout.checkout_url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
              <HiOutlineArrowTopRightOnSquare className='h-4 w-4' aria-hidden='true' />
              {t("checkout.open")}
            </a>
          </div>
        </div>
      ) : mode === "split" ? (
        <SplitPaymentForm orderId={orderId} collectable={collectable} methods={splitMethods} onDone={close} onCancel={close} />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className='grid gap-5'>
          {available.length === 0 ? (
            <p className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>{tr("noMethods")}</p>
          ) : (
            <>
              <div className='grid gap-3'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='text-sm font-medium text-foreground'>{tr("method")}</span>
                  <Segmented<PaymentChannel>
                    label={tm("fields.channel")}
                    value={channel}
                    onChange={setChannel}
                    options={(["PHYSICAL", "VIRTUAL"] as const).map((value) => ({
                      value,
                      label: `${tm(`channels.${value}`)} (${countBy(value)})`,
                    }))}
                  />
                </div>
                <div role='radiogroup' aria-label={tr("method")} className='grid gap-2 sm:grid-cols-2'>
                  {channelMethods.map((item) => {
                    const Icon = isPaymentKind(item.kind) ? KIND_ICONS[item.kind] : HiOutlineCreditCard;
                    const selected = String(item.id) === values.payment_method_id;
                    const unavailable = item.kind === "GATEWAY" && !item.provider_configured;
                    return (
                      <button
                        key={item.id}
                        type='button'
                        role='radio'
                        aria-checked={selected}
                        disabled={unavailable}
                        title={unavailable ? tm("providerMissing") : undefined}
                        onClick={() => chooseMethod(item)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/40",
                          unavailable && "cursor-not-allowed opacity-50",
                        )}>
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}>
                          <Icon className='h-5 w-5' aria-hidden='true' />
                        </span>
                        <span className='min-w-0'>
                          <span className='block truncate text-sm font-semibold text-foreground'>{item.name}</span>
                          <span className='block truncate text-xs text-muted-foreground'>
                            {isPaymentKind(item.kind) ? tm(`kinds.${item.kind}`) : item.kind}
                          </span>
                          <span className='mt-1 flex flex-wrap gap-1'>
                            {item.requires_reference ? <Badge variant='outline'>{tr("needsReference")}</Badge> : null}
                            {item.allows_change ? <Badge variant='outline'>{tr("givesChange")}</Badge> : null}
                            {unavailable ? <Badge variant='destructive'>{tm("form.notConfigured")}</Badge> : null}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {channelMethods.length === 0 ? (
                    <p className='col-span-full text-sm text-muted-foreground'>{tr("noMethodsChannel")}</p>
                  ) : null}
                </div>
                {err("payment_method_id") ? <p className='text-sm text-destructive'>{err("payment_method_id")}</p> : null}
              </div>

              {method ? (
                <div className='grid grid-cols-12 gap-4 rounded-xl border border-border p-4'>
                  {method.instructions ? (
                    <p className='col-span-12 flex gap-2 rounded-lg bg-muted/40 p-3 text-sm'>
                      <HiOutlineInformationCircle className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                      <span className='whitespace-pre-line'>{method.instructions}</span>
                    </p>
                  ) : null}

                  <div className='col-span-12 sm:col-span-6'>
                    <FormField
                      controller={{ control, name: "amount" }}
                      type='number'
                      min={0}
                      step='1'
                      prefix='$'
                      label={t("fields.amount")}
                      placeholder={gateway ? String(collectable) : undefined}
                      description={gateway ? tr("amountGatewayHint") : undefined}
                    />
                    <div className='mt-1.5 flex flex-wrap gap-1.5'>
                      <button
                        type='button'
                        onClick={() => setValue("amount", collectable, { shouldValidate: true })}
                        className='rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-muted'>
                        {tr("fullBalance")}
                      </button>
                      {collectable > 1 ? (
                        <button
                          type='button'
                          onClick={() => setValue("amount", Math.round(collectable / 2), { shouldValidate: true })}
                          className='rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-muted'>
                          {tr("half")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {method.allows_change ? (
                    <div className='col-span-12 sm:col-span-6'>
                      <FormField
                        controller={{ control, name: "tendered_amount" }}
                        type='number'
                        min={0}
                        step='1'
                        prefix='$'
                        label={t("fields.tenderedAmount")}
                        description={tr("tenderedHint")}
                      />
                      <div className='mt-1.5 flex flex-wrap gap-1.5'>
                        {cashSuggestions(amount).map((value) => (
                          <button
                            key={value}
                            type='button'
                            onClick={() => setValue("tendered_amount", value, { shouldValidate: true })}
                            className='rounded-full border border-border px-2.5 py-0.5 text-xs tabular-nums hover:bg-muted'>
                            {value === amount ? tr("exact") : formatMoney(value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : gateway ? (
                    <FormField
                      controller={{ control, name: "payer_email" }}
                      type='email'
                      label={t("fields.payerEmail")}
                      description={tr("payerEmailHint")}
                      className='col-span-12 sm:col-span-6'
                    />
                  ) : (
                    <FormField
                      controller={{ control, name: "reference" }}
                      label={t("fields.reference")}
                      required={Boolean(method.requires_reference)}
                      description={tr("referenceHint")}
                      className='col-span-12 sm:col-span-6'
                    />
                  )}

                  {method.allows_change ? (
                    <FormField
                      controller={{ control, name: "reference" }}
                      label={t("fields.reference")}
                      required={Boolean(method.requires_reference)}
                      className='col-span-12 sm:col-span-6'
                    />
                  ) : null}

                  {change != null && change > 0 ? (
                    <div className='col-span-12 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3'>
                      <span className='text-sm font-medium'>{tr("change")}</span>
                      <span className='text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400'>{formatMoney(change)}</span>
                    </div>
                  ) : null}

                  {settles ? (
                    <div className='col-span-12'>
                      <ToggleRow
                        id='payment-pending'
                        label={tr("pending")}
                        description={tr("pendingHint")}
                        checked={Boolean(values.pending)}
                        onChange={(checked) => setValue("pending", checked)}
                      />
                    </div>
                  ) : (
                    <p className='col-span-12 flex gap-2 text-sm text-muted-foreground'>
                      <HiOutlineInformationCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
                      {gateway ? tr("gatewayPending") : tr("codPending")}
                    </p>
                  )}

                  {!gateway ? (
                    <FormTextAreaField
                      controller={{ control, name: "notes" }}
                      label={t("fields.notes")}
                      rows={2}
                      className='col-span-12'
                    />
                  ) : null}

                  <dl className='col-span-12 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-3 text-sm'>
                    <div>
                      <dt className='text-xs text-muted-foreground'>{t("fields.amount")}</dt>
                      <dd className='font-semibold tabular-nums'>{formatMoney(amount)}</dd>
                    </div>
                    <div>
                      <dt className='text-xs text-muted-foreground'>{t("fields.fee")}</dt>
                      <dd className='tabular-nums'>{formatMoney(fee)}</dd>
                    </div>
                    <div>
                      <dt className='text-xs text-muted-foreground'>{tr("remaining")}</dt>
                      <dd className='tabular-nums'>{formatMoney(Math.max(collectable - amount, 0))}</dd>
                    </div>
                  </dl>
                  {outOfLimits ? (
                    <p className='col-span-12 text-sm text-amber-700 dark:text-amber-400'>
                      {tr("outOfLimits", {
                        min: method.min_amount != null ? formatMoney(method.min_amount) : "—",
                        max: method.max_amount != null ? formatMoney(method.max_amount) : "—",
                      })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}

          <div className='flex justify-end gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={close}>
              {tCommon("cancel")}
            </Buttons>
            <Buttons type='submit' loading={isSubmitting} disabled={!method} className='rounded-full'>
              {gateway ? tr("generateLink") : tr("submit")}
            </Buttons>
          </div>
        </form>
      )}
    </Modal>
  );
};

