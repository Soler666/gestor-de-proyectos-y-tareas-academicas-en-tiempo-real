import { Router, Request, Response } from 'express'

const router = Router()

// Public endpoint (no protegido) que mantiene compatibilidad si el frontend llama sin /admin.
// Este endpoint NO gestiona cursos; solo evita 404 por ruta inexistente.
router.post('/courses', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint privado: use /admin/courses con rol ADMIN.' })
})

export default router


