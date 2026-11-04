/** @format */

/** Segmentos aceptados por el backend (`@Pattern` en el DTO). */
import { unstable_rethrow } from 'next/navigation';
export const SEGMENTS = [
  "VIP",
  "FREQUENT_BUYER",
  "PRICE_SENSITIVE",
  "BROWSER",
  "NEW_CUSTOMER",
  "CHURNING",
] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_VARIANT: Record<Segment, "default" | "secondary" | "destructive" | "outline"> = {
  VIP: "default",
  FREQUENT_BUYER: "default",
  PRICE_SENSITIVE: "secondary",
  BROWSER: "outline",
  NEW_CUSTOMER: "secondary",
  CHURNING: "destructive",
};

export const isSegment = (value?: string): value is Segment =>
  !!value && (SEGMENTS as readonly string[]).includes(value);

/** Campos JSON del perfil (máx. 4000 caracteres cada uno). */
export const JSON_FIELDS = [
  "context_metadata_json",
  "recommended_products_json",
  "dynamic_pricing_json",
  "personalized_content_json",
  "personalized_offers_json",
  "ui_personalization_json",
  "purchase_intent_json",
] as const;
export type JsonField = (typeof JSON_FIELDS)[number];

export const JSON_MAX = 4000;

/** Devuelve el JSON indentado, o el texto original si no es JSON válido. */
export const prettyJson = (value?: string) => {
  if (!value?.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (error) {
    unstable_rethrow(error);
    return value;
  }
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

export const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
};
