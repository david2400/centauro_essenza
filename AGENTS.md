# centauro_essenza — guía para personas y agentes

Panel administrativo de Essenza: Next.js 15 (App Router) + React 19 + TypeScript estricto + next-intl + `@repo/ui` + Tailwind 4.
Backend: draco (Spring Boot, `centauro_essenza_java`). Gestor de paquetes: **pnpm** (nunca npm/yarn).

## Comandos

```bash
pnpm dev            # desarrollo
pnpm lint           # --max-warnings 0 (revisa app, components, lib)
pnpm check-types    # tsc --noEmit
pnpm build          # validación final; muestra "First Load JS" por ruta
pnpm openapi:types  # regenera server/lib/essenza-openapi-types.ts desde endpoint.json
```

En un equipo nuevo, compila primero `@repo/ui`: `pnpm --filter @repo/ui run build:components && pnpm --filter @repo/ui run build:styles`.

## Estructura y reglas de dependencia

```
app/[locale]/      rutas: page, layout, loading, error y server actions finas (actions.ts)
modules/<dominio>/<feature>/  index.ts · scenes/ · components/ · hooks/ · schemas/ · models/ · utils/
server/domains/<dominio>/     types.ts · repository.ts · queries.ts · search.ts · actions.ts   ('server-only')
server/lib/        server_fetch, caché/tags, paginación, errores, tipos openapi
components/        sistema de diseño de la app (CrudManager, DataGrid, form-sections, feedback, notifications)
lib/               utilidades puras y hooks genéricos · shared/  i18n y modelos comunes
```

- `app → modules | components | server`. `modules → components | lib | shared` y solo **tipos** de `server/`.
- `components`, `lib` y `shared` no importan de `modules` ni de `app`.
- Un dominio no importa de otro: lo común va a `components/` o `shared/`, o se pasa como prop desde la page.
- El acceso al backend vive solo en `server/domains/*/repository.ts`. La UI llama a server actions que
  devuelven `{ success, data }` o `{ success: false, error }` (nunca lanzan hacia el cliente).
- Las pages son server components finas: leen params, cargan en paralelo (`Promise.all`; lo opcional con
  `.catch` + `unstable_rethrow`) y renderizan una escena. No convertir una page en `"use client"`.

## Convenciones de UI

- Patrones y componentes: skill `centauro-ui-pro` (formularios en modal con `FormSection` + `ModalFormFooter`,
  listados con `CrudManager`, `notify` y `confirm` de `@/components/notifications`, nunca `alert` ni sweetalert).
- Todo texto en `shared/i18n/message/es.json` **y** `en.json` (mismas claves, sin el carácter `<`).
- Formularios: react-hook-form + zod, `mode: "onTouched"`; `useWatch` solo de los campos que alimentan la vista.
- Borrar o hacer algo irreversible siempre pasa por `confirm(...)`.
- Rendimiento: formularios y diálogos que no se ven al abrir la página van con `next/dynamic` (`FormSkeleton`
  como carga) y, si están siempre montados, con `useMountedOnce(open)`. Listas que crecen sin límite: modo servidor.
- Números: `type='number'` con `inputMode` (`decimal` o `numeric`) para el teclado del celular.

## Seguridad

- No confiar en ids de empresa o vendedor enviados por el navegador; el backend valida permisos y ámbito.
  Ocultar un botón no es autorización.
- No modificar políticas de seguridad, rutas públicas ni `SpringSecurityConfig` para que algo compile.
- Secretos solo en variables de entorno (`.env.local`, nunca en el repositorio).

## Contrato con draco

`server/lib/essenza-openapi-types.ts` se genera con openapi-typescript desde `endpoint.json`
(`/v3/api-docs` de draco). Para actualizarlo: descarga el JSON de draco (con sesión, desde Swagger UI o con el
token) a `endpoint.json` y corre `pnpm openapi:types`. Hasta entonces, los tipos de endpoints nuevos se
declaran a mano en el `types.ts` del dominio (p. ej. `RegisterSplitPaymentDto`).

Cada petición envía `X-Request-Id`; en errores 5xx el mensaje incluye `(ref xxxxxxxx)` para buscarla en los
logs de draco.
