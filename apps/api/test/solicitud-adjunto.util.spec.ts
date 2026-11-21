import { validarAdjuntoSolicitud } from '../src/common/utils/solicitud-adjunto.util';

describe('validarAdjuntoSolicitud', () => {
  it('acepta PDF con firma %PDF', () => {
    const buf = Buffer.from('%PDF-1.4 test');
    const r = validarAdjuntoSolicitud(buf, 'informe.pdf', 'application/pdf');
    expect(r.ext).toBe('pdf');
  });

  it('rechaza extensión no permitida', () => {
    expect(() => validarAdjuntoSolicitud(Buffer.from('x'), 'mal.exe')).toThrow();
  });
});