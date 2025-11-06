# 📚 Documentación del Backend - Sistema de Gestión de Proyectos Educativos

Esta documentación detalla la implementación del backend, incluyendo la funcionalidad de recordatorios y entregas agregada recientemente.

## 📤 Sistema de Entregas

### Descripción General
El sistema de entregas permite a los estudiantes enviar tareas con archivos adjuntos y contenido textual, y a los tutores calificar dichas entregas. Incluye gestión de archivos, notificaciones automáticas y estadísticas de rendimiento.

### Modelo de Datos (Prisma Schema)

```prisma
model Submission {
  id          Int      @id @default(autoincrement())
  taskId      Int
  task        Task     @relation(fields: [taskId], references: [id])
  studentId   Int
  student     User     @relation("StudentSubmissions", fields: [studentId], references: [id])
  submittedAt DateTime @default(now())
  content     String?  // Texto adicional del estudiante
  grade       Float?   // Calificación del tutor (0-100)
  feedback    String?  // Comentarios del tutor
  gradedAt    DateTime?
  gradedBy    Int?     // ID del tutor que calificó
  gradedByUser User?   @relation("TutorGradings", fields: [gradedBy], references: [id])
  status      String   @default("submitted") // "submitted", "graded", "returned"
  files       File[]
}

model File {
  id          Int      @id @default(autoincrement())
  filename    String
  originalName String
  mimeType    String
  size        Int
  path        String
  uploadedAt  DateTime @default(now())
  submission  Submission? @relation(fields: [submissionId], references: [id])
  submissionId Int?
}
```

### Servicio de Entregas (submissionService.ts)

#### Funcionalidades Implementadas:
- **Singleton Pattern**: Instancia única del servicio para manejar entregas globalmente.
- **Subida de Archivos**: Soporte para múltiples archivos con validación de tipos y tamaños.
- **Gestión de Permisos**: Control de acceso basado en roles (estudiantes y tutores).
- **Calificación de Entregas**: Sistema de calificación con retroalimentación textual.
- **Notificaciones Automáticas**: Notificación a tutores de nuevas entregas y a estudiantes de calificaciones.
- **Estadísticas**: Métricas de entregas, calificaciones y rendimiento.
- **Gestión de Archivos**: Almacenamiento seguro y descarga de archivos adjuntos.

#### Métodos Principales:
- `createSubmission()`: Crea una nueva entrega con archivos opcionales y notifica al tutor.
- `getStudentSubmissions()`: Obtiene todas las entregas de un estudiante.
- `getSubmissionsForGrading()`: Obtiene entregas pendientes de calificación para un tutor.
- `gradeSubmission()`: Califica una entrega y notifica al estudiante.
- `getSubmissionById()`: Obtiene detalles de una entrega específica con control de permisos.
- `deleteSubmission()`: Elimina una entrega no calificada (solo por el estudiante).
- `getSubmissionStats()`: Proporciona estadísticas de entregas y calificaciones.

#### Tipos de Archivo Permitidos:
- PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx)
- Archivos comprimidos (ZIP, RAR, 7Z)
- Texto plano, imágenes (JPEG, PNG, GIF)
- Tamaño máximo: 20MB por archivo, máximo 10 archivos por entrega

#### Mensajes de Notificación (en español):
- Para tutores: `"Nueva entrega: ${student.username} ha entregado la tarea "${task.name}""`
- Para estudiantes: `"Tu tarea "${task.name}" ha sido calificada con ${grade}/100"`

### Controlador de Entregas (submissionController.ts)

#### Endpoints CRUD:
- `POST /submissions`: Crear entrega (con subida de archivos)
- `GET /submissions/student`: Obtener entregas del estudiante actual
- `GET /submissions/grading`: Obtener entregas pendientes de calificación (tutores)
- `PUT /submissions/:id/grade`: Calificar una entrega
- `GET /submissions/:id`: Obtener entrega específica
- `DELETE /submissions/:id`: Eliminar entrega
- `GET /submissions/:submissionId/files/:fileId/download`: Descargar archivo
- `GET /submissions/stats`: Obtener estadísticas de entregas

#### Validaciones Implementadas:
- Autenticación requerida para todas las rutas
- Verificación de roles: estudiantes para crear/entregar, tutores para calificar
- Validación de archivos: tipos permitidos, tamaño máximo
- Permisos de acceso: estudiantes solo ven sus entregas, tutores solo las de sus tareas
- Validación de calificaciones: rango 0-100, formato numérico

