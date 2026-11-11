/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineArchiveBoxArrowDown,
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentCheck,
  HiOutlinePencilSquare,
  HiOutlineXCircle,
} from "react-icons/hi2";
import type { IconType } from "react-icons";
import { Link } from "@/shared/i18n/routing";
import { DevolutionStatusBadge } from "../devolution-status-badge";
import type { FlowDialog } from "../return-action-dialogs";
import type { DevolutionState } from "../../constants";
import type { IDevolution, ReturnAction } from "../../models/devolution.interface";

const ACTION_BUTTONS: { action: Exclude<ReturnAction, "edit_lines">; code: DevolutionState; icon: IconType }[] = [
  { action: "approve", code: "A", icon: HiOutlineCheckCircle },
  { action: "receive", code: "R", icon: HiOutlineArchiveBoxArrowDown },
  { action: "inspect", code: "I", icon: HiOutlineClipboardDocumentCheck },
  { action: "refund", code: "F", icon: HiOutlineBanknotes },
];

/** Volver, título con estado y las acciones disponibles (las da el backend en `actions`). */
export const DetailHeader = ({
  devolution,
  actions,
  canEditHeader,
  onEdit,
  onAction,
}: {
  devolution: IDevolution;
  actions: ReturnAction[];
  canEditHeader: boolean;
  onEdit: () => void;
  onAction: (action: Exclude<FlowDialog, null>) => void;
}) => {
  const t = useTranslations("Administre.devolution");
  return (
    <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
      <div className='space-y-2'>
        <Link
          href='/postventa/devolutions'
          className='inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground'>
          <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
          {t("backToList")}
        </Link>
        <div className='flex flex-wrap items-center gap-3'>
          <h2 className='text-xl font-semibold tracking-tight text-foreground'>
            {t("devolutionLabel", { id: devolution.id ?? "—" })}
          </h2>
          <DevolutionStatusBadge state={devolution.state} />
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {canEditHeader ? (
          <Buttons variant='outline' onClick={onEdit} className='rounded-full'>
            <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
            {t("editTitle")}
          </Buttons>
        ) : null}
        {actions.includes("reject") ? (
          <Buttons variant='danger' onClick={() => onAction("reject")} className='rounded-full'>
            <HiOutlineXCircle className='h-4 w-4' aria-hidden='true' />
            {t("actions.X")}
          </Buttons>
        ) : null}
        {ACTION_BUTTONS.filter((item) => actions.includes(item.action)).map(({ action, code, icon: Icon }) => (
          <Buttons key={action} onClick={() => onAction(action)} className='rounded-full'>
            <Icon className='h-4 w-4' aria-hidden='true' />
            {t(`actions.${code}` as never)}
          </Buttons>
        ))}
      </div>
    </div>
  );
};
