# Reglas de Exclusión de Contexto y Optimización de Tokens

Esta directiva establece qué archivos, directorios y artefactos generados **NUNCA deben ser leídos ni indexados** por el agente de inteligencia artificial para evitar el desbordamiento de la memoria de contexto, reducir la latencia y eliminar el consumo innecesario de tokens.

---

## 🚫 1. Lista de Archivos y Carpetas Ignorados

### Dependencias y Paquetes Externos (Alto Consumo)
* `**/node_modules/**`: Contiene miles de bibliotecas de terceros; leerlos agota la ventana de contexto de inmediato.
* `**/.pnpm-store/**`: Repositorio local de paquetes de pnpm.
* `pnpm-lock.yaml`: Archivo de bloqueo que supera los 280 KB (>70.000 tokens) con metadatos de resolución de dependencias irrelevantes para lógica de negocio.
* `package-lock.json`, `yarn.lock`, `bun.lockb`.

### Artefactos de Compilación y Distribución
* `**/dist/**`: Código transpilado y minificado (JS, CSS, sourcemaps). Leer siempre el código fuente en `src/`.
* `**/build/**`: Compilaciones intermedias.
* `**/.vite/**`, `**/.cache/**`: Caché interna del empaquetador Vite.
* `**/*.map`: Archivos de mapas de origen (sourcemaps).

### Almacenamiento Local y Archivos Temporales
* `storage/uploads/**`: Archivos, documentos y binarios adjuntos por usuarios.
* `storage/temp/**`, `storage/cache/**`: Archivos volátiles generados en tiempo de ejecución.
* `**/*.dump`, `**/*.sql`: Respaldos y volcados masivos de base de datos PostgreSQL.
* `**/*.tar`, `**/*.gz`, `**/*.zip`: Comprimidos y binarios.

### Pruebas y Reportes de Cobertura
* `**/coverage/**`: Informes HTML/LCOV de cobertura de código generados por Jest o Vitest.
* `**/.nyc_output/**`.
* `**/test-results/**`, `**/playwright-report/**`.

### Logs y Registros de Ejecución
* `**/*.log`, `npm-debug.log*`, `pnpm-debug.log*`, `yarn-debug.log*`.
* `**/.system_generated/**`: Registros de tareas del entorno de desarrollo.

### Entornos de Desarrollo e IDEs
* `.idea/**`, `.vscode/**`: Configuraciones privadas de JetBrains o Visual Studio Code.
* `.DS_Store`, `Thumbs.db`: Archivos ocultos de metadatos del sistema operativo.

### Seguridad y Credenciales Privadas
* `.env`, `.env.local`, `.env.production`: Variables con secretos bancarios. *(Para consultar la estructura de variables de entorno, consultar únicamente `.env.example`)*.

---

## 📋 2. Reglas de Conducta para el Agente AI

1. **Lectura Selectiva:** Consultar únicamente archivos de código fuente (`.ts`, `.vue`, `.json`, `.prisma`, `.md`).
2. **Priorizar Archivos Fuente sobre Compilados:** Nunca leer `dist/src/main.js` si existe `src/main.ts`.
3. **Paginación al Leer Archivos Extensos:** Usar `StartLine` y `EndLine` cuando un archivo supere las 200 líneas.
4. **Verificación de Estructura:** Utilizar comandos ligeros como `ls` o `tree -L 2` antes de recorrer directorios completos.
5. **Consumo de Dependencias:** Para conocer versiones de librerías, inspeccionar el `package.json` del proyecto correspondiente, **jamás** el archivo `pnpm-lock.yaml` ni la carpeta `node_modules`.

---

## 🎯 3. Formato Sintético `.cursorignore`

El siguiente bloque representa el estándar compatible con herramientas como Cursor, Copilot y agentes LLM:

```gitignore
# Dependencias
node_modules/
.pnpm-store/
pnpm-lock.yaml
package-lock.json
yarn.lock

# Compilación
dist/
build/
*.tsbuildinfo
*.map

# Caché
.cache/
.vite/
.turbo/

# Pruebas y Cobertura
coverage/
.nyc_output/
playwright-report/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Almacenamiento y Respaldos
storage/uploads/*
storage/temp/*
*.dump
*.sql

# Entornos y Secretos
.env
.env.local
.env.*.local

# IDEs y SO
.idea/
.vscode/
.DS_Store
Thumbs.db
```

