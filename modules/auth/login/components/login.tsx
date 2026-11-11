"use client";

import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HiArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineExclamationCircle,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { iniciarSesionOidc } from "@/server/domains/auth/sesion";
import { AuthShell, AvisoSesionVencida } from "./auth-shell";

/** Códigos de error que Auth.js agrega a la página de login (`?error=`) y que tienen mensaje propio. */
const ERRORES_CONOCIDOS = ["AccessDenied", "Configuration"] as const;
type ErrorConocido = (typeof ERRORES_CONOCIDOS)[number];

/** Solo se muestra el código si tiene forma de código (evita pintar texto arbitrario de la URL). */
const codigoSeguro = (valor: string | null) => (valor && /^[A-Za-z]{1,40}$/.test(valor) ? valor : null);

function BotonContinuar() {
  const t = useTranslations("Login");
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type='submit'
        disabled={pending}
        aria-busy={pending}
        aria-describedby='login-secure-note'
        autoFocus
        className='group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-80 motion-reduce:transition-none'>
        {pending ? (
          <>
            <span
              className='h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground motion-reduce:animate-none'
              aria-hidden='true'
            />
            {t("redirecting")}
          </>
        ) : (
          <>
            {t("continue")}
            <HiArrowRight
              className='h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none'
              aria-hidden='true'
            />
          </>
        )}
      </button>
      {/* Anuncia el cambio a lectores de pantalla: el botón deshabilitado no siempre se lee. */}
      <p className='sr-only' aria-live='polite'>
        {pending ? t("redirectingAnnouncement") : ""}
      </p>
    </>
  );
}

function AvisoError({ codigo }: { codigo: string }) {
  const t = useTranslations("Login.errors");
  const conocido = (ERRORES_CONOCIDOS as readonly string[]).includes(codigo) ? (codigo as ErrorConocido) : null;
  return (
    <div
      role='alert'
      className='flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground'>
      <HiOutlineExclamationCircle className='mt-0.5 h-5 w-5 shrink-0 text-destructive' aria-hidden='true' />
      <div className='space-y-1'>
        <p className='font-semibold'>{t("title")}</p>
        <p className='text-muted-foreground'>{conocido ? t(conocido) : t("default")}</p>
        <p className='text-xs text-muted-foreground'>{t("code", { code: codigo })}</p>
      </div>
    </div>
  );
}

/** La contraseña se escribe en access_control (portal de acceso), nunca en este panel. */
export function Login({ callbackUrl, expirada = false }: { callbackUrl?: string; expirada?: boolean }) {
  const t = useTranslations("Login");
  const error = codigoSeguro(useSearchParams().get("error"));

  return (
    <AuthShell>
      <header className='space-y-2'>
        <p className='text-xs font-semibold uppercase tracking-[0.14em] text-primary'>{t("eyebrow")}</p>
        <h1 id='login-title' className='text-3xl font-semibold tracking-tight text-foreground'>
          {t("title")}
        </h1>
        <p className='text-sm text-muted-foreground'>{t("subtitle")}</p>
      </header>

      {error ? <AvisoError codigo={error} /> : expirada && <AvisoSesionVencida />}

      <form action={iniciarSesionOidc} className='space-y-3'>
        <input type='hidden' name='callbackUrl' value={callbackUrl ?? "/"} />
        <BotonContinuar />
      </form>

      <ul className='space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground'>
        <li id='login-secure-note' className='flex items-start gap-3'>
          <HiOutlineLockClosed className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <span>{t("secureNote")}</span>
        </li>
        <li className='flex items-start gap-3'>
          <HiOutlineBuildingOffice2 className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <span>{t("companyNote")}</span>
        </li>
      </ul>
    </AuthShell>
  );
}
