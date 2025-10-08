# Documentación Técnica del Backend de Gestión de Proyectos Educativos

## Introducción

Este documento describe en detalle el desarrollo y funcionamiento de un backend completo para un sistema de gestión de proyectos educativos. El sistema permite la autenticación de usuarios con roles diferenciados (Alumno y Tutor), la gestión de proyectos y tareas, y un chat en tiempo real. El backend está desarrollado con tecnologías modernas como TypeScript, Express.js, Prisma ORM y Socket.io, y cuenta con un cliente HTML provisional para pruebas funcionales.

El propósito principal del sistema es facilitar la administración de proyectos educativos donde los tutores pueden asignar tareas a alumnos, gestionar proyectos colaborativos y mantener una comunicación en tiempo real a través de un chat público.

## Arquitectura del Sistema

### Estructura General

El proyecto sigue una arquitectura modular organizada en capas claras:

- **Capa de Presentación**: Cliente HTML provisional que consume la API REST y utiliza WebSockets para el chat.
- **Capa de Aplicación**: Controladores que manejan la lógica de negocio y validación de datos.
- **Capa de Servicios**: Servicios que encapsulan la lógica de acceso a datos.
- **Capa de Datos**: Prisma ORM que interactúa con la base de datos SQLite.
- **Capa de Infraestructura**: Middlewares, utilidades y configuración del servidor.

### Tecnologías Utilizadas

- **Node.js con TypeScript**: Lenguaje de programación principal, proporcionando tipado estático y mayor robustez.
- **Express.js**: Framework web para crear la API REST.
- **Prisma**: ORM moderno para interactuar con la base de datos SQLite.
- **Socket.io**: Biblioteca para comunicación en tiempo real vía WebSockets.
- **JWT (JSON Web Tokens)**: Sistema de autenticación basado en tokens.
- **bcrypt**: Librería para encriptación de contraseñas.
- **Zod**: Validación de esquemas de datos.
- **Axios**: Cliente HTTP para el frontend provisional.

## Modelo de Datos

La base de datos está diseñada siguiendo principios de modelado relacional, con cuatro entidades principales que representan los conceptos fundamentales del sistema de gestión de proyectos educativos. Cada entidad tiene un propósito específico y establece relaciones que permiten el flujo de información y la integridad de los datos.

### Usuario (User)
- **Propósito**: Representa a los individuos que interactúan con el sistema, ya sean alumnos o tutores. Esta entidad es fundamental ya que todos los procesos del sistema giran alrededor de los usuarios.
- **Campos principales**:
  - `id`: Identificador único autoincremental
  - `username`: Nombre de usuario único en el sistema
  - `role`: Rol del usuario (Alumno/Tutor) - determina permisos y funcionalidades
  - `password`: Contraseña encriptada para seguridad
- **Relaciones**:
  - **Con Proyectos**: Un usuario puede participar en múltiples proyectos (relación muchos a muchos a través de tabla intermedia)
  - **Como Tutor de Proyectos**: Un usuario puede ser tutor de múltiples proyectos
  - **Con Tareas**: Un usuario puede ser responsable de múltiples tareas como alumno
  - **Como Tutor de Tareas**: Un usuario puede ser tutor de múltiples tareas
  - **Con Chat**: Un usuario puede enviar múltiples mensajes de chat
- **Importancia**: Esta entidad centraliza la autenticación y autorización, controlando qué acciones puede realizar cada usuario según su rol.

### Proyecto (Project)
- **Propósito**: Representa los proyectos educativos colaborativos que agrupan tareas relacionadas. Los proyectos permiten organizar el trabajo en unidades lógicas más grandes que las tareas individuales.
- **Campos principales**:
  - `id`: Identificador único
  - `name`: Nombre descriptivo del proyecto
  - `description`: Descripción detallada de los objetivos
  - `startDate` y `endDate`: Periodo temporal del proyecto
  - `status`: Estado actual (Planificación/En progreso/Completado/Pausado)
  - `tutorId`: Referencia al tutor responsable
- **Relaciones**:
  - **Con Usuarios**: Múltiples participantes (alumnos) y un tutor asignado
  - **Con Tareas**: Un proyecto puede contener múltiples tareas relacionadas
- **Importancia**: Los proyectos proporcionan contexto y organización a las tareas, permitiendo seguimiento del progreso general y asignación de responsabilidades grupales.

