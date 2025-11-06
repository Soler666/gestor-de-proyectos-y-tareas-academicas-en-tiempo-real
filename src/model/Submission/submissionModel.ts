import z from 'zod'

export const createSubmissionSchema = z.object({
  taskId: z.number().int().positive(),
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
  grade: z.number().min(0).max(100),
  feedback: z.string().optional(),
})
