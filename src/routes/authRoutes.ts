import { Router, Response, NextFunction, Request } from 'express';
import { login, register } from '../controller/authController'
import { verifySchema } from '../middleware/validateSchema'
import { userSchema, loginSchema } from '../model/User/userModel'
import passport from '../service/googleAuthService'
import prisma from '../config/database'
import verifyToken from '../middleware/jwt/verifyToken'
import createToken from '../middleware/jwt/createToken'

// Extender el tipo Request para incluir el usuario
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      username: string;
      role: string;
      status: string;
      googleId?: string | null;
      googleAccessToken?: string | null;
      googleRefreshToken?: string | null;
      googleTokenExpiry?: Date | null;
      calendarId?: string | null;
    }
  }
}

const authRouter = Router()

authRouter
  .post('/register', verifySchema(userSchema), register)
  .post('/login', verifySchema(loginSchema), login)

// Rutas para autenticación con Google
authRouter.get('/google',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Iniciando autenticación con Google...');
    passport.authenticate('google', {
      scope: [
        'profile',
        'email',
        // Permiso para crear/editar eventos en el calendario del usuario
        'https://www.googleapis.com/auth/calendar.events',
        // Permiso opcional para enviar correos (si ya lo usas)
        'https://www.googleapis.com/auth/gmail.send'
      ],
      accessType: 'offline',
      prompt: 'consent'
    })(req, res, next);
  }
);

authRouter.get('/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('Recibiendo callback de Google...');
    passport.authenticate('google', { 
      failureRedirect: '/login',
      failureMessage: true
    }, async (err: any, user: any, info: any) => {
      if (err) {
        console.error('Error en autenticación de Google:', err);
        return res.redirect(`http://localhost:8000/login?error=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        console.error('No se encontró usuario:', info);
        return res.redirect('http://localhost:8000/login?error=no_user');
      }

      try {
        console.log('Usuario autenticado:', user);
        const payload = {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          googleId: user.googleId
        };

        console.log('Generando token con payload:', payload);
        const token = createToken(payload, '1h');
        console.log('Token generado:', token);
        
        // Configurar cookie segura
        res.cookie('token', token, { 
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 3600000 // 1 hora
        });
        
        // Redirigir con token en query params para el cliente
        // Guardar el token en una cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 3600000 // 1 hora
        });

        // Si el perfil no está completo, redirigir al flujo de completado de perfil
        if (user.profileComplete === false) {
          // Redirigir a la página pública de completado de perfil (token se envía en cookie httpOnly)
          return res.redirect('/profile-setup');
        }

        // Redirigir al cliente con los datos del usuario (perfil ya completo)
        res.redirect(`/client.html?token=${token}&userId=${user.id}&username=${encodeURIComponent(user.username)}&role=${user.role}`);
      } catch (error) {
        console.error('Error generando token:', error);
        res.status(500).json({
          success: false,
          error: 'Error generando token de autenticación'
        });
      }
    })(req, res, next);
  }
);

export default authRouter

// Endpoint para obtener información del usuario autenticado (usado por profile-setup)
authRouter.get('/me', verifyToken, async (req: any, res: any) => {
  try {
    console.log('Usuario en req.user:', req.user);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, firstName: true, lastName: true, role: true, googleId: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ user });
  } catch (error) {
    console.error('Error en /auth/me', error);
    res.status(500).json({ error: 'Error interno' });
  }
});