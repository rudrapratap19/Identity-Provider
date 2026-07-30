import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { hashPassword, verifyPassword, signToken } from '../utils/crypto';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Email and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, createdAt: user.createdAt }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Invalid credentials' });
      return;
    }

    // Account Lockout Check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(403).json({ error: 'access_denied', error_description: 'Account is locked due to too many failed attempts. Try again later.' });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockedUntil }
      });
      res.status(401).json({ error: 'invalid_client', error_description: 'Invalid credentials' });
      return;
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
      });
    }

    // Generate IdP session token
    const token = signToken({ sub: user.id, email: user.email }, process.env.JWT_EXPIRES_IN || '1h');
    
    // Audit Log
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'USER_LOGIN', ipAddress: req.ip }
    });

    res.status(200).json({
      message: 'Authentication successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};
