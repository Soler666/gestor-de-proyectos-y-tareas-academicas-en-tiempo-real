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
router.post('/', createReminder);
router.get('/', getUserReminders);
router.get('/:id', getReminderById);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);

// Legacy endpoints for backward compatibility
router.post('/schedule', scheduleReminder);
router.delete('/job/:jobId', cancelReminder);

// Obtener estado del servicio de recordatorios
router.get('/status', getReminderStatus);

export default router;
