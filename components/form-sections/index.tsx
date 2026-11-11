/** @format */

"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { HiCheck, HiOutlineExclamationCircle } from "react-icons/hi2";
import { Switch } from "@repo/ui/switches/scenes/switch";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

export type SectionState = "complete" | "pending" | "error" | "optional";

export interface FormSectionItem {
  id: string;
  title: string;
  state: SectionState;
}

/** Tarjeta de sección del formulario: icono, título, ayuda, estado y contenido. */
export const SectionCard = ({
  id,
  icon: Icon,
  title,
  hint,
  badge,
  state,
  children,
  stateLabel,
  actions,
  contentClassName,
}: {
  id: string;
  icon: IconType;
  title: string;
  hint?: string;
  badge?: string;
  state?: SectionState;
  stateLabel?: string;
  /** Botones a la derecha del encabezado (p. ej. "Agregar"). */
  actions?: ReactNode;
  /** Clases del cuerpo; por defecto rejilla de 12 columnas con relleno. */
  contentClassName?: string;
  children: ReactNode;
}) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className={cn(
      "scroll-mt-[calc(var(--sticky-offset,5rem)+0.5rem)] rounded-2xl border bg-card shadow-sm transition-colors",
      state === "error" ? "border-destructive/50" : "border-border",
    )}>
    <header className='flex items-start gap-3 border-b border-border px-5 py-4'>
      <span className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15'>
        <Icon className='h-5 w-5' aria-hidden='true' />
      </span>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <h3 id={`${id}-title`} className='text-base font-semibold tracking-tight text-foreground'>
            {title}
          </h3>
          {badge ? (
            <span className='rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              {badge}
            </span>
          ) : null}
        </div>
        {hint ? <p className='mt-0.5 text-sm text-muted-foreground'>{hint}</p> : null}
      </div>
      {state && stateLabel ? <StateDot state={state} label={stateLabel} /> : null}
      {actions ? <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div> : null}
    </header>
    <div className={contentClassName ?? "grid grid-cols-12 gap-4 px-5 py-5"}>{children}</div>
  </section>
);

const StateDot = ({ state, label }: { state: SectionState; label: string }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      state === "complete" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      state === "error" && "bg-destructive/10 text-destructive",
      state === "pending" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      state === "optional" && "bg-muted text-muted-foreground",
    )}>
    {state === "complete" ? <HiCheck className='h-3.5 w-3.5' aria-hidden='true' /> : null}
    {state === "error" ? <HiOutlineExclamationCircle className='h-3.5 w-3.5' aria-hidden='true' /> : null}
    {label}
  </span>
);

/** Índice lateral: salta a cada sección, marca la visible y su estado. */
export const SectionNav = ({
  items,
  title,
  progressLabel,
}: {
  items: FormSectionItem[];
  title: string;
  progressLabel: string;
}) => {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map((item) => item.id).join(",");

  useEffect(() => {
    const targets = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element != null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [ids]);

  const required = items.filter((item) => item.state !== "optional");
  const done = required.filter((item) => item.state === "complete").length;
  const percent = required.length ? Math.round((done / required.length) * 100) : 100;

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label={title} className='grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{title}</p>
        <div className='mt-3 flex items-center justify-between text-xs text-muted-foreground'>
          <span>{progressLabel}</span>
          <span className='font-semibold tabular-nums text-foreground'>{percent}%</span>
        </div>
        <div
          className='mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted'
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}>
          <div className='h-full rounded-full bg-primary transition-all' style={{ width: `${percent}%` }} />
        </div>
      </div>
      <ol className='grid gap-0.5'>
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type='button'
              onClick={() => go(item.id)}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active === item.id ? "bg-primary/10 font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  item.state === "complete" && "bg-emerald-500 text-white",
                  item.state === "error" && "bg-destructive text-white",
                  (item.state === "pending" || item.state === "optional") && "border border-border bg-background text-muted-foreground",
                )}
                aria-hidden='true'>
                {item.state === "complete" ? <HiCheck className='h-3 w-3' /> : item.state === "error" ? "!" : index + 1}
              </span>
              <span className='truncate'>{item.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};

