import { Router } from 'express';
import { PublicController } from './public.controller';

const router = Router();
const controller = new PublicController();

// Public guest management routes (token-based)
router.get('/reservations/:token', controller.getByToken);
router.patch('/reservations/:token', controller.updateByToken);
router.post('/reservations/:token/cancel', controller.cancelByToken);

export default router;
