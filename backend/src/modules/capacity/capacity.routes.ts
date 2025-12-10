import { Router } from 'express';
import { CapacityController } from './capacity.controller';

const router = Router();
const controller = new CapacityController();

router.post('/evaluate', controller.evaluate);
router.get('/slots', controller.getSlots);

export default router;