#### Respuestas de Error (en español):
- `"No autenticado."`
- `"Solo los alumnos pueden hacer entregas."`
- `"ID de tarea es requerido."`
- `"Tarea no encontrada"`
- `"No tienes permiso para entregar esta tarea"`
- `"Ya has entregado esta tarea"`
- `"Tipo de archivo no permitido. Solo se permiten PDF, Word, Excel, PowerPoint, ZIP, RAR y otros formatos comunes."`
- `"Esta ruta es solo para alumnos/tutores."`
- `"Solo los tutores pueden calificar entregas."`
- `"Calificación es requerida y debe ser un número."`
- `"La calificación debe estar entre 0 y 100"`

### Rutas de Entregas (submissionRoutes.ts)

Todas las rutas requieren autenticación JWT (`verifyToken` middleware) y usan middleware de subida de archivos (`uploadMiddleware`).

```typescript
router.post('/', uploadMiddleware, createSubmission);
router.get('/student', getStudentSubmissions);
router.get('/grading', getSubmissionsForGrading);
router.put('/:id/grade', gradeSubmission);
router.get('/:id', getSubmissionById);
router.delete('/:id', deleteSubmission);
router.get('/:submissionId/files/:fileId/download', downloadFile);
router.get('/stats', getSubmissionStats);
```

### Integración con la Aplicación Principal (app.ts)

Las rutas de entregas están registradas en `/submissions`:
```typescript
app.use('/submissions', submissionRoutes);
```

### Migración de Base de Datos

Se ejecutó la migración de Prisma para asegurar que los modelos Submission y File estén presentes en la base de datos:
```bash
npx prisma migrate dev --name add_submission_and_file_models
```

### Funcionamiento Automático

- **Subida de Archivos**: Los archivos se almacenan en `uploads/submissions/{submissionId}/` con nombres únicos.
- **Notificaciones**: Se envían automáticamente al crear entregas y calificarlas.
- **Permisos**: Control estricto de acceso basado en roles y relaciones tutor-estudiante.
- **Gestión de Archivos**: Los archivos se eliminan físicamente al eliminar entregas.
- **Estadísticas**: Cálculo automático de métricas de rendimiento por tutor.

### Consideraciones Técnicas

- **Almacenamiento**: Archivos guardados en sistema de archivos local con estructura organizada.
- **Seguridad**: Validación estricta de tipos de archivo y control de acceso.
- **Escalabilidad**: Patrón Singleton para el servicio, adecuado para cargas moderadas.
- **Integridad**: Transacciones de base de datos para operaciones críticas.
- **Idioma**: Mensajes de error y notificaciones en español para consistencia.

Esta implementación completa el sistema de entregas, permitiendo tanto la subida de tareas como su calificación con integración total al ecosistema existente.

## 📝 Sistema de Exámenes

### Descripción General
El sistema de exámenes permite a los tutores crear exámenes con preguntas generadas automáticamente por IA, asignarlos a estudiantes específicos, y gestionar el proceso de calificación automática con revisión detallada. Incluye integración completa con el sistema de notificaciones para mantener informados a todos los usuarios.

### Modelo de Datos (Prisma Schema)

```prisma
model Exam {
  id             Int             @id @default(autoincrement())
  title          String
  topics         String          // Temas especificados por el tutor (JSON array)
  numQuestions   Int
  timeLimit      Int             // En minutos
  generatedQuestions String        // Preguntas generadas por IA (JSON string)
  createdBy      Int             // ID del tutor
  createdByUser  User            @relation("ExamCreator", fields: [createdBy], references: [id])
  assignedTo     String          // IDs de estudiantes asignados (JSON string)
  status         String          @default("active") // active, completed
  createdAt      DateTime        @default(now())
  submissions    ExamSubmission[]
  questions      ExamQuestion[]
}

model ExamQuestion {
  id          Int      @id @default(autoincrement())
  examId      Int
  exam        Exam     @relation(fields: [examId], references: [id])
  question    String
  options     String?    // Opciones para múltiple choice (JSON string)
  correctAnswer String // Respuesta correcta
  type        String   // multiple_choice, true_false, open_ended
}

model ExamSubmission {
  id          Int      @id @default(autoincrement())
  examId      Int
  exam        Exam     @relation(fields: [examId], references: [id])
  studentId   Int
  student     User     @relation("ExamStudent", fields: [studentId], references: [id])
  answers     String     // Respuestas del estudiante (JSON string)
  score       Float    // Nota de 1.0 a 5.0
  submittedAt DateTime @default(now())
  review      String?    // Revisión: correctas/incorrectas (JSON string)
}
```