### Tarea (Task)
- **Propósito**: Representa las unidades de trabajo individuales que deben ser completadas. Las tareas pueden ser diarias (independientes) o asociadas a proyectos específicos.
- **Campos principales**:
  - `id`: Identificador único
  - `name`: Nombre descriptivo de la tarea
  - `description`: Detalles específicos del trabajo requerido
  - `dueDate`: Fecha límite para completar la tarea
  - `priority`: Nivel de importancia (Baja/Media/Alta)
  - `status`: Estado de progreso (Pendiente/En progreso/Completada/Bloqueada)
  - `type`: Tipo de tarea (daily/project)
  - `responsibleId`: Usuario alumno responsable
  - `tutorId`: Usuario tutor supervisor
  - `projectId`: Proyecto asociado (opcional)
- **Relaciones**:
  - **Con Proyecto**: Una tarea puede pertenecer a un proyecto (opcional)
  - **Con Usuario Responsable**: Cada tarea tiene un alumno asignado
  - **Con Usuario Tutor**: Cada tarea tiene un tutor supervisor
- **Importancia**: Las tareas son la unidad básica de trabajo, permitiendo seguimiento granular del progreso y asignación de responsabilidades individuales.

### Mensaje de Chat (ChatMessage)
- **Propósito**: Almacena la comunicación en tiempo real entre usuarios del sistema, incluyendo mensajes públicos y privados. Los mensajes de chat facilitan la colaboración y comunicación instantánea.
- **Campos principales**:
  - `id`: Identificador único
  - `userId`: Referencia al usuario que envió el mensaje
  - `message`: Contenido del mensaje de texto
  - `timestamp`: Marca temporal automática de creación
  - `recipientId`: ID del destinatario (solo para mensajes privados)
  - `isPrivate`: Booleano que indica si el mensaje es privado
- **Relaciones**:
  - **Con Usuario**: Cada mensaje pertenece a un usuario específico (remitente)
  - **Con Usuario Destinatario**: Para mensajes privados, referencia al usuario destinatario
- **Importancia**: El chat proporciona canales de comunicación síncrona (pública y privada) que complementan la gestión asíncrona de tareas y proyectos.

### Notificación (Notification)
- **Propósito**: Sistema de notificaciones en tiempo real para mantener informados a los usuarios sobre eventos importantes del sistema.
- **Campos principales**:
  - `id`: Identificador único
  - `userId`: Referencia al usuario destinatario
  - `message`: Contenido de la notificación
  - `type`: Tipo de notificación (task_assigned, project_assigned, deadline_reminder, status_update, message, private_message, etc.)
  - `isRead`: Estado de lectura de la notificación
  - `createdAt`: Fecha y hora de creación
  - `relatedId`: ID del elemento relacionado (tarea, proyecto, mensaje)
  - `relatedType`: Tipo del elemento relacionado (task, project, message)
- **Relaciones**:
  - **Con Usuario**: Cada notificación pertenece a un usuario específico
- **Importancia**: Las notificaciones mantienen a los usuarios informados sobre cambios en tareas, proyectos y mensajes, mejorando la comunicación y seguimiento del sistema.


## Funcionalidades del Sistema

### 1. Autenticación y Autorización

#### Registro de Usuarios
- **Endpoint**: `POST /auth/register`
- **Funcionalidad**: Permite registrar nuevos usuarios con username, password y role.
- **Validaciones**:
  - Username único en el sistema.
  - Password encriptada con bcrypt antes de almacenarse.
  - Role debe ser "Alumno" o "Tutor".
- **Respuesta**: Confirmación de creación exitosa.

#### Inicio de Sesión
- **Endpoint**: `POST /auth/login`
- **Funcionalidad**: Autentica usuarios y genera token JWT.
- **Proceso**:
  1. Verifica existencia del usuario por username.
  2. Compara password encriptada.
  3. Genera token JWT con payload (id, username, role).
  4. Devuelve token en header y datos del usuario.
- **Duración del token**: 1 hora.

#### Verificación de Tokens
- **Middleware JWT**: Protege rutas que requieren autenticación.
- **Funcionalidad**: Valida token en cada petición protegida.
- **Proceso**: Decodifica token y añade datos del usuario al objeto request.

### 2. Gestión de Usuarios

#### Obtener Lista de Usuarios
- **Endpoint**: `GET /user/`
- **Funcionalidad**: Devuelve lista de todos los usuarios del sistema.
- **Permisos**: Usuario autenticado (necesario para funcionalidad de chat privado).
- **Campos devueltos**: id, username, role.

