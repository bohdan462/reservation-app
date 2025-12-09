import { Router } from 'express';
import { WaitlistController } from './waitlist.controller';

const router = Router();
const controller = new WaitlistController();

router.post('/', controller.createEntry);
router.get('/', controller.getEntries);
router.get('/:id', controller.getEntryById);
router.patch('/:id', controller.updateEntry);

export default router;
