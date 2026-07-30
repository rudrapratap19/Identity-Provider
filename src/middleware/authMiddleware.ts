import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/crypto';
import { redis } from '../config/redis';

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid Bearer token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token) as any;
    
    if (!payload || !payload.sub) {
      res.status(401).json({ error: 'invalid_token', error_description: 'Invalid token payload' });
      return;
    }

    // Check Redis for token revocation via JTI (JWT ID)
    if (payload.jti) {
      const isRevoked = await redis.exists(`revoked_token:${payload.jti}`);
      if (isRevoked) {
        res.status(401).json({ error: 'invalid_token', error_description: 'Token has been revoked' });
        return;
      }
    }

    // Attach user payload to request
    req.user = payload;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'invalid_token', error_description: 'Token verification failed' });
  }
};
