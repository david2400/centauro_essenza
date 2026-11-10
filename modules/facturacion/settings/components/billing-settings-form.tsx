/** @format */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Control } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import {
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineMapPin,
} from "react-icons/hi2";
import { ActionBar, SectionCard, ToggleRow } from "@/components/form-sections";
import { GeoCascadeFields } from "@/components/geo-cascade-fields";
import { notify } from "@/components/notifications";
import { Link } from "@/shared/i18n/routing";
import { nitCheckDigit } from "@/modules/facturacion/invoice/schemas/buyer.schema";
import type { IBillingSettings } from "@/modules/facturacion/invoice/models/invoice.interface";
import { ENVIRONMENTS, TAX_REGIMES, validationBillingSettings, type BillingSettingsFormValues } from "../schemas/settings.schema";
import { updateBillingSettingsServerAction } from "@/app/[locale]/facturacion/settings/actions";
import { get_city_path_action } from "@/server/domains/parametros/georeferencing/actions";
import { useLegacyGeoMatch } from "../hooks/use-legacy-geo-match";

const MISSING_KEYS = ["nit", "legal_name", "address", "city", "email", "software"] as const;

/**
 * Datos del emisor y de la facturación electrónica: identificación tributaria, contacto,
 * ambiente y proveedor tecnológico, software, factura automática al pagar y pie de página.
 */
