/** @format */

import type { ReactNode } from "react";
import {
  HiOutlineChartBar,
  HiOutlineShoppingBag,
  HiOutlineTruck,
} from "react-icons/hi2";

const PUNTOS = [
  {
    icon: HiOutlineShoppingBag,
    titulo: "Catálogo y ventas",
    texto: "Productos, inventario, órdenes y facturación en un solo lugar.",
  },
  {
    icon: HiOutlineTruck,
    titulo: "Logística y postventa",
    texto: "Envíos, devoluciones y atención a tus clientes.",
  },
  {
    icon: HiOutlineChartBar,
    titulo: "Marketing y resultados",
    texto: "Promociones, contenido y métricas de tu tienda.",
  },
];

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
        E
      </span>
      <span className={claro ? "text-lg font-semibold text-white" : "text-lg font-semibold text-foreground"}>
        Essenza
      </span>
    </div>
  );
}

/**
 * Pantalla de acceso a dos columnas: panel de marca (solo en pantallas grandes) y el
 * formulario centrado. Sin hooks: sirve para el login OIDC y el de usuario/contraseña.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className='grid min-h-screen lg:grid-cols-[1.1fr_1fr]'>
      <aside className='relative hidden overflow-hidden bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary-border))] to-[hsl(224_60%_22%)] p-12 text-white lg:flex lg:flex-col lg:justify-between'>
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
            <h2 className='text-4xl font-semibold leading-tight tracking-tight'>
              Tu tienda, bajo control.
            </h2>
            <p className='text-base text-white/80'>
              Entra con tu cuenta de Essenza y administra la tienda con los permisos de tu rol.
            </p>
          </div>
          <ul className='space-y-4'>
            {PUNTOS.map(({ icon: Icono, titulo, texto }) => (
              <li key={titulo} className='flex items-start gap-4'>
                <span className='grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20'>
                  <Icono className='h-5 w-5' aria-hidden='true' />
                </span>
                <div>
                  <p className='font-medium'>{titulo}</p>
                  <p className='text-sm text-white/70'>{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className='relative text-xs text-white/60'>© {new Date().getFullYear()} Essenza</p>
      </aside>

      <section className='flex items-center justify-center px-4 py-12 sm:px-8'>
        <div className='w-full max-w-sm space-y-8'>
          <div className='lg:hidden'>
            <Marca />
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}

/** Aviso de sesion vencida (llega con ?expirada=1 desde el middleware o un 401). */
export function AvisoSesionVencida() {
  return (
    <div
      role='status'
      className='flex items-start gap-3 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'>
      <svg viewBox='0 0 20 20' fill='currentColor' className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true'>
        <path
          fillRule='evenodd'
          d='M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12.5a.75.75 0 0 0-1.5 0v5a.75.75 0 0 0 1.5 0v-5ZM10 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'
          clipRule='evenodd'
        />
      </svg>
      <p>Tu sesión venció o no está activa. Vuelve a iniciar sesión para continuar donde estabas.</p>
    </div>
  );
}
