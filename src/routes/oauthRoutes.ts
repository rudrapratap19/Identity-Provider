import { Router } from 'express';
import { authorizeGet, authorizePost, tokenExchange, userinfo, revoke, signupGet, signupPost } from '../controllers/oauthController';
import { validateAuthorizeParams } from '../middleware/validationMiddleware';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/authorize', validateAuthorizeParams, authorizeGet);
router.post('/authorize', validateAuthorizeParams, authorizePost);
router.get('/signup', validateAuthorizeParams, signupGet);
router.post('/signup', validateAuthorizeParams, signupPost);
router.post('/token', tokenExchange);
router.post('/revoke', revoke);
router.get('/userinfo', requireAuth, userinfo);

export default router;
