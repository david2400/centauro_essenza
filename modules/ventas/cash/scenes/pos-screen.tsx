/** @format */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineCheckCircle,
  HiOutlineComputerDesktop,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineLockOpen,
  HiOutlinePrinter,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlinePlusCircle,
  HiOutlineShoppingCart,
  HiOutlineTrash,
} from "react-icons/hi2";
import { AsyncCombobox, type ComboOption } from "@/components/async-combobox";
import { notify } from "@/components/notifications";
import { PageHeader } from "@/components/page-header";
import { formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { cn } from "@/lib/utils";
import { lookup_skus_action } from "@/server/domains/lookups/actions";
import { KIND_ICONS } from "@/modules/ventas/paymentMethod/scenes/formPaymentMethod";
import { isPaymentKind, type IPaymentMethod } from "@/modules/ventas/paymentMethod/models/paymentMethod.interface";
import { TicketPreview, TicketPrintStyles } from "../components/ticket-preview";
import {
  CASH_KINDS,
  SESSION_STORAGE_KEY,
  readLocal,
  writeLocal,
  type ICashRegister,
  type IPosResult,
  type ISku,
} from "../models/cash.interface";
import { posCheckoutServerAction } from "@/app/[locale]/ventas/cash-registers/actions";
import { getOrderInvoicesServerAction, issueInvoiceServerAction } from "@/app/[locale]/facturacion/invoices/actions";
import dynamic from "next/dynamic";
import { useMountedOnce } from "@/lib/use-mounted-once";

// Se descargan al abrirse (no viajan con la página).
const OpenSessionDialog = dynamic(() => import("../components/open-session-dialog").then((m) => m.OpenSessionDialog));

interface CartLine {
  sku: ISku;
  quantity: number;
  discount: number;
}

interface PaymentLine {
  key: number;
  methodId: string;
  amount: string;
  tendered: string;
  reference: string;
}

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const round = (value: number) => Math.round(value * 100) / 100;

interface PosScreenProps {
  registers: ICashRegister[];
  methods: IPaymentMethod[];
  initialSessionId: number | null;
  billingReady: boolean;
}

/**
 * Punto de venta: turno abierto, búsqueda de productos por nombre/código, carrito con
 * cantidades y descuentos (IVA incluido), cobro con uno o varios medios (efectivo con
 * cambio) y, al terminar, factura electrónica opcional (consumidor final o con datos).
 */
export const PosScreen = ({ registers, methods, initialSessionId, billingReady }: PosScreenProps) => {
  const t = useTranslations("Administre.cash.pos");
  const tm = useTranslations("Administre.paymentMethod");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();

  const openRegisters = registers.filter((r) => r.open_session_id != null);
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [opening, setOpening] = useState<ICashRegister | null>(null);
  const openMounted = useMountedOnce(opening != null);

  useEffect(() => {
    // Recuerda el turno elegido en este navegador si sigue abierto.
    if (sessionId != null && openRegisters.some((r) => r.open_session_id === sessionId)) return;
    const remembered = Number(readLocal(SESSION_STORAGE_KEY));
    const fallback = openRegisters.find((r) => r.open_session_id === remembered) ?? (openRegisters.length === 1 ? openRegisters[0] : null);
    setSessionId(fallback?.open_session_id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registers]);

  const register = openRegisters.find((r) => r.open_session_id === sessionId) ?? null;
  const chooseSession = (id: number) => {
    setSessionId(id);
    writeLocal(SESSION_STORAGE_KEY, String(id));
  };

  // ─── Carrito ───────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartLine[]>([]);
  const [reference, setReference] = useState("");
  const search = useMemo(
    () => async (q: string): Promise<ComboOption<ISku>[]> => {
      const result = await lookup_skus_action({
        q,
        sellable_only: true,
        limit: 20,
        warehouse_id: register?.effective_warehouse_id ?? undefined,
      });
      if (!result.success) throw new Error(result.error);
      return result.data.map((sku) => ({
        value: String(sku.sku_id),
        label: sku.name ?? sku.code ?? `#${sku.sku_id}`,
        hint: [sku.code, formatMoney(sku.unit_price), t("available", { count: sku.available ?? 0 })].filter(Boolean).join(" · "),
        disabled: (sku.available ?? 0) <= 0,
        data: sku,
      }));
    },
    [t, register?.effective_warehouse_id],
  );
  const maxDiscountPercent = register?.max_discount_percent ?? null;
  const maxDiscountFor = (subtotal: number) =>
    maxDiscountPercent == null ? subtotal : Math.floor(subtotal * maxDiscountPercent) / 100;
  const addSku = (sku?: ISku) => {
    if (!sku?.sku_id) return;
    setCart((current) => {
      const existing = current.find((line) => line.sku.sku_id === sku.sku_id);
      if (existing) return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
      return [...current, { sku, quantity: 1, discount: 0 }];
    });
  };
  const updateLine = (skuId: number | undefined, patch: Partial<CartLine>) =>
    setCart((current) => current.map((line) => (line.sku.sku_id === skuId ? { ...line, ...patch } : line)));
  const removeLine = (skuId: number | undefined) => setCart((current) => current.filter((line) => line.sku.sku_id !== skuId));

  const totals = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let tax = 0;
    for (const line of cart) {
      const subtotal = (line.sku.unit_price ?? 0) * line.quantity;
      const lineTotal = Math.max(0, subtotal - line.discount);
      gross += subtotal;
      discount += Math.min(line.discount, subtotal);
      const rate = line.sku.tax_kind === "EXCLUDED" ? 0 : Number(line.sku.tax_rate ?? 0);
      tax += rate > 0 ? lineTotal - lineTotal / (1 + rate / 100) : 0;
    }
    const total = round(gross - discount);
    return { gross: round(gross), discount: round(discount), tax: round(tax), total, base: round(total - tax) };
  }, [cart]);

  // ─── Pagos ─────────────────────────────────────────────────────────────────────
  const allowedIds = register?.allowed_method_ids ?? [];
  const counterMethods = methods.filter(
    (m) => m.active !== false && m.kind !== "GATEWAY" && (allowedIds.length === 0 || (m.id != null && allowedIds.includes(m.id))),
  );
  const defaultMethod = counterMethods.find((m) => m.kind === "CASH") ?? counterMethods[0];
  const newPayment = (key: number, amount = ""): PaymentLine => ({
    key,
    methodId: defaultMethod?.id != null ? String(defaultMethod.id) : "",
    amount,
    tendered: "",
    reference: "",
  });
  const [payments, setPayments] = useState<PaymentLine[]>(() => [newPayment(1)]);
  const paid = round(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const remaining = round(totals.total - paid);
  const methodOf = (p: PaymentLine) => counterMethods.find((m) => String(m.id) === p.methodId);
  const change = round(
    payments.reduce((sum, p) => {
      const method = methodOf(p);
      const tendered = Number(p.tendered) || 0;
      const amount = Number(p.amount) || 0;
      return method?.allows_change && tendered > amount ? sum + (tendered - amount) : sum;
    }, 0),
  );
  // Con un solo medio, el monto sigue al total del carrito.
  useEffect(() => {
    setPayments((current) => (current.length === 1 && current[0] ? [{ ...current[0], amount: totals.total ? String(totals.total) : "" }] : current));
  }, [totals.total]);
  const autoInvoice = Boolean(register?.auto_invoice) && billingReady;
  const [saleBuyer, setSaleBuyer] = useState({ enabled: false, doc_type: "CC", doc_number: "", name: "", email: "" });
  const buyerIncomplete = saleBuyer.enabled && (!saleBuyer.doc_number.trim() || !saleBuyer.name.trim());
  const missingReference = payments.some((p) => methodOf(p)?.requires_reference && !p.reference.trim());
  const canCharge =
    register != null && cart.length > 0 && totals.total > 0 && remaining === 0 && !missingReference && !(autoInvoice && buyerIncomplete);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IPosResult | null>(null);
  const charge = async () => {
    if (!canCharge || sessionId == null) return;
    setBusy(true);
    const response = await posCheckoutServerAction({
      cash_session_id: sessionId,
      reference: reference.trim() || undefined,
      items: cart.map((line) => ({ sku_id: line.sku.sku_id, quantity: line.quantity, discount: line.discount || undefined })),
      payments: payments.map((p) => ({
        payment_method_id: Number(p.methodId),
        amount: Number(p.amount),
        tendered_amount: methodOf(p)?.allows_change && p.tendered ? Number(p.tendered) : undefined,
        reference: p.reference.trim() || undefined,
      })),
      buyer:
        autoInvoice && saleBuyer.enabled
          ? {
              doc_type: saleBuyer.doc_type,
              doc_number: saleBuyer.doc_number.trim(),
              name: saleBuyer.name.trim(),
              email: saleBuyer.email.trim() || undefined,
            }
          : undefined,
    });
    setBusy(false);
    if (!response.success) {
      notify.error(tCommon("errorTitle"), response.error);
      return;
    }
    setResult(response.data);
    if (response.data.auto_invoice && response.data.order_id) {
      // La caja factura sola tras la venta: se consulta el documento emitido.
      const docs = await getOrderInvoicesServerAction(response.data.order_id);
      const issued = docs.success ? docs.data.find((doc) => doc.kind === "INVOICE") : undefined;
      if (issued) setInvoice({ id: issued.id, number: issued.full_number, status: issued.status });
    }
    router.refresh();
  };
  const reset = () => {
    setCart([]);
    setReference("");
    setPayments([newPayment(Date.now())]);
    setResult(null);
    setInvoice(null);
    setBuyerMode(null);
    setSaleBuyer({ enabled: false, doc_type: "CC", doc_number: "", name: "", email: "" });
  };

  // ─── Factura tras la venta ────────────────────────────────────────────────────
  const [buyerMode, setBuyerMode] = useState<"data" | null>(null);
  const [buyer, setBuyer] = useState({ doc_type: "CC", doc_number: "", name: "", email: "" });
  const [invoice, setInvoice] = useState<{ id?: number; number?: string; status?: string } | null>(null);
  const [invoicing, setInvoicing] = useState(false);
  const issue = async (withData: boolean) => {
    if (!result?.order_id) return;
    setInvoicing(true);
    const response = await issueInvoiceServerAction({
      order_id: result.order_id,
      buyer: withData
        ? { doc_type: buyer.doc_type, doc_number: buyer.doc_number, name: buyer.name, email: buyer.email || undefined }
        : undefined,
    });
    setInvoicing(false);
    if (!response.success) {
      notify.error(tCommon("errorTitle"), response.error);
      return;
    }
    setInvoice({ id: response.data.id, number: response.data.full_number, status: response.data.status });
    if (response.data.status === "ISSUED") notify.success(t("invoiceIssued", { number: response.data.full_number ?? "" }));
    else notify.warning(t("invoicePending", { number: response.data.full_number ?? "" }), response.data.status_detail ?? undefined);
  };

  // ─── Sin turno abierto ────────────────────────────────────────────────────────
  if (register == null) {
    return (
      <section className='flex w-full flex-col gap-6'>
        <PageHeader title={t("title")} description={t("description")} icon={HiOutlineShoppingCart} eyebrow={tCrud("domains.sales")} />
        <div className='grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm'>
          <div>
            <h3 className='text-base font-semibold'>{openRegisters.length > 0 ? t("chooseSession") : t("noSession")}</h3>
            <p className='text-sm text-muted-foreground'>{openRegisters.length > 0 ? t("chooseSessionHint") : t("noSessionHint")}</p>
          </div>
          <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {registers
              .filter((r) => r.active !== false)
              .map((r) => (
                <li key={r.id} className='flex flex-col gap-3 rounded-xl border border-border p-4'>
                  <div className='flex items-center gap-3'>
                    <HiOutlineComputerDesktop className='h-6 w-6 text-muted-foreground' aria-hidden='true' />
                    <div>
                      <p className='font-semibold'>{r.name}</p>
                      {r.store_name ? <p className='text-xs text-muted-foreground'>{r.store_name}</p> : null}
                      <p className='text-xs text-muted-foreground'>
                        {r.open_session_id ? t("openBy", { name: r.opened_by ?? "" }) : t("closedRegister")}
                      </p>
                    </div>
                  </div>
                  {r.open_session_id ? (
                    <Buttons type='button' className='rounded-full' onClick={() => chooseSession(r.open_session_id!)}>
                      {t("useSession")}
                    </Buttons>
                  ) : (
                    <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setOpening(r)}>
                      <HiOutlineLockOpen className='h-4 w-4' aria-hidden='true' />
                      {t("openRegister")}
                    </Buttons>
                  )}
                </li>
              ))}
          </ul>
          <Link href='/ventas/cash-registers' className='text-sm font-medium text-primary underline-offset-4 hover:underline'>
            {t("manageRegisters")}
          </Link>
        </div>
        {openMounted ? (
          <OpenSessionDialog register={opening} onClose={() => setOpening(null)} onOpened={(s) => s.id != null && chooseSession(s.id)} />
        ) : null}
      </section>
    );
  }

  // ─── Venta registrada ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <section className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
        <div className='grid justify-items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center'>
          <HiOutlineCheckCircle className='h-12 w-12 text-emerald-600' aria-hidden='true' />
          <h2 className='text-xl font-semibold'>{t("done")}</h2>
          <p className='text-sm text-muted-foreground'>
            {t("doneDetail", { order: result.order_id ?? "", total: formatMoney(result.total) })}
          </p>
          {(result.change_amount ?? 0) > 0 ? (
            <p className='rounded-xl bg-background px-6 py-3 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400'>
              {t("change", { amount: formatMoney(result.change_amount) })}
            </p>
          ) : null}
          <p className='text-xs text-muted-foreground'>
            {t("taxIncluded", { tax: formatMoney(result.tax_amount), base: formatMoney(result.net_amount) })}
          </p>
        </div>

        <section className='grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm'>
          <h3 className='flex items-center gap-2 text-base font-semibold'>
            <HiOutlineDocumentText className='h-5 w-5' aria-hidden='true' />
            {t("invoiceTitle")}
          </h3>
          {invoice ? (
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <p className='text-sm'>
                {t("invoiceResult", { number: invoice.number ?? "" })}{" "}
                <Badge variant={invoice.status === "ISSUED" ? "default" : "outline"}>{invoice.status}</Badge>
              </p>
              <Link
                href={`/facturacion/invoices/${invoice.id}`}
                className='inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                {t("viewInvoice")}
              </Link>
            </div>
          ) : !billingReady ? (
            <p className='text-sm text-muted-foreground'>
              {t("billingNotReady")}{" "}
              <Link href='/facturacion/settings' className='font-medium text-primary underline-offset-4 hover:underline'>
                {t("configureBilling")}
              </Link>
            </p>
          ) : buyerMode === "data" ? (
            <form
              className='grid gap-3 sm:grid-cols-2'
              onSubmit={(event) => {
                event.preventDefault();
                void issue(true);
              }}>
              <label className='grid gap-1 text-sm'>
                <span className='font-medium'>{t("docType")}</span>
                <select className={inputClass} value={buyer.doc_type} onChange={(e) => setBuyer({ ...buyer, doc_type: e.target.value })}>
                  {["CC", "NIT", "CE", "PP", "TI", "PEP", "NIT_EXT"].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className='grid gap-1 text-sm'>
                <span className='font-medium'>{t("docNumber")} *</span>
                <input className={inputClass} value={buyer.doc_number} onChange={(e) => setBuyer({ ...buyer, doc_number: e.target.value })} required />
              </label>
              <label className='grid gap-1 text-sm sm:col-span-2'>
                <span className='font-medium'>{t("buyerName")} *</span>
                <input className={inputClass} value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} required />
              </label>
              <label className='grid gap-1 text-sm sm:col-span-2'>
                <span className='font-medium'>{t("buyerEmail")}</span>
                <input className={inputClass} type='email' value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
              </label>
              <div className='flex justify-end gap-2 sm:col-span-2'>
                <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setBuyerMode(null)}>
                  {tCommon("cancel")}
                </Buttons>
                <Buttons type='submit' loading={invoicing} className='rounded-full'>
                  {t("issueInvoice")}
                </Buttons>
              </div>
            </form>
          ) : (
            <div className='flex flex-wrap gap-2'>
              <Buttons type='button' className='rounded-full' loading={invoicing} onClick={() => issue(false)}>
                {t("invoiceFinalConsumer")}
              </Buttons>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setBuyerMode("data")}>
                {t("invoiceWithData")}
              </Buttons>
            </div>
          )}
        </section>

        <div className='pos-receipt-print hidden print:block'>
          <TicketPreview
            width={register.receipt_width === "58MM" ? "58MM" : "80MM"}
            data={{
              storeName: register.ticket?.store_name,
              address: register.ticket?.address,
              city: register.ticket?.city,
              phone: register.ticket?.phone,
              header: register.ticket?.header,
              footer: register.ticket?.footer,
              registerName: register.name,
              cashier: register.opened_by,
              orderId: result.order_id,
              date: new Date().toLocaleString(),
              lines: cart.map((line) => ({
                name: line.sku.name ?? line.sku.code ?? "",
                quantity: line.quantity,
                discount: line.discount || undefined,
                total: Math.max(0, (line.sku.unit_price ?? 0) * line.quantity - line.discount),
              })),
              total: result.total ?? 0,
              tax: result.tax_amount,
              payments: (result.payments ?? []).map((payment) => ({
                name: methods.find((m) => m.id === payment.payment_method_id)?.name ?? "",
                amount: payment.amount ?? 0,
              })),
              change: result.change_amount,
              invoiceNumber: invoice?.number,
            }}
          />
        </div>
        <TicketPrintStyles width={register.receipt_width === "58MM" ? "58MM" : "80MM"} />

        <div className='flex flex-wrap justify-center gap-3'>
          <Buttons type='button' variant='outline' className='rounded-full' onClick={() => window.print()}>
            <HiOutlinePrinter className='h-4 w-4' aria-hidden='true' />
            {t("printTicket")}
          </Buttons>
          <Link
            href={`/ventas/orders/${result.order_id}`}
            className='inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium hover:bg-muted'>
            {t("viewOrder")}
          </Link>
          <Buttons type='button' className='rounded-full' onClick={reset}>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {t("newSale")}
          </Buttons>
        </div>
      </section>
    );
  }

  // ─── Venta en curso ───────────────────────────────────────────────────────────
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader
        title={t("title")}
        description={[register.store_name, t("sessionInfo", { register: register.name ?? "", name: register.opened_by ?? "" })]
          .filter(Boolean)
          .join(" · ")}
        icon={HiOutlineShoppingCart}
        eyebrow={tCrud("domains.sales")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            {openRegisters.length > 1 ? (
              <select
                aria-label={t("chooseSession")}
                className={cn(inputClass, "w-auto")}
                value={sessionId ?? ""}
                onChange={(e) => chooseSession(Number(e.target.value))}>
                {openRegisters.map((r) => (
                  <option key={r.id} value={r.open_session_id ?? ""}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Link
              href={`/ventas/cash-sessions/${sessionId}`}
              className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              {t("viewSession")}
            </Link>
          </div>
        }
      />

      {register.over_cash_limit ? (
        <div role='status' className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm'>
          <p className='flex items-center gap-2 text-amber-900 dark:text-amber-200'>
            <HiOutlineExclamationTriangle className='h-5 w-5 shrink-0' aria-hidden='true' />
            {t("overLimit", { limit: formatMoney(register.cash_limit) })}
          </p>
          <Link href={`/ventas/cash-sessions/${sessionId}`} className='font-medium text-primary underline-offset-4 hover:underline'>
            {t("withdraw")}
          </Link>
        </div>
      ) : null}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]'>
        <section className='grid content-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
          <AsyncCombobox<ISku>
            value={null}
            onChange={(_, option) => addSku(option?.data)}
            search={search}
            placeholder={t("searchPlaceholder")}
            searchPlaceholder={t("searchHint")}
            minChars={1}
            clearable={false}
          />
          {cart.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center'>
              <HiOutlineShoppingCart className='h-8 w-8 text-muted-foreground' aria-hidden='true' />
              <p className='text-sm font-medium'>{t("emptyCart")}</p>
              <p className='text-xs text-muted-foreground'>{t("emptyCartHint")}</p>
            </div>
          ) : (
            <ul className='grid gap-2'>
              {cart.map((line) => {
                const subtotal = (line.sku.unit_price ?? 0) * line.quantity;
                return (
                  <li key={line.sku.sku_id} className='grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto_7rem_7rem_auto] sm:items-center'>
                    <div className='min-w-0'>
                      <p className='truncate font-medium'>{line.sku.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        {line.sku.code} · {formatMoney(line.sku.unit_price)} ·{" "}
                        {line.sku.tax_kind === "EXCLUDED" ? t("excluded") : `${line.sku.tax_code ?? ""} ${Number(line.sku.tax_rate ?? 0)} %`}
                      </p>
                    </div>
                    <div className='flex items-center gap-1' role='group' aria-label={t("quantity")}>
                      <Buttons
                        type='button'
                        size='icon'
                        variant='outline'
                        aria-label={t("decrease")}
                        disabled={line.quantity <= 1}
                        onClick={() => updateLine(line.sku.sku_id, { quantity: line.quantity - 1 })}>
                        <HiOutlineMinus className='h-4 w-4' aria-hidden='true' />
                      </Buttons>
                      <input
                        className={cn(inputClass, "h-9 w-14 text-center")}
                        type='number'
                        inputMode='decimal'
                        min={1}
                        value={line.quantity}
                        aria-label={t("quantity")}
                        onChange={(e) => updateLine(line.sku.sku_id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      />
                      <Buttons
                        type='button'
                        size='icon'
                        variant='outline'
                        aria-label={t("increase")}
                        onClick={() => updateLine(line.sku.sku_id, { quantity: line.quantity + 1 })}>
                        <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
                      </Buttons>
                    </div>
                    <label className='grid gap-0.5 text-xs text-muted-foreground'>
                      {maxDiscountPercent != null ? t("discountMax", { percent: maxDiscountPercent }) : t("discount")}
                      <input
                        className={cn(inputClass, "h-9")}
                        type='number'
                        inputMode='decimal'
                        min={0}
                        max={maxDiscountFor(subtotal)}
                        value={line.discount || ""}
                        onChange={(e) =>
                          updateLine(line.sku.sku_id, { discount: Math.min(maxDiscountFor(subtotal), Math.max(0, Number(e.target.value) || 0)) })
                        }
                      />
                    </label>
                    <p className='text-right font-semibold tabular-nums'>{formatMoney(Math.max(0, subtotal - line.discount))}</p>
                    <Buttons type='button' size='icon' variant='ghost' aria-label={t("remove")} onClick={() => removeLine(line.sku.sku_id)}>
                      <HiOutlineTrash className='h-4 w-4 text-destructive' aria-hidden='true' />
                    </Buttons>
                  </li>
                );
              })}
            </ul>
          )}
          <label className='grid gap-1 text-sm'>
            <span className='font-medium'>{t("reference")}</span>
            <input className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} placeholder={t("referencePlaceholder")} />
          </label>
        </section>

        <aside className='grid content-start gap-4 xl:sticky xl:top-20'>
          <section className='grid gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>{t("subtotal")}</span>
              <span className='tabular-nums'>{formatMoney(totals.gross)}</span>
            </div>
            {totals.discount > 0 ? (
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>{t("discounts")}</span>
                <span className='tabular-nums'>−{formatMoney(totals.discount)}</span>
              </div>
            ) : null}
            <div className='flex items-end justify-between border-t border-border pt-2'>
              <span className='font-semibold'>{t("total")}</span>
              <span className='text-3xl font-bold tabular-nums'>{formatMoney(totals.total)}</span>
            </div>
            <p className='text-xs text-muted-foreground'>{t("taxIncluded", { tax: formatMoney(totals.tax), base: formatMoney(totals.base) })}</p>
          </section>

          <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <h3 className='flex items-center gap-2 text-sm font-semibold'>
                <HiOutlineCreditCard className='h-4 w-4' aria-hidden='true' />
                {t("payments")}
              </h3>
              <Buttons
                type='button'
                size='sm'
                variant='ghost'
                className='rounded-full'
                disabled={remaining <= 0}
                onClick={() => setPayments((current) => [...current, newPayment(Date.now(), remaining > 0 ? String(remaining) : "")])}>
                <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
                {t("splitPayment")}
              </Buttons>
            </div>
            {counterMethods.length === 0 ? <p className='text-sm text-muted-foreground'>{t("noMethods")}</p> : null}
            {payments.map((p, index) => {
              const method = methodOf(p);
              const Icon = isPaymentKind(method?.kind) ? KIND_ICONS[method.kind] : HiOutlineCreditCard;
              const tendered = Number(p.tendered) || 0;
              const amount = Number(p.amount) || 0;
              return (
                <div key={p.key} className='grid gap-2 rounded-xl border border-border p-3'>
                  <div className='flex flex-wrap gap-1.5' role='radiogroup' aria-label={t("method")}>
                    {counterMethods.map((m) => (
                      <button
                        key={m.id}
                        type='button'
                        role='radio'
                        aria-checked={String(m.id) === p.methodId}
                        onClick={() =>
                          setPayments((current) => current.map((x) => (x.key === p.key ? { ...x, methodId: String(m.id), tendered: "" } : x)))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          String(m.id) === p.methodId ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                        )}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <label className='grid gap-0.5 text-xs text-muted-foreground'>
                      <span className='flex items-center gap-1'>
                        <Icon className='h-3.5 w-3.5' aria-hidden='true' />
                        {t("amount")}
                      </span>
                      <input
                        className={cn(inputClass, "h-9")}
                        type='number'
                        inputMode='decimal'
                        min={0}
                        value={p.amount}
                        onChange={(e) => setPayments((current) => current.map((x) => (x.key === p.key ? { ...x, amount: e.target.value } : x)))}
                      />
                    </label>
                    {method?.allows_change ? (
                      <label className='grid gap-0.5 text-xs text-muted-foreground'>
                        {t("tendered")}
                        <input
                          className={cn(inputClass, "h-9")}
                          type='number'
                          inputMode='decimal'
                          min={0}
                          value={p.tendered}
                          onChange={(e) => setPayments((current) => current.map((x) => (x.key === p.key ? { ...x, tendered: e.target.value } : x)))}
                        />
                      </label>
                    ) : (
                      <label className='grid gap-0.5 text-xs text-muted-foreground'>
                        {t("paymentReference")}
                        {method?.requires_reference ? " *" : ""}
                        <input
                          className={cn(inputClass, "h-9")}
                          value={p.reference}
                          onChange={(e) => setPayments((current) => current.map((x) => (x.key === p.key ? { ...x, reference: e.target.value } : x)))}
                        />
                      </label>
                    )}
                  </div>
                  {method?.allows_change && amount > 0 ? (
                    <div className='flex flex-wrap gap-1.5'>
                      {[amount, Math.ceil(amount / 10000) * 10000, Math.ceil(amount / 50000) * 50000, Math.ceil(amount / 100000) * 100000]
                        .filter((value, i, all) => all.indexOf(value) === i)
                        .map((value) => (
                          <button
                            key={value}
                            type='button'
                            onClick={() => setPayments((current) => current.map((x) => (x.key === p.key ? { ...x, tendered: String(value) } : x)))}
                            className='rounded-full border border-border px-2.5 py-0.5 text-xs tabular-nums hover:bg-muted'>
                            {value === amount ? t("exact") : formatMoney(value)}
                          </button>
                        ))}
                    </div>
                  ) : null}
                  {method?.allows_change && tendered > amount ? (
                    <p className='text-sm font-semibold text-emerald-700 dark:text-emerald-400'>{t("changeShort", { amount: formatMoney(tendered - amount) })}</p>
                  ) : null}
                  {payments.length > 1 ? (
                    <button
                      type='button'
                      className='justify-self-end text-xs text-destructive underline-offset-4 hover:underline'
                      onClick={() => setPayments((current) => current.filter((x) => x.key !== p.key))}>
                      {t("removePayment", { index: index + 1 })}
                    </button>
                  ) : null}
                </div>
              );
            })}
            <div className='grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm'>
              <div>
                <p className='text-xs text-muted-foreground'>{t("paid")}</p>
                <p className='font-semibold tabular-nums'>{formatMoney(paid)}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>{remaining >= 0 ? t("remaining") : t("over")}</p>
                <p className={cn("font-semibold tabular-nums", remaining !== 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                  {formatMoney(Math.abs(remaining))}
                </p>
              </div>
            </div>
            {change > 0 ? <p className='text-center text-lg font-bold text-emerald-700 dark:text-emerald-400'>{t("change", { amount: formatMoney(change) })}</p> : null}
            {autoInvoice ? (
              <div className='grid gap-2 rounded-xl border border-border p-3'>
                <label className='flex items-center justify-between gap-3 text-sm'>
                  <span>
                    <span className='font-medium'>{t("buyerToggle")}</span>
                    <span className='block text-xs text-muted-foreground'>{t("autoInvoiceHint")}</span>
                  </span>
                  <input
                    type='checkbox'
                    className='h-4 w-4 accent-primary'
                    checked={saleBuyer.enabled}
                    onChange={(e) => setSaleBuyer({ ...saleBuyer, enabled: e.target.checked })}
                  />
                </label>
                {saleBuyer.enabled ? (
                  <div className='grid grid-cols-[6rem_minmax(0,1fr)] gap-2'>
                    <select
                      aria-label={t("docType")}
                      className={cn(inputClass, "h-9")}
                      value={saleBuyer.doc_type}
                      onChange={(e) => setSaleBuyer({ ...saleBuyer, doc_type: e.target.value })}>
                      {["CC", "NIT", "CE", "PP", "TI", "PEP", "NIT_EXT"].map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={t("docNumber")}
                      placeholder={t("docNumber")}
                      className={cn(inputClass, "h-9")}
                      value={saleBuyer.doc_number}
                      onChange={(e) => setSaleBuyer({ ...saleBuyer, doc_number: e.target.value })}
                    />
                    <input
                      aria-label={t("buyerName")}
                      placeholder={t("buyerName")}
                      className={cn(inputClass, "col-span-2 h-9")}
                      value={saleBuyer.name}
                      onChange={(e) => setSaleBuyer({ ...saleBuyer, name: e.target.value })}
                    />
                    <input
                      aria-label={t("buyerEmail")}
                      placeholder={t("buyerEmail")}
                      type='email'
                      className={cn(inputClass, "col-span-2 h-9")}
                      value={saleBuyer.email}
                      onChange={(e) => setSaleBuyer({ ...saleBuyer, email: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <Buttons type='button' className='h-12 rounded-full text-base' disabled={!canCharge} loading={busy} onClick={charge}>
              {t("charge", { amount: formatMoney(totals.total) })}
            </Buttons>
            {missingReference ? <p className='text-xs text-amber-700 dark:text-amber-400'>{t("referenceRequired")}</p> : null}
            {payments.some((p) => CASH_KINDS.includes(methodOf(p)?.kind ?? "") && methodOf(p)?.kind === "CASH_ON_DELIVERY") ? (
              <p className='text-xs text-muted-foreground'>{tm("kindHints.CASH_ON_DELIVERY")}</p>
            ) : null}
          </section>
        </aside>
      </div>
    </section>
  );
};
