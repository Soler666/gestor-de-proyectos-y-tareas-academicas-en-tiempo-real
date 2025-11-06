import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../config/database';

import { config } from '../config/config';

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
      passReqToCallback: true
    },
    async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
      console.log('Google profile received:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails,
        photos: profile.photos
      });
      try {
        console.log('Iniciando proceso de autenticación de Google...');
        console.log('Buscando usuario existente por googleId:', profile.id);
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (user) {
          console.log('Usuario encontrado, actualizando tokens...');
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleAccessToken: accessToken,
              googleRefreshToken: refreshToken,
              googleTokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hora
            },
          });
          console.log('Tokens actualizados correctamente');
        } else {
            // Buscar por email si no existe googleId
          console.log('Buscando usuario por email/username...');
          const existingUser = await prisma.user.findFirst({
            where: {
                email: profile.emails?.[0]?.value,
            },
          });
          console.log('Resultado de búsqueda por email/username:', existingUser ? 'encontrado' : 'no encontrado');

          if (existingUser) {
            // Vincular cuenta existente con Google
            user = await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: profile.id,
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken,
                googleTokenExpiry: new Date(Date.now() + 3600 * 1000),
              },
            });
          } else {
            // Crear nuevo usuario
            console.log('Creando nuevo usuario con datos de Google...');
              const names = profile.displayName.split(' ');
              const firstName = names[0];
              const lastName = names.slice(1).join(' ');
            user = await prisma.user.create({
              data: {
                  username: profile.emails?.[0]?.value.split('@')[0], // Usar la parte antes del @ como username
                  email: profile.emails?.[0]?.value,
                  firstName: firstName,
                  lastName: lastName || null,
                  role: 'ALUMNO', // Rol por defecto
                  profileComplete: false, // El usuario necesitará completar su perfil
                password: '', // No necesita password para login con Google
                googleId: profile.id,
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken,
                googleTokenExpiry: new Date(Date.now() + 3600 * 1000),
              },
            });
            console.log('Nuevo usuario creado exitosamente:', user.id);
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('Error en el proceso de autenticación de Google:', error);
        if (error instanceof Error) {
          console.error('Detalles del error:', {
            message: error.message,
            stack: error.stack
          });
        }
        return done(error, undefined);
      }
    }
  )
);

// Serialización para sesiones (si usas express-session)
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