### Servicio de Exámenes (examService.ts)

#### Funcionalidades Implementadas:
- **Generación de Preguntas con IA**: Integración con Gemini AI para crear preguntas automáticamente basadas en temas específicos.
- **Gestión de Asignaciones**: Sistema flexible para asignar exámenes a estudiantes individuales usando arrays de IDs.
- **Calificación Automática**: Sistema de puntuación automática con escala 1-5 y revisión detallada.
- **Control de Acceso**: Validación estricta de permisos basada en roles y asignaciones.
- **Manejo de Errores Robusto**: Try-catch blocks para parsing JSON seguro.
- **Integración con Notificaciones**: Notificaciones automáticas para creación y envío de exámenes.

#### Métodos Principales:
- `createExam()`: Crea un examen con preguntas generadas por IA y notifica a estudiantes asignados.
- `getExamsForStudent()`: Obtiene exámenes asignados a un estudiante específico.
- `getExamsForTutor()`: Obtiene todos los exámenes creados por un tutor con información de asignaciones.
- `submitExam()`: Procesa el envío de un examen, calcula calificación y notifica al tutor.
- `getExamQuestions()`: Obtiene preguntas de un examen para un estudiante autorizado.
- `getExamResults()`: Proporciona estadísticas y resultados detallados para tutores.
- `deleteExam()`: Elimina un examen y todas sus dependencias.

#### Tipos de Pregunta Soportados:
- **Opción Múltiple**: Preguntas con 4 opciones, una correcta.
- **Verdadero/Falso**: Preguntas de dos opciones.
- **Respuesta Corta**: Preguntas abiertas con validación de texto.

#### Mensajes de Notificación (en español):
- Para estudiantes (nuevo examen): `"Nuevo examen asignado: "${data.title}". Tienes ${data.timeLimit} minutos para completarlo."`
- Para tutores (examen completado): `"El estudiante ${student?.username} ha completado el examen "${exam.title}". Calificación: ${score.toFixed(1)}/5.0"`

### Controlador de Exámenes (examController.ts)

#### Endpoints CRUD:
- `POST /exams`: Crear examen (tutores)
- `GET /exams/student`: Obtener exámenes asignados (estudiantes)
- `GET /exams/tutor`: Obtener exámenes creados (tutores)
- `GET /exams/:id/questions`: Obtener preguntas de un examen (estudiantes)
- `POST /exams/submit`: Enviar respuestas de examen (estudiantes)
- `GET /exams/:id/results`: Obtener resultados y estadísticas (tutores)
- `DELETE /exams/:id`: Eliminar examen (tutores)

#### Validaciones Implementadas:
- Autenticación requerida para todas las rutas
- Verificación de roles: tutores para crear/gestionar, estudiantes para acceder/asignar
- Validación de asignaciones: estudiantes solo acceden a exámenes asignados
- Control de envíos: estudiantes no pueden enviar exámenes ya completados
- Validación de datos: temas, número de preguntas, tiempo límite
- **Validación de Schema**: Uso de Zod para validar estructura de datos, incluyendo array de IDs para assignedTo

#### Respuestas de Error (en español):
- `"No autenticado."`
- `"Solo los tutores pueden crear exámenes."`
- `"Examen no encontrado."`
- `"No asignado a este examen."`
- `"Ya has enviado este examen."`
- `"No autorizado para ver estos resultados."`

### Rutas de Exámenes (examRoutes.ts)

Todas las rutas requieren autenticación JWT (`verifyToken` middleware) y validación de schema con Zod.

```typescript
router.post('/', verifySchema(createExamSchema), createExamHandler as any);
router.get('/student', getExamsForStudentHandler as any);
router.get('/tutor', getExamsForTutorHandler as any);
router.get('/:examId/questions', getExamQuestionsHandler as any);
router.post('/submit', verifySchema(submitExamSchema), submitExamHandler as any);
router.get('/:examId/results', getExamResultsHandler as any);
router.delete('/:examId', deleteExamHandler as any);
```

### Modelos de Validación (examModel.ts)

