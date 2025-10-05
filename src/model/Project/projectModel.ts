import z from 'zod';

export const projectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Planificación', 'En progreso', 'Completado', 'Pausado']),
  participants: z.array(z.number()).optional(), // IDs de alumnos
  tutorId: z.number().optional(), // Se asigna automáticamente en el controlador
});

export type IProject = z.infer<typeof projectSchema>;
