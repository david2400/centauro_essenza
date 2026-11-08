/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowPath, HiOutlineBellAlert, HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineInformationCircle } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { StatCards } from "@/components/stat-cards";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { ALERT_HREF, MONEY_ALERTS, itemHref, type IAlert, type IAlerts } from "../models/operations.interface";

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "border-destructive/40 bg-destructive/5",
  WARNING: "border-warning/40 bg-warning/5",
  INFO: "border-border bg-card",
};

const SEVERITY_BADGE: Record<string, "destructive" | "default" | "secondary"> = { CRITICAL: "destructive", WARNING: "default", INFO: "secondary" };

/**
 * Centro de operaciones: lo que necesita atención hoy en ventas, marketplace, consignación,
 * facturación, postventa e inventario. Cada tarjeta lleva al listado filtrado y cada ejemplo a su
 * ficha. Solo aparecen los módulos que el usuario puede ver (lo decide draco).
 */
export const OperationsCenter = ({ data }: { data: IAlerts }) => {
  const router = useRouter();
  const t = useTranslations("Administre.operations");
  const tCrud = useTranslations("Crud");
  const [showEmpty, setShowEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const areas = useMemo(() => {
    const visible = data.alerts.filter((alert) => showEmpty || alert.count > 0 || !alert.available);
    const grouped = new Map<string, IAlert[]>();
    for (const alert of visible) grouped.set(alert.area, [...(grouped.get(alert.area) ?? []), alert]);
    return [...grouped.entries()];
  }, [data.alerts, showEmpty]);

  const pending = data.alerts.filter((alert) => alert.count > 0).length;

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("title")} description={t("description", { date: formatApiDate(data.generated_at) })}
        icon={HiOutlineBellAlert} eyebrow={tCrud("domains.operations")}
        actions={
          <div className='flex flex-wrap gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setShowEmpty(!showEmpty)}>
              {showEmpty ? t("hideEmpty") : t("showEmpty")}
            </Buttons>
            <Buttons type='button' className='rounded-full' loading={refreshing} onClick={refresh}>
              <HiOutlineArrowPath className='h-4 w-4' aria-hidden='true' />
              {t("refresh")}
            </Buttons>
          </div>
        } />

      <StatCards items={[
        { label: t("stats.critical"), value: formatNumber(data.critical), icon: HiOutlineExclamationTriangle, tone: data.critical > 0 ? "danger" : "default" },
        { label: t("stats.warning"), value: formatNumber(data.warning), icon: HiOutlineBellAlert, tone: data.warning > 0 ? "warning" : "default" },
        { label: t("stats.info"), value: formatNumber(data.info), icon: HiOutlineInformationCircle },
        { label: t("stats.pending"), value: formatNumber(pending), icon: HiOutlineCheckCircle, tone: pending === 0 ? "success" : "default",
          hint: t("stats.pendingHint", { total: data.alerts.length }) },
      ]} />

      {areas.length === 0 ? (
        <div className='flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center'>
          <HiOutlineCheckCircle className='h-10 w-10 text-success' aria-hidden='true' />
          <p className='font-semibold'>{t("allClearTitle")}</p>
          <p className='text-sm text-muted-foreground'>{t("allClear")}</p>
        </div>
      ) : (
        areas.map(([area, alerts]) => (
          <div key={area} className='grid gap-3'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>{t(`areas.${area}` as never)}</h2>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
              {alerts.map((alert) => <AlertCard key={alert.key} alert={alert} data={data} />)}
            </div>
          </div>
        ))
      )}
    </section>
  );
};

const AlertCard = ({ alert, data }: { alert: IAlert; data: IAlerts }) => {
  const t = useTranslations("Administre.operations");
  const href = ALERT_HREF[alert.key];
  const money = MONEY_ALERTS.has(alert.key);
  return (
    <article className={cn("flex flex-col gap-3 rounded-2xl border p-4 shadow-sm", SEVERITY_STYLE[alert.severity])}>
      <header className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='font-semibold'>{t(`alerts.${alert.key}.title` as never)}</p>
          <p className='text-xs text-muted-foreground'>
            {t(`alerts.${alert.key}.hint` as never, { days: alert.key === "CONSIGNMENT_AGED" ? data.consignment_aged_days : data.returns_stalled_days })}
          </p>
        </div>
        <Badge variant={alert.available ? SEVERITY_BADGE[alert.severity] : "outline"} className='shrink-0 tabular-nums'>
          {alert.available ? formatNumber(alert.count) : t("unavailable")}
        </Badge>
      </header>
      {alert.amount != null && alert.count > 0 ? (
        <p className='text-sm tabular-nums'>{money ? formatMoney(alert.amount) : t("units", { count: alert.amount })}</p>
      ) : null}
      {alert.items.length > 0 ? (
        <ul className='grid gap-1.5 text-sm'>
          {alert.items.map((item, index) => {
            const target = itemHref(alert, item);
            const label = <span className='font-medium'>{item.label}</span>;
            return (
              <li key={`${item.ref_id}-${index}`} className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  {target ? <Link href={target} className='hover:text-primary hover:underline'>{label}</Link> : label}
                  {item.detail ? <p className='truncate text-xs text-muted-foreground'>{item.detail}</p> : null}
                </div>
                <span className='shrink-0 text-right text-xs tabular-nums text-muted-foreground'>
                  {item.days != null && item.days > 0 ? t("days", { count: item.days }) : null}
                  {item.amount != null && money ? <span className='block'>{formatMoney(item.amount)}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {href && alert.count > 0 ? (
        <Link href={href} className='mt-auto text-sm font-medium text-primary hover:underline'>
          {alert.count > alert.items.length ? t("viewAll", { count: alert.count }) : t("open")}
        </Link>
      ) : null}
    </article>
  );
};
