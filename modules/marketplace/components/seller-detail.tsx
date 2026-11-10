/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineArrowDownTray,
  HiOutlineBuildingStorefront,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineIdentification,
  HiOutlinePencilSquare,
  HiOutlineTag,
  HiOutlineUserGroup,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { EmptyBlock, SectionCard } from "@/components/form-sections";
import { confirm, notify, prompt } from "@/components/notifications";
import { formatApiDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import {
  review_seller_document_action,
  seller_events_action,
  transition_seller_action,
  upload_seller_document_action,
} from "@/server/domains/marketplace/actions";
import {
  DOCUMENT_KINDS,
  REASON_REQUIRED,
  SELLER_ACTIONS,
  OFFERS_HREF,
  SELLERS_HREF,
  type IMarketplaceAccess,
  type ISellerAccount,
  type ISellerDetail,
  type ISellerEvent,
  type SellerAction,
} from "../models/marketplace.interface";
import { DocumentReviewBadge, SellerStatusBadge } from "./badges";
import { SellerPlans } from "./seller-plans";
import { SellerAccount } from "./seller-account";
import { SellerBankAccount } from "./seller-bank-account";
import type { IBank, IBankAccount } from "../models/payout.interface";

const DANGER: readonly SellerAction[] = ["SUSPEND", "CLOSE", "REQUEST_CHANGES"];

/**
 * Ficha del vendedor con flujo específico: lo que falta para revisar o aprobar, transiciones
 * con motivo, revisión documental, planes e historial. Los botones salen de `allowed_actions`,
 * que el backend calcula con el estado y los permisos del usuario (y vuelve a validar al ejecutar).
 */
export const SellerDetail = ({ seller, access, account, bankAccount, banks = [] }: { seller: ISellerDetail; access: IMarketplaceAccess;
  account?: ISellerAccount | null; bankAccount?: IBankAccount | null; banks?: IBank[] }) => {
  const t = useTranslations("Administre.marketplace.seller");
  const td = useTranslations("Administre.marketplace.seller.detail");
  const tKinds = useTranslations("Administre.marketplace.seller.kinds");
  const tActions = useTranslations("Administre.marketplace.seller.actions");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const allowed = SELLER_ACTIONS.filter((action) => seller.allowed_actions.includes(action));
  const editable = access.sellersManage && !["IN_REVIEW", "CLOSED"].includes(seller.status);
  const name = seller.trade_name ?? seller.legal_name;

  const run = async (action: SellerAction) => {
    let reason: string | undefined;
    if (REASON_REQUIRED.includes(action)) {
      const value = await prompt({
        title: tActions(`${action}.title`, { name }),
        description: tActions(`${action}.description`),
        confirmLabel: tActions(`${action}.label`),
        tone: DANGER.includes(action) ? "danger" : undefined,
        input: { label: td("reason"), multiline: true, required: true, placeholder: td("reasonPlaceholder") },
      });
      if (value == null || value.trim().length < 5) {
        if (value != null) notify.error(tCommon("errorTitle"), td("reasonTooShort"));
        return;
      }
      reason = value.trim();
    } else {
      const ok = await confirm({
        title: tActions(`${action}.title`, { name }),
        description: tActions(`${action}.description`),
        confirmLabel: tActions(`${action}.label`),
      });
      if (!ok) return;
    }
    setBusy(action);
    const result = await transition_seller_action(seller.id, { action, reason, version: seller.version });
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tActions(`${action}.done`), name);
    router.refresh();
  };

  const missing = seller.status === "IN_REVIEW" ? seller.readiness.for_approval : seller.readiness.for_submit;

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader
        title={name}
        description={[`${seller.doc_type} ${seller.doc_number}`, seller.code, tKinds(seller.kind as never)].filter(Boolean).join(" · ")}
        icon={HiOutlineBuildingStorefront}
        eyebrow={tCrud("domains.marketplace")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <SellerStatusBadge status={seller.status} />
            {editable ? (
              <Link href={`${SELLERS_HREF}/${seller.id}/edit`}
                className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
                {t("edit")}
              </Link>
            ) : null}
            {seller.kind === "EXTERNAL" && access.offersView ? (
              <Link href={`${OFFERS_HREF}?sellerId=${seller.id}`}
                className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                <HiOutlineTag className='h-4 w-4' aria-hidden='true' />
                {td("offers")}
              </Link>
            ) : null}
            {seller.kind === "EXTERNAL" && access.offersManage && seller.status !== "CLOSED" ? (
              <Link href={`${OFFERS_HREF}/new?sellerId=${seller.id}`}
                className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                {td("newOffer")}
              </Link>
            ) : null}
            {allowed.map((action) => (
              <Buttons key={action} type='button' size='sm' className='rounded-full'
                variant={DANGER.includes(action) ? "outline" : "default"} loading={busy === action} disabled={busy != null}
                onClick={() => void run(action)}>
                {tActions(`${action}.label`)}
              </Buttons>
            ))}
          </div>
        }
      />

      {seller.status_reason && ["CHANGES_REQUESTED", "SUSPENDED", "CLOSED"].includes(seller.status) ? (
        <div role='status' className='flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm'>
          <HiOutlineExclamationTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' aria-hidden='true' />
          <div>
            <p className='font-medium text-foreground'>{td("statusReason")}</p>
            <p className='whitespace-pre-line text-muted-foreground'>{seller.status_reason}</p>
            {seller.status_changed_at ? <p className='mt-1 text-xs text-muted-foreground'>{formatApiDate(seller.status_changed_at)}</p> : null}
          </div>
        </div>
      ) : null}

      {seller.status !== "APPROVED" && seller.status !== "CLOSED" && seller.status !== "SUSPENDED" ? (
        <SectionCard id='seller-readiness' icon={HiOutlineClipboardDocumentList}
          title={seller.status === "IN_REVIEW" ? td("readinessApproval") : td("readinessSubmit")}
          hint={missing.length === 0 ? td("readinessOk") : td("readinessHint")}>
          {missing.length === 0 ? (
            <p className='col-span-12 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400'>
              <HiOutlineCheckCircle className='h-5 w-5' aria-hidden='true' />
              {td("readinessOk")}
            </p>
          ) : (
            <ul className='col-span-12 grid gap-2 sm:grid-cols-2'>
              {missing.map((code) => (
                <li key={code} className='flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm'>
                  <HiOutlineXCircle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' aria-hidden='true' />
                  <span>{missingLabel(code, td, (kind) => td(`documentKinds.${kind}` as never))}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='grid content-start gap-6'>
          <SellerDocuments seller={seller} access={access} />
          <SellerPlans seller={seller} access={access} />
          {account ? <SellerAccount sellerId={seller.id} account={account} access={access} /> : null}
          {seller.kind === "EXTERNAL" && access.billingView ? (
            <SellerBankAccount sellerId={seller.id} account={bankAccount ?? null} banks={banks} canManage={access.billingManage} />
          ) : null}
          <SellerHistory sellerId={seller.id} />
        </div>
        <aside className='grid content-start gap-6'>
          <SectionCard id='seller-info' icon={HiOutlineIdentification} title={td("info")} contentClassName='p-4'>
            <dl className='col-span-12 grid gap-2 text-sm'>
              <Row label={t("fields.legalName")} value={seller.legal_name} />
              <Row label={t("fields.tradeName")} value={seller.trade_name} />
              <Row label={t("fields.email")} value={seller.email} />
              <Row label={t("fields.phone")} value={seller.phone} />
              <Row label={t("fields.website")} value={seller.website} />
              <Row label={t("fields.address")} value={[seller.address, seller.city].filter(Boolean).join(", ") || null} />
              <Row label={t("fields.accountManager")} value={seller.account_manager_name} />
              <Row label={td("approvedAt")} value={seller.approved_at ? formatApiDate(seller.approved_at) : null} />
              <Row label={td("createdAt")} value={seller.created_at ? formatApiDate(seller.created_at) : null} />
            </dl>
            {seller.description ? <p className='col-span-12 mt-3 whitespace-pre-line text-sm text-muted-foreground'>{seller.description}</p> : null}
          </SectionCard>
          <SectionCard id='seller-contacts' icon={HiOutlineUserGroup} title={td("contacts")} contentClassName='p-4'>
            {seller.contacts.length === 0 ? (
              <p className='col-span-12 text-sm text-muted-foreground'>{td("noContacts")}</p>
            ) : (
              <ul className='col-span-12 grid gap-3'>
                {seller.contacts.map((contact, index) => (
                  <li key={`${contact.name}-${index}`} className={cn("rounded-lg border p-3 text-sm", contact.primary ? "border-primary/40 bg-primary/5" : "border-border")}>
                    <p className='font-medium'>{contact.name}{contact.primary ? ` · ${td("primary")}` : ""}</p>
                    {contact.role ? <p className='text-xs text-muted-foreground'>{contact.role}</p> : null}
                    <p className='text-xs text-muted-foreground'>{[contact.email, contact.phone].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </section>
  );
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className='flex justify-between gap-3'>
    <dt className='text-muted-foreground'>{label}</dt>
    <dd className='min-w-0 truncate text-right text-foreground'>{value || "—"}</dd>
  </div>
);

/** Traduce los códigos estables de "lo que falta" del backend. */
function missingLabel(code: string, td: (key: never, values?: Record<string, string>) => string, kindLabel: (kind: string) => string) {
  if (code.startsWith("DOC_") && code.endsWith("_REVIEW")) {
    return td("missing.docReview" as never, { kind: kindLabel(code.slice(4, -7)) });
  }
  if (code.startsWith("DOC_") && code !== "DOCS_PENDING") {
    return td("missing.doc" as never, { kind: kindLabel(code.slice(4)) });
  }
  const known = ["EMAIL", "PHONE", "PRIMARY_CONTACT", "PLAN", "DOCS_PENDING"];
  return known.includes(code) ? td(`missing.${code}` as never) : code;
}

// ── Documentos ─────────────────────────────────────────────────────────────

const SellerDocuments = ({ seller, access }: { seller: ISellerDetail; access: IMarketplaceAccess }) => {
  const td = useTranslations("Administre.marketplace.documents");
  const tKinds = useTranslations("Administre.marketplace.seller.detail.documentKinds");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [kind, setKind] = useState<string>(seller.required_documents[0] ?? "RUT");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const canUpload = access.sellersManage && !["IN_REVIEW", "CLOSED"].includes(seller.status);
  const canReview = access.sellersApprove && seller.status !== "CLOSED";
  const docs = seller.documents.filter((doc) => showHistory || !doc.superseded);

  const upload = async () => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify.error(tCommon("errorTitle"), td("tooLarge"));
      return;
    }
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    setUploading(true);
    const result = await upload_seller_document_action(seller.id, form);
    setUploading(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setFile(null);
    notify.success(td("uploaded"), result.data.file_name);
    router.refresh();
  };

  const review = async (documentId: number, status: "ACCEPTED" | "REJECTED", fileName: string) => {
    let note: string | undefined;
    if (status === "REJECTED") {
      const value = await prompt({
        title: td("rejectTitle", { name: fileName }),
        description: td("rejectDescription"),
        confirmLabel: td("reject"),
        tone: "danger",
        input: { label: td("note"), multiline: true, required: true },
      });
      if (value == null || value.trim().length < 5) return;
      note = value.trim();
    }
    const result = await review_seller_document_action(seller.id, documentId, { status, note });
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(status === "ACCEPTED" ? td("accepted") : td("rejected"), fileName);
    router.refresh();
  };

  return (
    <SectionCard id='seller-documents' icon={HiOutlineDocumentText} title={td("title")}
      hint={seller.required_documents.length ? td("required", { list: seller.required_documents.map((k) => tKinds(k as never)).join(", ") }) : td("noneRequired")}
      actions={seller.documents.some((doc) => doc.superseded) ? (
        <Buttons type='button' size='sm' variant='ghost' className='rounded-full' onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? td("hideHistory") : td("showHistory")}
        </Buttons>
      ) : undefined}
      contentClassName='p-4'>
      {canUpload ? (
        <div className='col-span-12 mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border p-3'>
          <label className='grid gap-1 text-sm'>
            <span className='font-medium'>{td("kind")}</span>
            <select value={kind} onChange={(event) => setKind(event.target.value)}
              className='h-9 rounded-lg border border-input bg-background px-2 text-sm'>
              {DOCUMENT_KINDS.map((value) => <option key={value} value={value}>{tKinds(value)}</option>)}
            </select>
          </label>
          <label className='grid min-w-0 flex-1 gap-1 text-sm'>
            <span className='font-medium'>{td("file")}</span>
            <input type='file' accept='application/pdf,image/png,image/jpeg'
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className='text-sm file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5' />
          </label>
          <Buttons type='button' size='sm' className='rounded-full' disabled={!file} loading={uploading} onClick={() => void upload()}>
            {td("upload")}
          </Buttons>
          <p className='w-full text-xs text-muted-foreground'>{td("uploadHint")}</p>
        </div>
      ) : null}
      {docs.length === 0 ? (
        <EmptyBlock icon={HiOutlineDocumentText} title={td("empty")} description={canUpload ? td("emptyHint") : undefined} />
      ) : (
        <ul className='col-span-12 divide-y divide-border rounded-xl border border-border'>
          {docs.map((doc) => (
            <li key={doc.id} className={cn("flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm", doc.superseded && "opacity-60")}>
              <div className='min-w-0'>
                <p className='font-medium'>{tKinds(doc.kind as never)} · <span className='font-normal'>{doc.file_name}</span></p>
                <p className='text-xs text-muted-foreground'>
                  {[formatApiDate(doc.uploaded_at), `${Math.max(1, Math.round(doc.size_bytes / 1024))} KB`, doc.superseded ? td("superseded") : null]
                    .filter(Boolean).join(" · ")}
                </p>
                {doc.review_note ? <p className='text-xs text-muted-foreground'>{td("noteLabel", { note: doc.review_note })}</p> : null}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <DocumentReviewBadge status={doc.review_status} />
                <a href={`/api/marketplace/sellers/${seller.id}/documents/${doc.id}`}
                  className='inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted'>
                  <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />
                  {td("download")}
                </a>
                {canReview && !doc.superseded && doc.review_status !== "ACCEPTED" ? (
                  <Buttons type='button' size='sm' className='rounded-full' onClick={() => void review(doc.id, "ACCEPTED", doc.file_name)}>
                    {td("accept")}
                  </Buttons>
                ) : null}
                {canReview && !doc.superseded && doc.review_status !== "REJECTED" ? (
                  <Buttons type='button' size='sm' variant='outline' className='rounded-full' onClick={() => void review(doc.id, "REJECTED", doc.file_name)}>
                    {td("reject")}
                  </Buttons>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};

// ── Historial ──────────────────────────────────────────────────────────────

const SellerHistory = ({ sellerId }: { sellerId: number }) => {
  const th = useTranslations("Administre.marketplace.history");
  const tStatuses = useTranslations("Administre.marketplace.seller.statuses");
  const [events, setEvents] = useState<ISellerEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await seller_events_action(sellerId);
    setLoading(false);
    if (result.success) setEvents(result.data);
    else setError(result.error);
  };

  const status = (value: string | null) => (value ? tStatuses(value as never) : "");

  return (
    <SectionCard id='seller-history' icon={HiOutlineClock} title={th("title")} hint={th("hint")}
      actions={
        <Buttons type='button' size='sm' variant='outline' className='rounded-full' loading={loading} onClick={() => void load()}>
          {events ? th("reload") : th("load")}
        </Buttons>
      }
      contentClassName='p-4'>
      {error ? <p className='col-span-12 text-sm text-destructive'>{error}</p> : null}
      {events == null ? (
        <p className='col-span-12 text-sm text-muted-foreground'>{th("notLoaded")}</p>
      ) : events.length === 0 ? (
        <p className='col-span-12 text-sm text-muted-foreground'>{th("empty")}</p>
      ) : (
        <ol className='col-span-12 grid gap-3'>
          {events.map((event) => (
            <li key={event.id} className='rounded-lg border border-border px-3 py-2 text-sm'>
              <p className='font-medium'>
                {th(`types.${event.type}` as never)}
                {event.from_status || event.to_status ? ` · ${[status(event.from_status), status(event.to_status)].filter(Boolean).join(" → ")}` : ""}
              </p>
              {event.detail ? <p className='text-xs text-muted-foreground'>{event.detail}</p> : null}
              {event.reason ? <p className='whitespace-pre-line text-xs text-foreground'>{th("reason", { reason: event.reason })}</p> : null}
              <p className='text-xs text-muted-foreground'>{[formatApiDate(event.created_at), event.actor_name ?? event.actor_id].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
};