```typescript
export const createExamSchema = z.object({
  title: z.string().min(1).max(255),
  topics: z.string().min(1),
  numQuestions: z.number().int().min(1).max(50),
  timeLimit: z.number().int().min(1).max(300), // minutos
  assignedTo: z.array(z.number().int().positive()).min(1), // Array de IDs de estudiantes
})

export const submitExamSchema = z.object({
  answers: z.record(z.string(), z.string()), // { questionId: answer }
})
```

### Integración con la Aplicación Principal (app.ts)

Las rutas de exámenes están registradas en `/exams`:
```typescript
app.use('/exams', examRoutes);
```

### Servicio de IA (aiService.ts)

#### Funcionalidades de Generación de Preguntas:
- **Integración con Gemini AI**: Uso de la API de Google Gemini para generar preguntas contextuales.
- **Prompts Inteligentes**: Creación de prompts específicos por tipo de pregunta y tema.
- **Validación de Respuestas**: Aseguramiento de formato JSON válido en respuestas de IA.
- **Manejo de Errores**: Fallback para casos donde la IA no responde correctamente.

#### Tipos de Pregunta Generados:
- **Múltiple Choice**: 4 opciones con una correcta, explicación opcional.
- **True/False**: Preguntas de verdadero/falso con justificación.
- **Short Answer**: Preguntas abiertas con respuesta esperada.

### Migración de Base de Datos

Se ejecutó la migración de Prisma para asegurar que los modelos Exam, ExamQuestion y ExamSubmission estén presentes en la base de datos:
```bash
npx prisma migrate dev --name add_exam_models
```

### Funcionamiento Automático

- **Generación de Preguntas**: Las preguntas se generan automáticamente al crear un examen usando IA.
- **Notificaciones**: Se envían automáticamente al asignar exámenes y completar envíos.
- **Calificación**: Sistema automático con escala 1-5 y revisión detallada por pregunta.
- **Asignaciones**: Sistema flexible de asignación individual por estudiante usando arrays de IDs.
- **Seguridad**: Control estricto de acceso basado en roles y asignaciones específicas.

### Consideraciones Técnicas

- **IA Integration**: Uso de Google Gemini API para generación inteligente de contenido.
- **JSON Handling**: Parsing seguro con try-catch para evitar errores de datos corruptos.
- **Real-time Notifications**: Integración completa con el sistema de notificaciones existente.
- **Scalability**: Diseño modular que permite expansión futura (exámenes grupales, timers, etc.).
- **Data Integrity**: Relaciones de base de datos con cascada para mantener consistencia.
- **Language**: Mensajes en español para consistencia con la plataforma universitaria.
- **Validation**: Validación robusta con Zod schemas para asegurar integridad de datos.

Esta implementación completa el sistema de exámenes, proporcionando una solución integral para evaluación educativa con IA, calificación automática y notificaciones en tiempo real.

## 🔐 Integración con Google Services

### Descripción General
El sistema incluye integración completa con servicios de Google (OAuth 2.0, Gmail y Google Calendar) para proporcionar autenticación social, envío de notificaciones por email y sincronización de eventos del calendario.

### Configuración de Google APIs

#### Variables de Entorno Requeridas
```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8000/auth/google/callback

# Google Gemini AI (para exámenes)
GEMINI_API_KEY=your_gemini_api_key
```

#### Archivos de Credenciales
- `src/config/google-credentials.json`: Credenciales de cuenta de servicio para Gmail y Calendar APIs

#### APIs de Google Habilitadas
- Google+ API (para OAuth básico)
- Gmail API (para envío de emails)
- Google Calendar API (para sincronización de eventos)

### 🔑 Sistema de Autenticación Google OAuth

#### Servicio de Autenticación (googleAuthService.ts)

##### Funcionalidades Implementadas:
- **Autenticación OAuth 2.0**: Integración con Passport.js para login social
- **Vinculación de Cuentas**: Vincular cuentas existentes de Google con usuarios del sistema
- **Creación Automática de Usuarios**: Registro automático al iniciar sesión con Google
- **Gestión de Tokens**: Almacenamiento seguro de access tokens y refresh tokens
- **Renovación Automática**: Refresh automático de tokens expirados

##### Flujo de Autenticación:
1. Usuario inicia sesión con Google
2. Se obtiene perfil y tokens de Google
3. Se busca usuario existente por `googleId` o email
4. Si no existe, se crea nuevo usuario con rol por defecto 'ALUMNO'
5. Se almacenan tokens para futuras operaciones

