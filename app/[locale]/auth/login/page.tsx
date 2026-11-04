/** @format */

import type { Metadata } from "next";
import { Login } from "@/modules/auth/login/components/login";
import { rutaRetornoSegura } from "@/server/lib/ruta-retorno";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Acceso al panel de la tienda Essenza.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expirada?: string; callbackUrl?: string }>;
}) {
  const { expirada, callbackUrl } = await searchParams;
  return <Login callbackUrl={rutaRetornoSegura(callbackUrl)} expirada={Boolean(expirada)} />;
}
