/** @format */

import type { ReactNode } from "react";
import { Nav } from "@components/navbar/scenes";
import { Toaster } from "@repo/ui/toasts/scenes/toaster";
import { Footer } from "../footer";
import { NotificationHost } from "../notifications";
import { SinAuth } from "./sin-auth";

/**
 * Estructura común de la aplicación: barra superior, contenido y pie.
 *
 * Es un Server Component: sólo compone. `Nav` y `Toaster` declaran por su
 * cuenta el límite de cliente, así que no hace falta enviar este archivo al
 * navegador.
 */
export const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className='flex min-h-screen flex-col'>
      <Nav />
      <Toaster />
      <NotificationHost />
      <main id='main-content' className='main-content flex-1'>
        {children}
      </main>
      <SinAuth>
        <Footer />
      </SinAuth>
    </div>
  );
};
