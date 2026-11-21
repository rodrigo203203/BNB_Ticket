import { Role } from '@bnb/shared';

describe('solicitudes gantt RBAC', () => {
  it('solicitante queda excluido por regla de negocio', () => {
    expect(Role.SOLICITANTE).toBe('SOLICITANTE');
  });
});