##### Modelo de Datos (Campos agregados a User):
```prisma
model User {
  // ... campos existentes
  googleId          String?   @unique
  googleAccessToken String?
  googleRefreshToken String?
  googleTokenExpiry DateTime?
  calendarId        String?   // ID del calendario personal del usuario
}
```

#### Rutas de Autenticación (authRoutes.ts)
- `GET /auth/google`: Iniciar autenticación con Google
- `GET /auth/google/callback`: Callback de Google OAuth
- `POST /auth/login`: Login tradicional (JWT)
- `POST /auth/register`: Registro tradicional

### 📧 Servicio de Gmail (gmailService.ts)

##### Funcionalidades Implementadas:
- **Envío de Emails**: Envío de notificaciones usando cuenta de servicio o tokens de usuario
- **Templates de Notificación**: Emails preformateados para diferentes eventos
- **Gestión de Tokens**: Renovación automática de tokens expirados
- **Reportes por Email**: Envío de reportes de progreso y calificaciones

##### Métodos Principales:
- `sendEmailWithServiceAccount()`: Envío usando cuenta de servicio (para notificaciones del sistema)
- `sendEmailWithUserToken()`: Envío usando tokens del usuario (personalizado)
- `sendNotificationEmail()`: Envío de notificaciones genéricas
- `sendReportEmail()`: Envío de reportes (progreso, calificaciones, actividad)

##### Templates de Email:
- **Notificaciones de Sistema**: Recordatorios, asignaciones, calificaciones
- **Reportes**: Progreso académico, estadísticas de rendimiento
- **Formatos**: HTML básico con información estructurada

### 📅 Servicio de Google Calendar (calendarService.ts)

##### Funcionalidades Implementadas:
- **Sincronización de Eventos**: Crear eventos en Google Calendar para tareas y exámenes
- **Gestión de Calendarios**: Soporte para calendario principal y calendarios personalizados
- **Recordatorios Automáticos**: Configuración de recordatorios en eventos
- **Actualización de Eventos**: Modificar eventos existentes
- **Eliminación de Eventos**: Remover eventos del calendario

##### Métodos Principales:
- `syncTaskToCalendar()`: Sincronizar tarea con evento de calendario
- `syncProjectToCalendar()`: Sincronizar proyecto con evento de calendario
- `syncExamToCalendar()`: Sincronizar examen con evento de calendario
- `getCalendarEvents()`: Obtener eventos del calendario
- `updateEvent()`: Actualizar evento existente
- `deleteEvent()`: Eliminar evento

##### Configuración de Eventos:
```typescript
const event = {
  summary: `Entrega: ${task.name}`,
  description: `Proyecto: ${project.name}\nTutor: ${tutor.username}`,
  start: { dateTime: dueDate, timeZone: 'America/Bogota' },
  end: { dateTime: endDate, timeZone: 'America/Bogota' },
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 1440 }, // 24 horas antes
      { method: 'popup', minutes: 60 }    // 1 hora antes
    ]
  }
}
```

### 🌐 Rutas de Google (googleRoutes.ts)

#### Endpoints de Gmail:
- `POST /google/send-notification`: Enviar notificación por email
- `POST /google/send-report`: Enviar reporte por email

#### Endpoints de Calendar:
- `POST /google/tasks/:taskId/sync-calendar`: Sincronizar tarea
- `POST /google/projects/:projectId/sync-calendar`: Sincronizar proyecto
- `POST /google/exams/:examId/sync-calendar`: Sincronizar examen
- `GET /google/calendar/events`: Obtener eventos
- `PUT /google/calendar/events/:eventId`: Actualizar evento
- `DELETE /google/calendar/events/:eventId`: Eliminar evento

### 🔧 Rutas Administrativas (adminRoutes.ts)

#### Gestión de Tokens Google:
- `POST /admin/clear-google-tokens`: Limpiar tokens de Google de usuarios específicos
  - **Parámetros**: `{ ids: number[] }` - Array de IDs de usuarios
  - **Permisos**: Solo tutores
  - **Función**: Elimina tokens de acceso, refresh y calendarId

### Integración con la Aplicación Principal (app.ts)

```typescript
// Inicializar Passport con estrategia de Google
app.use(passport.initialize());

// Rutas de Google
app.use('/google', googleRoutes);
app.use('/admin', adminRoutes);
```

