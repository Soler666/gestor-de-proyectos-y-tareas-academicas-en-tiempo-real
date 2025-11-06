import { Router } from 'express'
import { userSchema, editUserSchema } from '../model/User/userModel'
import verifyToken from '../middleware/jwt/verifyToken'
import { verifySchema } from '../middleware/validateSchema'
import { getUsers, getUser, updateUser, deleteUser } from '../controller/userController'

const userRoutes = Router()
userRoutes.use(verifyToken)

userRoutes
  .get('/', getUsers as any)
  .get('/me', getUser as any) // No body to validate for GET /me
  .patch('/me', verifySchema(editUserSchema), updateUser as any)
  .delete('/me', deleteUser as any) // No body to validate for DELETE /me

export default userRoutes
