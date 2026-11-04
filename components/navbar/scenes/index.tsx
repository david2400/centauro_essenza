"use client";

import * as React from "react";
import {
  BiBox,
  BiCart,
  BiReceipt,
  BiPurchaseTag,
  BiListCheck,
  BiCategory,
  BiHome,
  BiMenu,
  BiLogOut,
  BiUndo,
  BiCar,
  BiTrendingUp,
} from "react-icons/bi";
import { MenuModal } from "@repo/ui/modals/scenes/menu/menuModal";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/menu/scenes/dropdown-menu";
import { Avatar, AvatarFallback } from "@repo/ui/avatar/scenes/avatar";
import { cerrarSesion, usuarioActual, type IUsuarioActual } from "@/server/domains/auth/sesion";
import { cn } from "@repo/ui/utils";
import { Link, usePathname } from "@/shared/i18n/routing";

/**
 * Rutas del menú principal.
 *
 * Los `href` NO llevan prefijo de idioma: el `Link` de next-intl añade el
 * locale activo. Antes estaban escritos como `/es/...`, lo que dejaba al
 * usuario de la versión en inglés fuera de su idioma en cada clic.
 */
type NavLeaf = { label: string; href: string };
type NavItem = {
  label: string;
  icon: React.ReactNode;
  href?: string;
  options?: NavLeaf[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Panel",
    href: "/",
    icon: <BiHome className='h-4 w-4' />,
  },
  {
    label: "Ventas",
    icon: <BiCart className='h-4 w-4' />,
    options: [
      { label: "Punto de venta", href: "/ventas/pos" },
      { label: "Órdenes", href: "/ventas/orders" },
      { label: "Cajas y turnos", href: "/ventas/cash-registers" },
      { label: "Tiendas / sedes", href: "/ventas/stores" },
      { label: "Pagos", href: "/ventas/payments" },
      { label: "Medios de pago", href: "/ventas/payment-methods" },
    ],
  },
  {
    label: "Facturación",
    icon: <BiReceipt className='h-4 w-4' />,
    options: [
      { label: "Facturas", href: "/facturacion/invoices" },
      { label: "Numeración DIAN", href: "/facturacion/resolutions" },
      { label: "Impuestos", href: "/facturacion/tax-rates" },
      { label: "Configuración", href: "/facturacion/settings" },
    ],
  },
  {
    label: "Catálogo",
    icon: <BiCategory className='h-4 w-4' />,
    options: [
      { label: "Productos", href: "/catalogo/products" },
      { label: "Marcas", href: "/catalogo/brand" },
      { label: "Categorías", href: "/catalogo/category" },
      { label: "Subcategorías", href: "/catalogo/subcategory" },
    ],
  },
  {
    label: "Inventario",
    icon: <BiBox className='h-4 w-4' />,
    options: [
      { label: "Movimientos", href: "/inventory/inventory-movements" },
      { label: "Bodegas", href: "/inventory/warehouses" },
      { label: "Proveedores", href: "/inventory/suppliers" },
    ],
  },
  {
    label: "Postventa",
    icon: <BiUndo className='h-4 w-4' />,
    options: [
      { label: "Devoluciones", href: "/postventa/devolutions" },
      { label: "Motivos de devolución", href: "/postventa/devolution-motives" },
      { label: "Métodos de devolución", href: "/postventa/return-methods" },
      { label: "Métodos de reembolso", href: "/postventa/refund-methods" },
    ],
  },
  {
    label: "Logística",
    icon: <BiCar className='h-4 w-4' />,
    options: [
      { label: "Despachos", href: "/logistica/dispatches" },
      { label: "Transportadoras", href: "/logistica/carriers" },
      { label: "Costos de envío", href: "/logistica/shipping-costs" },
      { label: "Tiempos de entrega", href: "/logistica/delivery-estimates" },
    ],
  },
  {
    label: "Marketing",
    icon: <BiPurchaseTag className='h-4 w-4' />,
    options: [
      { label: "Cupones", href: "/marketing/coupons" },
      { label: "Reseñas", href: "/marketing/reviews" },
    ],
  },
  {
    label: "Contenido y crecimiento",
    icon: <BiTrendingUp className='h-4 w-4' />,
    options: [
      { label: "Páginas (CMS)", href: "/contenido/pages" },
      { label: "Recomendaciones", href: "/contenido/recommendations" },
      { label: "Búsquedas", href: "/contenido/search-queries" },
      { label: "Personalización", href: "/contenido/personalization" },
    ],
  },
  {
    label: "Ficha técnica",
    icon: <BiListCheck className='h-4 w-4' />,
    options: [
      { label: "Atributos", href: "/fichaTecnica/attributes" },
      { label: "Plantillas de producto", href: "/fichaTecnica/templates" },
      { label: "Unidades de medida", href: "/fichaTecnica/unit-measurements" },
    ],
  },
];

const linkClasses =
  "group flex items-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-border/70 hover:bg-background/80 hover:text-foreground";
