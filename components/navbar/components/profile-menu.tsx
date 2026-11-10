"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BiChevronDown, BiLogOut } from "react-icons/bi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/menu/scenes/dropdown-menu";
import { Avatar, AvatarFallback } from "@repo/ui/avatar/scenes/avatar";
import { cerrarSesion, usuarioActual, type IUsuarioActual } from "@/server/domains/auth/sesion";
import { initials } from "../utils/nav.utils";

/** Menú de la cuenta: identidad, empresa, roles y cierre de sesión. */
export function ProfileMenu() {
  const t = useTranslations("Navigation.account");
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

  const nombre = usuario?.nombre ?? t("defaultName");
  const contexto = [usuario?.empresa, usuario?.aplicacion].filter(Boolean).join(" · ");

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-label={t("open", { name: nombre })}
          className='flex items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-2 outline-none transition-colors hover:border-border/70 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:border-border/70 data-[state=open]:bg-muted/60'>
          <Avatar className='h-8 w-8 border border-border/70'>
            <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>{initials(nombre)}</AvatarFallback>
          </Avatar>
          <span className='hidden max-w-[10rem] flex-col text-left leading-tight md:flex'>
            <span className='truncate text-sm font-medium text-foreground'>{nombre}</span>
            {usuario?.empresa && <span className='truncate text-[11px] text-muted-foreground'>{usuario.empresa}</span>}
          </span>
          <BiChevronDown className='hidden h-4 w-4 text-muted-foreground md:block' aria-hidden='true' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-64 p-2' align='end' sideOffset={8}>
        <div className='flex items-center gap-3 px-2.5 py-2'>
          <Avatar className='h-10 w-10 border border-border/70'>
            <AvatarFallback className='bg-primary/10 text-sm font-semibold text-primary'>{initials(nombre)}</AvatarFallback>
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
          <div className='flex flex-wrap gap-1 px-2.5 pb-2'>
            {usuario.roles.map((rol) => (
              <span
                key={rol}
                className='rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground'>
                {rol}
              </span>
            ))}
          </div>
        ) : null}
        <DropdownMenuSeparator className='my-1.5' />
        <DropdownMenuItem
          className='rounded-lg px-2.5 py-2 text-sm text-destructive focus:text-destructive'
          disabled={saliendo}
          onSelect={(e) => {
            // El menú sigue abierto mientras se cierra la sesión (muestra "Cerrando sesión…").
            e.preventDefault();
            startSalir(() => cerrarSesion());
          }}>
          <BiLogOut className='mr-2 h-4 w-4' aria-hidden='true' />
          {saliendo ? t("loggingOut") : t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
