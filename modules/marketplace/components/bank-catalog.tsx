/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { match_provider_banks_action, save_bank_action } from "@/server/domains/marketplace/payouts/actions";
import { BANK_KINDS, type BankKind, type IBank } from "../models/payout.interface";

const INPUT = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

/**
 * Catálogo de entidades para pagar a vendedores: bancos, bancos digitales, billeteras, cooperativas
 * y financieras. Se puede agregar cualquiera que falte, poner el código de banco que pida el archivo
 * de tu banco pagador y desactivar las que no se usen. COMISIONES.GESTIONAR (lo valida draco).
 */
export const BankCatalog = ({ banks: initial }: { banks: IBank[] }) => {
  const t = useTranslations("Administre.marketplace.payout.catalog");
  const tKind = useTranslations("Administre.marketplace.payout.bankKinds");
  const tCommon = useTranslations("Administre.common");
  const [banks, setBanks] = useState(initial);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [providerIds, setProviderIds] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<{ name: string; kind: BankKind; ach_code: string }>({ name: "", kind: "BANK", ach_code: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const replace = (bank: IBank) => setBanks((list) => list.some((b) => b.id === bank.id)
    ? list.map((b) => (b.id === bank.id ? bank : b)) : [...list, bank]);

  const update = async (bank: IBank, payload: { ach_code?: string; active?: boolean; wompi_bank_id?: string }) => {
    setBusy(`b${bank.id}`);
    const result = await save_bank_action(bank.id, payload);
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    replace(result.data);
    notify.success(tCommon("updatedSuccess"), result.data.name);
  };

  const add = async () => {
    setBusy("new");
    const result = await save_bank_action(null, { name: draft.name, kind: draft.kind, ach_code: draft.ach_code || null });
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    replace(result.data);
    setDraft({ name: "", kind: draft.kind, ach_code: "" });
    notify.success(tCommon("createdSuccess"), result.data.name);
  };

  /** Liga con Wompi Pagos a terceros por código o nombre las entidades sin id (lo consulta draco con sus llaves). */
  const match = async () => {
    setBusy("match");
    const result = await match_provider_banks_action();
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    const linked = new Map(result.data.provider_banks.filter((b) => b.linked_bank_id != null).map((b) => [b.linked_bank_id as number, b.id]));
    setBanks((list) => list.map((b) => (linked.has(b.id) ? { ...b, wompi_bank_id: linked.get(b.id) ?? null } : b)));
    setProviderIds({});
    notify.success(t("matched", { count: result.data.matched }),
      result.data.unmatched.length > 0 ? t("unmatched", { names: result.data.unmatched.slice(0, 8).join(", ") }) : "");
  };

  const query = filter.trim().toLowerCase();
  const visible = banks.filter((b) => !query || b.name.toLowerCase().includes(query) || (b.ach_code ?? "").includes(query));

  return (
    <SectionCard id='bank-catalog' icon={HiOutlineBuildingLibrary} title={t("title", { count: banks.filter((b) => b.active).length })}
      hint={t("hint")} contentClassName='p-0'>
      <div className='col-span-12 grid gap-3 border-b border-border p-4 text-sm'>
        <form className='flex flex-wrap items-end gap-2' onSubmit={(event) => { event.preventDefault(); void add(); }}>
          <label className='grid min-w-48 flex-1 gap-1'>
            <span className='font-medium'>{t("name")}</span>
            <input required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={INPUT} />
          </label>
          <label className='grid gap-1'>
            <span className='font-medium'>{t("kind")}</span>
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as BankKind })} className={INPUT}>
              {BANK_KINDS.map((kind) => <option key={kind} value={kind}>{tKind(kind)}</option>)}
            </select>
          </label>
          <label className='grid w-28 gap-1'>
            <span className='font-medium'>{t("code")}</span>
            <input maxLength={10} value={draft.ach_code} onChange={(e) => setDraft({ ...draft, ach_code: e.target.value })} className={INPUT} />
          </label>
          <Buttons type='submit' className='rounded-full' loading={busy === "new"}>{t("add")}</Buttons>
        </form>
        <div className='flex flex-wrap items-center gap-2'>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("search")} className={`${INPUT} max-w-xs`} />
          <Buttons type='button' variant='outline' className='rounded-full' loading={busy === "match"} onClick={() => void match()}>
            {t("matchProvider")}
          </Buttons>
        </div>
      </div>
      <div className='col-span-12 max-h-[480px] overflow-auto'>
        <table className='w-full text-sm'>
          <thead className='sticky top-0 bg-muted/90 text-left text-xs uppercase tracking-wide text-muted-foreground'>
            <tr>
              <th className='px-4 py-2'>{t("name")}</th>
              <th className='px-4 py-2'>{t("kind")}</th>
              <th className='px-4 py-2'>{t("code")}</th>
              <th className='px-4 py-2'>{t("providerId")}</th>
              <th className='px-4 py-2'>{t("status")}</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {visible.map((bank) => {
              const code = codes[bank.id] ?? bank.ach_code ?? "";
              const changed = code !== (bank.ach_code ?? "");
              const providerId = providerIds[bank.id] ?? bank.wompi_bank_id ?? "";
              const providerChanged = providerId !== (bank.wompi_bank_id ?? "");
              return (
                <tr key={bank.id} className={bank.active ? "" : "opacity-60"}>
                  <td className='px-4 py-2 font-medium'>{bank.name}</td>
                  <td className='px-4 py-2'>{tKind(bank.kind)}</td>
                  <td className='px-4 py-2'>
                    <div className='flex items-center gap-2'>
                      <input maxLength={10} value={code} aria-label={t("code")} className={`${INPUT} w-24`}
                        onChange={(e) => setCodes((c) => ({ ...c, [bank.id]: e.target.value }))} />
                      {changed ? (
                        <Buttons type='button' variant='outline' className='h-8 rounded-full px-3 text-xs' loading={busy === `b${bank.id}`}
                          onClick={() => void update(bank, { ach_code: code })}>{tCommon("save")}</Buttons>
                      ) : null}
                    </div>
                  </td>
                  <td className='px-4 py-2'>
                    <div className='flex items-center gap-2'>
                      <input maxLength={40} value={providerId} aria-label={t("providerId")} className={`${INPUT} w-44 font-mono text-xs`}
                        onChange={(e) => setProviderIds((c) => ({ ...c, [bank.id]: e.target.value }))} />
                      {providerChanged ? (
                        <Buttons type='button' variant='outline' className='h-8 rounded-full px-3 text-xs' loading={busy === `b${bank.id}`}
                          onClick={() => void update(bank, { wompi_bank_id: providerId })}>{tCommon("save")}</Buttons>
                      ) : null}
                    </div>
                  </td>
                  <td className='px-4 py-2'>
                    <div className='flex items-center gap-2'>
                      <Badge variant={bank.active ? "outline" : "secondary"}>{bank.active ? tCommon("active") : tCommon("inactive")}</Badge>
                      <Buttons type='button' variant='outline' className='h-8 rounded-full px-3 text-xs' loading={busy === `b${bank.id}`}
                        onClick={() => void update(bank, { active: !bank.active })}>{bank.active ? t("disable") : t("enable")}</Buttons>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
};
