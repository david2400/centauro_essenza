"use client";

import { useFormStatus } from "react-dom";
import { HiArrowRight, HiOutlineLockClosed } from "react-icons/hi2";
import { iniciarSesionOidc } from "@/server/domains/auth/sesion";
import { AuthShell, AvisoSesionVencida } from "./auth-shell";

function BotonContinuar() {
  const { pending } = useFormStatus();
  return (
    <button
      type='submit'
      disabled={pending}
      className='group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80'>
      {pending ? (
        <>
          <span
            className='h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground'
            aria-hidden='true'
          />
          Redirigiendo…
        </>
      ) : (
        <>
          Continuar
          <HiArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' aria-hidden='true' />
        </>
      )}
    </button>
  );
}

/** La contraseña se escribe en access_control (portal de acceso), nunca en este panel. */
export function Login({ callbackUrl, expirada = false }: { callbackUrl?: string; expirada?: boolean }) {
  return (
    <AuthShell>
      <div className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight text-foreground'>Bienvenido de nuevo</h1>
        <p className='text-sm text-muted-foreground'>Inicia sesión para administrar la tienda.</p>
      </div>
      {expirada && <AvisoSesionVencida />}
      <form action={iniciarSesionOidc} className='space-y-4'>
        <input type='hidden' name='callbackUrl' value={callbackUrl ?? "/"} />
        <BotonContinuar />
      </form>
      <div className='flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground'>
        <HiOutlineLockClosed className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
        <p>
          Escribirás tu usuario y contraseña en el portal seguro de acceso. Si trabajas en varias
          empresas, allí eliges con cuál entrar.
        </p>
      </div>
    </AuthShell>
  );
}
