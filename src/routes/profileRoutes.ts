import { Router } from 'express';
import { updateProfile, getProfile } from '../controller/profileController';
import { verifySchema } from '../middleware/validateSchema';
import { profileSchema } from '../model/User/profileSchema';
import prisma from '../config/database';
import verifyToken from '../middleware/jwt/verifyToken';
import createToken from '../middleware/jwt/createToken';

const profileRouter = Router();

// Proteger rutas de perfil con verificación de token
profileRouter.use(verifyToken);

// Obtener perfil del usuario actual
profileRouter.get('/', getProfile);

// Actualizar perfil con validación de esquema
profileRouter.put('/', verifySchema(profileSchema), updateProfile);
profileRouter.post('/complete-profile', async (req, res) => {
    try {
    const { fullName, role, studentId, specialization, email } = req.body;
        
        console.log('Datos recibidos:', { fullName, role, email });
        
        // Obtener usuario actual para usar email existente si no se envía
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!currentUser) return res.status(404).json({ error: 'Usuario no encontrado' });

        const finalEmail = email || currentUser.email;

        // Validar datos requeridos (email ahora opcional si ya existe)
        if (!fullName || !role) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        if (!finalEmail) {
            return res.status(400).json({ error: 'Email requerido' });
        }

        // Validar rol
        if (!['TUTOR', 'ALUMNO'].includes(role)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        // Actualizar usuario autenticado

    // Lógica de estado: ambos roles requieren aprobación
    const newStatus = 'PENDING'

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                role,
                firstName: fullName.split(' ')[0],
                lastName: fullName.split(' ').slice(1).join(' '),
                email: finalEmail,
                profileComplete: true,
                status: newStatus
            }
        });

        // Para cuentas en PENDING no emitir token y limpiar cookie si existiera
    if (user.status !== 'APPROVED') {
            // Limpiar cookie existente (si llegó de Google callback)
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            })

            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    status: user.status,
                    profileComplete: user.profileComplete,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                }
            })
        }

        // Si eventualmente el flujo emite APPROVED, emitir token y cookie
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            status: user.status,
            profileComplete: user.profileComplete,
            googleId: user.googleId ?? undefined
        }
        const token = createToken(tokenPayload, '1h')
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 3600000
        })
        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                profileComplete: user.profileComplete,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        })
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error actualizando perfil' });
    }
});

export default profileRouter;