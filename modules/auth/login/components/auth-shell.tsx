/** @format */

"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineShoppingBag,
  HiOutlineTruck,
} from "react-icons/hi2";

const PUNTOS = [
  { id: "catalog", icon: HiOutlineShoppingBag },
  { id: "logistics", icon: HiOutlineTruck },
  { id: "marketing", icon: HiOutlineChartBar },
] as const;

/** Nombre de la marca: no se traduce. */
const MARCA = "Essenza";

function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <div className='flex items-center gap-3'>
      <span
        className={
          claro
            ? "grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/30"
            : "grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-md shadow-primary/30"
        }
        aria-hidden='true'>
        {MARCA.charAt(0)}
      </span>
      <span className={claro ? "text-lg font-semibold text-white" : "text-lg font-semibold text-foreground"}>
        {MARCA}
      </span>
    </div>
  );
}

/**
 * Pantalla de acceso a dos columnas: panel de marca (solo en pantallas grandes) y el
 * formulario centrado (el `main` lo pone el layout). El panel de marca no lleva encabezados para que el `h1`
 * del formulario sea el primero de la página.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Login.shell");
  return (
    <div className='grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]'>
      <aside
        aria-label={t("asideLabel")}
        className='relative hidden overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-border))] to-[hsl(224_60%_22%)] p-12 text-white lg:flex lg:flex-col lg:justify-between'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]'
        />
        <div aria-hidden='true' className='pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl' />
        <div aria-hidden='true' className='pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/20 blur-3xl' />

        <div className='relative'>
          <Marca claro />
        </div>

        <div className='relative max-w-md space-y-8'>
          <div className='space-y-3'>
            <p className='text-4xl font-semibold leading-tight tracking-tight'>{t("headline")}</p>
            <p className='text-base text-white/85'>{t("lead")}</p>
          </div>
          <ul className='space-y-4'>
            {PUNTOS.map(({ id, icon: Icono }) => (
              <li key={id} className='flex items-start gap-4'>
                <span className='grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20'>
                  <Icono className='h-5 w-5' aria-hidden='true' />
                </span>
                <div>
                  <p className='font-medium'>{t(`points.${id}.title`)}</p>
                  <p className='text-sm text-white/75'>{t(`points.${id}.text`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className='relative text-xs text-white/70'>{t("copyright", { year: new Date().getFullYear() })}</p>
      </aside>

      <section aria-labelledby='login-title' className='flex items-center justify-center px-4 py-12 sm:px-8'>
        <div className='w-full max-w-sm space-y-8'>
          <div className='lg:hidden'>
            <Marca />
          </div>
          <div className='space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8'>{children}</div>
          <p className='text-center text-xs text-muted-foreground lg:hidden'>
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </section>
    </div>
  );
}

/** Aviso de sesión vencida (llega con ?expirada=1 desde el middleware o un 401). */
export function AvisoSesionVencida() {
  const t = useTranslations("Login");
  return (
    <div
      role='status'
      className='flex items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'>
      <HiOutlineClock className='mt-0.5 h-5 w-5 shrink-0' aria-hidden='true' />
      <div className='space-y-1'>
        <p className='font-semibold'>{t("expired.title")}</p>
        <p>{t("expired.text")}</p>
      </div>
    </div>
  );
}
