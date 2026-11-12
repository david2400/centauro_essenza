/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowUturnLeft, HiOutlinePlusCircle } from "react-icons/hi2";
import { Link } from "@/shared/i18n/routing";
import { DevolutionStatusBadge } from "./devolution-status-badge";
import { formatDateTime, formatMoney } from "../constants";
import type { IDevolution, IDevolutionCatalogs } from "../models/devolution.interface";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RequestReturnForm = dynamic(() => import("./request-return-form").then((m) => m.RequestReturnForm), { loading: () => <FormSkeleton /> });

const RETURNABLE_STATES = ["PAID", "PROCESSING", "READY", "SHIPPED", "DELIVERED"];

/** Devoluciones de una orden (bloque del detalle de la orden) y botón para solicitar una. */
export const OrderReturns = ({
  orderId,
  orderState,
  devolutions,
  catalogs,
}: {
  orderId: number;
  orderState?: string;
  devolutions: IDevolution[];
  catalogs: IDevolutionCatalogs;
}) => {
  const t = useTranslations("Administre.devolution");
  const tr = useTranslations("Administre.devolution.request");
  const [open, setOpen] = useState(false);
  const canRequest = RETURNABLE_STATES.includes(orderState ?? "");

  return (
    <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
            <HiOutlineArrowUturnLeft className='h-5 w-5' aria-hidden='true' />
          </span>
          <div>
            <h3 className='text-sm font-semibold text-foreground'>{tr("orderBlockTitle")}</h3>
            <p className='text-xs text-muted-foreground'>{canRequest ? tr("orderBlockHint") : tr("orderBlockLocked")}</p>
          </div>
        </div>
        {canRequest ? (
          <Buttons size='sm' className='rounded-full' onClick={() => setOpen(true)}>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {tr("requestButton")}
          </Buttons>
        ) : null}
      </div>
      {devolutions.length > 0 ? (
        <ul className='divide-y divide-border rounded-xl border border-border'>
          {devolutions.map((devolution) => (
            <li key={devolution.id} className='flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm'>
              <Link
                href={`/postventa/devolutions/${devolution.id}`}
                className='font-semibold text-primary underline-offset-4 hover:underline'>
                {t("devolutionLabel", { id: devolution.id ?? "" })}
              </Link>
              <span className='text-xs text-muted-foreground'>{formatDateTime(devolution.created_at)}</span>
              <span className='flex items-center gap-2'>
                <span className='tabular-nums'>{formatMoney(devolution.total_refund_amount)}</span>
                <DevolutionStatusBadge state={devolution.state} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted-foreground'>{tr("orderBlockEmpty")}</p>
      )}
      <Modal
        size='xl'
        open={open}
        onOpenChange={setOpen}
        title={tr("title", { order: orderId })}
        description={tr("subtitle")}
        hideDefaultFooter>
        {open ? <RequestReturnForm catalogs={catalogs} orderId={orderId} handleClose={() => setOpen(false)} /> : null}
      </Modal>
    </section>
  );
};
