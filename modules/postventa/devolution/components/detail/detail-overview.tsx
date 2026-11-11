/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  HiOutlineArchiveBoxArrowDown,
  HiOutlineArrowUturnLeft,
  HiOutlineBanknotes,
  HiOutlineReceiptRefund,
} from "react-icons/hi2";
import { StatCards } from "@/components/stat-cards";
import { Link } from "@/shared/i18n/routing";
import { formatDateTime, formatMoney, type DevolutionState } from "../../constants";
import type { IDevolution, IDevolutionCatalogs, IDevolutionOption } from "../../models/devolution.interface";

const TIMELINE: DevolutionState[] = ["P", "A", "R", "I", "F"];

/** Indicadores, seguimiento del flujo y datos generales de la devolución. */
export const DetailOverview = ({
  devolution,
  state,
  catalogs,
  warehouses,
}: {
  devolution: IDevolution;
  state: DevolutionState;
  catalogs: IDevolutionCatalogs;
  warehouses: IDevolutionOption[];
}) => {
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tStates = useTranslations("Administre.devolution.states");
  const details = devolution.details ?? [];

  const names = useMemo(() => {
    const toMap = (items: IDevolutionOption[]) => new Map(items.map((item) => [item.id ?? -1, item.name ?? `#${item.id}`]));
    return {
      motives: toMap(catalogs.motives),
      returnMethods: toMap(catalogs.returnMethods),
      refundMethods: toMap(catalogs.refundMethods),
      warehouses: toMap(warehouses),
    };
  }, [catalogs, warehouses]);

  const units = details.reduce((sum, detail) => sum + (detail.received_quantity ?? detail.quantity ?? 0), 0);
  const restocked = details.reduce((sum, detail) => sum + (detail.restocked_quantity ?? 0), 0);
  const estimated = details.reduce((sum, detail) => sum + (detail.quantity ?? 0) * (detail.unit_price ?? 0), 0);

  const summary = [
    {
      label: t("fields.orderId"),
      value:
        devolution.order_id != null ? (
          <Link href={`/ventas/orders/${devolution.order_id}`} className='text-primary underline-offset-4 hover:underline'>
            #{devolution.order_id}
          </Link>
        ) : (
          "—"
        ),
      icon: HiOutlineArrowUturnLeft,
    },
    {
      label: tf("units"),
      value: String(units),
      hint: state === "I" || state === "F" ? tf("unitsRestocked", { count: restocked }) : undefined,
      icon: HiOutlineArchiveBoxArrowDown,
    },
    {
      label: t("fields.totalRefundAmount"),
      value: devolution.total_refund_amount != null ? formatMoney(devolution.total_refund_amount) : "—",
      hint: devolution.total_refund_amount == null ? tf("estimatedValue", { amount: formatMoney(estimated) }) : undefined,
      icon: HiOutlineReceiptRefund,
    },
    {
      label: tf("refunded"),
      value: state === "F" ? formatMoney(devolution.refunded_amount) : "—",
      hint:
        state === "F" && (devolution.total_refund_amount ?? 0) > (devolution.refunded_amount ?? 0)
          ? tf("storeCreditShort", {
              amount: formatMoney((devolution.total_refund_amount ?? 0) - (devolution.refunded_amount ?? 0)),
            })
          : undefined,
      icon: HiOutlineBanknotes,
    },
  ];

  const who = (by?: string, at?: string) => (at ? `${by || "—"} · ${formatDateTime(at)}` : undefined);
  const timelineInfo: Partial<Record<DevolutionState, string | undefined>> = {
    P: devolution.created_at ? formatDateTime(devolution.created_at) : undefined,
    A: who(devolution.approved_by, devolution.approved_at),
    R: who(devolution.received_by, devolution.received_at),
    I: who(devolution.inspected_by, devolution.inspected_at),
    F: who(devolution.refunded_by, devolution.refunded_at),
  };
  const reachedIndex = TIMELINE.indexOf(state);

  return (
    <>
      <StatCards items={summary} />

      <div className='grid gap-4 lg:grid-cols-3'>
        <div className='rounded-xl border border-border/70 bg-background/60 p-5 lg:col-span-2'>
          <h3 className='text-base font-semibold text-foreground'>{t("timelineTitle")}</h3>
          {state === "X" ? (
            <p role='status' className='mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm'>
              {t("rejectedNotice", { reason: devolution.rejected_reason ?? devolution.inspection_notes ?? "—" })}
              {devolution.rejected_at ? (
                <span className='mt-1 block text-xs text-muted-foreground'>{who(devolution.rejected_by, devolution.rejected_at)}</span>
              ) : null}
            </p>
          ) : (
            <ol className='mt-4 grid gap-3 sm:grid-cols-5'>
              {TIMELINE.map((step, index) => {
                const reached = index <= reachedIndex;
                return (
                  <li
                    key={step}
                    aria-current={step === state ? "step" : undefined}
                    className={`rounded-xl border p-3 text-sm ${reached ? "border-primary/40 bg-primary/5" : "border-border opacity-60"}`}>
                    <p className='font-semibold text-foreground'>{tStates(step)}</p>
                    <p className='mt-1 break-words text-xs text-muted-foreground'>{timelineInfo[step] ?? (reached ? "✓" : "—")}</p>
                  </li>
                );
              })}
            </ol>
          )}
          {devolution.inspection_notes && state !== "X" ? (
            <p className='mt-3 text-sm text-muted-foreground'>
              <span className='font-medium text-foreground'>{t("fields.inspectionNotes")}:</span> {devolution.inspection_notes}
            </p>
          ) : null}
        </div>

        <dl className='space-y-3 rounded-xl border border-border/70 bg-background/60 p-5 text-sm'>
          <div>
            <dt className='text-muted-foreground'>{t("fields.motiveDevolutionId")}</dt>
            <dd className='font-medium text-foreground'>{names.motives.get(devolution.motive_devolution_id ?? -1) ?? "—"}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>{t("fields.returnMethodId")}</dt>
            <dd className='font-medium text-foreground'>{names.returnMethods.get(devolution.return_method_id ?? -1) ?? "—"}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>{t("fields.refundMethodId")}</dt>
            <dd className='font-medium text-foreground'>{names.refundMethods.get(devolution.refund_method_id ?? -1) ?? "—"}</dd>
          </div>
          {state === "I" || state === "F" ? (
            <div>
              <dt className='text-muted-foreground'>{tf("warehouse")}</dt>
              <dd className='font-medium text-foreground'>
                {devolution.warehouse_id != null ? names.warehouses.get(devolution.warehouse_id) ?? `#${devolution.warehouse_id}` : tf("mainWarehouse")}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className='text-muted-foreground'>{t("fields.externalReference")}</dt>
            <dd className='font-medium text-foreground'>{devolution.external_reference || "—"}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>{t("fields.observation")}</dt>
            <dd className='whitespace-pre-line text-foreground'>{devolution.observation || "—"}</dd>
          </div>
        </dl>
      </div>
    </>
  );
};
