import { Router } from 'express';
import { registerClient, getClients } from '../controllers/clientController';

const router = Router();

router.post('/register', registerClient);
router.get('/', getClients);

export default router;
