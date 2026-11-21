/**
 * Reglas de presentación del Gantt (revisión Spark M8).
 * Sin fecha de entrega: la barra punteada va de la creación al fin configurado;
 * la fecha requerida se marca aparte con un rombo neutro (◇).
 */
export type GanttFinBarraSinEntrega = 'hoy' | 'fecha_requerida';

/** Confirmado con diseño: barra punteada de creación hasta la fecha requerida. */
export const GANTT_FIN_BARRA_SIN_ENTREGA: GanttFinBarraSinEntrega = 'fecha_requerida';