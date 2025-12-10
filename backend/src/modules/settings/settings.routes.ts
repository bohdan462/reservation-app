import { Router } from 'express';
import { SettingsController } from './settings.controller';

const router = Router();
const controller = new SettingsController();

router.get('/', controller.getSettings);
router.post('/', controller.updateSettings);

export default router;
