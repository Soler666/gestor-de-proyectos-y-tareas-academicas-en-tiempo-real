import { Router, Response, NextFunction, Request } from 'express';
import { login, register } from '../controller/authController'
import { verifySchema } from '../middleware/validateSchema'
import { userSchema, loginSchema } from '../model/User/userModel'
import passport from '../service/googleAuthService'
import prisma from '../config/database'
import verifyToken from '../middleware/jwt/verifyToken'
import createToken from '../middleware/jwt/createToken'
import { config } from '../config/config'

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
      failureRedirect: `https://simback.netlify.app/?error=google_auth_failed`,
      failureMessage: true
    }, async (err: any, user: any, info: any) => {
      if (err) {
        console.error('Error en autenticación de Google:', err);
        return res.redirect(`https://simback.netlify.app/?error=${encodeURIComponent(err.message)}`);
      }

      if (!user) {
        console.error('No se encontró usuario:', info);
        return res.redirect(`https://simback.netlify.app/?error=no_user`);
      }

      try {
        console.log('Usuario autenticado:', user);
        
        // PRIORIDAD: si el perfil NO está completo, enviar al flujo de completado sin bloquear por status
        if (user.profileComplete === false) {
          const setupPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            status: user.status, // puede estar en PENDING inicial
            googleId: user.googleId,
            profileComplete: false,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
          const setupToken = createToken(setupPayload, '1h')
          res.cookie('token', setupToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 3600000
          })
          return res.redirect(`https://simback.netlify.app/profile-setup?token=${setupToken}`)
        }

        // Solo aplicar restricciones de estado cuando el perfil ya está completo
        if (user.status === 'PENDING') {
          return res.redirect(`https://simback.netlify.app/?error=${encodeURIComponent('Tu cuenta está pendiente de aprobación por un administrador')}&code=ACCOUNT_PENDING_APPROVAL`);
        }
        if (user.status === 'REJECTED') {
          return res.redirect(`https://simback.netlify.app/?error=${encodeURIComponent('Tu cuenta ha sido rechazada. Contacta al soporte para más información')}&code=ACCOUNT_REJECTED`);
        }
        if (user.status !== 'APPROVED') {
          return res.redirect(`https://simback.netlify.app/?error=${encodeURIComponent('Tu cuenta no está disponible. Contacta al soporte')}&code=ACCOUNT_UNAVAILABLE`);
        }

        const payload = {
          id: user.id,
            username: user.username,
            role: user.role,
            status: user.status,
            googleId: user.googleId,
            profileComplete: true,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        }
        const token = createToken(payload, '1h')
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 3600000
        })
        return res.redirect(`https://simback.netlify.app/?token=${token}&userId=${user.id}&username=${encodeURIComponent(user.username)}&role=${user.role}`)
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