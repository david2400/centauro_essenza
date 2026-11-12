/** @format */

"use client";

import { useTranslations } from "next-intl";

/**
 * Esqueleto mientras llega el código de un formulario o diálogo cargado bajo demanda
 * (`next/dynamic`). Ocupa más o menos lo mismo que una sección del formulario para que
 * el modal no salte de tamaño al terminar de cargar.
 */
export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useTranslations("Notifications");
  return (
    <div role='status' aria-live='polite' aria-busy='true' className='grid animate-pulse gap-4 py-2'>
      <span className='sr-only'>{t("loading")}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className='grid gap-3 rounded-xl border border-border p-4'>
          <div className='h-4 w-40 rounded-md bg-muted' />
          <div className='grid grid-cols-12 gap-3'>
            <div className='col-span-12 h-10 rounded-md bg-muted/70 sm:col-span-7' />
            <div className='col-span-12 h-10 rounded-md bg-muted/70 sm:col-span-5' />
          </div>
        </div>
      ))}
      <div className='flex justify-end gap-2'>
        <div className='h-10 w-24 rounded-full bg-muted' />
        <div className='h-10 w-36 rounded-full bg-muted' />
      </div>
    </div>
  );
}
