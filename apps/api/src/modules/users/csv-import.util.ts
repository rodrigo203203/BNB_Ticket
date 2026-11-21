import { Role } from '@bnb/shared';

export const CSV_MAX_ROWS = 500;
export const CSV_MAX_BYTES = 2 * 1024 * 1024;

export interface CsvUserRow {
  rowNumber: number;
  email: string;
  fullName: string;
  role: Role;
  area: string;
}

export interface CsvRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface CsvValidationResult {
  validRows: CsvUserRow[];
  errors: CsvRowError[];
}

const TEMPLATE_HEADER = 'email,nombre,rol,area';

export function getUsersImportTemplateCsv(): string {
  return `\uFEFF${TEMPLATE_HEADER}\r\nsolicitante.ejemplo@bnb.com.bo,Juan Pérez,SOLICITANTE,Créditos\r\n`;
}

/** Quita BOM UTF-8 si existe. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function detectDelimiter(headerLine: string): ',' | ';' {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

function splitCsvLine(line: string, delimiter: ',' | ';'): string[] {
  // CSV simple sin comillas internas (plantilla institucional)
  return line.split(delimiter).map((c) => c.trim());
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set<string>(Object.values(Role));

export function parseAndValidateUsersCsv(
  fileBuffer: Buffer,
  existingEmails: Set<string>,
): CsvValidationResult {
  if (fileBuffer.length > CSV_MAX_BYTES) {
    return {
      validRows: [],
      errors: [{ rowNumber: 0, field: 'archivo', message: `El archivo supera ${CSV_MAX_BYTES / 1024 / 1024} MB` }],
    };
  }

  const text = stripBom(fileBuffer.toString('utf8'));
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: [{ rowNumber: 0, field: 'archivo', message: 'El CSV debe incluir encabezado y al menos una fila' }],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.toLowerCase());

  const idxEmail = header.findIndex((h) => h === 'email' || h === 'correo');
  const idxNombre = header.findIndex((h) => h === 'nombre' || h === 'fullname' || h === 'nombre_completo');
  const idxRol = header.findIndex((h) => h === 'rol' || h === 'role');
  const idxArea = header.findIndex((h) => h === 'area' || h === 'área');

  const errors: CsvRowError[] = [];
  if (idxEmail < 0 || idxNombre < 0 || idxRol < 0 || idxArea < 0) {
    errors.push({
      rowNumber: 1,
      field: 'encabezado',
      message: 'Columnas requeridas: email, nombre, rol, area (coma o punto y coma)',
    });
    return { validRows: [], errors };
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > CSV_MAX_ROWS) {
    errors.push({
      rowNumber: 0,
      field: 'archivo',
      message: `Máximo ${CSV_MAX_ROWS} filas de datos`,
    });
    return { validRows: [], errors };
  }

  const validRows: CsvUserRow[] = [];
  const emailsInFile = new Map<string, number>();

  for (let i = 0; i < dataLines.length; i++) {
    const rowNumber = i + 2;
    const cols = splitCsvLine(dataLines[i], delimiter);
    const email = (cols[idxEmail] || '').trim().toLowerCase();
    const fullName = (cols[idxNombre] || '').trim();
    const roleRaw = (cols[idxRol] || '').trim().toUpperCase();
    const area = (cols[idxArea] || '').trim();

    if (!email) errors.push({ rowNumber, field: 'email', message: 'Email vacío' });
    else if (!EMAIL_RE.test(email)) errors.push({ rowNumber, field: 'email', message: 'Formato de email inválido' });
    else if (emailsInFile.has(email)) {
      errors.push({ rowNumber, field: 'email', message: `Duplicado en fila ${emailsInFile.get(email)}` });
    } else if (existingEmails.has(email)) {
      errors.push({ rowNumber, field: 'email', message: 'El email ya existe en la base de datos' });
    } else {
      emailsInFile.set(email, rowNumber);
    }

    if (!fullName) errors.push({ rowNumber, field: 'nombre', message: 'Nombre vacío' });
    if (!area) errors.push({ rowNumber, field: 'area', message: 'Área vacía' });
    if (!roleRaw) errors.push({ rowNumber, field: 'rol', message: 'Rol vacío' });
    else if (!ROLES.has(roleRaw)) {
      errors.push({ rowNumber, field: 'rol', message: `Rol inválido: ${roleRaw}` });
    }

    const rowErrors = errors.filter((e) => e.rowNumber === rowNumber);
    if (rowErrors.length === 0) {
      validRows.push({
        rowNumber,
        email,
        fullName,
        role: roleRaw as Role,
        area,
      });
    }
  }

  return { validRows, errors };
}

export function buildCredentialsCsv(rows: Array<{ email: string; temporaryPassword: string }>): string {
  const lines = ['email,clave_temporal', ...rows.map((r) => `${r.email},${r.temporaryPassword}`)];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}