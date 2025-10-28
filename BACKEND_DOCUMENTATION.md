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
  id              Int      @id @default(autoincrement())
  title           String
  topics          String   // JSON stringified array
  numQuestions    Int
  timeLimit       Int      // in minutes
  generatedQuestions String? // JSON stringified questions
  createdBy       Int
  createdByUser   User     @relation("CreatedExams", fields: [createdBy], references: [id])
  assignedTo       String   // JSON stringified array of user IDs
  status          String   @default("active") // "active", "inactive"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  questions       ExamQuestion[]
  submissions     ExamSubmission[]
}

model ExamQuestion {
  id          Int      @id @default(autoincrement())
  examId      Int
  exam        Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  question    String
  options     String?  // JSON stringified array for multiple choice
  correctAnswer String
  type        String   // "multiple_choice", "true_false", "short_answer"
}

model ExamSubmission {
  id          Int      @id @default(autoincrement())
  examId      Int
  exam        Exam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  studentId   Int
  student     User     @relation("ExamSubmissions", fields: [studentId], references: [id])
  answers     String   // JSON stringified answers object
  score       Float    // 0-5 scale
  review      String   // JSON stringified review object
  submittedAt DateTime @default(now())
}
```

### Servicio de Exámenes (examService.ts)

#### Funcionalidades Implementadas:
- **Generación de Preguntas con IA**: Integración con Gemini AI para crear preguntas automáticamente basadas en temas específicos.
- **Gestión de Asignaciones**: Sistema flexible para asignar exámenes a estudiantes individuales.
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
- Para estudiantes (nuevo examen): `"Nuevo examen asignado: "${exam.title}". Tienes ${exam.timeLimit} minutos para completarlo."`
- Para tutores (examen completado): `"El estudiante ${student.username} ha completado el examen "${exam.title}". Calificación: ${score.toFixed(1)}/5.0"`

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

#### Respuestas de Error (en español):
- `"No autenticado."`
- `"Solo los tutores pueden crear exámenes."`
- `"Título, temas y número de preguntas son requeridos."`
- `"Número de preguntas debe estar entre 1 y 20."`
- `"Tiempo límite debe estar entre 5 y 180 minutos."`
- `"Debe asignar al menos un estudiante."`
- `"Examen no encontrado."`
- `"No asignado a este examen."`
- `"Ya has enviado este examen."`
- `"No autorizado para ver estos resultados."`

### Rutas de Exámenes (examRoutes.ts)

Todas las rutas requieren autenticación JWT (`verifyToken` middleware).

```typescript
router.post('/', createExam);
router.get('/student', getExamsForStudent);
router.get('/tutor', getExamsForTutor);
router.get('/:id/questions', getExamQuestions);
router.post('/submit', submitExam);
router.get('/:id/results', getExamResults);
router.delete('/:id', deleteExam);
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
- **Asignaciones**: Sistema flexible de asignación individual por estudiante.
- **Seguridad**: Control estricto de acceso basado en roles y asignaciones específicas.

### Consideraciones Técnicas

- **IA Integration**: Uso de Google Gemini API para generación inteligente de contenido.
- **JSON Handling**: Parsing seguro con try-catch para evitar errores de datos corruptos.
- **Real-time Notifications**: Integración completa con el sistema de notificaciones existente.
- **Scalability**: Diseño modular que permite expansión futura (exámenes grupales, timers, etc.).
- **Data Integrity**: Relaciones de base de datos con cascada para mantener consistencia.
- **Language**: Mensajes en español para consistencia con la plataforma universitaria.

Esta implementación completa el sistema de exámenes, proporcionando una solución integral para evaluación educativa con IA, calificación automática y notificaciones en tiempo real.

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
