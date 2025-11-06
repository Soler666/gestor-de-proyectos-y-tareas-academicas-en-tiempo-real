import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  role: z.enum(['ALUMNO', 'TUTOR'], {
    errorMap: () => ({ message: 'El rol debe ser ALUMNO o TUTOR' })
  })
});

export type ProfileUpdateData = z.infer<typeof profileSchema>;