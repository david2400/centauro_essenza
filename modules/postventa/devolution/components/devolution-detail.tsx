/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { confirm, notify } from "@/components/notifications";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { DevolutionDetailForm, EvidenceForm, UpdateDevolution } from "./form";
import { ReturnActionDialog, type FlowDialog } from "./return-action-dialogs";
import { DetailHeader } from "./detail/detail-header";
import { DetailOverview } from "./detail/detail-overview";
import { RefundSummary } from "./detail/refund-summary";
import { DetailLines } from "./detail/detail-lines";
import { EvidenceList } from "./detail/evidence-list";
import { isDevolutionState, type DevolutionState } from "../constants";
import type {
  IDevolution,
  IDevolutionCatalogs,
  IDevolutionDetail,
  IDevolutionEvidence,
  IDevolutionOption,
  IReturnCreditNote,
  IReturnableOrder,
  ReturnAction,
} from "../models/devolution.interface";
import {
  deleteDevolutionDetailServerAction,
  deleteDevolutionEvidenceServerAction,
  deleteDevolutionServerAction,
} from "@/app/[locale]/postventa/devolutions/actions";

interface IDevolutionDetailProps {
  devolution: IDevolution;
  evidences: IDevolutionEvidence[];
  catalogs: IDevolutionCatalogs;
  /** Lo que se puede devolver de la orden sin contar esta devolución (y lo reembolsable). */
  returnable: IReturnableOrder | null;
  warehouses: IDevolutionOption[];
  creditNotes: IReturnCreditNote[];
}

/**
 * Detalle de una devolución con su flujo: las acciones disponibles vienen del backend
 * (`actions`); la inspección reingresa al stock y el reembolso devuelve el dinero sobre los
 * pagos de la orden y emite la nota crédito parcial. Cada bloque vive en `./detail/`; aquí
 * quedan el estado de los modales y el borrado con confirmación.
 */
export const DevolutionDetail = ({
  devolution,
  evidences,
  catalogs,
  returnable,
  warehouses,
  creditNotes,
}: IDevolutionDetailProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tDetails = useTranslations("Administre.devolution.details");
  const tEvidences = useTranslations("Administre.devolution.evidences");
  const tCommon = useTranslations("Administre.common");

  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<FlowDialog>(null);
  const [detailModal, setDetailModal] = useState<{ open: boolean; detail: IDevolutionDetail | null }>({
    open: false,
    detail: null,
  });
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const state: DevolutionState = isDevolutionState(devolution.state) ? devolution.state : "P";
  const actions = (devolution.actions ?? []) as ReturnAction[];
  const canEditLines = actions.includes("edit_lines");
  const canEditHeader = state === "P" || state === "A";
  const details = devolution.details ?? [];
  const devolutionId = devolution.id ?? 0;

  const showError = (message?: string) => notify.error(tCommon("errorTitle"), message || tCommon("unexpectedError"));

  const confirmDelete = (name: string, action: () => Promise<{ success: boolean; error?: string }>) =>
    confirm({
      title: tCommon("deleteConfirmTitle"),
      description: tCommon("deleteConfirmText", { name }),
      confirmLabel: tCommon("deleteConfirmButton"),
      tone: "danger",
    }).then(async (ok) => {
      if (!ok) return;
      const response = await action();
      if (response.success) {
        notify.success(tCommon("deletedSuccess"), name);
        router.refresh();
      } else showError(response.error);
    });

  /**
   * Una devolución no puede quedar sin productos: al quitar el único se ofrece eliminarla completa
   * (el backend solo lo permite si está pendiente o rechazada).
   */
  const deleteLine = (detail: IDevolutionDetail) => {
    const name = detail.product_name ?? `#${detail.id}`;
    if (details.length > 1) {
      void confirmDelete(name, () => deleteDevolutionDetailServerAction(detail.id as number));
      return;
    }
    void confirm({
      title: tf("lastLine.title"),
      description: tf("lastLine.text", { name, id: devolutionId }),
      confirmLabel: tf("lastLine.confirm"),
      tone: "danger",
    }).then(async (ok) => {
      if (!ok) return;
      const response = await deleteDevolutionServerAction(devolutionId);
      if (response.success) {
        notify.success(tf("lastLine.deleted", { id: devolutionId }));
        router.push("/postventa/devolutions");
        router.refresh();
      } else showError(response.error);
    });
  };

  const closeDetailModal = () => setDetailModal({ open: false, detail: null });

  return (
    <section className='flex w-full flex-col gap-6'>
      <DetailHeader
        devolution={devolution}
        actions={actions}
        canEditHeader={canEditHeader}
        onEdit={() => setEditing(true)}
        onAction={setDialog}
      />

      <div className='flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6'>
        <DetailOverview devolution={devolution} state={state} catalogs={catalogs} warehouses={warehouses} />

        {state === "F" ? <RefundSummary devolution={devolution} creditNotes={creditNotes} /> : null}

        <DetailLines
          details={details}
          canEditLines={canEditLines}
          canAdd={Boolean(returnable?.lines?.some((line) => (line.returnable ?? 0) > 0))}
          onAdd={() => setDetailModal({ open: true, detail: null })}
          onEdit={(detail) => setDetailModal({ open: true, detail })}
          onDelete={deleteLine}
        />

        <EvidenceList
          evidences={evidences}
          onAdd={() => setEvidenceOpen(true)}
          onDelete={(evidence) =>
            evidence.id != null &&
            confirmDelete(evidence.evidence_type ?? `#${evidence.id}`, () =>
              deleteDevolutionEvidenceServerAction(evidence.id as number),
            )
          }
        />
      </div>

      <ReturnActionDialog
        action={dialog}
        devolution={devolution}
        catalogs={catalogs}
        returnable={returnable}
        warehouses={warehouses}
        onClose={() => setDialog(null)}
      />

      <Modal size='md' title={t("editTitle")} open={editing} onOpenChange={setEditing} hideDefaultFooter={true}>
        {editing ? <UpdateDevolution devolution={devolution} catalogs={catalogs} handleClose={() => setEditing(false)} /> : null}
      </Modal>

      <Modal
        size='md'
        title={detailModal.detail ? tDetails("editTitle") : tDetails("createTitle")}
        open={detailModal.open}
        onOpenChange={(open) => {
          if (!open) closeDetailModal();
        }}
        hideDefaultFooter={true}>
        {detailModal.open ? (
          <DevolutionDetailForm
            devolutionId={devolutionId}
            detail={detailModal.detail}
            lines={(returnable?.lines ?? []).filter((line) =>
              detailModal.detail
                ? line.product_order_id === detailModal.detail.product_order_id
                : !details.some((detail) => detail.product_order_id === line.product_order_id),
            )}
            handleClose={closeDetailModal}
          />
        ) : null}
      </Modal>

      <Modal size='md' title={tEvidences("createTitle")} open={evidenceOpen} onOpenChange={setEvidenceOpen} hideDefaultFooter={true}>
        {evidenceOpen ? <EvidenceForm devolutionId={devolutionId} handleClose={() => setEvidenceOpen(false)} /> : null}
      </Modal>
    </section>
  );
};
