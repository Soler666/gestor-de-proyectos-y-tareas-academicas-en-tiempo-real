# 🚀 Sistema de Gestión de Proyectos Educativos

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

Un backend completo y robusto para la gestión de proyectos educativos, desarrollado con tecnologías modernas. Incluye autenticación de usuarios con roles diferenciados (Tutor/Alumno), gestión de proyectos y tareas, chat en tiempo real (público y privado), y un sistema completo de notificaciones.

## ✨ Características Principales

### 👥 Gestión de Usuarios
- **Autenticación JWT** con roles diferenciados (Tutor/Alumno)
- Registro e inicio de sesión seguro
- Gestión completa de perfiles de usuario

### 📋 Gestión de Proyectos
- Creación y administración de proyectos colaborativos
- Asignación de participantes y tutores
- Seguimiento de estados del proyecto (Planificación, En progreso, Completado, Pausado)

### ✅ Gestión de Tareas
- Sistema dual: tareas diarias y asociadas a proyectos
- Asignación de responsables y tutores
- Seguimiento de prioridades y estados
- Fechas límite y recordatorios automáticos

### 💬 Sistema de Chat en Tiempo Real
- **Chat público** para comunicación general
- **Chat privado** entre usuarios individuales
- Historial completo de conversaciones
- Comunicación en tiempo real vía WebSocket

### 🔔 Sistema de Notificaciones
- Notificaciones automáticas para eventos importantes
- Marcado como leído y gestión de notificaciones
- Entrega en tiempo real vía WebSocket
- Tipos: asignaciones, recordatorios, mensajes, actualizaciones

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js + TypeScript + Express.js
- **Base de Datos**: SQLite con Prisma ORM
- **Tiempo Real**: Socket.io
- **Autenticación**: JWT (JSON Web Tokens)
- **Encriptación**: bcrypt
- **Validación**: Zod
- **Cliente Provisional**: HTML/CSS/JavaScript puro

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js versión 16 o superior
- npm o yarn

### Pasos de Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/Soler666/gestor-de-proyectos-y-tareas-academicas-en-tiempo-real
   cd proyecto-pd
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="jwt-super-seguro"
   PORT=8000
   ```

4. **Genera el cliente de Prisma**
   ```bash
   npx prisma generate
   ```

5. **Ejecuta las migraciones de la base de datos**
   ```bash
   npx prisma migrate dev
   ```

6. **Inicia el servidor**
   ```bash
   npm run dev
   ```

7. **Accede al cliente provisional**
   Abre tu navegador en `http://localhost:8000`

## 🚀 Uso

### Endpoints Principales

#### Autenticación
- `POST /auth/register` - Registro de nuevos usuarios
- `POST /auth/login` - Inicio de sesión

#### Usuarios
- `GET /user/` - Lista de todos los usuarios
- `GET /user/me` - Información del usuario actual
- `PATCH /user/me` - Actualizar perfil
- `DELETE /user/me` - Eliminar cuenta

#### Proyectos
- `GET /projects` - Lista de proyectos
- `POST /projects` - Crear proyecto
- `GET /projects/:id` - Detalles de proyecto
- `PUT /projects/:id` - Actualizar proyecto
- `DELETE /projects/:id` - Eliminar proyecto

#### Tareas
- `GET /tasks` - Lista de tareas
- `POST /tasks` - Crear tarea
- `GET /tasks/:id` - Detalles de tarea
- `PUT /tasks/:id` - Actualizar tarea
- `DELETE /tasks/:id` - Eliminar tarea

#### Chat
- `GET /api/chat/messages` - Historial de chat público
- `GET /api/chat/private/:otherUserId` - Historial de chat privado
- `POST /api/chat/private` - Enviar mensaje privado

#### Notificaciones
- `GET /notifications` - Notificaciones del usuario
- `PUT /notifications/:id/read` - Marcar como leído
- `PUT /notifications/read-all` - Marcar todas como leídas
- `DELETE /notifications/:id` - Eliminar notificación

### Eventos WebSocket

#### Chat Público
```javascript
// Enviar mensaje público
socket.emit('public-message', 'Hola a todos!');

// Recibir mensaje público
socket.on('public-message', (data) => {
  console.log(data.user, data.message, data.timestamp);
});
```

#### Chat Privado
```javascript
// Enviar mensaje privado
socket.emit('private-message', {
  message: 'Mensaje privado',
  recipientId: 123
});

// Recibir mensaje privado
socket.on('private-message', (data) => {
  console.log('Mensaje privado:', data);
});
```

#### Notificaciones
```javascript
// Recibir notificaciones en tiempo real
socket.on('notification', (notification) => {
  console.log('Nueva notificación:', notification);
});
```

## 🏗️ Arquitectura

```
src/
├── app.ts                 # Configuración principal de Express
├── index.ts              # Servidor HTTP y Socket.io
├── config/
│   ├── database.ts       # Configuración de Prisma
│   └── socket.ts         # Utilidades de Socket.io
├── controller/           # Controladores de la aplicación
│   ├── authController.ts
│   ├── userController.ts
│   ├── projectController.ts
│   ├── taskController.ts
│   ├── chatController.ts
│   └── notificationController.ts
├── routes/               # Definición de rutas
├── middleware/           # Middlewares personalizados
├── model/                # Modelos y esquemas Zod
├── service/              # Lógica de negocio
└── util/                 # Utilidades
```

## 🔒 Seguridad

- **Encriptación de contraseñas** con bcrypt
- **Autenticación JWT** con expiración de tokens
- **Validación de esquemas** con Zod
- **Middleware de autorización** basado en roles
- **CORS configurado** para desarrollo

## 📱 Cliente Provisional

Se incluye un cliente HTML básico para pruebas funcionales que incluye:
- Formularios de autenticación
- Gestión de tareas y proyectos
- Chat en tiempo real
- Interfaz responsive


## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.


## 📞 Contacto

- **Autor**: Soler Beleño
- **Proyecto**: Sistema de Gestión de Proyectos Educativos
- **Versión**: 1.0.0

---

⭐ Si este proyecto te resulta útil, ¡dale una estrella en GitHub!
