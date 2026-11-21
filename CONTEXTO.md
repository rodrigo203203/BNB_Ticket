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
  - `feat/schema-migraciones` … `feat/usuarios-csv` — modelo, admin, CSV (apiladas).

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
| 2026-11-20 | Agentes Cursor: modelo Composer. |

## Estado

| Área | Situación |
|------|-----------|
| Funcionalidad core | Login, solicitudes, Kanban, dashboard básico, admin usuarios, RBAC |
| BD | Prisma Migrate — migración inicial + campos solicitud/adjuntos/`must_change_password` |
| Despliegue | Documentado para Windows + IIS; credenciales en docs corregidas en `chore/contexto` |
| Offline / npm | En PR — scripts `scripts/offline/*.ps1`, docs/instalacion-offline.md, Inter vía @fontsource |
| Postgres portable | Scripts init/start/create-db/backup en `chore/postgres-portable` |
| Seed producción | `seed:admin` idempotente; `seed:demo` solo desarrollo |

## Pendientes y bloqueos

**Fases futuras (orden sugerido):**

1. ~~Postgres portable~~ (rama T2).
2. Prisma Migrate + campos solicitud/adjuntos (T3).
3. `seed:admin` idempotente (variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`); separar `seed:demo`.
4. Alta masiva de usuarios por CSV (email, nombre, rol, área; clave temporal obligatoria a cambiar en primer ingreso).
5. Campos nuevos en solicitud: *fecha requerida* (cuando el solicitante necesita el dato), *fecha de entrega* (analista; editable coordinador/admin), listado de campos, adjuntos.
6. Dashboard ampliado, Gantt, mejoras de UI.

**Pendiente explícito (no tocar en T0):**

- Contraseña de demo en seed (`Password123!`) y prellenado en modal de alta — limpiar en fase de admin/seed.

**Bloqueos:** ninguno técnico en fase 0; validación final del zip offline requiere Windows x64 real.

## Enlaces

- [README.md](./README.md)
- [docs/arquitectura.md](./docs/arquitectura.md)
- [docs/deployment-windows.md](./docs/deployment-windows.md)
- [docs/instalacion-offline.md](./docs/instalacion-offline.md)
- [docs/postgres-portable.md](./docs/postgres-portable.md)
- [docs/backup-restore.md](./docs/backup-restore.md)
- [rules/ignore-rules.md](./rules/ignore-rules.md) — detalle de exclusiones para agentes
- Plan de análisis (referencia interna): `uploads/bnb_ticket_plan.md`