import {
  BiBell,
  BiBox,
  BiCar,
  BiCart,
  BiCategory,
  BiHome,
  BiListCheck,
  BiPlus,
  BiPurchaseTag,
  BiReceipt,
  BiStore,
  BiTrendingUp,
  BiUndo,
} from "react-icons/bi";
import type { NavAction, NavSection } from "../models/nav.types";

/**
 * Fuente única del menú del panel. Para agregar una página:
 *  1. agrega la hoja en el grupo que corresponda (o un grupo nuevo);
 *  2. agrega su texto en `Navigation.items.<grupo>.<key>` de es.json y en.json.
 * El sidebar, el menú móvil y el buscador (Ctrl+K) se alimentan de aquí.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "main",
    untitled: true,
    entries: [
      { key: "home", href: "/", icon: BiHome, keywords: ["inicio", "dashboard", "home"] },
      { key: "operations", href: "/operations", icon: BiBell, keywords: ["alertas", "pendientes", "alerts"] },
    ],
  },
  {
    key: "operation",
    entries: [
      {
        key: "sales",
        icon: BiCart,
        items: [
          { key: "pos", href: "/ventas/pos", keywords: ["pos", "caja", "vender"] },
          { key: "orders", href: "/ventas/orders", keywords: ["pedidos", "ventas"] },
          { key: "purchases", href: "/ventas/purchases", keywords: ["multivendedor", "checkout"] },
          { key: "dispatch", href: "/ventas/dispatch", keywords: ["despachos", "alistamiento"] },
          { key: "customers", href: "/ventas/customers", keywords: ["clientes", "compradores"] },
          { key: "cashRegisters", href: "/ventas/cash-registers", keywords: ["turnos", "arqueo"] },
          { key: "stores", href: "/ventas/stores", keywords: ["sedes", "sucursales"] },
          { key: "payments", href: "/ventas/payments", keywords: ["cobros", "wompi"] },
          { key: "paymentMethods", href: "/ventas/payment-methods", keywords: ["medios", "efectivo", "tarjeta"] },
        ],
      },
      {
        key: "marketplace",
        icon: BiStore,
        items: [
          { key: "sellers", href: "/marketplace/sellers", keywords: ["vendedores", "aliados"] },
          { key: "plans", href: "/marketplace/plans", keywords: ["planes", "comisión"] },
          { key: "offers", href: "/marketplace/offers", keywords: ["ofertas", "precios"] },
          { key: "consignment", href: "/marketplace/consignment", keywords: ["consignación", "liquidación"] },
          { key: "disputes", href: "/marketplace/disputes", keywords: ["reclamos", "disputas"] },
          { key: "billing", href: "/marketplace/billing", keywords: ["comisiones", "cuentas", "ledger"] },
          { key: "payouts", href: "/marketplace/payouts", keywords: ["pagos", "dispersión", "transferencias"] },
        ],
      },
      {
        key: "logistics",
        icon: BiCar,
        items: [
          { key: "dispatches", href: "/logistica/dispatches", keywords: ["envíos", "guías"] },
          { key: "carriers", href: "/logistica/carriers", keywords: ["transportadoras", "mensajería"] },
          { key: "shippingCosts", href: "/logistica/shipping-costs", keywords: ["tarifario", "tarifas", "fletes", "zonas", "envío", "costo"] },
          { key: "deliveryEstimates", href: "/logistica/delivery-estimates", keywords: ["tiempos", "promesa"] },
        ],
      },
      {
        key: "afterSales",
        icon: BiUndo,
        items: [
          { key: "devolutions", href: "/postventa/devolutions", keywords: ["devoluciones", "garantías"] },
          { key: "devolutionMotives", href: "/postventa/devolution-motives" },
          { key: "returnMethods", href: "/postventa/return-methods" },
          { key: "refundMethods", href: "/postventa/refund-methods", keywords: ["reembolsos"] },
        ],
      },
    ],
  },
  {
    key: "catalog",
    entries: [
      {
        key: "catalog",
        icon: BiCategory,
        items: [
          { key: "products", href: "/catalogo/products", keywords: ["productos", "sku", "variantes"] },
          { key: "brands", href: "/catalogo/brand", keywords: ["marcas"] },
          { key: "categories", href: "/catalogo/category", keywords: ["categorías"] },
          { key: "subcategories", href: "/catalogo/subcategory", keywords: ["subcategorías"] },
        ],
      },
      {
        key: "specs",
        icon: BiListCheck,
        items: [
          { key: "attributes", href: "/fichaTecnica/attributes", keywords: ["atributos", "talla", "color"] },
          { key: "templates", href: "/fichaTecnica/templates", keywords: ["plantillas"] },
          { key: "units", href: "/fichaTecnica/unit-measurements", keywords: ["unidades", "medidas"] },
        ],
      },
      {
        key: "inventory",
        icon: BiBox,
        items: [
          { key: "movements", href: "/inventory/inventory-movements", keywords: ["kardex", "stock", "existencias"] },
          { key: "warehouses", href: "/inventory/warehouses", keywords: ["bodegas", "almacenes"] },
          { key: "suppliers", href: "/inventory/suppliers", keywords: ["proveedores"] },
          { key: "purchaseOrders", href: "/inventory/purchase-orders", keywords: ["compras", "reabastecer"] },
        ],
      },
    ],
  },
  {
    key: "finance",
    entries: [
      {
        key: "billing",
        icon: BiReceipt,
        items: [
          { key: "invoices", href: "/facturacion/invoices", keywords: ["facturas", "dian", "electrónica"] },
          { key: "resolutions", href: "/facturacion/resolutions", keywords: ["numeración", "resolución", "dian"] },
          { key: "taxRates", href: "/facturacion/tax-rates", keywords: ["impuestos", "iva"] },
          { key: "settings", href: "/facturacion/settings", keywords: ["configuración"] },
        ],
      },
    ],
  },
  {
    key: "growth",
    entries: [
      {
        key: "marketing",
        icon: BiPurchaseTag,
        items: [
          { key: "coupons", href: "/marketing/coupons", keywords: ["cupones", "descuentos"] },
          { key: "reviews", href: "/marketing/reviews", keywords: ["reseñas", "calificaciones"] },
        ],
      },
      {
        key: "content",
        icon: BiTrendingUp,
        items: [
          { key: "pages", href: "/contenido/pages", keywords: ["cms", "páginas"] },
          { key: "recommendations", href: "/contenido/recommendations" },
          { key: "searchQueries", href: "/contenido/search-queries", keywords: ["búsquedas"] },
          { key: "personalization", href: "/contenido/personalization" },
        ],
      },
    ],
  },
];

/** Atajos de creación que aparecen primero en el buscador. */
export const NAV_ACTIONS: NavAction[] = [
  { key: "newOrder", href: "/ventas/orders/new", icon: BiPlus, keywords: ["crear", "pedido"] },
  { key: "newProduct", href: "/catalogo/products/new", icon: BiPlus, keywords: ["crear", "producto"] },
  { key: "newCustomer", href: "/ventas/customers/new", icon: BiPlus, keywords: ["crear", "cliente"] },
  { key: "newPurchaseOrder", href: "/inventory/purchase-orders/new", icon: BiPlus, keywords: ["crear", "compra"] },
];
