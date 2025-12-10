import { Router } from 'express';
import { ReservationController } from './reservation.controller';

const router = Router();
const controller = new ReservationController();

router.post('/', controller.createReservation);
router.get('/', controller.getReservations);
router.get('/:id', controller.getReservationById);
router.get('/:id/history', controller.getHistory);
router.patch('/:id', controller.updateReservation);
router.delete('/:id', controller.deleteReservation);
router.post('/:id/cancel', controller.cancelReservation);

// Guest-facing cancellation route (no /api prefix)
export const cancelRouter = Router();
cancelRouter.get('/cancel/:cancelToken', controller.cancelByToken);

export default router;
