import { describe, expect, it } from 'vitest';
import {
  deltaAutoscrollKanban,
  estadoDegradadoKanban,
  mascaraKanbanCss,
} from './kanban-board-scroll.util';

describe('estadoDegradadoKanban', () => {
  it('muestra degradado derecho al inicio si hay overflow', () => {
    const s = estadoDegradadoKanban(0, 1504, 1100);
    expect(s.degradadoDerecha).toBe(true);
    expect(s.degradadoIzquierda).toBe(false);
    expect(s.puedeScrollHorizontal).toBe(true);
  });

  it('muestra ambos degradados en medio del scroll', () => {
    const max = 1504 - 1100;
    const s = estadoDegradadoKanban(max / 2, 1504, 1100);
    expect(s.degradadoIzquierda).toBe(true);
    expect(s.degradadoDerecha).toBe(true);
  });

  it('sin degradado derecho al llegar al final', () => {
    const s = estadoDegradadoKanban(404, 1504, 1100);
    expect(s.degradadoDerecha).toBe(false);
    expect(s.degradadoIzquierda).toBe(true);
  });
});

describe('deltaAutoscrollKanban', () => {
  const rect = { left: 100, right: 500 };

  it('devuelve 0 en el centro', () => {
    expect(deltaAutoscrollKanban(300, rect, 80, 12)).toBe(0);
  });

  it('acelera hacia la derecha cerca del borde', () => {
    expect(deltaAutoscrollKanban(490, rect, 80, 12)).toBeGreaterThan(0);
  });

  it('acelera hacia la izquierda cerca del borde', () => {
    expect(deltaAutoscrollKanban(110, rect, 80, 12)).toBeLessThan(0);
  });
});

describe('mascaraKanbanCss', () => {
  it('combina máscaras cuando hay scroll en ambos lados', () => {
    expect(mascaraKanbanCss(true, true)).toContain('24px');
    expect(mascaraKanbanCss(false, false)).toBeNull();
  });
});