# Arquitectura del Sistema - Plataforma BNB Gerencia de Datos

## 1. Visión General del Monorepo

El sistema está estructurado como un monorepo administrado mediante `pnpm workspaces`, desacoplado en capas de responsabilidad única y preparado para ejecutarse de forma 100% autónoma en la intranet corporativa del Banco Nacional de Bolivia (BNB), sin dependencias de Docker, sin CDNs públicas y sin servicios de nube de pago:

```text
GerenciaDatos_Ticket/
├── apps/
│   ├── api/             # Backend NestJS 10 + Prisma ORM + Argon2id + Swagger
│   └── web/             # Frontend Vue 3 (Composition API) + Vite 5 + PrimeVue Aura
├── packages/
│   └── shared/          # Modelos compartidos, contratos, interfaces, DTOs y constantes RBAC
├── docs/                # Documentación técnica corporativa en español
├── scripts/             # Scripts de verificación y validación de variables de entorno
├── storage/             # Almacenamiento local desacoplado (uploads, logs)
├── .env.example         # Plantilla documentada de variables de entorno
├── pnpm-workspace.yaml  # Configuración del espacio de trabajo pnpm
└── tsconfig.base.json   # Configuración base estricta de TypeScript
```

---

## 2. Capa Backend (`apps/api`)

Construido sobre **NestJS 10** bajo una arquitectura modular basada en dominios (Domain-Driven Design / Clean Architecture):

```text
apps/api/src/
├── common/
│   ├── decorators/      # CurrentUser, Roles, Public
│   ├── filters/         # Centralized HttpExceptionFilter
│   ├── guards/          # JwtAuthGuard, RolesGuard, CsrfGuard
│   ├── interceptors/    # LoggingInterceptor, TransformInterceptor (formato estándar ApiResponse)
│   └── utils/           # argon2.util (Argon2id hashing y verificación)
├── config/              # env.config (Validación estricta al inicio del runtime)
├── prisma/              # PrismaService y PrismaModule (Gestión de ciclo de vida de conexión PostgreSQL)
├── modules/
│   ├── auth/            # Login, perfil, avatar, cookies HttpOnly, CSRF, cambio de contraseña
│   ├── users/           # Administración de cuentas, catálogo de analistas asignables, bloqueo/activación
│   ├── solicitudes/     # Creación, catálogo, detalle, matriz de transiciones RBAC, asignación y notas
│   ├── dashboard/       # Agregaciones analíticas y KPIs calculados por rol en tiempo real
│   ├── sessions/        # Consulta, auditoría y revocación remota de sesiones
│   └── health/          # Telemetría de disponibilidad y uso de memoria (/api/v1/health)
└── main.ts              # Bootstrap con Helmet, CookieParser, CORS restringido y Swagger
```

### Principios de Diseño Backend:
- **Validación con DTOs:** Uso sistemático de `class-validator` y `class-transformer` con `whitelist: true` y `forbidNonWhitelisted: true`.
- **Cero SQL Injections:** Todas las consultas se canalizan a través de Prisma ORM con sentencias preparadas y parámetros tipados.
- **Formato Estándar de Respuesta:** Todos los endpoints devuelven el envoltorio `{ success: true, data: T }` o `{ success: false, error: { ... } }` mediante `TransformInterceptor` y `HttpExceptionFilter`.

---

## 3. Capa Frontend (`apps/web`)

Desarrollado con **Vue 3** empleando la sintaxis moderna `<script setup>` y TypeScript estricto:

- **Estructura de Vistas:**
  - `LoginView.vue`: Acceso seguro con credenciales corporativas.
  - `DashboardView.vue`: Tablero ejecutivo adaptativo con indicadores por rol y accesos directos.
  - `SolicitudesView.vue`: Bandeja y catálogo de requerimientos con filtros dinámicos y exportación CSV.
  - `NuevaSolicitudView.vue`: Formulario de registro de requerimientos técnicos y justificación de negocio.
  - `SolicitudDetailView.vue`: Ficha técnica del ticket, reasignación, línea de tiempo (timeline) e historial de avances.
  - `KanbanView.vue`: Tablero Kanban con arrastre entre columnas (`vue-draggable-plus`), validación RBAC y componentes `KanbanColumn` / `KanbanCard`.
  - `UsersAdminView.vue`: Directorio corporativo, creación de cuentas con Argon2id y desbloqueo de seguridad.
  - `ProfileView.vue`: Perfil editable (nombre, cargo, área), foto de perfil y cambio de contraseña.
  - `SessionsView.vue`: Monitoreo y revocación de dispositivos conectados.
  - `UserAvatarImage.vue` + `assets/responsive.css`: avatar con fallback y tablas/vistas adaptadas a móvil (sin scroll horizontal de página).
- **Gestión de Estado:** Stores modulares con Pinia (`auth.store`, `dashboard.store`).
- **Navegación Protegida:** Vue Router con guardias `beforeEach` que validan autenticación mediante `/auth/me` y permisos del rol.
- **Diseño UI/UX Institucional:** Personalización centralizada con el preset de PrimeVue Aura:
  - Color Primario: `#26b460` (Verde institucional BNB).
  - Color Secundario: `#5b21b6` / `#4c1d95` (Morado BNB).
  - Fondos neutros de alto contraste y legibilidad para funcionarios del banco.

---

## 4. Paquete Compartido (`packages/shared`)

Garantiza la consistencia de tipos entre cliente y servidor, eliminando duplicidad de contratos:

- `enums`: `Role`, `RequestStatus`, `RequestPriority`, `RequestCategory`, `AuditAction`.
- `interfaces`: `UserSummary`, `SolicitudItem`, `SolicitudAuditEntry`, `DashboardStats`, `ApiResponse`.
- `constants`: Matriz `ALLOWED_STATUS_TRANSITIONS`, etiquetas descriptivas `STATUS_LABELS`, `CATEGORY_LABELS`, `ROLE_LABELS` y constantes de sesión.
- `dto`: Interfaces de peticiones HTTP para login, solicitudes, usuarios y contraseñas.

---

## 5. Base de Datos PostgreSQL

Instancia local independiente conectada mediante `DATABASE_URL`:
- Esquema relacional estructurado con índices en claves foráneas, códigos y marcas temporales.
- Transaccionalidad garantizada en cambios de estado de tickets e inserciones en bitácora.
- Script de inicialización `prisma/seed.ts` con cuentas y tickets sintéticos para pruebas operativas.
