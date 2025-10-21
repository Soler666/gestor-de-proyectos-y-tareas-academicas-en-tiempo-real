# TODO: Implementar Sistema de Entregas en Frontend

## Paso 1: Eliminar Sección 'Submissions'
- [x] Remover botón 'show-submissions' de la navegación
- [x] Remover vista 'submissions-view' del HTML
- [x] Remover estilos relacionados con .submission-section

## Paso 2: Agregar Botón 'Realizar Entrega' en Tareas y Proyectos
- [ ] Modificar renderTasks() para agregar botón "Realizar Entrega" debajo de cada tarea (solo para alumnos)
- [ ] Modificar renderProjects() para agregar botón "Realizar Entrega" debajo de cada proyecto (solo para alumnos)
- [ ] Agregar estilos para .task-submit-btn y .project-submit-btn

## Paso 3: Crear Formulario de Entrega
- [ ] Crear modal o sección oculta para el formulario de entrega
- [ ] Campo de texto para contenido
- [ ] Área de drag & drop para archivos
- [ ] Mostrar tipos permitidos: .doc, .docx, .pdf, .txt, etc.
- [ ] Límite de 10 archivos, 20MB total
- [ ] Validación de archivos

## Paso 4: Manejo de Archivos con localStorage
- [ ] Implementar drag & drop events
- [ ] Convertir archivos a base64 para localStorage
- [ ] Mostrar lista de archivos adjuntos
- [ ] Permitir remover archivos
- [ ] Persistir archivos en localStorage hasta envío

## Paso 5: Envío de Entrega al Backend
- [ ] Función para enviar POST a /submissions
- [ ] Incluir taskId, content, files
- [ ] Manejar respuesta y actualizar UI
- [ ] Limpiar localStorage después de envío exitoso

## Paso 6: Vista de Calificación para Tutores
- [ ] Modificar renderTasks() y renderProjects() para mostrar entregas pendientes (solo tutores)
- [ ] Agregar botón "Ver Entrega" o "Calificar"
- [ ] Crear modal para ver entrega y calificar
- [ ] Campos para grade (0-100) y feedback
- [ ] Enviar PUT a /submissions/:id/grade

## Paso 7: Actualizar Estado de Entrega para Alumnos
- [ ] Modificar renderTasks() y renderProjects() para mostrar estado de entrega
- [ ] Mostrar "Entrega realizada", "Pendiente de calificación", etc.
- [ ] Si no hay entrega, mostrar botón "Realizar Entrega"

## Paso 8: Testing y Ajustes
- [ ] Probar flujo completo como alumno
- [ ] Probar flujo completo como tutor
- [ ] Verificar manejo de errores
- [ ] Ajustar estilos y UX
