# Especificación de la API REST - Plataforma BNB

Todos los endpoints están versionados bajo el prefijo `/api/v1/` y documentados interactivamente mediante **Swagger UI** en:
`http://localhost:3000/api/v1/docs`

---

## 1. Formato Estándar de Respuesta

### Respuesta Exitosa:
```json
{
  "success": true,
  "data": { ... }
}
```

### Respuesta de Error:
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "code": "Bad Request",
    "message": "Descripción detallada del error",
    "timestamp": "2026-11-07T20:58:01.186Z",
    "path": "/api/v1/solicitudes/..."
  }
}
```

---

## 2. Endpoints de Autenticación y Seguridad (`/auth`)

| Método | Ruta | Roles | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Público | Inicia sesión con correo y contraseña. Emite cookies `bnb_session` (HttpOnly) y `bnb_csrf_token`. Aplica rate limiting (10 req/min). |
| `POST` | `/auth/logout` | Público | Cierra la sesión activa, revoca el registro en base de datos y elimina las cookies. |
| `GET` | `/auth/me` | Autenticado | Devuelve el perfil completo (`UserSummary`: nombre, cargo, área, rol, `avatarUrl`, etc.). |
| `GET` | `/auth/csrf` | Público | Genera y retorna un token CSRF seguro. |
| `PATCH` | `/auth/change-password` | Autenticado | Actualiza la contraseña del usuario tras verificar la contraseña actual mediante Argon2id. |
| `PATCH` | `/auth/profile` | Autenticado | Actualiza `fullName`, `jobTitle` y `area` del usuario conectado (no modifica email ni rol). |
| `POST` | `/auth/profile/avatar` | Autenticado | Sube foto de perfil (`multipart/form-data`, campo `file`). JPEG/PNG/WebP, máx. 2 MB. |
| `DELETE` | `/auth/profile/avatar` | Autenticado | Elimina la foto de perfil y el archivo en disco. |
| `GET` | `/auth/profile/avatar` | Autenticado | Devuelve el binario de la foto del usuario conectado (para `<img>` vía proxy `/api/v1` en dev). |

---

## 3. Endpoints de Gestión de Solicitudes (`/solicitudes`)

| Método | Ruta | Roles | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/solicitudes` | Todos | Registra un nuevo requerimiento. Genera código consecutivo `REQ-YYYY-XXXX`. |
| `GET` | `/solicitudes` | Todos | Lista solicitudes con filtros (`search`, `status`, `category`, `priority`). Los solicitantes solo ven sus propios tickets. |
| `GET` | `/solicitudes/:id` | Todos | Obtiene el detalle técnico y la bitácora completa de eventos de un ticket. |
| `PATCH` | `/solicitudes/:id/status` | Analista, Coord, Admin | Actualiza el estado respetando la matriz de transiciones RBAC y registra el motivo en la bitácora. |
| `PATCH` | `/solicitudes/:id/assign` | Coordinador, Admin | Asigna o reasigna el analista encargado (se rechaza a usuarios con rol `SOLICITANTE`). Promueve a `EN_ANALISIS` si estaba `REGISTRADA`. |
| `POST` | `/solicitudes/:id/comments` | Participantes | Agrega una nota técnica o avance en el historial del requerimiento. |

---

## 4. Endpoints de Administración de Usuarios (`/users`)

| Método | Ruta | Roles | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | Administrador | Lista todos los funcionarios registrados en la plataforma con filtros por rol y búsqueda. |
| `GET` | `/users/assignable` | Analista, Coord, Admin | Devuelve los usuarios aptos para ser asignados como encargados de tickets (**excluye a usuarios con rol `SOLICITANTE`**). |
| `POST` | `/users` | Administrador | Da de alta a un nuevo usuario aplicando hash Argon2id y validando unicidad de correo institucional. |
| `PATCH` | `/users/:id/status` | Administrador | Activa/desactiva cuentas o desbloquea cuentas bloqueadas por fuerza bruta (resetea intentos fallidos). |
| `GET` | `/users/:id` | Administrador | Obtiene la ficha detallada de un usuario. |

---

## 5. Endpoints de Dashboard y Sesiones

| Método | Ruta | Roles | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/metrics` | Todos | Métricas operativas consolidadas en backend según el rol del usuario conectado. |
| `GET` | `/sessions/me` | Todos | Consulta todas las sesiones activas en base de datos para el usuario conectado. |
| `DELETE` | `/sessions/:id` | Todos / Admin | Revoca una sesión activa por ID. |
| `DELETE` | `/sessions/me/others` | Todos | Revoca todas las sesiones activas excepto la sesión actual. |
| `GET` | `/health` | Público | Telemetría básica del backend (estado del servicio, uptime y uso de memoria). |

