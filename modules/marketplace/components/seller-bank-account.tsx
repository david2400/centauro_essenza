/** @format */

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatApiDate } from "@/lib/format";
import { save_bank_account_action } from "@/server/domains/marketplace/payouts/actions";
import {
  BANK_KINDS,
  BRE_B_KEY_TYPES,
  HOLDER_DOC_TYPES,
  type BankAccountType,
  type IBank,
  type IBankAccount,
} from "../models/payout.interface";

const INPUT = "h-10 rounded-lg border border-input bg-background px-3 text-sm";
const ANY_ENTITY = "";

interface FormState {
  bank_id: string;
  account_type: BankAccountType;
  key_type: string;
  account_number: string;
  holder_name: string;
  holder_doc_type: string;
  holder_doc_number: string;
}

/**
 * Cuenta a la que la tienda le transfiere al vendedor sus liquidaciones: cuenta de ahorros o
 * corriente en cualquier banco, banco digital o cooperativa del catálogo, billetera (celular) o una
 * llave Bre-B, que llega a cualquier entidad participante. Quien solo consulta ve el número
 * enmascarado; editarla exige COMISIONES.GESTIONAR (lo valida draco).
 */
export const SellerBankAccount = ({ sellerId, account: initial, banks, canManage }: { sellerId: number; account: IBankAccount | null;
  banks: IBank[]; canManage: boolean }) => {
  const t = useTranslations("Administre.marketplace.payout.bankAccount");
  const tAccount = useTranslations("Administre.marketplace.payout.accountTypes");
  const tKey = useTranslations("Administre.marketplace.payout.keyTypes");
  const tKind = useTranslations("Administre.marketplace.payout.bankKinds");
  const tCommon = useTranslations("Administre.common");
  const [account, setAccount] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const empty: FormState = { bank_id: "", account_type: "SAVINGS", key_type: "", account_number: "", holder_name: "", holder_doc_type: "NIT",
    holder_doc_number: "" };
  const [form, setForm] = useState<FormState>(empty);

  const bank = banks.find((b) => String(b.id) === form.bank_id) ?? null;
  const breB = form.account_type === "BRE_B_KEY";
  // Con una entidad elegida, solo sus tipos; sin entidad, solo la llave Bre-B.
  const types: BankAccountType[] = bank ? bank.account_types : ["BRE_B_KEY"];
  const grouped = useMemo(() => BANK_KINDS.map((kind) => ({ kind, items: banks.filter((b) => b.kind === kind) }))
    .filter((group) => group.items.length > 0), [banks]);

  const edit = () => {
    setForm(account && !account.masked ? {
      bank_id: account.bank_id == null ? ANY_ENTITY : String(account.bank_id), account_type: account.account_type,
      key_type: account.key_type ?? "", account_number: account.account_number, holder_name: account.holder_name,
      holder_doc_type: account.holder_doc_type, holder_doc_number: account.holder_doc_number,
    } : empty);
    setEditing(true);
  };

  const chooseBank = (value: string) => {
    const next = banks.find((b) => String(b.id) === value) ?? null;
    const allowed: BankAccountType[] = next ? next.account_types : ["BRE_B_KEY"];
    setForm({ ...form, bank_id: value, account_type: allowed.includes(form.account_type) ? form.account_type : allowed[0] ?? "BRE_B_KEY" });
  };

  const save = async () => {
    setBusy(true);
    const result = await save_bank_account_action(sellerId, {
      bank_id: form.bank_id ? Number(form.bank_id) : null, account_type: form.account_type, account_number: form.account_number,
      key_type: breB ? form.key_type || null : null, holder_name: form.holder_name, holder_doc_type: form.holder_doc_type,
      holder_doc_number: form.holder_doc_number,
    });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setAccount(result.data);
    setEditing(false);
    notify.success(tCommon("updatedSuccess"));
  };

  const numberLabel = breB ? t("key") : form.account_type === "DIGITAL_WALLET" ? t("phone") : t("number");

  return (
    <SectionCard id='seller-bank-account' icon={HiOutlineBuildingLibrary} title={t("title")} hint={t("hint")} contentClassName='p-4'
      actions={canManage && !editing ? (
        <Buttons type='button' variant='outline' className='rounded-full' onClick={edit}>{account ? t("edit") : t("add")}</Buttons>
      ) : undefined}>
      <div className='col-span-12 grid gap-3 text-sm'>
        {editing ? (
          <form className='grid gap-3' onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <label className='grid gap-1.5'>
              <span className='font-medium'>{t("bank")}</span>
              <select value={form.bank_id} onChange={(e) => chooseBank(e.target.value)} className={INPUT}>
                <option value={ANY_ENTITY}>{t("anyEntity")}</option>
                {grouped.map((group) => (
                  <optgroup key={group.kind} label={tKind(group.kind)}>
                    {group.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <span className='text-xs text-muted-foreground'>{t("missingBank")}</span>
            </label>
            <label className='grid gap-1.5'>
              <span className='font-medium'>{t("type")}</span>
              <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value as BankAccountType })} className={INPUT}>
                {types.map((type) => <option key={type} value={type}>{tAccount(type)}</option>)}
              </select>
            </label>
            {breB ? (
              <label className='grid gap-1.5'>
                <span className='font-medium'>{t("keyType")}</span>
                <select required value={form.key_type} onChange={(e) => setForm({ ...form, key_type: e.target.value })} className={INPUT}>
                  <option value=''>{t("chooseKey")}</option>
                  {BRE_B_KEY_TYPES.map((type) => <option key={type} value={type}>{tKey(type)}</option>)}
                </select>
                <span className='text-xs text-muted-foreground'>{t("breBHint")}</span>
              </label>
            ) : null}
            <label className='grid gap-1.5'>
              <span className='font-medium'>{numberLabel}</span>
              <input required value={form.account_number} maxLength={120}
                inputMode={breB && form.key_type !== "PHONE" ? "text" : "numeric"}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })} className={INPUT} />
            </label>
            <label className='grid gap-1.5'>
              <span className='font-medium'>{t("holder")}</span>
              <input required value={form.holder_name} maxLength={160} onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
                className={INPUT} />
            </label>
            <div className='grid grid-cols-[110px_1fr] gap-2'>
              <label className='grid gap-1.5'>
                <span className='font-medium'>{t("docType")}</span>
                <select value={form.holder_doc_type} onChange={(e) => setForm({ ...form, holder_doc_type: e.target.value })} className={INPUT}>
                  {HOLDER_DOC_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className='grid gap-1.5'>
                <span className='font-medium'>{t("doc")}</span>
                <input required value={form.holder_doc_number} maxLength={30}
                  onChange={(e) => setForm({ ...form, holder_doc_number: e.target.value })} className={INPUT} />
              </label>
            </div>
            <div className='flex justify-end gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setEditing(false)}>{tCommon("cancel")}</Buttons>
              <Buttons type='submit' className='rounded-full' loading={busy}>{tCommon("save")}</Buttons>
            </div>
          </form>
        ) : account ? (
          <dl className='grid gap-2'>
            {[
              [t("bank"), account.bank_name],
              [t("type"), tAccount(account.account_type) + (account.key_type ? ` · ${tKey(account.key_type as never)}` : "")],
              [account.account_type === "BRE_B_KEY" ? t("key") : account.account_type === "DIGITAL_WALLET" ? t("phone") : t("number"),
                account.account_number],
              [t("holder"), `${account.holder_name} · ${account.holder_doc_type} ${account.holder_doc_number}`],
            ].map(([label, value]) => (
              <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                <dt className='text-muted-foreground'>{label}</dt>
                <dd className='break-all text-right font-medium'>{value}</dd>
              </div>
            ))}
            {account.updated_at ? (
              <p className='text-xs text-muted-foreground'>{t("updated", { name: account.updated_by_name ?? "", date: formatApiDate(account.updated_at) })}</p>
            ) : null}
          </dl>
        ) : (
          <p className='text-muted-foreground'>{t("empty")}</p>
        )}
      </div>
    </SectionCard>
  );
};