### Migración de Base de Datos

Campos agregados al modelo User para integración con Google:
```bash
npx prisma migrate dev --name add_google_integration_fields
```

### Consideraciones de Seguridad

- **Almacenamiento Seguro**: Tokens encriptados en base de datos
- **Renovación Automática**: Refresh tokens para mantener acceso válido
- **Permisos Limitados**: Solo scopes necesarios (calendar, gmail.send)
- **Validación de Usuarios**: Verificación de propiedad de tokens
- **Rate Limiting**: Control de frecuencia de operaciones con Google APIs

### Funcionamiento Automático

- **Renovación de Tokens**: Automática al detectar tokens expirados
- **Sincronización**: Eventos creados automáticamente al asignar tareas/exámenes
- **Notificaciones**: Emails enviados automáticamente para eventos importantes
- **Gestión de Errores**: Fallback a notificaciones del sistema si fallan servicios de Google

### Consideraciones Técnicas

- **APIs de Google**: Uso de googleapis npm package
- **Autenticación**: Passport.js con estrategia passport-google-oauth20
- **Tokens**: Gestión de OAuth 2.0 con refresh automático
- **Calendarios**: Soporte para múltiples calendarios por usuario
- **Emails**: Envío tanto desde cuenta de servicio como desde cuentas de usuario
- **Zona Horaria**: Configurada para America/Bogota
- **Idioma**: Mensajes en español para consistencia

Esta integración proporciona una experiencia completa con servicios de Google, mejorando la funcionalidad del sistema educativo con autenticación social, notificaciones por email y sincronización de calendario.

## 🔔 Sistema de Recordatorios

### Descripción General
El sistema de recordatorios permite a los usuarios crear recordatorios personalizados y recibir notificaciones automáticas para tareas y proyectos próximos a vencer.

### Modelo de Datos (Prisma Schema)

```prisma
model Reminder {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation("UserReminders", fields: [userId], references: [id])
  title       String
  description String?
  scheduledAt DateTime
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  relatedId   Int?     // ID de la tarea o proyecto relacionado
  relatedType String?  // "task" o "project"
}
```

### Servicio de Recordatorios (reminderService.ts)

#### Funcionalidades Implementadas:
- **Singleton Pattern**: Instancia única del servicio para manejar recordatorios globalmente.
- **Recordatorios Automáticos**: Verificación horaria de tareas y proyectos próximos a vencer (24h y 1h antes).
- **CRUD Completo**: Crear, leer, actualizar y eliminar recordatorios personalizados.
- **Programación con Cron**: Uso de node-cron para ejecutar recordatorios en fechas específicas.
- **Integración con Notificaciones**: Envío automático de notificaciones vía el sistema existente.

#### Métodos Principales:
- `initializeReminders()`: Inicializa el servicio y configura verificación horaria.
- `checkReminders()`: Verifica tareas y proyectos próximos a vencer.
- `createReminder()`: Crea un recordatorio personalizado y programa su ejecución.
- `getRemindersByUser()`: Obtiene todos los recordatorios de un usuario.
- `updateReminder()`: Actualiza un recordatorio existente.
- `deleteReminder()`: Elimina un recordatorio y cancela su programación.

#### Mensajes de Notificación (en español):
- Para tareas: `"Recordatorio: La tarea '${task.name}' vence en ${timeLeft}. ${task.project ? 'Proyecto: ${task.project.name}' : ''}"`
- Para proyectos: `"Recordatorio: El proyecto '${project.name}' vence en ${timeLeft}."`
- Para recordatorios personalizados: `"Recordatorio: ${reminder.title}${reminder.description ? ' - ' + reminder.description : ''}"`

### Controlador de Recordatorios (reminderController.ts)

#### Endpoints CRUD:
- `POST /reminders`: Crear recordatorio
- `GET /reminders`: Obtener recordatorios del usuario
- `GET /reminders/:id`: Obtener recordatorio específico
- `PUT /reminders/:id`: Actualizar recordatorio
- `DELETE /reminders/:id`: Eliminar recordatorio

#### Endpoints Legacy (para compatibilidad):
- `POST /reminders/schedule`: Programar recordatorio (método antiguo)
- `DELETE /reminders/job/:jobId`: Cancelar recordatorio programado

