/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineDocumentText, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { preview_payout_format_action, save_payout_format_action } from "@/server/domains/marketplace/payouts/actions";
import {
  PAYOUT_FILE_FIELDS,
  PAYOUT_SUMMARY_FIELDS,
  type IPayoutColumn,
  type IPayoutFormat,
  type IPayoutLayout,
  type PayoutFileField,
} from "../models/payout.interface";

const INPUT = "h-9 rounded-lg border border-input bg-background px-2 text-sm";
type Section = "header" | "detail" | "footer";

interface Draft {
  id: number | null;
  name: string;
  extension: string;
  encoding: string;
  active: boolean;
  layout: IPayoutLayout;
  codes: { account: string; key: string; doc: string };
}

const toText = (codes?: Record<string, string> | null) => Object.entries(codes ?? {}).map(([k, v]) => `${k}=${v}`).join("\n");
const fromText = (text: string) => Object.fromEntries(text.split(/\r?\n/).map((line) => line.split("=")).filter((p) => p.length >= 2 && p[0].trim())
  .map(([k, ...v]) => [k.trim().toUpperCase(), v.join("=").trim()]).filter(([, v]) => v));

const blank = (): Draft => ({
  id: null, name: "", extension: "txt", encoding: "UTF-8", active: true,
  layout: { type: "DELIMITED", delimiter: ";", title_row: false, line_ending: "CRLF", amount_decimals: 2, amount_separator: ".",
    date_pattern: "yyyyMMdd", ascii_only: true, header: [], detail: [{ field: "ACCOUNT_NUMBER" }, { field: "AMOUNT" }], footer: [] },
  codes: { account: "SAVINGS=\nCHECKING=\nDIGITAL_WALLET=\nBRE_B_KEY=", key: "", doc: "" },
});

const fromFormat = (f: IPayoutFormat): Draft => ({
  id: f.built_in ? null : f.id, name: f.built_in ? "" : f.name, extension: f.extension, encoding: f.encoding, active: f.active,
  layout: { ...f.layout, header: f.layout.header ?? [], footer: f.layout.footer ?? [] },
  codes: { account: toText(f.layout.account_type_codes), key: toText(f.layout.key_type_codes), doc: toText(f.layout.doc_type_codes) },
});

/**
 * Formatos del archivo de pagos para el banco pagador de la tienda (cualquier banco): delimitado o de
 * ancho fijo, registros de encabezado / detalle / control, columnas con datos del pago o constantes y
 * tablas de códigos del banco. Se arma con el instructivo del banco y se revisa con la vista previa.
 */