#### Obtener Usuario Actual
- **Endpoint**: `GET /user/me`
- **Funcionalidad**: Devuelve información del usuario autenticado.
- **Campos devueltos**: id, username, role.

#### Actualizar Usuario
- **Endpoint**: `PATCH /user/me`
- **Funcionalidad**: Permite actualizar username y role del usuario actual.

#### Eliminar Usuario
- **Endpoint**: `DELETE /user/me`
- **Funcionalidad**: Elimina la cuenta del usuario autenticado.

### 3. Gestión de Tareas

#### Creación de Tareas
- **Endpoint**: `POST /tasks`
- **Permisos**: Solo usuarios con role "Tutor".
- **Funcionalidad**:
  - Crea tareas diarias o asociadas a proyectos.
  - Asigna automáticamente el tutor creador.
  - Valida esquema con Zod.
- **Campos requeridos**: name, responsibleId, priority, type.
- **Campos opcionales**: description, dueDate, projectId (solo para type "project").

#### Listado de Tareas
- **Endpoint**: `GET /tasks`
- **Funcionalidad**:
  - Tutores ven tareas que crearon.
  - Alumnos ven tareas asignadas a ellos.
- **Incluye**: Información del proyecto, responsable y tutor.

#### Obtener Tarea por ID
- **Endpoint**: `GET /tasks/:id`
- **Funcionalidad**: Devuelve detalles completos de una tarea específica.

#### Actualización de Tareas
- **Endpoint**: `PUT /tasks/:id`
- **Permisos**: Solo tutores pueden actualizar.
- **Funcionalidad**: Modifica cualquier campo de la tarea.

#### Eliminación de Tareas
- **Endpoint**: `DELETE /tasks/:id`
- **Permisos**: Solo tutores pueden eliminar.
- **Funcionalidad**: Elimina la tarea de la base de datos.

### 4. Gestión de Proyectos

#### Creación de Proyectos
- **Endpoint**: `POST /projects`
- **Permisos**: Solo tutores.
- **Funcionalidad**: Crea proyectos con participantes y tutor asignado.

#### Listado de Proyectos
- **Endpoint**: `GET /projects`
- **Funcionalidad**:
  - Tutores ven todos los proyectos.
  - Alumnos ven proyectos donde participan.

#### Operaciones CRUD
- **Endpoints**: `GET /projects/:id`, `PUT /projects/:id`, `DELETE /projects/:id`
- **Permisos**: Operaciones de modificación solo para tutores.

### 5. Sistema de Chat en Tiempo Real

#### Mensajes del Chat
- **Endpoint**: `GET /api/chat/messages`
- **Funcionalidad**: Devuelve historial de mensajes con información de usuarios.

#### Envío de Mensajes
- **WebSocket Event**: `public-message`
- **Funcionalidad**:
  - Autenticación vía token JWT en socket.
  - Guarda mensaje en base de datos.
  - Emite mensaje a todos los usuarios conectados.
- **Campos**: user (username, role), message, timestamp.

#### Conexión de Sockets
- **Middleware de autenticación**: Valida token al conectar.
- **Eventos manejados**: connection, disconnect, public-message.

#### Mensajes Privados
- **Endpoint**: `GET /api/chat/private/:otherUserId`
- **Funcionalidad**: Obtiene el historial de mensajes privados entre el usuario autenticado y otro usuario específico.
- **Permisos**: Usuario autenticado.

- **Endpoint**: `POST /api/chat/private`
- **Funcionalidad**: Envía un mensaje privado a otro usuario.
- **Campos requeridos**: message, recipientId.
- **WebSocket Events**:
  - `private-message`: Envía mensaje privado al destinatario.
  - `private-message-sent`: Confirma envío al remitente.

#### Sistema de Notificaciones en Tiempo Real
- **Endpoint**: `GET /notifications`
- **Funcionalidad**: Obtiene todas las notificaciones del usuario autenticado, ordenadas por fecha descendente.

- **Endpoint**: `POST /notifications`
- **Funcionalidad**: Crea una nueva notificación (usado internamente por el sistema).

- **Endpoint**: `PUT /notifications/:id/read`
- **Funcionalidad**: Marca una notificación específica como leída.

- **Endpoint**: `PUT /notifications/read-all`
- **Funcionalidad**: Marca todas las notificaciones del usuario como leídas.

