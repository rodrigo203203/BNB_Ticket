# Plataforma BNB - Gestión de Solicitudes (Gerencia de Datos)

Plataforma corporativa bancaria para la centralización, asignación, trazabilidad y control de requerimientos analíticos, extracción de datos, modelos de Machine Learning y gobierno de información del **Banco Nacional de Bolivia (BNB)**.

---

## 🏛️ Stack Tecnológico Implementado

- **Monorepo:** `pnpm` workspaces (`apps/api`, `apps/web`, `packages/shared`).
- **Frontend (`apps/web`):**
  - Vue 3 (Composition API con `<script setup>` y TypeScript estricto).
  - Vite 5 como bundler optimizado.
  - PrimeVue 4 con preset Aura tokenizado (Verde institucional `#26b460` y Morado `#5b21b6`).
  - Pinia para estado global reactivo.
  - Vue Router con guardias de navegación RBAC.
  - Axios con soporte de cookies `HttpOnly` y protección CSRF.
  - Font Awesome SVG para iconografía institucional.
- **Backend (`apps/api`):**
  - NestJS 10 modular basado en dominios.
  - Prisma ORM 5 con PostgreSQL.
  - Documentación interactiva Swagger (`/api/v1/docs`).
  - Validación con DTOs y `class-validator`.
  - Criptografía con **Argon2id** (resistente a ataques por GPU y canal lateral).
  - Sesiones revocables en base de datos.
  - Throttler (Rate Limit) y política de bloqueo por fuerza bruta (5 intentos fallidos -> bloqueo 15 min).
  - Manejo centralizado de excepciones y logging de auditoría.
- **Shared Package (`packages/shared`):**
  - Enums unificados (`Role`, `RequestStatus`, `RequestPriority`, `RequestCategory`, `AuditAction`).
  - Interfaces TypeScript y DTOs comunes.
  - Matriz RBAC de transiciones y paleta de tokens.
- **Restricciones estrictas respetadas:**
  - Sin Docker.
  - Sin CDNs externas (100% autónomo para intranet bancaria).
  - Sin servicios comerciales ni dependencias de pago en la nube.

---

## 🚀 Módulos Funcionales

1. **Gestión de Solicitudes:**
   - **Crear Solicitud (`/solicitudes/nueva`):** Formulario estricto con validación de título, categoría, prioridad (Baja, Media, Alta, Urgente), justificación de negocio/ASFI y alcance técnico. Genera código correlativo anual (ej. `REQ-2026-0005`).
   - **Catálogo Centralizado (`/solicitudes`):** Búsqueda en tiempo real por código, título y solicitante, filtros por estado y exportación directa a formato **CSV compatible con Microsoft Excel** (con BOM UTF-8).
2. **Detalle del Ticket y Bitácora (`/solicitudes/:id`):**
   - Panel de solicitante y encargado responsable.
   - Acciones de transición según la matriz de estados RBAC.
   - **Línea de Tiempo (Timeline):** Registro cronológico de auditoría con fecha, hora, autor y detalle de cada cambio de estado.
   - **Registro de Notas y Avances:** Área interactiva para intercambiar notas técnicas y actualizaciones operativas.
3. **Herramienta del Manager para Asignación de Encargado:**
   - Asignación formal de personal técnico (`PATCH /api/v1/solicitudes/:id/assign`).
   - **Regla de asignación bancaria:** Se puede asignar a cualquier usuario del sistema **excepto aquellos con rol `SOLICITANTE`** (validado en backend con excepción `400 Bad Request` y filtrado en frontend).
   - Transición automática de estado de `REGISTRADA` a `EN_ANALISIS` con registro en bitácora.
4. **Tablero Kanban (`/kanban`):**
   - Vista visual por columnas del ciclo de vida (Registradas → Análisis → Revisión → Aprobadas → Rechazadas/Canceladas).
   - **Arrastre entre columnas** (`vue-draggable-plus`) con validación RBAC en cliente y servidor (`PATCH /solicitudes/:id/status`).
   - Diálogos para elegir rechazo/cancelación y comentario obligatorio en cierres.
   - En **móvil** las columnas se apilan en vertical (sin scroll horizontal de página).
5. **Administración de Usuarios y Accesos (`/admin/users`):**
   - Módulo exclusivo para usuarios con rol `ADMINISTRADOR`.
   - Creación de nuevos usuarios con contraseña segura mediante **Argon2id**.
   - Activación y desactivación de cuentas institucionales.
   - Desbloqueo manual de cuentas bloqueadas por fuerza bruta (reseteo de intentos fallidos).
6. **Perfil de Funcionario (`/profile`):**
   - Edición de **nombre**, **cargo** (`jobTitle`) y **área/gerencia**.
   - **Foto de perfil** (JPEG/PNG/WebP, máx. 2 MB) almacenada en `storage/avatars/`.
   - Actualización de contraseña con Argon2id y enlace a sesiones activas (`/sessions`).
   - Diseño responsive: hero institucional y formularios adaptados a móvil.