export const PayoutFormatEditor = ({ formats: initial }: { formats: IPayoutFormat[] }) => {
  const t = useTranslations("Administre.marketplace.payout.formats");
  const tField = useTranslations("Administre.marketplace.payout.formats.fields");
  const tCommon = useTranslations("Administre.common");
  const [formats, setFormats] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fixed = draft?.layout.type === "FIXED";
  const setLayout = (patch: Partial<IPayoutLayout>) => draft && setDraft({ ...draft, layout: { ...draft.layout, ...patch } });
  const columns = (section: Section) => (draft?.layout[section] ?? []) as IPayoutColumn[];
  const setColumns = (section: Section, next: IPayoutColumn[]) => setLayout({ [section]: next } as Partial<IPayoutLayout>);
  const updateColumn = (section: Section, index: number, patch: Partial<IPayoutColumn>) =>
    setColumns(section, columns(section).map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const move = (section: Section, index: number, delta: number) => {
    const list = [...columns(section)];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setColumns(section, list);
  };

  const payloadLayout = (): IPayoutLayout | null => draft && ({
    ...draft.layout,
    account_type_codes: fromText(draft.codes.account), key_type_codes: fromText(draft.codes.key), doc_type_codes: fromText(draft.codes.doc),
  });

  const runPreview = async () => {
    const layout = payloadLayout();
    if (!layout) return;
    const result = await preview_payout_format_action(layout);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setPreview(result.data);
  };

  const save = async () => {
    const layout = payloadLayout();
    if (!draft || !layout) return;
    setBusy(true);
    const result = await save_payout_format_action(draft.id, { name: draft.name, extension: draft.extension, encoding: draft.encoding,
      active: draft.active, layout });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setFormats((list) => list.some((f) => f.id === result.data.id) ? list.map((f) => (f.id === result.data.id ? result.data : f)) : [...list, result.data]);
    setDraft(fromFormat(result.data));
    notify.success(draft.id == null ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.name);
  };

  const sectionEditor = (section: Section) => {
    const allowed = section === "detail" ? PAYOUT_FILE_FIELDS : PAYOUT_SUMMARY_FIELDS;
    return (
      <div className='grid gap-2'>
        <div className='flex items-center justify-between'>
          <p className='font-semibold'>{t(`sections.${section}`)}</p>
          <Buttons type='button' variant='outline' className='h-8 rounded-full px-3 text-xs'
            onClick={() => setColumns(section, [...columns(section), { field: section === "detail" ? "AMOUNT" : "CONSTANT", width: fixed ? 10 : 0 }])}>
            <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />{t("addColumn")}
          </Buttons>
        </div>
        {columns(section).length === 0 ? <p className='text-xs text-muted-foreground'>{t("noColumns")}</p> : null}
        {columns(section).map((c, i) => (
          <div key={i} className='flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 p-2'>
            <span className='w-6 text-xs tabular-nums text-muted-foreground'>{i + 1}</span>
            <select value={c.field} aria-label={t("field")} onChange={(e) => updateColumn(section, i, { field: e.target.value as PayoutFileField })} className={INPUT}>
              {allowed.map((f) => <option key={f} value={f}>{tField(f)}</option>)}
            </select>
            {c.field === "CONSTANT" ? (
              <input value={c.value ?? ""} placeholder={t("constant")} maxLength={200} className={`${INPUT} w-32`}
                onChange={(e) => updateColumn(section, i, { value: e.target.value })} />
            ) : null}
            {section === "detail" && !fixed ? (
              <input value={c.title ?? ""} placeholder={t("columnTitle")} maxLength={60} className={`${INPUT} w-32`}
                onChange={(e) => updateColumn(section, i, { title: e.target.value })} />
            ) : null}
            <input type='number' min={0} max={200} value={c.width ?? 0} aria-label={t("width")} title={t("width")} className={`${INPUT} w-20`}
              onChange={(e) => updateColumn(section, i, { width: Number(e.target.value) })} />
            {fixed ? (
              <>
                <select value={c.align ?? "LEFT"} aria-label={t("align")} onChange={(e) => updateColumn(section, i, { align: e.target.value as "LEFT" | "RIGHT" })} className={INPUT}>
                  <option value='LEFT'>{t("left")}</option>
                  <option value='RIGHT'>{t("right")}</option>
                </select>
                <select value={c.pad ?? " "} aria-label={t("pad")} onChange={(e) => updateColumn(section, i, { pad: e.target.value as " " | "0" })} className={INPUT}>
                  <option value=' '>{t("padSpace")}</option>
                  <option value='0'>{t("padZero")}</option>
                </select>
              </>
            ) : null}
            <div className='ml-auto flex gap-1'>
              <button type='button' aria-label={t("up")} onClick={() => move(section, i, -1)} className='rounded p-1 hover:bg-muted'><HiOutlineArrowUp className='h-4 w-4' /></button>
              <button type='button' aria-label={t("down")} onClick={() => move(section, i, 1)} className='rounded p-1 hover:bg-muted'><HiOutlineArrowDown className='h-4 w-4' /></button>
              <button type='button' aria-label={t("remove")} onClick={() => setColumns(section, columns(section).filter((_, j) => j !== i))}
                className='rounded p-1 text-destructive hover:bg-muted'><HiOutlineTrash className='h-4 w-4' /></button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <SectionCard id='payout-formats' icon={HiOutlineDocumentText} title={t("title")} hint={t("hint")} contentClassName='p-4'
      actions={!draft ? <Buttons type='button' variant='outline' className='rounded-full' onClick={() => { setDraft(blank()); setPreview(null); }}>{t("new")}</Buttons> : undefined}>
      <div className='col-span-12 grid gap-4 text-sm'>
        <div className='flex flex-wrap gap-2'>
          {formats.map((f) => (
            <button key={f.id} type='button' onClick={() => { setDraft(fromFormat(f)); setPreview(null); }}
              className={`rounded-full border px-3 py-1 text-xs ${f.active ? "border-border" : "border-dashed opacity-60"} hover:bg-muted`}>
              {f.name}{f.built_in ? ` · ${t("builtIn")}` : ""}
            </button>
          ))}
        </div>

        {draft ? (
          <form className='grid gap-4' onSubmit={(event) => { event.preventDefault(); void save(); }}>
            {draft.id == null && formats.some((f) => f.built_in) ? <p className='text-xs text-muted-foreground'>{t("copyHint")}</p> : null}
            <div className='grid gap-3 md:grid-cols-4'>
              <label className='grid gap-1 md:col-span-2'>
                <span className='font-medium'>{t("name")}</span>
                <input required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={INPUT} />
              </label>
              <label className='grid gap-1'>
                <span className='font-medium'>{t("extension")}</span>
                <select value={draft.extension} onChange={(e) => setDraft({ ...draft, extension: e.target.value })} className={INPUT}>
                  {["txt", "csv", "prn", "dat"].map((x) => <option key={x} value={x}>.{x}</option>)}
                </select>
              </label>
              <label className='grid gap-1'>
                <span className='font-medium'>{t("encoding")}</span>
                <select value={draft.encoding} onChange={(e) => setDraft({ ...draft, encoding: e.target.value })} className={INPUT}>
                  {["UTF-8", "ISO-8859-1", "windows-1252"].map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              <label className='grid gap-1'>
                <span className='font-medium'>{t("type")}</span>
                <select value={draft.layout.type} onChange={(e) => setLayout({ type: e.target.value as "DELIMITED" | "FIXED" })} className={INPUT}>
                  <option value='DELIMITED'>{t("delimited")}</option>
                  <option value='FIXED'>{t("fixed")}</option>
                </select>
              </label>
              {!fixed ? (
                <label className='grid gap-1'>
                  <span className='font-medium'>{t("delimiter")}</span>
                  <select value={draft.layout.delimiter ?? ";"} onChange={(e) => setLayout({ delimiter: e.target.value })} className={INPUT}>
                    <option value=','>, ({t("comma")})</option>
                    <option value=';'>; ({t("semicolon")})</option>
                    <option value='|'>| ({t("pipe")})</option>
                    <option value='TAB'>{t("tab")}</option>
                  </select>
                </label>
              ) : null}
              <label className='grid gap-1'>
                <span className='font-medium'>{t("lineEnding")}</span>
                <select value={draft.layout.line_ending ?? "CRLF"} onChange={(e) => setLayout({ line_ending: e.target.value as "CRLF" | "LF" })} className={INPUT}>
                  <option value='CRLF'>Windows (CRLF)</option>
                  <option value='LF'>Unix (LF)</option>
                </select>
              </label>
              <label className='grid gap-1'>
                <span className='font-medium'>{t("datePattern")}</span>
                <input value={draft.layout.date_pattern ?? ""} placeholder='yyyyMMdd' maxLength={20}
                  onChange={(e) => setLayout({ date_pattern: e.target.value })} className={INPUT} />
              </label>
              <label className='grid gap-1'>
                <span className='font-medium'>{t("decimals")}</span>
                <select value={String(draft.layout.amount_decimals ?? 2)} onChange={(e) => setLayout({ amount_decimals: Number(e.target.value) })} className={INPUT}>
                  {[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className='grid gap-1'>
                <span className='font-medium'>{t("separator")}</span>
                <select value={draft.layout.amount_separator ?? "."} onChange={(e) => setLayout({ amount_separator: e.target.value })} className={INPUT}>
                  <option value='.'>{t("dot")}</option>
                  <option value=','>{t("commaSep")}</option>
                  <option value=''>{t("noSeparator")}</option>
                </select>
              </label>
              <label className='flex items-center gap-2 pt-5'>
                <input type='checkbox' checked={Boolean(draft.layout.ascii_only)} onChange={(e) => setLayout({ ascii_only: e.target.checked })} />
                {t("asciiOnly")}
              </label>
              {!fixed ? (
                <label className='flex items-center gap-2 pt-5'>
                  <input type='checkbox' checked={Boolean(draft.layout.title_row)} onChange={(e) => setLayout({ title_row: e.target.checked })} />
                  {t("titleRow")}
                </label>
              ) : null}
              {draft.id != null ? (
                <label className='flex items-center gap-2 pt-5'>
                  <input type='checkbox' checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                  {tCommon("active")}
                </label>
              ) : null}
            </div>

            <div className='grid gap-3 md:grid-cols-3'>
              {(["account", "key", "doc"] as const).map((kind) => (
                <label key={kind} className='grid gap-1'>
                  <span className='font-medium'>{t(`codes.${kind}`)}</span>
                  <textarea rows={4} value={draft.codes[kind]} onChange={(e) => setDraft({ ...draft, codes: { ...draft.codes, [kind]: e.target.value } })}
                    className='rounded-lg border border-input bg-background p-2 font-mono text-xs' />
                  <span className='text-xs text-muted-foreground'>{t(`codes.${kind}Hint`)}</span>
                </label>
              ))}
            </div>

            {sectionEditor("header")}
            {sectionEditor("detail")}
            {sectionEditor("footer")}

            {preview != null ? (
              <pre className='max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs'>{preview}</pre>
            ) : null}
            <div className='flex flex-wrap justify-end gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => { setDraft(null); setPreview(null); }}>{tCommon("cancel")}</Buttons>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => void runPreview()}>{t("preview")}</Buttons>
              <Buttons type='submit' className='rounded-full' loading={busy}>{tCommon("save")}</Buttons>
            </div>
          </form>
        ) : null}
      </div>
    </SectionCard>
  );
};