export const BillingSettingsForm = ({ settings }: { settings: IBillingSettings }) => {
  const t = useTranslations("Administre.billing.settings");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { isSubmitting, isDirty },
  } = useForm<BillingSettingsFormValues>({
    resolver: zodResolver(validationBillingSettings()),
    defaultValues: {
      nit: settings.nit ?? "",
      legal_name: settings.legal_name ?? "",
      trade_name: settings.trade_name ?? "",
      tax_regime: settings.tax_regime === "NO_RESPONSABLE_IVA" ? "NO_RESPONSABLE_IVA" : "RESPONSABLE_IVA",
      responsibilities: settings.responsibilities ?? "",
      address: settings.address ?? "",
      country_id: settings.country_id != null ? String(settings.country_id) : "",
      state_id: settings.state_id != null ? String(settings.state_id) : "",
      city_id: settings.city_id != null ? String(settings.city_id) : "",
      email: settings.email ?? "",
      phone: settings.phone ?? "",
      environment: settings.environment === "PRODUCTION" ? "PRODUCTION" : "TEST",
      provider: settings.provider ?? "SIMULATOR",
      software_id: settings.software_id ?? "",
      software_pin: "",
      auto_invoice: Boolean(settings.auto_invoice),
      invoice_footer: settings.invoice_footer ?? "",
    },
  });
  const values = useWatch({ control }) as BillingSettingsFormValues;
  const dv = nitCheckDigit(values.nit ?? "");
  const missing = (settings.missing ?? []).filter((key): key is (typeof MISSING_KEYS)[number] =>
    (MISSING_KEYS as readonly string[]).includes(key),
  );

  // Configuración guardada antes del catálogo: conserva ciudad y departamento escritos hasta elegir una ubicación.
  const legacy = settings.city_id == null ? { city: settings.city ?? "", department: settings.department ?? "" } : null;
  const legacyLabel = legacy ? [legacy.city, legacy.department].filter(Boolean).join(", ") : "";
  // Precarga los selectores buscando en el catálogo la ciudad y el departamento que estaban escritos.
  const { match: geoMatch, searching: geoSearching } = useLegacyGeoMatch(legacy?.city ?? "", legacy?.department ?? "", Boolean(legacyLabel));

  useEffect(() => {
    if (!geoMatch) return;
    // Queda como cambio sin guardar: la ubicación se confirma al guardar.
    setValue("country_id", geoMatch.countryId, { shouldDirty: true });
    setValue("state_id", geoMatch.stateId, { shouldDirty: true });
    setValue("city_id", geoMatch.cityId, { shouldDirty: true });
  }, [geoMatch, setValue]);

  const submit = async (form: BillingSettingsFormValues) => {
    const toId = (value: string) => (value ? Number(value) : undefined);
    // Los nombres se guardan junto a los ids: la representación gráfica de la factura no consulta parametros.
    const path = form.city_id ? await get_city_path_action(Number(form.city_id)) : null;
    if (form.city_id && !path?.city?.name) {
      notify.error(tCommon("errorTitle"), t("cityUnresolved"));
      return;
    }
    const keepLegacy = !form.country_id && legacy;
    const { country_id, state_id, city_id, ...rest } = form;
    const result = await updateBillingSettingsServerAction({
      ...rest,
      city: path?.city?.name ?? (keepLegacy ? legacy.city : ""),
      department: path?.state?.name ?? (keepLegacy ? legacy.department : ""),
      country_id: toId(country_id),
      state_id: toId(state_id),
      city_id: toId(city_id),
      software_pin: form.software_pin || undefined,
    });
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tCommon("updatedSuccess"), result.data.ready ? t("readyNow") : t("stillMissing"));
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6'>
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]'>
        <div className='grid content-start gap-6'>
          <SectionCard id='billing-issuer' icon={HiOutlineBuildingOffice2} title={t("issuer")} hint={t("issuerHint")}>
            <FormField
              controller={{ control, name: "nit" }}
              label={t("fields.nit")}
              inputMode='numeric'
              autoComplete='off'
              maxLength={20}
              classNameInput='tabular-nums'
              // El sufijo debe existir siempre: si aparece con la primera tecla, FormField cambia de
              // Input a InputGroup, el campo se vuelve a montar y pierde el foco.
              suffix={<span className='tabular-nums'>DV {dv || "–"}</span>}
              description={t("nitHint")}
              className='col-span-12 sm:col-span-5'
            />
            <FormSelectField
              controller={{ control, name: "tax_regime" }}
              label={t("fields.taxRegime")}
              data={TAX_REGIMES.map((regime) => ({ value: regime, label: t(`regimes.${regime}`) }))}
              triggerClassName='!w-full'
              className='col-span-12 sm:col-span-7'
            />
            <FormField controller={{ control, name: "legal_name" }} label={t("fields.legalName")} className='col-span-12 sm:col-span-7' />
            <FormField controller={{ control, name: "trade_name" }} label={t("fields.tradeName")} className='col-span-12 sm:col-span-5' />
            <FormField
              controller={{ control, name: "responsibilities" }}
              label={t("fields.responsibilities")}
              description={t("responsibilitiesHint")}
              className='col-span-12'
            />
          </SectionCard>

          <SectionCard id='billing-contact' icon={HiOutlineMapPin} title={t("contact")} hint={t("contactHint")}>
            {/* El schema con superRefine tipa distinto el control; el componente solo usa los tres campos geo. */}
            <GeoCascadeFields
              // Se vuelve a montar al encontrar la ubicación escrita, para cargar sus departamentos y ciudades.
              key={geoMatch ? `match-${geoMatch.stateId}` : "saved"}
              control={control as unknown as Control}
              setValue={(name, value) => {
                // Al cambiar el nivel superior los inferiores se vacían: se limpia su error en vez de validarlos.
                const field = name as "country_id" | "state_id" | "city_id";
                setValue(field, value, { shouldDirty: true });
                clearErrors(field);
              }}
              initialCountryId={geoMatch?.countryId ?? (settings.country_id != null ? String(settings.country_id) : "")}
              initialStateId={geoMatch?.stateId ?? (settings.state_id != null ? String(settings.state_id) : "")}
            />
            {geoMatch && values.country_id === geoMatch.countryId ? (
              <p className='col-span-12 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground'>
                {t(geoMatch.cityId ? "legacyMatched" : "legacyMatchedState", { city: legacyLabel })}
              </p>
            ) : legacyLabel && !geoSearching && !values.country_id ? (
              <p className='col-span-12 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground'>
                {t("legacyCity", { city: legacyLabel })}
              </p>
            ) : null}
            <FormField controller={{ control, name: "address" }} label={t("fields.address")} className='col-span-12' />
            <FormField
              controller={{ control, name: "email" }}
              type='email'
              label={t("fields.email")}
              description={t("emailHint")}
              className='col-span-12 sm:col-span-7'
            />
            <FormField controller={{ control, name: "phone" }} label={t("fields.phone")} className='col-span-12 sm:col-span-5' />
          </SectionCard>

          <SectionCard id='billing-electronic' icon={HiOutlineCog6Tooth} title={t("electronic")} hint={t("electronicHint")}>
            <FormSelectField
              controller={{ control, name: "environment" }}
              label={t("fields.environment")}
              data={ENVIRONMENTS.map((env) => ({ value: env, label: t(`environments.${env}`) }))}
              triggerClassName='!w-full'
              className='col-span-12 sm:col-span-6'
            />
            <FormSelectField
              controller={{ control, name: "provider" }}
              label={t("fields.provider")}
              data={[{ value: "SIMULATOR", label: t("providers.SIMULATOR") }]}
              triggerClassName='!w-full'
              className='col-span-12 sm:col-span-6'
            />
            {values.environment === "PRODUCTION" ? (
              <p className='col-span-12 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300'>
                <HiOutlineExclamationTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
                {t("productionWarning")}
              </p>
            ) : null}
            <FormField controller={{ control, name: "software_id" }} label={t("fields.softwareId")} className='col-span-12 sm:col-span-6' />
            <FormField
              controller={{ control, name: "software_pin" }}
              type='password'
              autoComplete='new-password'
              label={t("fields.softwarePin")}
              placeholder={settings.software_pin_set ? t("pinSet") : undefined}
              description={t("pinHint")}
              className='col-span-12 sm:col-span-6'
            />
            <div className='col-span-12'>
              <ToggleRow
                id='billing-auto'
                label={t("fields.autoInvoice")}
                description={t("autoInvoiceHint")}
                checked={Boolean(values.auto_invoice)}
                onChange={(checked) => setValue("auto_invoice", checked, { shouldDirty: true })}
              />
            </div>
          </SectionCard>

          <SectionCard id='billing-document' icon={HiOutlineDocumentText} title={t("document")} hint={t("documentHint")}>
            <FormTextAreaField
              controller={{ control, name: "invoice_footer" }}
              aria-label={t("fields.invoiceFooter")}
              placeholder={t("footerPlaceholder")}
              rows={3}
              className='col-span-12'
            />
          </SectionCard>
        </div>

        <aside className='grid content-start gap-4 lg:sticky lg:top-20'>
          <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{t("status")}</h3>
            {settings.ready ? (
              <p className='flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400'>
                <HiOutlineCheckCircle className='h-5 w-5' aria-hidden='true' />
                {t("ready")}
              </p>
            ) : (
              <div className='grid gap-2 text-sm'>
                <p className='flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400'>
                  <HiOutlineExclamationTriangle className='h-5 w-5' aria-hidden='true' />
                  {t("notReady")}
                </p>
                <ul className='grid gap-1 text-muted-foreground'>
                  {missing.map((key) => (
                    <li key={key}>• {t(`missing.${key}`)}</li>
                  ))}
                  {!settings.provider_configured ? <li>• {t("missing.provider")}</li> : null}
                </ul>
              </div>
            )}
            <div className='flex flex-wrap gap-1.5'>
              <Badge variant='outline'>{t(`environments.${settings.environment === "PRODUCTION" ? "PRODUCTION" : "TEST"}`)}</Badge>
              <Badge variant={settings.provider_configured ? "secondary" : "destructive"}>{settings.provider}</Badge>
              {settings.auto_invoice ? <Badge variant='secondary'>{t("autoOn")}</Badge> : null}
            </div>
          </section>
          <section className='grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{t("related")}</h3>
            <Link href='/facturacion/resolutions' className='text-primary underline-offset-4 hover:underline'>
              {t("goResolutions")}
            </Link>
            <Link href='/facturacion/tax-rates' className='text-primary underline-offset-4 hover:underline'>
              {t("goTaxRates")}
            </Link>
            <Link href='/facturacion/invoices' className='text-primary underline-offset-4 hover:underline'>
              {t("goInvoices")}
            </Link>
          </section>
        </aside>
      </div>
      <ActionBar message={isDirty ? t("unsaved") : undefined}>
        <Buttons type='submit' loading={isSubmitting} className='rounded-full'>
          {tCommon("save")}
        </Buttons>
      </ActionBar>
    </form>
  );
};