- **Endpoint**: `DELETE /notifications/:id`
- **Funcionalidad**: Elimina una notificación específica.

- **WebSocket Event**: `notification`
- **Funcionalidad**: Emite notificaciones en tiempo real a usuarios conectados.
- **Campos**: id, message, type, createdAt, relatedId, relatedType.

#### Eventos de Notificación Automáticos
El sistema genera notificaciones automáticamente para:
- Asignación de tareas a alumnos
- Asignación de proyectos a alumnos
- Recordatorios de fechas límite
- Cambios de estado en tareas/proyectos
- Mensajes privados recibidos
- Mensajes públicos (para todos los usuarios conectados)

## Cliente HTML Provisional

El cliente HTML es una interfaz básica para pruebas funcionales que incluye:

### Secciones Principales
- **Login/Registro**: Formularios para autenticación con roles.
- **Chat Público**: Interfaz de chat en tiempo real con Socket.io.
- **Gestión de Tareas**: Formularios para crear/editar tareas, listado filtrado.
- **Gestión de Proyectos**: CRUD de proyectos con asignación de participantes.

### Tecnologías del Cliente
- **HTML/CSS/JavaScript puro**: Sin frameworks para simplicidad.
- **Axios**: Para peticiones HTTP a la API.
- **Socket.io Client**: Para comunicación en tiempo real.

### Funcionalidades del Cliente
- **Autenticación**: Login/registro con manejo de tokens JWT.
- **Navegación**: Botones para cambiar entre vistas (chat, tareas, proyectos).
- **Formularios dinámicos**: Carga de dropdowns con usuarios y proyectos.
- **Validaciones**: Verificación de campos requeridos y tokens válidos.
- **Manejo de errores**: Alertas para errores de red y autenticación.

## Lógica de Socket.io (Chat en Tiempo Real)

La lógica principal de Socket.io se encuentra en el archivo `src/index.ts`. Esta configuración incluye:

- Creación del servidor HTTP y la instancia de Socket.io con configuración CORS abierta.
- Middleware de autenticación para sockets que valida el token JWT enviado en el handshake.
- Manejo del evento `connection` para registrar la conexión de un usuario autenticado.
- Escucha del evento `public-message` para recibir mensajes de chat:
  - Guarda el mensaje en la base de datos usando Prisma.
  - Emite el mensaje a todos los usuarios conectados con información del usuario, mensaje y timestamp.
- Manejo del evento `disconnect` para registrar la desconexión del usuario.

Este enfoque asegura que solo usuarios autenticados puedan enviar y recibir mensajes en tiempo real, manteniendo la integridad y seguridad del chat.

## Seguridad y Validación

### Medidas de Seguridad
- **Encriptación de contraseñas**: Uso de bcrypt con salt.
- **Autenticación JWT**: Tokens con expiración de 1 hora.
- **Validación de esquemas**: Zod para validar datos de entrada.
- **CORS configurado**: Permite origen desde cualquier dominio (para desarrollo).
- **Middleware de errores**: Manejo centralizado de excepciones.

### Validaciones Implementadas
- **Esquemas Zod**: Para registro, login, tareas, proyectos.
- **Verificación de roles**: Control de acceso basado en role del usuario.
- **Validación de tokens**: En cada petición protegida y conexión socket.

## Configuración e Instalación

### Requisitos Previos
- Node.js versión 16 o superior.
- npm para gestión de paquetes.

### Pasos de Instalación


1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crear archivo `.env` con:
   ```
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="jwt-super-seguro"
   PORT=8000
   ```

3. **Generar cliente Prisma**:
   ```bash
   npx prisma generate
   ```

4. **Ejecutar migraciones**:
   ```bash
   npx prisma migrate dev
   ```

5. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

6. **Acceder al cliente**:
   Abrir navegador en `http://localhost:8000`

## Conclusión

Este backend proporciona una solución completa para la gestión de proyectos educativos, implementando las mejores prácticas de desarrollo con TypeScript, arquitectura modular y seguridad robusta. El sistema permite una gestión eficiente de usuarios, proyectos y tareas, con comunicación en tiempo real a través del chat.

El cliente HTML provisional facilita las pruebas funcionales, pero se recomienda desarrollar un frontend más avanzado con frameworks modernos como React o Vue.js para una mejor experiencia de usuario.

El código está estructurado de manera mantenible y escalable, siguiendo principios SOLID y patrones de diseño como separación de responsabilidades entre controladores, servicios y modelos de datos.



