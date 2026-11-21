/** Estado del degradado lateral del tablero Kanban según scroll horizontal. */
export type EstadoDegradadoKanban = {
  degradadoIzquierda: boolean;
  degradadoDerecha: boolean;
  puedeScrollHorizontal: boolean;
};

export function estadoDegradadoKanban(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
  epsilon = 2,
): EstadoDegradadoKanban {
  const maxScroll = Math.max(0, scrollWidth - clientWidth);
  return {
    degradadoIzquierda: scrollLeft > epsilon,
    degradadoDerecha: scrollLeft < maxScroll - epsilon,
    puedeScrollHorizontal: maxScroll > epsilon,
  };
}

/** Velocidad de autoscroll horizontal cuando el puntero está cerca del borde del tablero (px por evento). */
export function deltaAutoscrollKanban(
  pointerX: number,
  boardRect: { left: number; right: number },
  scrollSensitivity = 80,
  scrollSpeed = 12,
): number {
  const leftEdge = boardRect.left + scrollSensitivity;
  const rightEdge = boardRect.right - scrollSensitivity;
  if (pointerX < leftEdge) {
    const ratio = Math.min(1, (leftEdge - pointerX) / scrollSensitivity);
    return -scrollSpeed * ratio;
  }
  if (pointerX > rightEdge) {
    const ratio = Math.min(1, (pointerX - rightEdge) / scrollSensitivity);
    return scrollSpeed * ratio;
  }
  return 0;
}

export function mascaraKanbanCss(degradadoIzquierda: boolean, degradadoDerecha: boolean): string | null {
  if (degradadoIzquierda && degradadoDerecha) {
    return 'linear-gradient(to right, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)';
  }
  if (degradadoDerecha) {
    return 'linear-gradient(to right, #000 0, #000 calc(100% - 24px), transparent 100%)';
  }
  if (degradadoIzquierda) {
    return 'linear-gradient(to right, transparent 0, #000 24px, #000 100%)';
  }
  return null;
}