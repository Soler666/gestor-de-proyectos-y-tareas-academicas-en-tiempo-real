import { Router } from 'express';
import {
  createReminder,
  getUserReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  scheduleReminder,
  cancelReminder,
  getReminderStatus,
} from '../controller/reminderController';
import verifyToken from '../middleware/jwt/verifyToken';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// CRUD operations for reminders
router.post('/', createReminder as any);
router.get('/', getUserReminders as any);
router.get('/:id', getReminderById as any);
router.put('/:id', updateReminder as any);
router.delete('/:id', deleteReminder as any);

// Legacy endpoints for backward compatibility
router.post('/schedule', scheduleReminder as any);
router.delete('/job/:jobId', cancelReminder as any);

// Obtener estado del servicio de recordatorios
router.get('/status', getReminderStatus as any);

export default router;
