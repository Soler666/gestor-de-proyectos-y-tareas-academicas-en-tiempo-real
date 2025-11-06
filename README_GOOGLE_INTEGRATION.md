# Integración con APIs de Google

Esta guía explica cómo configurar e integrar las APIs de Google (Gmail y Google Calendar) en tu backend educativo.

## Paso a Paso para la Configuración

### 1. Configuración en Google Cloud Console

#### Crear Proyecto y Habilitar APIs
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a "APIs y servicios" > "Biblioteca"
4. Habilita las siguientes APIs:
   - Google Calendar API
   - Gmail API

#### Crear Credenciales

**Para Cuenta de Servicio (Server-to-Server):**
1. Ve a "APIs y servicios" > "Credenciales"
2. Haz clic en "Crear credenciales" > "Cuenta de servicio"
3. Completa los detalles:
   - Nombre: `backend-service`
   - Descripción: `Cuenta para acceder a APIs de Google desde el backend`
4. Asigna roles apropiados (Editor o roles específicos)
5. Crea la cuenta y genera una clave JSON
6. Descarga el archivo JSON y guárdalo como `src/config/google-credentials.json`

**Para OAuth 2.0 (Usuario):**
1. Ve a "APIs y servicios" > "Credenciales"
2. Haz clic en "Crear credenciales" > "ID de cliente OAuth"
3. Selecciona "Aplicación web"
4. Agrega URIs autorizadas:
   - `http://localhost:8000/auth/google/callback`
5. Copia el Client ID y Client Secret

### 2. Configuración del Backend

#### Variables de Entorno
Crea un archivo `.env` basado en `.env.example`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu_jwt_secret_aqui"
GOOGLE_CLIENT_ID="tu_google_client_id_aqui"
GOOGLE_CLIENT_SECRET="tu_google_client_secret_aqui"
PORT=8000
```

#### Instalación de Dependencias
```bash
npm install googleapis passport passport-google-oauth20 @types/passport @types/passport-google-oauth20 dotenv
```

#### Migración de Base de Datos
```bash
npx prisma migrate dev --name add-google-oauth-fields
npx prisma generate
```

### 3. Funcionalidades Implementadas

#### Autenticación con Google OAuth
- **Endpoint:** `GET /auth/google`
- **Callback:** `GET /auth/google/callback`
- Permite a estudiantes y tutores iniciar sesión con cuentas de Google
- Vincula automáticamente cuentas existentes o crea nuevas

#### Gestión de Tokens
- Los tokens de acceso y refresh se almacenan en la base de datos
- Se refrescan automáticamente cuando expiran
- Soporte tanto para OAuth como para cuenta de servicio

#### API de Gmail
- **Enviar notificaciones:** `POST /google/send-notification`
- **Enviar reportes:** `POST /google/send-report`

Ejemplos de uso:

```javascript
// Enviar notificación
POST /google/send-notification
{
  "userId": 1,
  "subject": "Nueva tarea asignada",
  "message": "Se te ha asignado una nueva tarea de matemáticas",
  "useServiceAccount": true
}

// Enviar reporte
POST /google/send-report
{
  "userId": 1,
  "reportType": "progress",
  "reportData": { /* datos del reporte */ },
  "useServiceAccount": true
}
```

#### API de Google Calendar
- **Sincronizar tarea:** `POST /google/tasks/:taskId/sync-calendar`
- **Sincronizar proyecto:** `POST /google/projects/:projectId/sync-calendar`
- **Sincronizar examen:** `POST /google/exams/:examId/sync-calendar`
- **Obtener eventos:** `GET /google/calendar/events`
- **Actualizar evento:** `PUT /google/calendar/events/:eventId`
- **Eliminar evento:** `DELETE /google/calendar/events/:eventId`

Ejemplos de uso:

```javascript
// Sincronizar tarea con calendario
POST /google/tasks/123/sync-calendar

// Obtener eventos del calendario
GET /google/calendar/events?timeMin=2024-01-01T00:00:00Z
```

### 4. Estructura de Eventos en Calendar

Los eventos creados incluyen:
- **Título:** "Entrega: [Nombre de la tarea]"
- **Descripción:** Detalles de la tarea/proyecto/examen + enlace
- **Fecha/Hora:** Basado en `dueDate` o `endDate`
- **Recordatorios:** Email 24h antes, popup 1h antes

### 5. Consideraciones de Seguridad

- El archivo `google-credentials.json` está en `.gitignore`
- Los tokens se almacenan encriptados en la base de datos
- Se refrescan automáticamente cuando expiran
- Validación de permisos en cada endpoint

### 6. Próximos Pasos

1. **Configurar credenciales** en Google Cloud Console
2. **Crear archivo `.env`** con las variables necesarias
3. **Ejecutar migraciones** de Prisma
4. **Probar autenticación** con Google OAuth
5. **Probar envío de emails** y sincronización de calendario
6. **Ajustar permisos** según necesidades específicas

### 7. Solución de Problemas

- **Error de credenciales:** Verificar que el archivo JSON esté en la ubicación correcta
- **Tokens expirados:** Se refrescan automáticamente, pero verificar configuración
- **Permisos insuficientes:** Revisar roles asignados en Google Cloud Console
- **CORS issues:** Asegurar configuración correcta en el frontend

Para más detalles, revisa los archivos de código en `src/service/` y `src/routes/`.
