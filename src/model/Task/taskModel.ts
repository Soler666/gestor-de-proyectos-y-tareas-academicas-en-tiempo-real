import z from 'zod';

export const taskSchema = z.object({
  projectId: z.number().optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  responsibleId: z.number().optional(), // ID de usuario individual (retrocompatibilidad)
  responsibleIds: z.array(z.number()).optional(), // IDs de múltiples usuarios
  tutorId: z.number().optional(), // ID del tutor
  dueDate: z.string().nullable().optional(),
  // Defaults para simplificar creación desde frontend (el tutor no elige estado al crear)
  priority: z.enum(['Baja', 'Media', 'Alta']).default('Media'),
  status: z.enum(['Pendiente', 'En progreso', 'Completada', 'Bloqueada']).default('Pendiente'),
  type: z.enum(['daily', 'project']).optional().default('project'),
});

export type ITask = z.infer<typeof taskSchema>;
