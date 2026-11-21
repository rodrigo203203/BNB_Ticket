import { parseAndValidateUsersCsv, CSV_MAX_ROWS } from '../src/modules/users/csv-import.util';
import { Role } from '@bnb/shared';

describe('parseAndValidateUsersCsv', () => {
  const existing = new Set<string>(['existente@bnb.com.bo']);

  it('acepta UTF-8 BOM y separador punto y coma', () => {
    const csv = Buffer.from(
      '\uFEFFemail;nombre;rol;area\r\nnuevo@bnb.com.bo;Ana López;SOLICITANTE;Riesgos\r\n',
      'utf8',
    );
    const result = parseAndValidateUsersCsv(csv, existing);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].role).toBe(Role.SOLICITANTE);
  });

  it('reporta duplicados en archivo y en BD', () => {
    const csv = Buffer.from(
      'email,nombre,rol,area\na@bnb.com.bo,Uno,SOLICITANTE,A\na@bnb.com.bo,Dos,SOLICITANTE,A\nexistente@bnb.com.bo,Tres,ANALISTA,B\r\n',
    );
    const result = parseAndValidateUsersCsv(csv, existing);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].email).toBe('a@bnb.com.bo');
    expect(result.errors.some((e) => e.message.includes('Duplicado'))).toBe(true);
    expect(result.errors.some((e) => e.message.includes('ya existe'))).toBe(true);
  });

  it('rechaza más filas que el máximo', () => {
    const header = 'email,nombre,rol,area\n';
    const row = 'x@bnb.com.bo,N,R,A\n';
    const big = header + row.repeat(CSV_MAX_ROWS + 1);
    const result = parseAndValidateUsersCsv(Buffer.from(big), new Set());
    expect(result.errors[0].field).toBe('archivo');
  });
});