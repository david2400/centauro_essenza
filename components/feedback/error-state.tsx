"use client";

import { useEffect } from "react";
import { Buttons } from "@repo/ui/buttons/scenes";

interface ErrorStateProps {
  /** Título en lenguaje del usuario, no el mensaje técnico. */
  title?: string;
  description?: string;
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Cuerpo compartido de los `error.tsx` de cada sección.
 *
 * Muestra un mensaje comprensible y un botón para reintentar. El detalle
 * técnico se registra en consola y sólo se despliega en desarrollo, para no
 * exponer trazas del servidor al usuario final.
 */
export function ErrorState({
  title = "No pudimos cargar esta sección",
  description = "Ocurrió un problema al obtener la información. Puedes reintentar; si persiste, avisa al equipo de soporte.",
  error,
  reset,
}: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role='alert'
      className='mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center'>
      <div className='space-y-2'>
        <h2 className='text-lg font-semibold text-foreground'>{title}</h2>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>

      {/* NODE_ENV lo fija Next.js en el build; no es una variable de entorno del pipeline de Turborepo. */}
      {/* eslint-disable-next-line turbo/no-undeclared-env-vars */}
      {process.env.NODE_ENV !== "production" ? (
        <pre className='max-w-full overflow-x-auto rounded-lg bg-muted px-4 py-3 text-left text-xs text-muted-foreground'>
          {error.message}
        </pre>
      ) : null}

      {error.digest ? (
        <p className='text-xs text-muted-foreground'>
          Código de referencia: {error.digest}
        </p>
      ) : null}

      <Buttons onClick={reset}>Reintentar</Buttons>
    </div>
  );
}
