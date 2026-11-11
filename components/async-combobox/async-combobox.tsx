/** @format */

"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { HiChevronUpDown, HiMagnifyingGlass, HiOutlineXMark } from "react-icons/hi2";
import { cn } from "@/lib/utils";

/** Opción del combobox. `data` lleva el objeto completo (SKU, producto…) para quien lo necesite. */
export type ComboOption<T = unknown> = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  data?: T;
};

export interface AsyncComboboxProps<T = unknown> {
  id?: string;
  /** Valor elegido (id). Vacío / null = sin selección. */
  value: string | number | null | undefined;
  onChange: (value: string, option: ComboOption<T> | null) => void;
  /** Busca opciones para el texto escrito. Lanza si falla (se muestra el error). */
  search: (query: string) => Promise<ComboOption<T>[]>;
  /** Resuelve la etiqueta de un valor ya guardado (al editar). */
  resolve?: (value: string) => Promise<ComboOption<T> | null>;
  /** Etiqueta conocida de antemano: evita la llamada a `resolve`. */
  initialOption?: ComboOption<T> | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  /** Caracteres mínimos antes de buscar (0 = lista inicial al abrir). */
  minChars?: number;
  debounceMs?: number;
  renderOption?: (option: ComboOption<T>, active: boolean) => ReactNode;
  className?: string;
  "aria-describedby"?: string;
  onBlur?: () => void;
}

/**
 * Selector con búsqueda en el servidor mientras se escribe (debounce, descarta
 * respuestas viejas, teclado y lector de pantalla). La lista se pinta debajo del
 * disparador, sin portal, para funcionar igual dentro de modales.
 */
export function AsyncCombobox<T = unknown>({
  id,
  value,
  onChange,
  search,
  resolve,
  initialOption = null,
  placeholder,
  searchPlaceholder,
  disabled = false,
  invalid = false,
  clearable = true,
  minChars = 0,
  debounceMs = 250,
  renderOption,
  className,
  onBlur,
  ...aria
}: AsyncComboboxProps<T>) {
  const t = useTranslations("Lookup");
  const autoId = useId();
  const baseId = id ?? `combo-${autoId}`;
  const listId = `${baseId}-list`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ComboOption<T>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<ComboOption<T> | null>(initialOption);

  const current = value == null ? "" : String(value);

  // Mantiene la etiqueta alineada con el valor (edición, reset del formulario…).
  useEffect(() => {
    if (!current) {
      setSelected(null);
      return;
    }
    if (selected?.value === current) return;
    if (initialOption?.value === current) {
      setSelected(initialOption);
      return;
    }
    if (!resolve) {
      setSelected({ value: current, label: `#${current}` });
      return;
    }
    let cancelled = false;
    resolve(current)
      .then((option) => {
        if (!cancelled) setSelected(option ?? { value: current, label: `#${current}` });
      })
      .catch(() => {
        if (!cancelled) setSelected({ value: current, label: `#${current}` });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, initialOption?.value]);

  const runSearch = useCallback(
    async (text: string) => {
      const request = ++requestRef.current;
      if (text.trim().length < minChars) {
        setOptions([]);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const found = await search(text.trim());
        if (request !== requestRef.current) return;
        setOptions(found);
        setActive(found.findIndex((option) => !option.disabled));
      } catch (cause) {
        if (request !== requestRef.current) return;
        setOptions([]);
        setError(cause instanceof Error && cause.message ? cause.message : t("error"));
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [search, minChars, t],
  );

  // Búsqueda con debounce mientras el panel está abierto.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void runSearch(query), query ? debounceMs : 0);
    return () => clearTimeout(timer);
  }, [open, query, runSearch, debounceMs]);

  // Cierra al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openPanel = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  function close() {
    setOpen(false);
    setActive(-1);
    requestRef.current++;
    onBlur?.();
  }

  const choose = (option: ComboOption<T>) => {
    if (option.disabled) return;
    setSelected(option);
    onChange(option.value, option);
    close();
  };

  const clear = () => {
    setSelected(null);
    onChange("", null);
  };

  const move = (step: number) => {
    if (options.length === 0) return;
    let next = active;
    for (let i = 0; i < options.length; i++) {
      next = (next + step + options.length) % options.length;
      if (!options[next]?.disabled) break;
    }
    setActive(next);
    document.getElementById(`${baseId}-opt-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      close();
    }
  };

  const status = loading
    ? t("loading")
    : error
      ? error
      : query.trim().length < minChars
        ? t("typeMore", { count: minChars })
        : options.length === 0
          ? t("empty")
          : null;

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex h-9 w-full items-center gap-1 rounded-md border border-gray-300 bg-white text-sm text-gray-900 shadow-xs transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
          invalid && "border-red-500 dark:border-red-400",
          disabled && "cursor-not-allowed opacity-50",
          open && "ring-2 ring-blue-500",
        )}>
        <button
          type='button'
          id={baseId}
          disabled={disabled}
          onClick={() => (open ? close() : openPanel())}
          aria-haspopup='listbox'
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-describedby={aria["aria-describedby"]}
          className='flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left outline-none'>
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : (placeholder ?? t("placeholder"))}
          </span>
          {selected?.hint ? <span className='hidden shrink-0 truncate text-xs text-muted-foreground sm:inline'>{selected.hint}</span> : null}
        </button>
        {clearable && selected && !disabled ? (
          <button
            type='button'
            onClick={clear}
            aria-label={t("clear")}
            className='rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground'>
            <HiOutlineXMark className='h-4 w-4' aria-hidden='true' />
          </button>
        ) : null}
        <HiChevronUpDown className='mr-2 h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
      </div>

      {open ? (
        <div className='absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800'>
          <div className='flex items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-700'>
            <HiMagnifyingGlass className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
            <input
              ref={inputRef}
              role='combobox'
              aria-expanded='true'
              aria-controls={listId}
              aria-autocomplete='list'
              aria-activedescendant={active >= 0 ? `${baseId}-opt-${active}` : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder ?? t("search")}
              className='h-10 w-full bg-transparent text-sm outline-none placeholder:text-gray-500'
            />
          </div>
          <ul id={listId} role='listbox' className='max-h-72 overflow-y-auto p-1'>
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${baseId}-opt-${index}`}
                role='option'
                aria-selected={option.value === current}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className={cn(
                  "cursor-pointer rounded-sm px-3 py-2 text-sm",
                  index === active && "bg-blue-50 dark:bg-gray-700",
                  option.value === current && "font-semibold",
                  option.disabled && "cursor-not-allowed opacity-50",
                )}>
                {renderOption ? (
                  renderOption(option, index === active)
                ) : (
                  <div className='flex items-center justify-between gap-3'>
                    <span className='min-w-0 truncate'>{option.label}</span>
                    {option.hint ? <span className='shrink-0 text-xs text-muted-foreground'>{option.hint}</span> : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {status ? (
            <p role='status' className={cn("px-3 py-4 text-center text-sm text-muted-foreground", error && "text-destructive")}>
              {status}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