#### Validaciones Implementadas:
- Autenticación requerida para todas las rutas
- Verificación de fechas futuras
- Permisos: solo el propietario puede acceder a sus recordatorios
- Validación de campos requeridos (título, fecha programada)

#### Respuestas de Error (en español):
- `"No autenticado."`
- `"Título y fecha programada son requeridos."`
- `"La fecha debe ser futura."`
- `"Recordatorio no encontrado."`
- `"No tienes permiso para ver/editar/eliminar este recordatorio."`

### Rutas de Recordatorios (reminderRoutes.ts)

Todas las rutas requieren autenticación JWT (`verifyToken` middleware).

```typescript
router.post('/', createReminder);
router.get('/', getUserReminders);
router.get('/:id', getReminderById);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

// Legacy
router.post('/schedule', scheduleReminder);
router.delete('/job/:jobId', cancelReminder);
router.get('/status', getReminderStatus);
```

### Integración con la Aplicación Principal (app.ts)

Las rutas de recordatorios están registradas en `/reminders`:
```typescript
app.use('/reminders', reminderRoutes);
```

### Migración de Base de Datos

Se ejecutó la migración de Prisma para asegurar que el modelo Reminder esté presente en la base de datos:
```bash
npx prisma migrate dev --name add_reminder_model
```

### Funcionamiento Automático

- **Verificación Horaria**: Cada hora se ejecuta `checkReminders()` para enviar notificaciones automáticas.
- **Programación Personalizada**: Los recordatorios personalizados se programan con node-cron y se ejecutan en la fecha/hora especificada.
- **Cancelación**: Al eliminar un recordatorio, se cancela el job de cron correspondiente.

### Consideraciones Técnicas

- **Persistencia**: Todos los recordatorios se almacenan en SQLite vía Prisma.
- **Tiempo Real**: Las notificaciones se envían vía WebSocket usando el sistema existente.
- **Idioma**: Los mensajes están en español para consistencia con el resto de la aplicación.
- **Seguridad**: Solo usuarios autenticados pueden gestionar sus recordatorios.
- **Escalabilidad**: El servicio usa un Map para trackear jobs de cron, adecuado para cargas moderadas.

Esta implementación completa el sistema de recordatorios, permitiendo tanto recordatorios automáticos como personalizados con integración total al ecosistema existente.

## 🤖 Sistema de Chatbot con IA

### Descripción General
El sistema de chatbot con IA permite a los usuarios interactuar con un asistente inteligente especializado en búsqueda de información educativa. El chatbot utiliza Google Gemini AI para proporcionar respuestas contextuales, manteniendo memoria de conversación y permitiendo múltiples hilos de diálogo. Está diseñado exclusivamente para facilitar el aprendizaje autónomo mediante la búsqueda de información confiable en internet, rechazando cualquier solicitud relacionada con tareas escolares o actividades que involucren calificaciones.

### Modelo de Datos (Prisma Schema)

