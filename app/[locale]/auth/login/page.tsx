/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Login } from "@/modules/auth/login/components/login";
import { rutaRetornoSegura } from "@/server/lib/ruta-retorno";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login.meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expirada?: string; callbackUrl?: string }>;
}) {
  const { expirada, callbackUrl } = await searchParams;
  return <Login callbackUrl={rutaRetornoSegura(callbackUrl)} expirada={Boolean(expirada)} />;
}
