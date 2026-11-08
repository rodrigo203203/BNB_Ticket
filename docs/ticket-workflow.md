# Ciclo de Vida y Flujo de Estados de Tickets

## 1. Definición de Estados

Cada solicitud dirigida a la Gerencia de Datos transita a través de estados predefinidos que aseguran control y transparencia:

1. **`REGISTRADA`:**
   * La solicitud ha sido ingresada formalmente por el funcionario solicitante o un administrador.
   * Aún no cuenta con analista asignado o está pendiente de revisión inicial por la Coordinación.
   * El solicitante puede cancelarla directamente si ya no requiere el entregable.
2. **`EN_ANALISIS`:**
   * El requerimiento ha sido asignado a un analista técnico (o tomado directamente por un analista).
   * Se encuentra en fase de desarrollo: extracción SQL, cruce de datos, elaboración de tableros PowerBI o entrenamiento de modelos de Machine Learning.
3. **`EN_REVISION_COORDINACION`:**
   * El analista ha completado el análisis y remite el entregable a la Coordinación de Gobierno y Analítica para control de calidad y validación normativa.
4. **`APROBADA`:**
   * El requerimiento cuenta con el visto bueno final de la Coordinación y ha sido entregado a entera conformidad del área solicitante.
   * Se registra la marca de tiempo `closedAt`.
5. **`RECHAZADA`:**
   * La solicitud no es técnicamente viable, carece de justificación regulatoria o no cumple con los criterios de seguridad de la información.
   * Requiere registrar un motivo obligatorio en la bitácora.
6. **`CANCELADA`:**
   * El solicitante desiste formalmente del requerimiento antes de que inicie la atención técnica.

---

## 2. Reglas de Validación de Negocio

- **Asignación Automática de Estado:** Al asignar por primera vez un encargado a un ticket en estado `REGISTRADA`, el sistema promueve automáticamente su estado a `EN_ANALISIS`.
- **Inmutabilidad de Tickets Cerrados:** Un ticket en estado `APROBADA`, `RECHAZADA` o `CANCELADA` no puede recibir nuevas transiciones operativas salvo reactivación excepcional por un `ADMINISTRADOR`.
- **Aislamiento de Solicitantes:** Un solicitante nunca puede aprobar su propia solicitud ni modificar tickets de otras gerencias.
- **Trazabilidad en Bitácora:** Ningún estado puede cambiar sin que se registre automáticamente una entrada en la tabla `solicitud_histories` indicando el usuario, la fecha y hora, el estado anterior, el estado nuevo y el comentario explicativo.

---

## 3. Mapeo en el Tablero Kanban

El Tablero Kanban (`/kanban`) proyecta los tickets en cinco columnas operativas. Desde la interfaz se pueden **arrastrar tarjetas** hacia otra columna; cada movimiento invoca `PATCH /api/v1/solicitudes/:id/status` y respeta la misma matriz RBAC que el detalle del ticket. Si el rol no permite la transición, la tarjeta vuelve a su columna y se muestra un aviso al usuario.

| Columna | Estados Mapeados | Propósito Operativo |
| :--- | :--- | :--- |
| **Registradas** | `REGISTRADA` | Bandeja de entrada para triaje y asignación por parte de Coordinación |
| **En Análisis** | `EN_ANALISIS` | Trabajo técnico activo de analistas e ingenieros de datos |
| **En Revisión** | `EN_REVISION_COORDINACION` | Control de calidad y revisión metodológica |
| **Aprobadas** | `APROBADA` | Entregas completadas a satisfacción de negocio |
| **Rechazadas / Canceladas** | `RECHAZADA`, `CANCELADA` | Solicitudes desestimadas o anuladas |

