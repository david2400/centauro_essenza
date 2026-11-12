/** @format */

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import {
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineFaceSmile,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { BreakdownList } from "@/components/breakdown-list";
import { SegmentBadge } from "./segment-badge";
import { SEGMENTS, formatDateTime } from "../constants";
import type { IPersonalizationProfile } from "../models/personalizationProfile.interface";
import { deleteProfileServerAction } from "@/app/[locale]/contenido/personalization/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";
const ProfileViewer = dynamic(() => import("./profile-viewer").then((m) => m.ProfileViewer), { loading: () => <FormSkeleton /> });

// Se descargan al abrirse (no viajan con la página).
const PersonalizationProfileForm = dynamic(() => import("./form").then((m) => m.PersonalizationProfileForm), { loading: () => <FormSkeleton /> });

/** Perfiles de personalización: segmentos, puntuación, ficha de solo lectura y acciones en lote. */
export const PersonalizationManager = ({ initialData }: { initialData: IPersonalizationProfile[] }) => {
  const t = useTranslations("Administre.personalization");
  const tSegments = useTranslations("Administre.personalization.segments");
  const tCrud = useTranslations("Crud");

  const [viewing, setViewing] = useState<IPersonalizationProfile | null>(null);

  const data = useMemo(
    () => [...initialData].sort((a, b) => (b.personalization_score ?? 0) - (a.personalization_score ?? 0)),
    [initialData],
  );

  const scores = initialData
    .map((profile) => profile.personalization_score)
    .filter((value): value is number => value != null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const vip = initialData.filter((profile) => profile.segment === "VIP").length;
  const churning = initialData.filter((profile) => profile.segment === "CHURNING").length;

  const bySegment = useMemo(
    () =>
      SEGMENTS.map((value) => ({
        key: value,
        label: tSegments(value),
        value: initialData.filter((profile) => profile.segment === value).length,
      })),
    [initialData, tSegments],
  );

  const profileLabel = (profile: IPersonalizationProfile) =>
    t("profileLabel", { id: profile.customer_id ?? profile.id ?? "—" });

  const columns = useMemo<GridColumn<IPersonalizationProfile>[]>(
    () => [
      {
        id: "customer_id",
        accessorFn: (row) => row.customer_id ?? 0,
        header: t("fields.customerId"),
        meta: { label: t("fields.customerId"), hideable: false, exportValue: (row) => row.customer_id },
        cell: ({ row }) => <span className='font-semibold text-foreground'>#{row.original.customer_id ?? "—"}</span>,
      },
      {
        id: "segment",
        header: t("fields.segment"),
        enableSorting: false,
        meta: {
          label: t("fields.segment"),
          exportValue: (row) => (row.segment ? tSegments(row.segment as never) : ""),
        },
        cell: ({ row }) => <SegmentBadge segment={row.original.segment} />,
      },
      {
        id: "personalization_score",
        accessorFn: (row) => row.personalization_score ?? -1,
        header: t("fields.personalizationScore"),
        meta: { label: t("fields.personalizationScore"), exportValue: (row) => row.personalization_score },
        cell: ({ row }) => {
          const score = row.original.personalization_score;
          if (score == null) return "—";
          return (
            <div className='flex items-center gap-2'>
              <div
                className='h-2 w-16 overflow-hidden rounded-full bg-muted'
                role='meter'
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={score}
                aria-label={t("fields.personalizationScore")}>
                <div className='h-full rounded-full bg-primary' style={{ width: `${score * 100}%` }} />
              </div>
              <span className='tabular-nums text-xs text-muted-foreground'>{score.toFixed(2)}</span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: t("fields.status"),
        enableSorting: false,
        meta: { label: t("fields.status"), exportValue: (row) => row.status },
        cell: ({ row }) => row.original.status || "—",
      },
      {
        id: "lastAnalysisAt",
        accessorFn: (row) => row.last_analysis_at ?? row.updated_at ?? "",
        header: t("fields.lastAnalysisAt"),
        meta: { label: t("fields.lastAnalysisAt"), exportValue: (row) => row.last_analysis_at ?? row.updated_at },
        cell: ({ row }) => formatDateTime(row.original.last_analysis_at ?? row.original.updated_at),
      },
    ],
    [t, tSegments],
  );

  const filters: GridFilter<IPersonalizationProfile>[] = [
    {
      id: "segment",
      label: t("fields.segment"),
      options: SEGMENTS.map((value) => ({ value, label: tSegments(value) })),
      accessor: (row) => row.segment,
    },
  ];

  return (
    <CrudManager<IPersonalizationProfile>
      gridId='perfiles-personalizacion'
      namespace='Administre.personalization'
      icon={HiOutlineUserGroup}
      eyebrow={tCrud("domains.catalog")}
      data={data}
      columns={columns}
      filters={filters}
      stats={[
        { label: t("total"), value: initialData.length, icon: HiOutlineUserGroup },
        { label: t("avgScore"), value: avgScore.toFixed(2), icon: HiOutlineSparkles },
        { label: t("vipCount"), value: vip, icon: HiOutlineFaceSmile, tone: "success" },
        {
          label: t("churningCount"),
          value: churning,
          icon: HiOutlineExclamationTriangle,
          tone: churning > 0 ? "danger" : "default",
        },
      ]}
      rowLabel={profileLabel}
      searchPlaceholder={t("searchPlaceholder")}
      searchText={(row) => `${row.customer_id ?? ""} ${row.status ?? ""} ${row.segment ?? ""}`}
      extraRowActions={(row) => [{ label: t("view"), icon: HiOutlineEye, onSelect: () => setViewing(row) }]}
      renderForm={(item, close) =>
        item ? (
          <PersonalizationProfileForm profile={item} handleClose={close} />
        ) : (
          <PersonalizationProfileForm handleClose={close} />
        )
      }
      onDelete={(id) => deleteProfileServerAction(id)}>
      <BreakdownList title={t("bySegment")} items={bySegment} emptyLabel={t("emptyBreakdown")} />
      <Modal
        size='lg'
        title={viewing ? profileLabel(viewing) : ""}
        open={viewing != null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        hideDefaultFooter={true}>
        {viewing ? <ProfileViewer profile={viewing} /> : null}
      </Modal>
    </CrudManager>
  );
};
