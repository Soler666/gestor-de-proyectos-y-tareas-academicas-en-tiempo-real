import z from 'zod'

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
