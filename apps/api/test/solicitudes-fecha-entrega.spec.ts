import { canEditFechaEntrega } from '@bnb/shared';
import { Role } from '@bnb/shared';

describe('canEditFechaEntrega (RBAC)', () => {
  const solicitud = { assignedAnalystId: 'analyst-1' };

  it('permite al analista asignado', () => {
    expect(canEditFechaEntrega(Role.ANALISTA, 'analyst-1', solicitud)).toBe(true);
  });

  it('deniega a otro analista', () => {
    expect(canEditFechaEntrega(Role.ANALISTA, 'analyst-2', solicitud)).toBe(false);
  });

  it('permite coordinador y administrador', () => {
    expect(canEditFechaEntrega(Role.COORDINADOR, 'c1', solicitud)).toBe(true);
    expect(canEditFechaEntrega(Role.ADMINISTRADOR, 'a1', solicitud)).toBe(true);
  });

  it('deniega al solicitante', () => {
    expect(canEditFechaEntrega(Role.SOLICITANTE, 's1', solicitud)).toBe(false);
  });
});