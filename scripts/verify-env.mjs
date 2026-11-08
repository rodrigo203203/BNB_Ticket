import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function verifyEnvironment() {
  console.log('🔍 Validando archivo de variables de entorno (.env o .env.example)...');
  const rootDir = path.resolve(__dirname, '..');
  const envPath = fs.existsSync(path.join(rootDir, '.env'))
    ? path.join(rootDir, '.env')
    : path.join(rootDir, '.env.example');

  const content = fs.readFileSync(envPath, 'utf8');
  const requiredKeys = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_COOKIE_SECRET',
    'MAX_FAILED_LOGIN_ATTEMPTS',
    'LOCKOUT_DURATION_MINUTES',
    'CSRF_SECRET',
    'CORS_ORIGIN',
  ];

  const missingKeys = requiredKeys.filter((key) => !content.includes(key));

  if (missingKeys.length > 0) {
    console.error(`❌ Faltan las siguientes variables obligatorias: ${missingKeys.join(', ')}`);
    process.exit(1);
  }

  console.log('✅ Todas las variables de entorno requeridas están correctamente declaradas y documentadas.');
}

verifyEnvironment();
