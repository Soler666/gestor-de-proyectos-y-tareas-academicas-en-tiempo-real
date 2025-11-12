import createToken from '../middleware/jwt/createToken'
import userService from '../service/userService'
import { Response, NextFunction, Request } from 'express'
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types/auth'
import hashPassword from '../util/bcrypt/hashpassword'
import comparePassword from '../util/bcrypt/comparePassword'

type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const register: RequestHandler = async (req, res, next) => {
  try {
    const userData = req.body as RegisterCredentials;
    const hashedPassword = await hashPassword(userData.password);

    // Solo permitir roles ALUMNO o TUTOR en registro público
    const allowedRoles = ['ALUMNO', 'TUTOR'];
    const userRole = allowedRoles.includes(userData.role || '') ? userData.role! : 'ALUMNO';

    const newUser = await userService.create({
      username: userData.username,
      password: hashedPassword,
      role: userRole,
      status: 'PENDING', // Todos los nuevos usuarios empiezan pendientes de aprobación
      email: userData.email, // Agregar email si se proporciona
      firstName: userData.firstName,
      lastName: userData.lastName,
    });

    // Eliminamos la contraseña antes de enviar la respuesta
    const { password, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: '✅ Usuario registrado exitosamente. Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos cuando sea aprobada.',
      user: userWithoutPassword,
      status: 'PENDING'
    });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const credentials = req.body as LoginCredentials;
    const user = await userService.getByUsername(credentials.username);

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Verificar el estado del usuario
    if (user.status === 'PENDING') {
      res.status(403).json({
        message: 'Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos por email cuando sea aprobada.',
        code: 'ACCOUNT_PENDING_APPROVAL',
        status: user.status
      });
      return;
    }

    if (user.status === 'REJECTED') {
      res.status(403).json({
        message: 'Tu cuenta ha sido rechazada. Contacta al soporte para más información.',
        code: 'ACCOUNT_REJECTED',
        status: user.status
      });
      return;
    }

    if (user.status !== 'APPROVED') {
      res.status(403).json({
        message: 'Tu cuenta no está disponible. Contacta al soporte para más información.',
        code: 'ACCOUNT_UNAVAILABLE',
        status: user.status
      });
      return;
    }

    const isPasswordValid = await comparePassword(credentials.password, user.password);
    if (isPasswordValid !== true) {
      res.status(401).json({ message: 'Contraseña incorrecta' });
      return;
    }

    // Eliminamos datos sensibles antes de generar el token
    const { password, googleAccessToken, googleRefreshToken, ...safeUser } = user as any;
    // Construir payload explícito para evitar problemas de tipos con googleId nullable
    const payload = {
      id: safeUser.id,
      username: safeUser.username,
      role: safeUser.role,
      status: safeUser.status,
      googleId: safeUser.googleId ?? undefined
    };
    const token = createToken(payload, '1h');

    res.header('token', token).json({
      user: safeUser,
      token
    });
  } catch (error) {
    next(error);
  }
};