7. **Dashboard y Métricas en Tiempo Real (`/dashboard`):**
   - Métricas y tarjetas operativas adaptadas al rol del usuario conectado.

---

## 👥 Cuentas de Prueba (Seed Sintético)

Todas las cuentas iniciales utilizan la contraseña por defecto: `Password123!`

| Rol | Correo | Nombre | Cargo (seed) | Área |
| :--- | :--- | :--- | :--- | :--- |
| **ADMINISTRADOR** | `admin@bnb.com.bo` | Carlos Morales | Administrador de Seguridad TI | Seguridad y Arquitectura de Datos |
| **COORDINADOR** | `coordinador@bnb.com.bo` | Valeria Quispe | Coordinadora de Gobierno y Analítica | Gobierno y Analítica de Datos |
| **ANALISTA** | `analista@bnb.com.bo` | Rodrigo Mendoza | Analista Senior de Datos | Ingeniería y Modelado de Datos |
| **ANALISTA** | `analista2@bnb.com.bo` | Mariana Flores | Analista de Business Intelligence | Inteligencia de Negocios y Reportes |
| **SOLICITANTE** | `solicitante@bnb.com.bo` | Alejandro Torrico | Oficial de Riesgos | Gerencia de Riesgos Crediticios |
| **SOLICITANTE** | `solicitante2@bnb.com.bo` | Lucía Gutiérrez | Jefa de Finanzas | Finanzas y Planificación |

---

## 🔒 Seguridad Bancaria Implementada

1. **Argon2id:** Configurado con 19 MiB de memoria, 2 iteraciones y 32 bytes de clave (PHC winner, resistente a GPUs y canal lateral).
2. **Sesiones Revocables:** Cada login crea un registro en la tabla `sessions`; pueden consultarse y revocarse en `/sessions`.
3. **Cookies HttpOnly:** La cookie `bnb_session` no es legible por JavaScript, mitigando ataques de robo por XSS.
4. **Protección CSRF:** Implementación de Double Submit Cookie con cabecera `X-CSRF-Token`.
5. **Mitigación de Fuerza Bruta:** Bloqueo automático de 15 minutos al registrarse 5 intentos fallidos consecutivos, con auditoría de IP y User-Agent.
6. **RBAC Estricto:** Verificación a nivel de controlador y servicio que impide accesos no autorizados a datos de otras áreas o transiciones prohibidas.

---

## 🛠️ Instalación y Ejecución

### Prerrequisitos
- Node.js >= 20
- pnpm >= 9
- PostgreSQL local en ejecución

### 1. Variables de Entorno
Configurar `.env` con las credenciales de PostgreSQL:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/bnb_tickets_dev?schema=public
```

### 2. Base de Datos y Seed
```bash
# Sincronizar esquema en PostgreSQL
pnpm --filter @bnb/api prisma db push

# Poblar datos semilla sintéticos
pnpm seed
```

### 3. Ejecutar en Modo Desarrollo
Inicia frontend (puerto 5173) y backend (puerto 3000) en paralelo:
```bash
pnpm dev
```
En desarrollo el frontend usa el proxy Vite (`VITE_API_URL=/api/v1`) para cookies, avatares y sesión en la misma origen que la SPA.
O de forma independiente:
- Backend: `pnpm dev:api`
- Frontend: `pnpm dev:web`

### 4. Pruebas y Compilación
```bash
# Comprobación estricta de tipos TypeScript
pnpm typecheck

# Pruebas unitarias completas
pnpm test

# Compilación completa de producción (shared, api, web)
pnpm build
```

---

## 📚 Documentación Técnica Detallada

Encuentra guías y manuales especializados en la carpeta [`docs/`](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs):
- [**docs/arquitectura.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/arquitectura.md): Estructura del monorepo, decisiones de diseño y arquitectura de software.
- [**docs/database.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/database.md): Modelo de datos relacional, diagrama entidad-relación y tablas.
- [**docs/api.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/api.md): Especificación de endpoints REST, DTOs y documentación Swagger.
- [**docs/rbac.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/rbac.md): Matriz de permisos por rol, reglas de asignación y transiciones de tickets.
- [**docs/seguridad.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/seguridad.md): Criptografía Argon2id, cookies HttpOnly, CSRF y mitigación de fuerza bruta.
- [**docs/ticket-workflow.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/ticket-workflow.md): Ciclo de vida de solicitudes y máquina de estados.
- [**docs/deployment-windows.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/deployment-windows.md): Despliegue en Windows Server como servicio sin Docker.
- [**docs/backup-restore.md**](file:///Users/rodrigo203/Desarrollo/GerenciaDatos_Ticket/docs/backup-restore.md): Estrategia de respaldo y recuperación de PostgreSQL y archivos.
