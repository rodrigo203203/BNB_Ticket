# Guía de Despliegue en Windows Server (Sin Docker)

Esta guía describe el procedimiento para desplegar la Plataforma BNB en un entorno **Windows Server 2019/2022** dentro de la red corporativa del banco, utilizando servicios nativos de Windows sin dependencias de Docker ni WSL.

---

## 1. Prerrequisitos en el Servidor

1. **Node.js LTS (v20 o superior):**
   * Descargar el instalador `.msi` oficial de 64 bits desde [nodejs.org](https://nodejs.org).
   * Verificar en PowerShell: `node -v` y `npm -v`.
2. **pnpm:**
   * Instalar globalmente: `npm install -g pnpm`.
3. **PostgreSQL Server (v14 o superior):**
   * Instalado como servicio de Windows (`postgresql-x64-16`).
   * Puerto predeterminado: `5432`.
4. **NSSM (Non-Sucking Service Manager):**
   * Herramienta estándar y recomendada para encapsular procesos Node.js como servicios nativos de Windows con auto-reinicio ante fallos.
   * Descargar desde [nssm.cc](https://nssm.cc/) y colocar el binario `nssm.exe` en `C:\Windows\System32`.

---

## 2. Preparación de la Aplicación

1. **Ubicación del Proyecto:**
   Colocar los archivos en una ruta de servidor dedicada, por ejemplo:
   `D:\Aplicaciones\BNB_GerenciaDatos`

2. **Configuración de Variables de Entorno:**
   Crear el archivo `.env` en la raíz copiando `.env.example`:
   ```env
   NODE_ENV=production
   PORT=3000
   API_PREFIX=api/v1
   APP_URL=https://solicitudes-datos.bnb.com.bo
   API_URL=https://solicitudes-datos.bnb.com.bo

   DATABASE_URL=postgresql://rodrigo203:XboxOne@localhost:5432/bnb_tickets_dev?schema=public

   JWT_ACCESS_SECRET=clave_segura_de_minimo_32_caracteres_cambiar_en_produccion!
   JWT_REFRESH_SECRET=clave_segura_de_minimo_32_caracteres_cambiar_en_produccion!
   SESSION_COOKIE_SECRET=clave_segura_de_minimo_32_caracteres_cambiar_en_produccion!

   COOKIE_SECURE=true
   COOKIE_SAME_SITE=lax
   CORS_ORIGIN=https://solicitudes-datos.bnb.com.bo
   ```

3. **Instalación de Dependencias y Compilación:**
   Ejecutar en PowerShell como Administrador:
   ```powershell
   cd D:\Aplicaciones\BNB_GerenciaDatos
   pnpm install --frozen-lockfile
   pnpm --filter @bnb/api prisma generate
   pnpm --filter @bnb/api prisma db push
   pnpm build
   ```

---

## 3. Configuración como Servicio de Windows (NSSM)

Para garantizar que la aplicación se inicie automáticamente con el sistema operativo y se reinicie en caso de error:

1. Abrir PowerShell como Administrador y ejecutar:
   ```powershell
   nssm install BNB_Tickets_API
   ```

2. En la interfaz gráfica de NSSM configurar:
   * **Path:** `C:\Program Files\nodejs\node.exe`
   * **Startup directory:** `D:\Aplicaciones\BNB_GerenciaDatos\apps\api`
   * **Arguments:** `dist/src/main.js`
   * **Environment:** Cargar las variables del `.env` si es necesario.
   * **Exit actions:** Restart application (Restart delay: 5000 ms).

3. Iniciar el servicio de Windows:
   ```powershell
   nssm start BNB_Tickets_API
   ```

4. Verificar estado del servicio:
   ```powershell
   Get-Service BNB_Tickets_API
   ```

---

## 4. Configuración del Reverse Proxy en IIS (Internet Information Services)

Para exponer la aplicación en el puerto estándar 443 con certificado TLS/SSL institucional del banco:

1. Habilitar **IIS** con los módulos:
   * **URL Rewrite Module 2.1**.
   * **Application Request Routing (ARR) 3.0** (Habilitar *Server Proxy Settings -> Enable proxy*).
2. Crear un sitio en IIS apuntando a `D:\Aplicaciones\BNB_GerenciaDatos\apps\web\dist`.
3. Configurar la regla de reescritura en el archivo `web.config` para enrutar las peticiones `/api/v1/*` al servicio interno en `http://localhost:3000/api/v1/{R:1}` y las demás rutas a `index.html` para la SPA de Vue:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyAPI" stopProcessing="true">
          <match url="^api/v1/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/v1/{R:1}" />
        </rule>
        <rule name="VueRouterRoutes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-Content-Type-Options" value="nosniff" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