```prisma
model ChatbotConversation {
  id          Int      @id @default(autoincrement())
  userId      Int
  user        User     @relation("UserChatbotConversations", fields: [userId], references: [id])
  title       String?
  messages    String   // JSON array de mensajes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Servicio de Chatbot (chatbotService.ts)

#### Funcionalidades Implementadas:
- **Integración con Gemini AI**: Uso de Google Gemini 2.0 Flash para generar respuestas inteligentes.
- **Memoria de Conversación**: Mantiene contexto de hasta los últimos 5 mensajes para respuestas coherentes.
- **Detección de Cambio de Tema**: Resetea el contexto cuando detecta frases como "cambiando de tema" o "olvida lo anterior".
- **Restricciones Éticas**: Rechaza solicitudes relacionadas con tareas escolares, exámenes o cualquier actividad académica calificada.
- **Extracción de Enlaces**: Identifica y extrae enlaces reales de fuentes confiables en las respuestas.
- **Generación de Títulos**: Crea títulos automáticos para conversaciones basados en el primer mensaje.

#### Métodos Principales:
- `processMessage()`: Procesa un mensaje del usuario y genera respuesta con IA, considerando historial y restricciones.
- `shouldResetContext()`: Detecta frases que indican cambio de tema para resetear memoria.
- `isRestrictedRequest()`: Verifica si el mensaje viola las reglas éticas del chatbot.
- `extractLinks()`: Extrae enlaces de las respuestas generadas.
- `generateConversationTitle()`: Crea títulos descriptivos para conversaciones.

#### Restricciones Éticas:
El chatbot está programado para rechazar cualquier solicitud que involucre:
- Ayuda con tareas escolares o trabajos académicos
- Preparación de exámenes o pruebas
- Resolución de ejercicios calificados
- Cualquier actividad que pueda afectar calificaciones

En su lugar, dirige a los usuarios hacia el aprendizaje autónomo y búsqueda de información general.

#### Mensajes de Rechazo (en español):
- `"Lo siento, soy un chatbot educativo diseñado únicamente para ayudar con la búsqueda y explicación de información general. No puedo ayudar con tareas escolares, trabajos académicos, exámenes o cualquier actividad que involucre calificaciones."`

### Controlador de Chatbot (chatbotController.ts)

#### Endpoints CRUD:
- `GET /chatbot/conversations`: Obtener todas las conversaciones del usuario
- `GET /chatbot/conversations/:conversationId`: Obtener conversación específica
- `POST /chatbot/conversations`: Crear nueva conversación
- `POST /chatbot/conversations/:conversationId/messages`: Enviar mensaje al chatbot
- `DELETE /chatbot/conversations/:conversationId`: Eliminar conversación

#### Validaciones Implementadas:
- Autenticación requerida para todas las rutas
- Verificación de propiedad de conversaciones (solo el propietario puede acceder)
- Validación de mensajes no vacíos
- Control de existencia de conversaciones

#### Respuestas de Error (en español):
- `"No autenticado."`
- `"ID de conversación requerido."`
- `"ID de conversación inválido."`
- `"Conversación no encontrada."`
- `"Mensaje requerido."`
- `"Error interno del servidor."`

### Rutas de Chatbot (chatbotRoutes.ts)

Todas las rutas requieren autenticación JWT (`verifyToken` middleware).

```typescript
router.get('/conversations', getChatbotConversations as any);
router.get('/conversations/:conversationId', getChatbotConversation as any);
router.post('/conversations', createChatbotConversation as any);
router.post('/conversations/:conversationId/messages', sendChatbotMessage as any);
router.delete('/conversations/:conversationId', deleteChatbotConversation as any);
```

### Integración con la Aplicación Principal (app.ts)

Las rutas de chatbot están registradas en `/chatbot`:
```typescript
app.use('/chatbot', chatbotRoutes);
```

### Servicio de IA (aiService.ts - Integración)

#### Funcionalidades de Generación de Respuestas:
- **Prompts Estructurados**: Prompts del sistema en español con reglas claras de comportamiento.
- **Formato de Respuesta**: Estructura organizada con títulos, explicaciones detalladas y enlaces.
- **Validación de Contenido**: Aseguramiento de respuestas apropiadas y éticas.
- **Manejo de Errores**: Fallback para casos donde la IA no está disponible.

#### Estructura de Respuestas:
Cada respuesta sigue un formato Markdown consistente:
1. **Título Principal**: Claro y atractivo con emojis
2. **Explicación Detallada**: Información organizada con listas y negritas
3. **Fuentes y Enlaces**: Enlaces reales de fuentes confiables

### Funcionamiento Automático

- **Creación de Conversaciones**: Los usuarios pueden iniciar múltiples conversaciones independientes.
- **Memoria Contextual**: Mantiene coherencia dentro de cada hilo de conversación.
- **Reset de Contexto**: Detecta automáticamente cambios de tema y comienza nuevo contexto.
- **Almacenamiento Seguro**: Todas las conversaciones se guardan en base de datos con JSON de mensajes.
- **Títulos Automáticos**: Genera títulos descriptivos basados en el contenido inicial.

### Consideraciones Técnicas

- **IA Integration**: Uso de Google Gemini API con clave de API configurable.
- **JSON Handling**: Parseo seguro de mensajes con try-catch para evitar corrupciones.
- **Persistencia**: Conversaciones almacenadas en SQLite vía Prisma con actualizaciones automáticas.
- **Seguridad**: Solo usuarios autenticados pueden acceder a sus conversaciones.
- **Escalabilidad**: Patrón Singleton para el servicio, adecuado para cargas moderadas.
- **Idioma**: Interfaz completamente en español para consistencia con la plataforma educativa.
- **Ética**: Restricciones programadas para mantener el propósito educativo sin comprometer la integridad académica.

Esta implementación proporciona un asistente de IA ético y educativo, complementando el ecosistema de aprendizaje con herramientas de búsqueda inteligente y contextual.
