/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineDocumentText, HiOutlineLink, HiOutlinePlusCircle, HiOutlineTrash } from "react-icons/hi2";
import { formatDateTime } from "../../constants";
import type { IDevolutionEvidence } from "../../models/devolution.interface";

/** Evidencias (fotos, videos, documentos) con su enlace, quién la registró y cuándo. */
export const EvidenceList = ({
  evidences,
  onAdd,
  onDelete,
}: {
  evidences: IDevolutionEvidence[];
  onAdd: () => void;
  onDelete: (evidence: IDevolutionEvidence) => void;
}) => {
  const tEvidences = useTranslations("Administre.devolution.evidences");
  const tCommon = useTranslations("Administre.common");
  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-foreground'>{tEvidences("title")}</h3>
        <Buttons size='sm' variant='outline' onClick={onAdd} className='rounded-full'>
          <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
          {tEvidences("create")}
        </Buttons>
      </div>
      {evidences.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
          {tEvidences("emptyDescription")}
        </div>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {evidences.map((evidence) => (
            <li key={evidence.id} className='flex flex-col gap-2 rounded-xl border border-border/70 bg-background/60 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <span className='inline-flex items-center gap-1.5 text-sm font-semibold text-foreground'>
                  <HiOutlineDocumentText className='h-4 w-4 text-primary' aria-hidden='true' />
                  {evidence.evidence_type ? tEvidences(`types.${evidence.evidence_type}` as never) : "—"}
                </span>
                <Buttons
                  size='sm'
                  variant='ghost'
                  aria-label={tCommon("deleteAria", { name: evidence.evidence_type ?? `#${evidence.id}` })}
                  className='rounded-full text-destructive hover:text-destructive'
                  onClick={() => onDelete(evidence)}>
                  <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                </Buttons>
              </div>
              {evidence.description ? <p className='text-sm text-muted-foreground'>{evidence.description}</p> : null}
              <a
                href={evidence.resource_url}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 truncate text-sm text-primary underline-offset-4 hover:underline'>
                <HiOutlineLink className='h-4 w-4 shrink-0' aria-hidden='true' />
                <span className='truncate'>{evidence.resource_url}</span>
              </a>
              <p className='text-xs text-muted-foreground'>
                {evidence.recorded_by || "—"} · {formatDateTime(evidence.recorded_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
