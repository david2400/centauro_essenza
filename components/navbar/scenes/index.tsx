"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BiChevronsLeft, BiChevronsRight, BiMenu, BiSearch } from "react-icons/bi";
import { Kbd, KbdGroup } from "@repo/ui/kbds/scenes/kbd";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui/sheets/scenes/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip/scenes/tooltip";
import { cn } from "@repo/ui/utils";
import { Link, usePathname } from "@/shared/i18n/routing";
import { NavSearch } from "../components/nav-search";
import { NavTree } from "../components/nav-tree";
import { ProfileMenu } from "../components/profile-menu";
import { useHotkey, useModKey, useSidebarCollapsed } from "../hooks/use-nav";

/** La página de login va a pantalla completa, sin barra ni menú. */
function useHidden() {
  return usePathname().startsWith("/auth");
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Navigation");
  return (
    <Link
      href='/'
      aria-label={t("brand")}
      className='flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30'>
        E
      </span>
      {!compact && <span className='text-base font-semibold tracking-tight text-foreground'>{t("brand")}</span>}
    </Link>
  );
}

/**
 * Barra superior: marca, buscador (Ctrl/⌘ + K) y cuenta. En pantallas pequeñas
 * abre el menú lateral como panel deslizable.
 */
export function Nav() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const hidden = useHidden();
  const mod = useModKey();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  useHotkey("k", () => setSearchOpen((open) => !open), { allowInFields: true });

  if (hidden) return null;

  const openSearchFromMobile = () => {
    setMobileOpen(false);
    setSearchOpen(true);
  };

  return (
    <header className='sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70'>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground'>
        {t("skipToContent")}
      </a>

      <div className='flex h-14 w-full items-center gap-3 px-3 sm:px-4'>
        <button
          type='button'
          aria-label={t("openMenu")}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className='flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 lg:hidden'>
          <BiMenu className='h-5 w-5' aria-hidden='true' />
        </button>

        <BrandMark />

        <button
          type='button'
          onClick={() => setSearchOpen(true)}
          aria-label={t("search.trigger")}
          aria-haspopup='dialog'
          aria-keyshortcuts='Control+K Meta+K'
          className='ml-auto flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-full sm:max-w-sm sm:px-3 lg:ml-[5.5rem]'>
          <BiSearch className='h-4 w-4 shrink-0' aria-hidden='true' />
          <span className='hidden flex-1 truncate text-left sm:inline'>{t("search.trigger")}</span>
          <KbdGroup className='hidden sm:inline-flex'>
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </button>

        <div className='flex items-center sm:ml-auto'>
          <ProfileMenu />
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side='left' className='w-[19rem] gap-0 p-0 sm:max-w-[19rem]'>
          <SheetHeader className='border-b border-border/60 px-4 py-3'>
            <SheetTitle className='sr-only'>{t("mainNav")}</SheetTitle>
            <SheetDescription className='sr-only'>{t("mobileDescription")}</SheetDescription>
            <BrandMark />
          </SheetHeader>
          <div className='px-3 pt-3'>
            <button
              type='button'
              onClick={openSearchFromMobile}
              className='flex h-10 w-full items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground'>
              <BiSearch className='h-4 w-4' aria-hidden='true' />
              {t("search.trigger")}
            </button>
          </div>
          <nav aria-label={t("mainNav")} className='flex-1 overflow-y-auto px-3 py-4'>
            <NavTree pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
        </SheetContent>
      </Sheet>

      <NavSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

/**
 * Menú lateral de escritorio (desde `lg`). Se contrae a íconos con el botón
 * inferior o con Ctrl/⌘ + B; la preferencia queda guardada en el navegador.
 */
export function SideNav() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const hidden = useHidden();
  const mod = useModKey();
  const { collapsed, toggle } = useSidebarCollapsed();

  useHotkey("b", toggle);

  if (hidden) return null;

  const toggleLabel = collapsed ? t("expand") : t("collapse");
  const ToggleIcon = collapsed ? BiChevronsRight : BiChevronsLeft;

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-14 z-30 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col border-r border-border/60 bg-background/60 transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[4.25rem]" : "w-[15.5rem]",
      )}>
      <nav aria-label={t("mainNav")} className='flex-1 [scrollbar-width:thin] overflow-y-auto overflow-x-hidden px-3 py-4'>
        <NavTree pathname={pathname} collapsed={collapsed} />
      </nav>
      <div className='border-t border-border/60 p-3'>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              onClick={toggle}
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              aria-keyshortcuts='Control+B Meta+B'
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40",
                collapsed && "justify-center px-0",
              )}>
              <ToggleIcon className='h-[1.15rem] w-[1.15rem] shrink-0' aria-hidden='true' />
              {!collapsed && <span className='flex-1 truncate text-left'>{toggleLabel}</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side='right' sideOffset={10}>
            <span className='flex items-center gap-2'>
              {toggleLabel}
              <KbdGroup>
                <Kbd>{mod}</Kbd>
                <Kbd>B</Kbd>
              </KbdGroup>
            </span>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
