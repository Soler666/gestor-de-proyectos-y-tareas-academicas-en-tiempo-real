# TODO: Configurar Chatbot con Memoria y Multi-Hilo - COMPLETADO

## Información Recopilada
- El chatbot ya tiene soporte para conversaciones múltiples (hilos) a través del modelo `ChatbotConversation` en Prisma.
- El servicio `ChatbotService` procesa mensajes con historial de conversación (últimos 5 mensajes).
- El controlador maneja creación, obtención, envío de mensajes y eliminación de conversaciones.
- La interfaz frontend tiene vista de chatbot con lista de conversaciones, botón para nueva conversación, etc.
- El prompt del sistema ya está en español y tiene reglas básicas.

## Plan de Actualización - COMPLETADO
- [x] Modificar `ChatbotService` para detectar cambios de tema y resetear contexto cuando se detecte frases como "Cambiando de tema" o "Olvida lo anterior".
- [x] Actualizar el prompt del sistema para incluir las reglas específicas de memoria y detección de cambios de tema.
- [x] Verificar que la interfaz permita iniciar nuevas conversaciones sin contexto previo.
- [x] Probar el comportamiento con cambios de tema y memoria de conversación.

## Archivos Dependientes
- `src/service/chatbotService.ts`: Lógica de procesamiento de mensajes y prompt del sistema ya implementada.

## Pasos de Seguimiento - COMPLETADO
- [x] Probar el chatbot enviando mensajes de seguimiento y cambios de tema.
- [x] Verificar que las conversaciones se guarden correctamente y se puedan retomar.
- [x] Asegurar que el tono sea útil, profesional y amigable en español.

## Notas
- La funcionalidad de memoria y reset de contexto ya estaba implementada en el código.
- El servicio detecta frases como "cambiando de tema", "olvida lo anterior", etc., y filtra el historial de conversación.
- El prompt del sistema incluye reglas específicas para mantener memoria y detectar cambios de tema.
- El chatbot mantiene contexto para preguntas de seguimiento y resetea cuando se solicita.
