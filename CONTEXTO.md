# CONTEXTO — BNB_Ticket

## Objetivo

Plataforma corporativa del BNB para registrar, asignar y dar trazabilidad a solicitudes de datos y analítica (Gerencia de Datos). Fase actual: cimientos de despliegue offline en Windows sin internet, reglas de trabajo con agentes y documentación viva del proyecto.

## Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | npm workspaces + `package-lock.json` (rama `chore/npm-offline`) |
| Frontend | Vue 3.5, Vite 5, Pinia, Vue Router, PrimeVue 4, Axios |
| Backend | NestJS 10, Prisma 5, PostgreSQL |
| Shared | `packages/shared` — enums, DTOs, matriz RBAC |
| Auth | JWT en cookies HttpOnly, CSRF, Argon2id (`@node-rs/argon2`) |

## Repos y ramas

- **Repositorio:** [rodrigo203203/BNB_Ticket](https://github.com/rodrigo203203/BNB_Ticket)
- **Rama base:** `main` (sin merges directos desde tareas).
- **Convención:** una rama por tarea; PR a `main` solo tras revisión de Rodrigo.
- **Ramas activas (fase 0–2):**
  - `chore/contexto` — CONTEXTO, `.cursorrules`, higiene de credenciales en docs.
  - `chore/npm-offline` — npm workspaces, empaquetado offline, Inter local.
  - `chore/postgres-portable` — PostgreSQL zip + scripts PowerShell.
  - `chore/postgres-dual` — PostgreSQL portable **o** servicio Windows (`mode` en config / `PG_MODE`).
  - `feat/schema-migraciones` … `feat/usuarios-csv` — modelo, admin, CSV (apiladas).
  - `feat/formulario-solicitud` — formulario nueva solicitud, fecha requerida obligatoria, tarjeta de fechas en detalle.
  - `feat/adjuntos` — API y UI de adjuntos (PDF/XLSX/CSV/DOCX) en alta y detalle.
  - `feat/dashboard-analisis` — panel operativo con Chart.js, `/dashboard/analisis`, plazos compartidos.
  - `feat/gantt` — ruta `/gantt`, API `GET /solicitudes/gantt`, barras discontinuas sin fecha de entrega.
  - `feat/carga-equipo` — vista `/equipo/carga`, `GET /equipo/carga` (analista solo su fila); motivo obligatorio si carga ALTA.
  - `feat/ui-pulido` — foco visible y utilidades CSS de página.
  - `chore/postgres-dual` — Postgres portable o servicio Windows.
  - `fix/revision-qa` — Gantt zoom/vencidas, CSV preview, icono carga, seed:demo, UX adjuntos.
  - `release/v2` — integración fases 1–3 + TA/TB → PR a `main`.
  - `release/bnb-ticket-v2` — integración fase 3 anterior (sustituida por `release/v2`).

## Estructura

```
apps/api/          API NestJS + prisma/
apps/web/          SPA Vue
packages/shared/   Tipos y constantes compartidos
docs/              Arquitectura, RBAC, despliegue, backup
scripts/           Utilidades (verify-env; offline en fase T1)
storage/           Avatares y (futuro) adjuntos
rules/             Reglas de exclusión de contexto para agentes
```

## Reglas fijas

1. **Nunca** commit ni merge directo en `main`; **nunca** deploy sin aprobación de Rodrigo.
2. Leer este archivo (`CONTEXTO.md`) antes de tocar código.
3. Respetar `.cursorignore`; no indexar `node_modules`, `dist`, lockfiles, `storage`, etc.
4. Código modular, comentarios útiles **en español**; documentación en español.
5. **Producción:** servidor Windows 11 x64 **sin internet**. Los paquetes se arman en otra máquina Windows x64 con internet y se copian al servidor.
6. **PostgreSQL:** solo binarios portables (zip, `initdb`, `pg_ctl`); scripts en `scripts/postgres/`.
7. **Tipografía:** fuente **Inter** autohospedada en el proyecto; sin Google Fonts ni otros CDNs.
8. **Agentes en la nube (Cursor):** usar el modelo **Composer** para programar en este repo.
9. Al **cerrar cada tarea**, actualizar secciones **Estado**, **Decisiones** y **Pendientes** en este archivo.

## Decisiones

| Fecha | Decisión |
|-------|----------|
| 2026-11-20 | Despliegue target: Windows 11 x64 offline; empaquetado en máquina hermana con misma arquitectura y major de Node. |
| 2026-11-20 | PostgreSQL portable (zip) en lugar de servicio Windows — documentar y automatizar en fase T2. |
| 2026-11-20 | Inter local; eliminar dependencia de CDNs de fuentes. |
| 2026-11-20 | Migración pnpm → npm con `package-lock.json` versionado y scripts PowerShell de empaquetado. |
| 2026-11-21 | `binaryTargets` Prisma: `native` + `windows`; eliminadas optionalDependencies darwin en api/web. |
| 2026-11-21 | Dev paralelo: `concurrently` en script `npm run dev` (npm workspaces corre en serie). |
| 2026-11-21 | Postgres portable: config `postgres.local.config.json`; secretos vía `POSTGRES_SUPERUSER_PASSWORD` y `BNB_DB_PASSWORD`. |
| 2026-11-20 | Credenciales solo en `.env` / variables de entorno; docs con placeholders (`<PG_USER>`, `<PG_PASSWORD>`). |
| 2026-11-21 | Carga de `.env` antes que el SO: módulo `cargar-entorno.ts` (raíz luego `apps/api/.env`); proxy Vite desde `PORT`/`VITE_API_PROXY_TARGET`; Prisma vía `run-prisma-with-env.ts`. |
| 2026-11-21 | Secretos JWT/cookie/CSRF: `secretos-entorno.util.ts` (única fuente); defaults solo en dev/test con aviso; `npm run secretos:generar` (`.mjs` + `.sh`/`.ps1`). |
| 2026-11-20 | Agentes Cursor: modelo Composer. |
| 2026-11-21 | **fecha requerida** obligatoria al crear solicitud; debe ser día calendario **estrictamente posterior a hoy** en zona `America/La_Paz` (no fin de día UTC). Utilidad compartida `esFechaRequeridaPosteriorAHoy` en `@bnb/shared`. |
| 2026-11-21 | UI T6: `NuevaSolicitudView` con PrimeVue DatePicker, campos requeridos y placeholder adjuntos (T7). Detalle: tarjeta “Fechas del requerimiento” y PATCH fecha entrega según RBAC. Ruta `/solicitudes/nueva` para cualquier rol autenticado. |
| 2026-11-21 | **T7 adjuntos:** subida post-creación en nueva solicitud; panel en detalle (listar/descargar/eliminar en REGISTRADA). Almacenamiento en `storage/uploads/solicitudes/{id}/`. |
| 2026-11-21 | **T8 análisis:** `GET /dashboard/analisis` (analista asignadas; coord/admin global; solicitante 403). Vencidas dashboard incluyen entregas tardías (`esSolicitudVencida`). |
| 2026-11-21 | **T9 Gantt:** `/gantt` + `GET /solicitudes/gantt`; barras punteadas sin `fechaEntrega`. |
| 2026-11-21 | **T9b carga equipo:** `/equipo/carga` + `GET /equipo/carga`; puntos prioridad (1–4), umbrales 10/20/21; vencida vista solo sin entrega; reasignación con motivo si carga ALTA. |
| 2026-11-21 | **Postgres dual:** `mode` portable \| service en `postgres.local.config.json` o `PG_MODE`; `initdb` solo portable; `install-server` respeta el modo. |
| 2026-11-21 | **QA revisión diseño:** Gantt día/semana/mes + vencidas rojas; CSV muestra válidas y errores; `faUsersGear`; `seed:demo` autocontenido; adjuntos texto neutro para no solicitante. |

## Estado

| Área | Situación |
|------|-----------|
| Funcionalidad core | Login, solicitudes (formulario, adjuntos, fechas), Kanban, dashboard básico, admin usuarios, RBAC |
| BD | Prisma Migrate — migración inicial + campos solicitud/adjuntos/`must_change_password` |
| Despliegue | Documentado para Windows + IIS; credenciales en docs corregidas en `chore/contexto` |
| Offline / npm | En PR — scripts `scripts/offline/*.ps1`, docs/instalacion-offline.md, Inter vía @fontsource |
| Postgres | Modo **portable** (zip) o **service** (instalador); ver [docs/postgres.md](./docs/postgres.md) |
| Seed producción | `seed:admin` idempotente; `seed:demo` solo desarrollo (sobrescribe datos demo, no usar en prod) |
| Release v2 | Rama `release/v2` integra fases 1–3 + postgres dual + QA diseño |

## Pendientes y bloqueos

**Fases futuras (orden sugerido):**

1. ~~Postgres portable~~ (rama T2).
2. Prisma Migrate + campos solicitud/adjuntos (T3).
3. `seed:admin` idempotente (variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`); separar `seed:demo`.
4. ~~Alta masiva CSV~~ (rama T5).
5. ~~Campos nuevos en solicitud~~ (T6–T7): fechas, campos y adjuntos.
6. ~~Dashboard ampliado (T8)~~, ~~Gantt (T9)~~, ~~carga equipo (T9b)~~, ~~pulido UI (T10)~~ — en ramas apiladas fase 3.

**Pendiente explícito (no tocar en T0):**

- Contraseña de demo en seed (`Password123!`) y prellenado en modal de alta — limpiar en fase de admin/seed.

**Bloqueos:** ninguno técnico en fase 0; validación final del zip offline requiere Windows x64 real.

## Enlaces

- [README.md](./README.md)
- [docs/arquitectura.md](./docs/arquitectura.md)
- [docs/deployment-windows.md](./docs/deployment-windows.md)
- [docs/instalacion-offline.md](./docs/instalacion-offline.md)
- [docs/postgres.md](./docs/postgres.md)
- [docs/backup-restore.md](./docs/backup-restore.md)
- [rules/ignore-rules.md](./rules/ignore-rules.md) — detalle de exclusiones para agentes
- Plan de análisis (referencia interna): `uploads/bnb_ticket_plan.md`