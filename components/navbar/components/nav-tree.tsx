"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BiChevronDown } from "react-icons/bi";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/collapse/scenes/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui/menu/scenes/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip/scenes/tooltip";
import { cn } from "@repo/ui/utils";
import { Link } from "@/shared/i18n/routing";
import { NAV_SECTIONS } from "../config/nav-items";
import type { NavEntry } from "../models/nav.types";
import { activeEntryKey, entryIsActive, isActive } from "../utils/nav.utils";

const rowBase =
  "group/row relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40";
const rowActive = "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";
const iconBase = "h-[1.15rem] w-[1.15rem] shrink-0";

interface NavTreeProps {
  pathname: string;
  /** Solo íconos; los grupos se abren como menú flotante a la derecha. */
  collapsed?: boolean;
  /** Se llama al elegir una página (el menú móvil se cierra). */
  onNavigate?: () => void;
}

/** Árbol de navegación compartido por el sidebar de escritorio y el menú móvil. */
export function NavTree({ pathname, collapsed = false, onNavigate }: NavTreeProps) {
  const t = useTranslations("Navigation");
  const currentKey = activeEntryKey(NAV_SECTIONS, pathname);
  const [openKeys, setOpenKeys] = React.useState<Set<string>>(() => new Set(currentKey ? [currentKey] : []));

  // Al navegar (por ejemplo desde el buscador) se abre el grupo de la página nueva.
  React.useEffect(() => {
    if (!currentKey) return;
    setOpenKeys((prev) => (prev.has(currentKey) ? prev : new Set(prev).add(currentKey)));
  }, [currentKey]);

  const setOpen = (key: string, open: boolean) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <div className='flex flex-col gap-5'>
      {NAV_SECTIONS.map((section) => (
        <div key={section.key} className='flex flex-col gap-1'>
          {!section.untitled &&
            (collapsed ? (
              <div className='mx-auto mb-1 h-px w-6 bg-border' aria-hidden='true' />
            ) : (
              <p className='px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70'>
                {t(`sections.${section.key}`)}
              </p>
            ))}
          <ul className='flex flex-col gap-0.5'>
            {section.entries.map((entry) => (
              <li key={entry.key}>
                {collapsed ? (
                  <CollapsedEntry entry={entry} pathname={pathname} onNavigate={onNavigate} />
                ) : (
                  <ExpandedEntry
                    entry={entry}
                    pathname={pathname}
                    open={openKeys.has(entry.key)}
                    onOpenChange={(open) => setOpen(entry.key, open)}
                    onNavigate={onNavigate}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ExpandedEntry({
  entry,
  pathname,
  open,
  onOpenChange,
  onNavigate,
}: {
  entry: NavEntry;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Navigation");
  const Icon = entry.icon;
  const label = t(`groups.${entry.key}`);
  const active = entryIsActive(entry, pathname);

  if (entry.href) {
    return (
      <Link
        href={entry.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(rowBase, active && rowActive)}>
        <Icon className={iconBase} aria-hidden='true' />
        <span className='truncate'>{label}</span>
      </Link>
    );
  }

  const items = entry.items ?? [];
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className={cn(rowBase, active && !open && rowActive, active && open && "text-foreground")}>
        <Icon className={cn(iconBase, active && "text-primary")} aria-hidden='true' />
        <span className='flex-1 truncate text-left'>{label}</span>
        <BiChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200", open && "rotate-180")}
          aria-hidden='true'
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <ul className='ml-[1.3rem] mt-0.5 flex flex-col gap-0.5 border-l border-border/70 py-0.5 pl-2.5'>
          {items.map((leaf) => {
            const leafActive = isActive(pathname, leaf.href);
            return (
              <li key={leaf.href}>
                <Link
                  href={leaf.href}
                  onClick={onNavigate}
                  aria-current={leafActive ? "page" : undefined}
                  className={cn(
                    "relative block truncate rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
                    leafActive &&
                      "bg-primary/10 font-medium text-primary hover:bg-primary/15 hover:text-primary before:absolute before:-left-[11px] before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-full before:bg-primary",
                  )}>
                  {t(`items.${entry.key}.${leaf.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CollapsedEntry({
  entry,
  pathname,
  onNavigate,
}: {
  entry: NavEntry;
  pathname: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Navigation");
  const Icon = entry.icon;
  const label = t(`groups.${entry.key}`);
  const active = entryIsActive(entry, pathname);
  const railClasses = cn(rowBase, "justify-center px-0 py-2.5", active && rowActive);

  if (entry.href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={entry.href}
            onClick={onNavigate}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={railClasses}>
            <Icon className={iconBase} aria-hidden='true' />
          </Link>
        </TooltipTrigger>
        <TooltipContent side='right' sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type='button' aria-label={label} className={cn(railClasses, "data-[state=open]:bg-muted")}>
          <Icon className={iconBase} aria-hidden='true' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side='right' align='start' sideOffset={10} className='min-w-[13rem] p-1.5'>
        <DropdownMenuLabel className='px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
          {label}
        </DropdownMenuLabel>
        {(entry.items ?? []).map((leaf) => {
          const leafActive = isActive(pathname, leaf.href);
          return (
            <DropdownMenuItem key={leaf.href} asChild className='rounded-md px-2.5 py-1.5'>
              <Link
                href={leaf.href}
                onClick={onNavigate}
                aria-current={leafActive ? "page" : undefined}
                className={cn("w-full text-sm no-underline", leafActive && "font-medium text-primary")}>
                {t(`items.${entry.key}.${leaf.key}`)}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
