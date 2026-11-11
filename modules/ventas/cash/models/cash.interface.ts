/** @format */

import { unstable_rethrow } from 'next/navigation';
import type {
  CashMovementDto,
  CashRegisterDto,
  CashSessionDto,
  CashSessionMethodDto,
  CashierDto,
  PosCheckoutResultDto,
  SaveCashRegisterDto,
  SaveStoreDto,
  StoreDto,
} from "@/server/domains/sales/cash/types";
import type { SkuLookupDto } from "@/server/domains/lookups/types";

export type ICashRegister = CashRegisterDto;
export type ICashSession = CashSessionDto;
export type ICashier = CashierDto;
export type ICashSessionMethod = CashSessionMethodDto;
export type ICashMovement = CashMovementDto;
export type IPosResult = PosCheckoutResultDto;
export type ISku = SkuLookupDto;
export type IStore = StoreDto;
export type IStoreSave = SaveStoreDto;
export type ICashRegisterSave = SaveCashRegisterDto;
export type ITicketInfo = NonNullable<CashRegisterDto["ticket"]>;

/** Elemento con id y nombre (bodegas, medios de pago) para selects. */
export interface INamedOption {
  id?: number;
  name?: string;
}

/** Medio de pago que se puede habilitar en una caja. */
export interface IRegisterMethodOption {
  id?: number;
  name?: string;
  kind?: string;
  channel?: string;
  active?: boolean;
}

export const OPENING_MODES = ["FREE", "SUGGESTED", "FIXED"] as const;
export type OpeningModeValue = (typeof OPENING_MODES)[number];
export const RECEIPT_WIDTHS = ["80MM", "58MM"] as const;
export type ReceiptWidth = (typeof RECEIPT_WIDTHS)[number];

export const STORES_HREF = "/ventas/stores";
export const REGISTERS_HREF = "/ventas/cash-registers";

/** Código sugerido desde el nombre: MAYÚSCULAS, sin tildes, con guion bajo. */
export const codeFromName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "C_$1")
    .slice(0, 30);

export const CASH_KINDS = ["CASH", "CASH_ON_DELIVERY"];

/** Nombre de quien cobra, recordado en este navegador (comodidad; no es autenticación). */
export const CASHIER_STORAGE_KEY = "essenza.cashier";
export const SESSION_STORAGE_KEY = "essenza.cashSession";

export const readLocal = (key: string) => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
};

export const writeLocal = (key: string, value: string | null) => {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch (error) {
    unstable_rethrow(error);
    /* almacenamiento no disponible */
  }
};
