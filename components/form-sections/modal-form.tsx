/** @format */

"use client";

import type { ComponentType, ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import { cn } from "@/lib/utils";
import { ToggleRow } from "./index";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

/**
 * Bloque de un formulario dentro de un modal: icono, título, ayuda y campos en 12 columnas. Es la versión compacta
 * de `SectionCard` (que es para formularios de página completa con índice lateral).
 */
export const FormSection = ({
  icon: Icon,
  title,
  hint,
  badge,
  actions,
  className,
  children,
}: {
  icon: IconType;
  title: string;
  hint?: string;
  /** Etiqueta corta junto al título, p. ej. "Opcional". */
  badge?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <fieldset className={cn("min-w-0 rounded-xl border border-border bg-card p-4", className)}>
    <legend className='sr-only'>{title}</legend>
    <div className='mb-4 flex items-start gap-3'>
      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15'>
        <Icon className='h-4 w-4' aria-hidden='true' />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground'>
          {title}
          {badge ? (
            <span className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
              {badge}
            </span>
          ) : null}
        </p>
        {hint ? <p className='mt-0.5 text-xs text-muted-foreground'>{hint}</p> : null}
      </div>
      {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
    </div>
    <div className='grid grid-cols-12 gap-4'>{children}</div>
  </fieldset>
);

/**
 * Pie fijo de un formulario en modal: nota a la izquierda y Cancelar + acción principal a la derecha. Queda pegado al
 * borde inferior mientras el cuerpo del modal hace scroll (el cuerpo de `Modal` tiene `px-6`, por eso el `-mx-6`).
 */
export const ModalFormFooter = ({
  note,
  submitLabel,
  cancelLabel,
  onCancel,
  submitting,
  submitDisabled,
  extra,
  submitVariant = "default",
}: {
  note?: ReactNode;
  submitLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  /** Acciones secundarias junto a Cancelar (p. ej. "Guardar y crear otra"). */
  extra?: ReactNode;
  /** `danger` pinta la acción principal en rojo (rechazar, anular, eliminar). */
  submitVariant?: "default" | "danger";
}) => (
  <div className='sticky bottom-0 z-10 -mx-6 mt-1 flex flex-col-reverse gap-2 border-t border-border bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:flex-row sm:items-center sm:justify-between dark:bg-background/95'>
    <div className='min-w-0 text-xs text-muted-foreground'>{note}</div>
    <div className='flex flex-col-reverse gap-2 sm:flex-row'>
      {onCancel && cancelLabel ? (
        <Buttons type='button' variant='outline' className='rounded-full' onClick={onCancel} disabled={submitting}>
          {cancelLabel}
        </Buttons>
      ) : null}
      {extra}
      <Buttons
        type='submit'
        variant={submitVariant === "danger" ? "danger" : undefined}
        loading={submitting}
        disabled={submitDisabled}
        className='rounded-full sm:min-w-40'>
        {submitLabel}
      </Buttons>
    </div>
  </div>
);

/**
 * Interruptor conectado a react-hook-form. Acepta el valor como booleano o como "true"/"false" (los formularios
 * antiguos lo guardan como texto para un select Sí/No) y escribe de vuelta en el mismo formato que recibió.
 */
export const SwitchField = <TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  description,
  disabled,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => {
      const asText = typeof field.value === "string";
      return (
        <ToggleRow
          id={id}
          label={label}
          description={description}
          disabled={disabled}
          checked={field.value === true || field.value === "true"}
          onChange={(checked) => field.onChange(asText ? String(checked) : checked)}
        />
      );
    }}
  />
);
