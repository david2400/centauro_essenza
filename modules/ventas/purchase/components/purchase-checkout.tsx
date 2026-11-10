/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowTopRightOnSquare, HiOutlineClipboardDocument, HiOutlineCreditCard } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import type { IPaymentMethod } from "@/modules/ventas/paymentMethod/models/paymentMethod.interface";
import { start_purchase_checkout_action } from "@/server/domains/sales/purchases/actions";
import type { PurchaseCheckoutDto } from "@/server/domains/sales/purchases/types";

const INPUT = "h-10 rounded-lg border border-input bg-background px-3 text-sm";

/**
 * Cobro en línea de toda la compra: un solo link por el saldo de todos los subpedidos (también
 * los de vendedores externos, que cobra la tienda y les liquida). La aprobación paga todos.
 */
export const PurchaseCheckout = ({ purchaseId, methods, defaultEmail, pendingTotal }: { purchaseId: number;
  methods: IPaymentMethod[]; defaultEmail: string | null; pendingTotal: number }) => {
  const router = useRouter();
  const t = useTranslations("Administre.purchase.checkout");
  const tCommon = useTranslations("Administre.common");
  const gateways = methods.filter((m) => m.kind === "GATEWAY" && m.active !== false && m.id != null);
  const [methodId, setMethodId] = useState<string>(() => String(gateways.find((m) => m.provider_configured)?.id ?? ""));
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PurchaseCheckoutDto | null>(null);

  const start = async () => {
    if (!methodId) return;
    setBusy(true);
    const response = await start_purchase_checkout_action(purchaseId, { payment_method_id: Number(methodId),
      payer_email: email.trim() || null });
    setBusy(false);
    if (!response.success) {
      notify.error(tCommon("errorTitle"), response.error);
      return;
    }
    setResult(response.data);
    router.refresh();
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.checkout_url);
      notify.success(t("copied"));
    } catch {
      notify.info(result.checkout_url);
    }
  };

  return (
    <SectionCard id='purchase-checkout' icon={HiOutlineCreditCard} title={t("title")} hint={t("hint")} contentClassName='p-4'>
      <div className='col-span-12 grid gap-3 text-sm'>
        {result ? (
          <>
            <p className='font-semibold'>{t("ready", { amount: formatMoney(result.amount), count: result.payments.length })}</p>
            <code className='break-all rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs'>{result.checkout_url}</code>
            <p className='text-xs text-muted-foreground'>{t("reference")}: <span className='font-mono'>{result.reference}</span></p>
            <div className='flex flex-wrap gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => void copy()}>
                <HiOutlineClipboardDocument className='h-4 w-4' aria-hidden='true' />
                {t("copy")}
              </Buttons>
              <a href={result.checkout_url} target='_blank' rel='noopener noreferrer'
                className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
                <HiOutlineArrowTopRightOnSquare className='h-4 w-4' aria-hidden='true' />
                {t("open")}
              </a>
            </div>
          </>
        ) : gateways.length === 0 ? (
          <p className='text-muted-foreground'>{t("noGateway")}</p>
        ) : (
          <>
            <p className='text-muted-foreground'>{t("pending", { amount: formatMoney(pendingTotal) })}</p>
            <label className='grid gap-1.5'>
              <span className='font-medium'>{t("method")}</span>
              <select value={methodId} onChange={(event) => setMethodId(event.target.value)} className={INPUT}>
                <option value=''>{t("choose")}</option>
                {gateways.map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.provider_configured}>
                    {m.name}{m.provider_configured ? "" : ` · ${t("notConfigured")}`}
                  </option>
                ))}
              </select>
            </label>
            <label className='grid gap-1.5'>
              <span className='font-medium'>{t("email")}</span>
              <input type='email' value={email} onChange={(event) => setEmail(event.target.value)} className={INPUT} />
            </label>
            <Buttons type='button' className='rounded-full' loading={busy} disabled={!methodId} onClick={() => void start()}>
              {t("generate")}
            </Buttons>
          </>
        )}
      </div>
    </SectionCard>
  );
};
