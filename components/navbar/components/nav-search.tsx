"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BiSearch } from "react-icons/bi";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/modals/scenes/dialog/dialog";
import { Kbd } from "@repo/ui/kbds/scenes/kbd";
import { cn } from "@repo/ui/utils";
import { useRouter } from "@/shared/i18n/routing";
import { useNavSearchItems } from "../hooks/use-nav";
import type { NavSearchItem } from "../models/nav.types";
import { searchNav } from "../utils/nav.utils";

interface NavSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Buscador de páginas y acciones (Ctrl/⌘ + K). Se navega con flechas y Enter.
 * Usa el patrón combobox: el foco queda en el campo y la opción activa se
 * anuncia con `aria-activedescendant`.
 */
export function NavSearch({ open, onOpenChange }: NavSearchProps) {
  const t = useTranslations("Navigation.search");
  const router = useRouter();
  const all = useNavSearchItems();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  const results = React.useMemo(() => searchNav(all, query), [all, query]);
  const groups = React.useMemo(() => groupByContext(results, query ? t("results") : null), [results, query, t]);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => setActiveIndex(0), [query]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const go = (item: NavSearchItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    router.push(item.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(results.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  const optionId = (index: number) => `${listId}-opt-${index}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 sm:rounded-xl'>
        <DialogTitle className='sr-only'>{t("title")}</DialogTitle>
        <DialogDescription className='sr-only'>{t("description")}</DialogDescription>

        <div className='flex items-center gap-3 border-b border-border/70 px-4'>
          <BiSearch className='h-5 w-5 shrink-0 text-muted-foreground' aria-hidden='true' />
          <input
            autoFocus
            role='combobox'
            aria-expanded='true'
            aria-controls={listId}
            aria-activedescendant={results.length ? optionId(activeIndex) : undefined}
            aria-autocomplete='list'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("placeholder")}
            className='h-14 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground'
          />
          <Kbd className='hidden sm:inline-flex'>Esc</Kbd>
        </div>

        <div ref={listRef} id={listId} role='listbox' aria-label={t("title")} className='max-h-[min(60vh,26rem)] overflow-y-auto p-2'>
          {results.length === 0 ? (
            <p className='px-3 py-10 text-center text-sm text-muted-foreground'>{t("empty", { query })}</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} role='group' aria-label={group.label} className='pb-1'>
                <p className='px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70'>
                  {group.label}
                </p>
                {group.items.map(({ item, index: current }) => {
                  const Icon = item.icon;
                  const selected = current === activeIndex;
                  return (
                    <div
                      key={item.id}
                      id={optionId(current)}
                      role='option'
                      aria-selected={selected}
                      data-index={current}
                      onMouseMove={() => setActiveIndex(current)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground",
                        selected && "bg-primary/10 text-primary",
                      )}>
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground",
                          selected && "border-primary/30 text-primary",
                        )}>
                        <Icon className='h-4 w-4' aria-hidden='true' />
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate font-medium'>{item.label}</span>
                        {query && <span className='block truncate text-xs text-muted-foreground'>{item.context}</span>}
                      </span>
                      {selected && <Kbd className='hidden sm:inline-flex'>↵</Kbd>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className='hidden items-center gap-4 border-t border-border/70 bg-muted/40 px-4 py-2 text-xs text-muted-foreground sm:flex'>
          <span className='flex items-center gap-1.5'>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {t("navigate")}
          </span>
          <span className='flex items-center gap-1.5'>
            <Kbd>↵</Kbd>
            {t("open")}
          </span>
          <span className='flex items-center gap-1.5'>
            <Kbd>Esc</Kbd>
            {t("close")}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sin consulta: agrupa por sección (acciones primero, en el orden del menú).
 * Con consulta: una sola lista ordenada por relevancia; el grupo va en cada fila.
 */
function groupByContext(items: NavSearchItem[], resultsLabel: string | null) {
  const groups: { label: string; items: { item: NavSearchItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const label = resultsLabel ?? item.context;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ item, index });
    else groups.push({ label, items: [{ item, index }] });
  });
  return groups;
}
