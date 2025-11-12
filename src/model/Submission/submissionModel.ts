import z from 'zod'

export const createSubmissionSchema = z.object({
  // taskId llega como string en multipart/form-data; usamos coerce para validarlo como number
  taskId: z.coerce.number().int().positive(),
  content: z.string().optional(),
  files: z.array(z.object({
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number().int().positive(),
    path: z.string(),
  })).optional(),
})

export const gradeSubmissionSchema = z.object({
  grade: z.number().min(0).max(5.0),
  feedback: z.string().optional(),
})
