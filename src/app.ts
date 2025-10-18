import express, { Request, Response } from 'express'
import path from 'path'
import showRequests from './middleware/showRequest'
import cors from 'cors'
import authRouter from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import projectRoutes from './routes/projectRoutes'
import taskRoutes from './routes/taskRoutes'
import chatRoutes from './routes/chatRoutes'
import notificationRoutes from './routes/notificationRoutes'

const app = express()
const port = process.env.PORT || 8000

app.use(express.json())
app.use(showRequests)
app.use(cors({
  origin: '*',
  exposedHeaders: ['token'],
  credentials: true
}))

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'client.html'))
})

app.get('/ping', (_req: Request, res: Response) => {
  res.send({ message: 'pong' })
})

app.use('/auth', authRouter)
app.use('/user', userRoutes)
app.use('/projects', projectRoutes)
app.use('/tasks', taskRoutes)
app.use('/api/chat', chatRoutes)
app.use('/notifications', notificationRoutes)

//TODO: añadir validaciones con zod (listo)

export { app, port }
