import { hayBaseDeDatosParaTests, urlBaseDeDatosInicial } from './hay-base';

describe('hay-base (snapshot Jest)', () => {
  it('refleja DATABASE_URL capturada al arrancar (no valores fugados en runtime)', () => {
    process.env.DATABASE_URL = 'postgresql://fugada/durante-test';
    expect(urlBaseDeDatosInicial()).not.toBe('postgresql://fugada/durante-test');
  });

  it('hayBaseDeDatosParaTests ignora DATABASE_URL mutada después del snapshot', () => {
    const antes = hayBaseDeDatosParaTests();
    process.env.DATABASE_URL = 'postgresql://fugada/durante-test';
    expect(hayBaseDeDatosParaTests()).toBe(antes);
  });
});