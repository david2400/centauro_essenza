/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import type {
  IDevolution,
  IDevolutionCatalogs,
  IDevolutionOption,
  IReturnableOrder,
  ReturnAction,
} from "../models/devolution.interface";
import { ApproveForm } from "./flow/approve-form";
import { RejectForm } from "./flow/reject-form";
import { ReceiveForm } from "./flow/receive-form";
import { InspectForm } from "./flow/inspect-form";
import { RefundForm } from "./flow/refund-form";

export type FlowDialog = Exclude<ReturnAction, "edit_lines"> | null;

const TITLES: Record<Exclude<FlowDialog, null>, string> = {
  approve: "A",
  reject: "X",
  receive: "R",
  inspect: "I",
  refund: "F",
};

/** Diálogo de la acción del flujo elegida (aprobar, rechazar, recibir, inspeccionar, reembolsar). */
export const ReturnActionDialog = ({
  action,
  devolution,
  catalogs,
  returnable,
  warehouses,
  onClose,
}: {
  action: FlowDialog;
  devolution: IDevolution;
  catalogs: IDevolutionCatalogs;
  returnable: IReturnableOrder | null;
  warehouses: IDevolutionOption[];
  onClose: () => void;
}) => {
  const t = useTranslations("Administre.devolution");
  return (
    <Modal
      size={action === "inspect" ? "lg" : "md"}
      open={action != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={action ? t(`actions.${TITLES[action]}` as never) : ""}
      hideDefaultFooter>
      {action === "approve" ? <ApproveForm devolution={devolution} onClose={onClose} catalogs={catalogs} /> : null}
      {action === "reject" ? <RejectForm devolution={devolution} onClose={onClose} /> : null}
      {action === "receive" ? <ReceiveForm devolution={devolution} onClose={onClose} /> : null}
      {action === "inspect" ? (
        <InspectForm devolution={devolution} onClose={onClose} returnable={returnable} warehouses={warehouses} />
      ) : null}
      {action === "refund" ? (
        <RefundForm devolution={devolution} onClose={onClose} catalogs={catalogs} refundable={returnable?.refundable} />
      ) : null}
    </Modal>
  );
};
