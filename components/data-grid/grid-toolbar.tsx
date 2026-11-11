/** @format */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Table } from "@tanstack/react-table";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/menu/scenes/dropdown-menu";
import { cn } from "@repo/ui/utils";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineMagnifyingGlass,
  HiOutlineViewColumns,
  HiXMark,
} from "react-icons/hi2";
import type { GridFilter } from "./types";

export type Density = "comfortable" | "compact";

interface GridToolbarProps<T> {
  table: Table<T>;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  /** `false` oculta la búsqueda (el backend del recurso todavía no busca). */
  searchable?: boolean;
  filters: GridFilter<T>[];
  filterValue: (id: string) => string;
  onFilter: (id: string, value: string) => void;
  density: Density;
  onDensity: (value: Density) => void;
  onExport?: () => void;
  exporting?: boolean;
  onRefresh?: () => void;
  hasActiveQuery: boolean;
  onReset: () => void;
  extra?: ReactNode;
}

const selectClass =
  "h-9 rounded-full border border-border/70 bg-background px-4 pr-8 text-sm text-foreground shadow-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export function GridToolbar<T>({
  table,
  search,
  onSearch,
  searchPlaceholder,
  searchable = true,
  filters,
  filterValue,
  onFilter,
  density,
  onDensity,
  onExport,
  exporting,
  onRefresh,
  hasActiveQuery,
  onReset,
  extra,
}: GridToolbarProps<T>) {
  const t = useTranslations("Grid");
  const [draft, setDraft] = useState(search);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza cuando la URL cambia desde fuera (atrás/adelante, limpiar).
  useEffect(() => setDraft(search), [search]);

  // Búsqueda con espera: no dispara una petición por cada tecla.
  useEffect(() => {
    if (draft === search) return;
    const timer = window.setTimeout(() => onSearch(draft.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [draft, search, onSearch]);

  // Atajo "/" para enfocar la búsqueda (como en GitHub o Linear).
  useEffect(() => {
    if (!searchable) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchable]);

  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {searchable ? (
          <label className='relative w-full sm:max-w-xs'>
            <span className='sr-only'>{t("search")}</span>
            <HiOutlineMagnifyingGlass
              className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden='true'
            />
            <input
              ref={inputRef}
              type='search'
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch(draft.trim());
                if (event.key === "Escape") setDraft("");
              }}
              placeholder={searchPlaceholder ?? t("searchPlaceholder")}
              className='h-9 w-full rounded-full border border-border/70 bg-background pl-9 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
            />
            <kbd className='pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:block'>
              /
            </kbd>
          </label>
        ) : null}

        {filters.map((filter) => (
          <label key={filter.id} className='flex items-center gap-2'>
            <span className='sr-only'>{filter.label}</span>
            <select
              value={filterValue(filter.id)}
              onChange={(event) => onFilter(filter.id, event.target.value)}
              className={cn(selectClass, filterValue(filter.id) && "border-primary/50 bg-primary/5")}>
              <option value=''>{t("allOf", { label: filter.label })}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {hasActiveQuery ? (
          <Buttons variant='link' size='sm' onClick={onReset} className='px-2'>
            <HiXMark className='h-4 w-4' aria-hidden='true' />
            {t("clearFilters")}
          </Buttons>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {extra}

        {onRefresh ? (
          <Buttons
            variant='outline'
            size='icon-sm'
            onClick={onRefresh}
            aria-label={t("refresh")}
            title={t("refresh")}
            className='rounded-full'>
            <HiOutlineArrowPath className='h-4 w-4' aria-hidden='true' />
          </Buttons>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Buttons variant='outline' size='sm' aria-label={t("view")} className='rounded-full'>
              <HiOutlineViewColumns className='h-4 w-4' aria-hidden='true' />
              <span className='hidden sm:inline'>{t("view")}</span>
            </Buttons>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuLabel>{t("columns")}</DropdownMenuLabel>
            {hideable.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                onSelect={(event) => event.preventDefault()}>
                {column.columnDef.meta?.label ?? column.id}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className='flex items-center gap-2'>
              <HiOutlineAdjustmentsHorizontal className='h-4 w-4' aria-hidden='true' />
              {t("density")}
            </DropdownMenuLabel>
            {(["comfortable", "compact"] as const).map((value) => (
              <DropdownMenuCheckboxItem
                key={value}
                checked={density === value}
                onCheckedChange={() => onDensity(value)}>
                {t(`densities.${value}`)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onExport ? (
          <Buttons variant='outline' size='sm' onClick={onExport} loading={exporting} className='rounded-full'>
            <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />
            <span className='hidden sm:inline'>{t("export")}</span>
          </Buttons>
        ) : null}
      </div>
    </div>
  );
}
