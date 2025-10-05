import z from 'zod';

export const taskSchema = z.object({
  projectId: z.number().optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  responsibleId: z.number(), // ID de usuario
  tutorId: z.number().optional(), // ID del tutor
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['Baja', 'Media', 'Alta']),
  status: z.enum(['Pendiente', 'En progreso', 'Completada', 'Bloqueada']),
  type: z.enum(['daily', 'project']).optional().default('project'),
});

export type ITask = z.infer<typeof taskSchema>;