/** Opción en tarjeta (radio) con icono, título y descripción. */
export const ChoiceCard = ({
  icon: Icon,
  title,
  description,
  selected,
  disabled,
  onSelect,
  name,
  value,
}: {
  icon: IconType;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  name: string;
  value: string;
}) => (
  <label
    className={cn(
      "relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-all focus-within:ring-2 focus-within:ring-ring",
      selected ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" : "border-border hover:border-primary/50 hover:bg-muted/40",
      disabled && "cursor-not-allowed opacity-50 hover:border-border hover:bg-transparent",
    )}>
    <input
      type='radio'
      name={name}
      value={value}
      checked={selected}
      disabled={disabled}
      onChange={onSelect}
      className='sr-only'
    />
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}>
      <Icon className='h-5 w-5' aria-hidden='true' />
    </span>
    <span className='min-w-0'>
      <span className='block text-sm font-semibold text-foreground'>{title}</span>
      <span className='mt-0.5 block text-xs leading-relaxed text-muted-foreground'>{description}</span>
    </span>
    {selected ? (
      <span className='absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
        <HiCheck className='h-3 w-3' aria-hidden='true' />
      </span>
    ) : null}
  </label>
);

/** Control segmentado compacto (unidades, etc.). */
export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) => (
  <div role='radiogroup' aria-label={label} className='inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5'>
    {options.map((option) => (
      <button
        key={option.value}
        type='button'
        role='radio'
        aria-checked={value === option.value}
        title={option.title}
        onClick={() => onChange(option.value)}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}>
        {option.label}
      </button>
    ))}
  </div>
);

/** Barra de acciones fija al pie (guardar, cancelar) con un mensaje de estado a la izquierda. */
export const ActionBar = ({ message, children }: { message?: ReactNode; children: ReactNode }) => (
  <div className='sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur'>
    <div className='mr-auto min-w-0 text-sm text-muted-foreground'>{message}</div>
    {children}
  </div>
);

/** Estado vacío dentro de una sección: icono, título, texto y acción opcional. */
export const EmptyBlock = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: IconType;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className='col-span-12 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center'>
    <span className='flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground'>
      <Icon className='h-6 w-6' aria-hidden='true' />
    </span>
    <p className='text-sm font-semibold text-foreground'>{title}</p>
    {description ? <p className='max-w-md text-sm text-muted-foreground'>{description}</p> : null}
    {action ? <div className='mt-2'>{action}</div> : null}
  </div>
);

/** Fila de indicadores compactos (resumen de una pestaña). */
export const KpiStrip = ({
  items,
}: {
  items: { label: string; value: string; hint?: string; tone?: "good" | "warn" | "bad"; icon?: IconType }[];
}) => (
  <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm md:grid-cols-4'>
    {items.map(({ label, value, hint, tone, icon: Icon }) => (
      <div key={label} className='flex items-start gap-3 bg-card px-4 py-3'>
        {Icon ? (
          <span className='mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
            <Icon className='h-4 w-4' aria-hidden='true' />
          </span>
        ) : null}
        <div className='min-w-0'>
          <dt className='truncate text-xs text-muted-foreground'>{label}</dt>
          <dd
            className={cn(
              "truncate text-lg font-semibold tabular-nums text-foreground",
              tone === "good" && "text-emerald-700 dark:text-emerald-400",
              tone === "warn" && "text-amber-700 dark:text-amber-400",
              tone === "bad" && "text-destructive",
            )}>
            {value}
          </dd>
          {hint ? <p className='truncate text-xs text-muted-foreground'>{hint}</p> : null}
        </div>
      </div>
    ))}
  </dl>
);

/** Fila con interruptor: etiqueta, ayuda y estado (accesible como switch). */
export const ToggleRow = ({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <div className={cn("flex items-start justify-between gap-4 rounded-xl border border-border p-3", disabled && "opacity-60")}>
    <div className='min-w-0'>
      <label htmlFor={id} className='text-sm font-medium text-foreground'>
        {label}
      </label>
      {description ? <p id={`${id}-hint`} className='mt-0.5 text-xs text-muted-foreground'>{description}</p> : null}
    </div>
    <Switch
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
      aria-describedby={description ? `${id}-hint` : undefined}
      className='mt-0.5'
    />
  </div>
);

export { FormSection, ModalFormFooter, SwitchField } from "./modal-form";
