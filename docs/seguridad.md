# Medidas de Seguridad Bancaria Implementadas

La plataforma está diseñada para satisfacer las exigencias de auditoría interna de la Gerencia de Seguridad de la Información del Banco Nacional de Bolivia (BNB) y normativas ASFI.

---

## 1. Hash Criptográfico de Contraseñas (Argon2id)

- **Algoritmo:** Argon2id (variante híbrida resistente tanto a ataques por canal lateral como a ataques por fuerza bruta paralela mediante GPUs y ASICs).
- **Parámetros configurados:**
  - Memoria: `19456 KiB` (~19 MiB).
  - Iteraciones: `2`.
  - Paralelismo: `1`.
  - Longitud de clave de salida: `32 bytes`.
- **Implementación:** Biblioteca nativa `@node-rs/argon2` con soporte compilado para arquitecturas corporativas.
- **Cambio de Contraseña:** Endpoint seguro `PATCH /api/v1/auth/change-password` que exige verificar la contraseña actual antes de aplicar el nuevo hash.
- **Foto de Perfil:** `POST /api/v1/auth/profile/avatar` valida tipo MIME y magic bytes (JPEG/PNG/WebP), rechaza SVG, limita tamaño a 2 MB y guarda en `storage/avatars/` (sin exposición de rutas internas; lectura solo autenticada vía `GET /auth/profile/avatar`).

---

## 2. Mitigación de Ataques de Fuerza Bruta (Account Lockout)

- **Control de Intentos:** Campos `failedAttempts`, `isLocked` y `lockedUntil` a nivel de la tabla `users`.
- **Umbral de Bloqueo:** Tras **5 intentos fallidos consecutivos** con contraseñas erróneas.
- **Acción:** La cuenta pasa a estado bloqueado (`isLocked = true`) durante **15 minutos**.
- **Auditoría:** Cada fallo y cada bloqueo dispara una alerta inmediata en la tabla `audit_logs` registrando la dirección IP y la cadena User-Agent del solicitante.
- **Desbloqueo:** Se reanuda automáticamente transcurrida la ventana de 15 minutos o de forma inmediata por un usuario con rol `ADMINISTRADOR` desde el panel de Gestión de Usuarios.

---

## 3. Sesiones Revocables y Cookies HttpOnly

A diferencia de los esquemas tradicionales de JWT estáticos sin estado (los cuales no pueden invalidarse ante un incidente de seguridad):
- **Base de Datos:** Cada inicio de sesión exitoso almacena una tupla en la tabla `sessions` con un `tokenHash` único, dirección IP, información del dispositivo del usuario y fecha de expiración.
- **Cookie Segura:** El token de autenticación se transporta en la cookie `bnb_session` configurada con:
  - `HttpOnly: true`: Totalmente inaccesible desde JavaScript en el navegador, anulando ataques de robo de sesión mediante Cross-Site Scripting (XSS).
  - `SameSite: 'lax'`: Protección contra ataques de navegación cruzada.
  - `Path: '/'`: Alcance delimitado a la aplicación bancaria.
- **Revocación Inmediata:** El usuario o el Administrador pueden cerrar una sesión individual o todas las sesiones remotas desde `/sessions`, invalidando al instante la entrada en base de datos.

---

## 4. Protección contra Cross-Site Request Forgery (CSRF)

- **Patrón:** Double Submit Cookie tokenizado.
- **Flujo:**
  1. Durante el login o al invocar `GET /api/v1/auth/csrf`, el backend emite una cookie legible `bnb_csrf_token` junto con el token criptográfico generado con `crypto.randomBytes(32)`.
  2. El cliente Axios intercepta automáticamente esta cookie y la incluye en la cabecera `X-CSRF-Token` para todas las peticiones mutantes (`POST`, `PUT`, `PATCH`, `DELETE`).
  3. El guardia de backend valida la correspondencia y firma del token antes de permitir cualquier mutación de datos.

---

## 5. Prevención de IDOR (Insecure Direct Object Reference)

- El backend valida a nivel de servicio que:
  - Un usuario con rol `SOLICITANTE` **únicamente pueda consultar y modificar sus propias solicitudes**. Si intenta acceder a un identificador perteneciente a otra área, el sistema retorna `403 Forbidden`.
  - Un usuario no pueda asignarse a sí mismo un ticket a menos que su rol lo autorice conforme a la matriz RBAC.
  - El administrador no pueda bloquear o desactivar su propia cuenta activa.

---

## 6. Rate Limiting (Throttler)

- Aplicado de manera global y endurecido en rutas sensibles:
  - Endpoints de autenticación (`/auth/login`): Máximo 10 peticiones por minuto por dirección IP.
  - Endpoints de operaciones generales: Máximo 100 peticiones por minuto por IP.