const activeLinkClasses =
  "border-border/70 bg-background text-foreground shadow-sm";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon,
  onNavigate,
  active,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onNavigate?: () => void;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(linkClasses, active && activeLinkClasses)}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const options = item.options ?? [];
  const groupActive = options.some((option) => isActive(pathname, option.href));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-label={item.label}
          className={cn(
            linkClasses,
            "data-[state=open]:border-border/70 data-[state=open]:bg-background/80 data-[state=open]:text-foreground",
            groupActive && activeLinkClasses,
          )}>
          {item.icon}
          <span>{item.label}</span>
          <span aria-hidden='true' className='text-muted-foreground/80'>
            ▾
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' sideOffset={8} className='min-w-[14rem] p-2'>
        {options.map((option) => {
          const active = isActive(pathname, option.href);
          return (
            <DropdownMenuItem key={option.href} asChild className='px-3 py-2'>
              <Link
                href={option.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg text-sm no-underline",
                  active && "font-semibold text-foreground",
                )}>
                {option.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavList({
  orientation = "horizontal",
  onNavigate,
  pathname,
}: {
  orientation?: "horizontal" | "vertical";
  onNavigate?: () => void;
  pathname: string;
}) {
  const baseClasses =
    orientation === "vertical"
      ? "flex flex-col gap-1"
      : "flex flex-row items-center gap-1";

  return (
    <ul className={cn("relative z-40", baseClasses)}>
      {NAV_ITEMS.map((item) => (
        <li key={item.label}>
          {item.options?.length ? (
            <NavGroup item={item} pathname={pathname} onNavigate={onNavigate} />
          ) : (
            <NavLink
              href={item.href ?? "/"}
              label={item.label}
              icon={item.icon}
              onNavigate={onNavigate}
              active={isActive(pathname, item.href ?? "/")}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Iniciales para el avatar: "Ana Prueba" -> "AP", "demo" -> "DE". */
function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
  return (partes[0] ?? "?").slice(0, 2).toUpperCase();
}

function ProfileMenu() {
  const [usuario, setUsuario] = React.useState<IUsuarioActual | null>(null);
  const [saliendo, startSalir] = React.useTransition();

  React.useEffect(() => {
    let vivo = true;
    usuarioActual()
      .then((u) => {
        if (vivo) setUsuario(u);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const nombre = usuario?.nombre ?? "Usuario";
  const contexto = [usuario?.empresa, usuario?.aplicacion].filter(Boolean).join(" · ");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Buttons
          variant='ghost'
          size='icon'
          aria-label={`Abrir menú de la cuenta de ${nombre}`}
          className='rounded-full border border-transparent p-0 transition hover:border-border/70'>
          <Avatar className='h-10 w-10 border border-border/70 shadow-sm shadow-primary/30'>
            <AvatarFallback className='bg-primary/10 text-sm font-semibold text-primary'>
              {iniciales(nombre)}
            </AvatarFallback>
          </Avatar>
        </Buttons>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-64 p-2' align='end'>
        <div className='flex items-center gap-3 px-3 py-2'>
          <Avatar className='h-10 w-10 border border-border/70'>
            <AvatarFallback className='bg-primary/10 text-sm font-semibold text-primary'>
              {iniciales(nombre)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-foreground'>{nombre}</p>
            {usuario?.usuario && usuario.usuario !== nombre && (
              <p className='truncate text-xs text-muted-foreground'>@{usuario.usuario}</p>
            )}
            {contexto && <p className='truncate text-xs text-muted-foreground'>{contexto}</p>}
          </div>
        </div>
        {usuario?.roles?.length ? (
          <div className='flex flex-wrap gap-1 px-3 pb-2'>
            {usuario.roles.map((rol) => (
              <span
                key={rol}
                className='rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground'>
                {rol}
              </span>
            ))}
          </div>
        ) : null}
        <DropdownMenuSeparator className='my-2' />
        <DropdownMenuItem
          className='rounded-lg px-3 py-2 text-sm text-destructive focus:text-destructive'
          disabled={saliendo}
          onSelect={(e) => {
            // Se deja el menu abierto mientras se cierra la sesion (muestra "Cerrando sesión…").
            e.preventDefault();
            startSalir(() => cerrarSesion());
          }}>
          <BiLogOut className='mr-2 h-4 w-4' aria-hidden='true' />
          {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Nav() {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const pathname = usePathname();

  // La pagina de login ocupa toda la pantalla, sin barra.
  if (pathname.startsWith("/auth")) return null;

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70'>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground'>
        Saltar al contenido
      </a>

      <div className='mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6'>
        <Link
          href='/'
          className='text-lg font-semibold tracking-tight text-foreground'>
          Essenza
        </Link>

        <nav aria-label='Navegación principal' className='hidden lg:flex'>
          <NavList pathname={pathname} />
        </nav>

        <div className='flex items-center gap-4'>
          <div className='lg:hidden'>
            <Buttons
              variant='ghost'
              size='icon'
              aria-label='Abrir menú principal'
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}>
              <BiMenu className='h-6 w-6' aria-hidden='true' />
            </Buttons>
          </div>

          <ProfileMenu />
        </div>
      </div>

      <MenuModal
        placement='left'
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        className='w-80'
        title='Menú principal'>
        <nav aria-label='Navegación principal' className='flex flex-col gap-3 py-2'>
          <NavList
            orientation='vertical'
            pathname={pathname}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </nav>
      </MenuModal>
    </header>
  );
}
