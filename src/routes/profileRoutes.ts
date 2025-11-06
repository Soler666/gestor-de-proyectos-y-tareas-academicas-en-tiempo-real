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
        
        // Validar datos requeridos
        if (!fullName || !role || !email) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Validar rol
        if (!['TUTOR', 'ALUMNO'].includes(role)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }

        // Actualizar usuario autenticado
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                role,
                firstName: fullName.split(' ')[0],
                lastName: fullName.split(' ').slice(1).join(' '),
                email,
                profileComplete: true
            }
        });

        // Generar nuevo token con el rol actualizado
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            googleId: user.googleId ?? undefined
        };
        console.log('Generando nuevo token después de actualizar perfil. Payload:', tokenPayload);
        const token = createToken(tokenPayload, '1h');
        console.log('Nuevo token generado:', token);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: 'Error actualizando perfil' });
    }
});

export default profileRouter;