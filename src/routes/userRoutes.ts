import { Router } from 'express'
import { userSchema, editUserSchema } from '../model/User/userModel'
import verifyToken from '../middleware/jwt/verifyToken'
import { verifySchema } from '../middleware/validateSchema'
import { getUsers, getUser, updateUser, deleteUser } from '../controller/userController'

const userRoutes = Router()
userRoutes.use(verifyToken)

userRoutes
  .get('/', getUsers)
  .get('/me', verifySchema(userSchema), getUser)
  .patch('/me', verifySchema(editUserSchema), updateUser)
  .delete('/me', verifySchema(userSchema), deleteUser)

export default userRoutes
