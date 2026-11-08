# Modelo de Datos y PostgreSQL - Plataforma BNB

El modelo de datos relacional está optimizado para garantizar integridad referencial, trazabilidad de auditoría bancaria y alto rendimiento en consultas filtradas.

---

## 1. Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    users ||--o{ sessions : "posee"
    users ||--o{ solicitudes : "solicita (requester)"
    users ||--o{ solicitudes : "atiende (assignedAnalyst)"
    users ||--o{ solicitud_histories : "escribe (author)"
    users ||--o{ audit_logs : "genera (user)"
    
    solicitudes ||--o{ solicitud_histories : "registra eventos"

    users {
        string id PK "UUID"
        string email UK "Correo corporativo único"
        string fullName "Nombre y apellidos"
        string jobTitle "Cargo funcional (opcional)"
        string avatarPath "Ruta relativa en storage/avatars (opcional)"
        string passwordHash "Hash Argon2id"
        enum role "SOLICITANTE, ANALISTA, COORDINADOR, ADMINISTRADOR"
        string area "Gerencia u oficina"
        boolean isActive "Estado de la cuenta"
        boolean isLocked "Bloqueado por fuerza bruta"
        int failedAttempts "Contador de fallos de login"
        datetime lockedUntil "Fecha de desbloqueo"
        datetime lastLoginAt "Último ingreso"
        datetime createdAt "Creación"
        datetime updatedAt "Modificación"
    }

    sessions {
        string id PK "UUID"
        string userId FK "Usuario propietario"
        string tokenHash UK "Hash SHA-256 del token"
        string ipAddress "Dirección IP"
        string userAgent "Navegador y OS"
        string deviceInfo "Tipo de dispositivo"
        boolean isValid "Estado de validez"
        datetime expiresAt "Fecha de caducidad"
        datetime createdAt "Creación"
        datetime lastActivityAt "Última actividad"
    }

    solicitudes {
        string id PK "UUID"
        string code UK "Código legible REQ-YYYY-XXXX"
        string title "Título del requerimiento"
        string description "Alcance técnico detallado"
        enum category "Categoría de datos"
        enum priority "BAJA, MEDIA, ALTA, URGENTE"
        enum status "REGISTRADA, EN_ANALISIS, etc."
        string requesterId FK "Usuario solicitante"
        string assignedAnalystId FK "Analista encargado (Opcional)"
        string requesterArea "Área solicitante"
        string justification "Justificación de negocio/ASFI"
        int estimatedHours "Horas estimadas"
        datetime closedAt "Fecha de cierre"
        datetime createdAt "Creación"
        datetime updatedAt "Modificación"
    }

    solicitud_histories {
        string id PK "UUID"
        string solicitudId FK "Ticket relacionado"
        string authorId FK "Usuario que ejecutó la acción"
        enum previousStatus "Estado anterior"
        enum newStatus "Estado nuevo"
        string comment "Comentario o nota de avance"
        datetime createdAt "Fecha y hora del evento"
    }

    audit_logs {
        string id PK "UUID"
        string userId FK "Usuario asociado (Opcional)"
        string userEmail "Correo del actor"
        enum action "LOGIN_SUCCESS, USER_CREATED, etc."
        string details "Descripción detallada del evento"
        string ipAddress "IP de origen"
        string userAgent "User agent"
        datetime createdAt "Fecha y hora del registro"
    }
```

---

## 2. Descripción de Tablas

### `users`
Almacena las credenciales y perfiles de los funcionarios del banco:
* `email`: Índice único en minúsculas.
* `passwordHash`: Almacenado con el algoritmo Argon2id.
* `failedAttempts`, `isLocked`, `lockedUntil`: Controlan el bloqueo por fuerza bruta.

### `sessions`
Registra las sesiones revocables activas:
* `tokenHash`: Índice único para validación rápida en cada petición autenticada.
* `isValid`: Bandera que permite la invalidación instantánea sin eliminar el registro histórico.

### `solicitudes`
Entidad principal del ciclo de vida de requerimientos analíticos:
* `code`: Código único consecutivo anual (ej. `REQ-2026-0001`).
* `assignedAnalystId`: Llave foránea hacia `users` restringida por regla de negocio a roles no-solicitantes.
* `closedAt`: Marca de tiempo registrada automáticamente cuando el ticket pasa a `APROBADA`, `RECHAZADA` o `CANCELADA`.

### `solicitud_histories`
Bitácora inmutable de eventos por solicitud:
* Cada cambio de estado o comentario registrado por el solicitante o analista se inserta con clave foránea en cascada ante eliminación del ticket.

### `audit_logs`
Bitácora de seguridad para auditorías internas del banco:
* Registra inicios de sesión exitosos y fallidos, bloqueos de cuenta, creación y edición de usuarios, y cambios de estado en requerimientos.

---

## 3. Enumeradores (Enums)

- **`Role`:** `SOLICITANTE`, `ANALISTA`, `COORDINADOR`, `ADMINISTRADOR`.
- **`RequestStatus`:** `REGISTRADA`, `EN_ANALISIS`, `EN_REVISION_COORDINACION`, `APROBADA`, `RECHAZADA`, `CANCELADA`.
- **`RequestPriority`:** `BAJA`, `MEDIA`, `ALTA`, `URGENTE`.
- **`RequestCategory`:** `EXTRACCION_DATOS`, `REPORTES_BI`, `MODELOS_ML`, `CALIDAD_DATOS`, `GOBIERNO_DATOS`, `ACCESO_BD`.
- **`AuditAction`:** `LOGIN_SUCCESS`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `LOGOUT`, `SESSION_REVOKED`, `REQUEST_CREATED`, `REQUEST_STATUS_UPDATED`, `USER_CREATED`, `USER_UPDATED`.

---

## 4. Comandos de Gestión de Base de Datos

```bash
# Validar el esquema de Prisma sin conexión activa
pnpm --filter @bnb/api prisma validate

# Generar el cliente TypeScript de Prisma (@prisma/client)
pnpm --filter @bnb/api prisma generate

# Sincronizar el esquema con PostgreSQL local
pnpm --filter @bnb/api prisma db push

# Poblar la base de datos con usuarios y tickets de prueba
pnpm seed
```

