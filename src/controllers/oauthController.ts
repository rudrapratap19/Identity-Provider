import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { verifyPassword, hashPassword, generateAuthCode, signToken, verifyToken } from '../utils/crypto';
import { saveAuthCode, getAndDeleteAuthCode } from '../services/authCode.service';
import crypto from 'crypto';

export const authorizeGet = async (req: Request, res: Response): Promise<void> => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;

  const client = await prisma.client.findUnique({ where: { clientId: client_id as string } });
  
  if (!client) {
    res.status(400).json({ error: 'invalid_client', error_description: 'Client not found' });
    return;
  }

  if (!client.redirectUris.includes(redirect_uri as string)) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Invalid redirect URI' });
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login & Consent</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; padding-top: 50px; background: #f4f4f5; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        h2 { margin-top: 0; }
        .form-group { margin-bottom: 1rem; }
        label { display: block; margin-bottom: 0.5rem; }
        input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 0.75rem; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        button:hover { background: #0051a8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Sign in to continue to ${client.name}</h2>
        <p>${client.name} is requesting access to your account.</p>
        <form action="/oauth/authorize" method="POST">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="state" value="${state}">
          <input type="hidden" name="scope" value="${scope || ''}">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" name="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" name="password" id="password" required>
          </div>
          <button type="submit">Approve & Sign In</button>
        </form>
        <p style="text-align: center; margin-top: 1rem;">
          Don't have an account? <a href="/oauth/signup?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri as string)}&state=${state}&response_type=${response_type}&scope=${scope || ''}">Sign Up</a>
        </p>
      </div>
    </body>
    </html>
  `;

  res.send(html);
};

export const authorizePost = async (req: Request, res: Response): Promise<void> => {
  const { email, password, client_id, redirect_uri, state, scope } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing credentials' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'access_denied', error_description: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'access_denied', error_description: 'Invalid credentials' });
      return;
    }

    const client = await prisma.client.findUnique({ where: { clientId: client_id } });
    if (!client || !client.redirectUris.includes(redirect_uri)) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Invalid client or redirect URI' });
      return;
    }

    const requestedScopes = scope ? scope.split(' ') : [];
    await prisma.grant.create({
      data: {
        userId: user.id,
        clientId: client.id,
        scopes: requestedScopes
      }
    });

    const code = generateAuthCode();
    await saveAuthCode(code, {
      userId: user.id,
      clientId: client.clientId,
      redirectUri: redirect_uri,
      scopes: requestedScopes
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    redirectUrl.searchParams.append('state', state);

    res.redirect(302, redirectUrl.toString());
  } catch (error) {
    console.error('Authorize error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

export const tokenExchange = async (req: Request, res: Response): Promise<void> => {
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token } = req.body;

  if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
    res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Unsupported grant type' });
    return;
  }

  if (!client_id || !client_secret) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing client credentials' });
    return;
  }

  try {
    const client = await prisma.client.findUnique({ where: { clientId: client_id } });
    if (!client) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed' });
      return;
    }

    const isValidSecret = await verifyPassword(client_secret, client.clientSecretHash);
    if (!isValidSecret) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed' });
      return;
    }

    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
        return;
      }

      const authCodeData = await getAndDeleteAuthCode(code);
      if (!authCodeData) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
        return;
      }

      if (authCodeData.redirectUri !== redirect_uri || authCodeData.clientId !== client_id) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Redirect URI or Client ID mismatch' });
        return;
      }

      const accessToken = signToken({
        sub: authCodeData.userId,
        aud: client_id,
        scope: authCodeData.scopes.join(' ')
      }, process.env.JWT_EXPIRES_IN || '1h');

      const plainRefreshToken = `rt_${crypto.randomBytes(32).toString('hex')}`;
      const tokenHash = crypto.createHash('sha256').update(plainRefreshToken).digest('hex');
      const familyId = crypto.randomUUID();

      await prisma.refreshToken.create({
        data: {
          tokenHash,
          familyId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          userId: authCodeData.userId,
          clientId: client.id
        }
      });

      res.status(200).json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: plainRefreshToken,
        scope: authCodeData.scopes.join(' ')
      });
      return;
    }

    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        res.status(400).json({ error: 'invalid_request', error_description: 'Missing refresh token' });
        return;
      }

      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      const rtRecord = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true, client: true }
      });

      if (!rtRecord) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid refresh token' });
        return;
      }

      // Reuse detection
      if (rtRecord.isRevoked) {
        // Token was already used/revoked. Revoke the entire family to protect the account!
        await prisma.refreshToken.updateMany({
          where: { familyId: rtRecord.familyId },
          data: { isRevoked: true }
        });
        console.warn(`[SECURITY] Refresh token reuse detected for family ${rtRecord.familyId}. Family revoked.`);
        res.status(400).json({ error: 'invalid_grant', error_description: 'Token reuse detected. Session terminated.' });
        return;
      }

      if (rtRecord.expiresAt < new Date()) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token expired' });
        return;
      }

      // Valid token. Rotate it by revoking the old one and creating a new one.
      await prisma.refreshToken.update({
        where: { id: rtRecord.id },
        data: { isRevoked: true }
      });

      // Get scopes from grants
      const grant = await prisma.grant.findFirst({
        where: { userId: rtRecord.userId, clientId: rtRecord.clientId }
      });

      const scopes = grant?.scopes.join(' ') || '';

      const accessToken = signToken({
        sub: rtRecord.userId,
        aud: client_id,
        scope: scopes
      }, process.env.JWT_EXPIRES_IN || '1h');

      const plainNewRefreshToken = `rt_${crypto.randomBytes(32).toString('hex')}`;
      const newHash = crypto.createHash('sha256').update(plainNewRefreshToken).digest('hex');

      await prisma.refreshToken.create({
        data: {
          tokenHash: newHash,
          familyId: rtRecord.familyId, // Maintain family lineage
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: rtRecord.userId,
          clientId: rtRecord.clientId
        }
      });

      res.status(200).json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: plainNewRefreshToken,
        scope: scopes
      });
      return;
    }

  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

export const userinfo = async (req: any, res: Response): Promise<void> => {
  const payload = req.user;
  
  if (!payload || !payload.sub) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Invalid token payload' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'invalid_token', error_description: 'User not found' });
      return;
    }

    res.status(200).json({
      sub: user.id,
      email: user.email,
      email_verified: true
    });
  } catch (error) {
    console.error('Userinfo error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

export const revoke = async (req: Request, res: Response): Promise<void> => {
  const { token, client_id, client_secret } = req.body;

  if (!token || !client_id || !client_secret) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
    return;
  }

  try {
    const client = await prisma.client.findUnique({ where: { clientId: client_id } });
    if (!client) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed' });
      return;
    }

    const isValidSecret = await verifyPassword(client_secret, client.clientSecretHash);
    if (!isValidSecret) {
      res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed' });
      return;
    }

    // Decode token without verifying signature just to get JTI and expiration
    // (If the token is forged, its JTI gets blacklisted anyway, which is harmless)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token) as any;

    if (decoded && decoded.jti && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remainingTTL = decoded.exp - now;
      if (remainingTTL > 0) {
        const { redis } = require('../config/redis');
        await redis.set(`revoked_token:${decoded.jti}`, 'true', 'EX', remainingTTL);
      }
    }

    res.status(200).json({ message: 'Token revoked successfully' });
  } catch (error) {
    console.error('Revoke error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

export const signupGet = async (req: Request, res: Response): Promise<void> => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;

  const client = await prisma.client.findUnique({ where: { clientId: client_id as string } });
  
  if (!client || !client.redirectUris.includes(redirect_uri as string)) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Invalid client or redirect URI' });
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign Up</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; padding-top: 50px; background: #f4f4f5; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
        h2 { margin-top: 0; }
        .form-group { margin-bottom: 1rem; }
        label { display: block; margin-bottom: 0.5rem; }
        input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 0.75rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
        button:hover { background: #218838; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Create an Account</h2>
        <p>Sign up to continue to ${client.name}.</p>
        <form action="/oauth/signup" method="POST">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="state" value="${state}">
          <input type="hidden" name="response_type" value="${response_type}">
          <input type="hidden" name="scope" value="${scope || ''}">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" name="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" name="password" id="password" required>
          </div>
          <button type="submit">Sign Up & Authorize</button>
        </form>
        <p style="text-align: center; margin-top: 1rem;">
          Already have an account? <a href="/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri as string)}&state=${state}&response_type=code&scope=${scope || ''}">Log In</a>
        </p>
      </div>
    </body>
    </html>
  `;

  res.send(html);
};

export const signupPost = async (req: Request, res: Response): Promise<void> => {
  const { email, password, client_id, redirect_uri, state, scope } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing credentials' });
    return;
  }

  try {
    const client = await prisma.client.findUnique({ where: { clientId: client_id } });
    if (!client || !client.redirectUris.includes(redirect_uri)) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Invalid client or redirect URI' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).send('User already exists. Please go back and log in.');
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash }
    });

    const requestedScopes = scope ? scope.split(' ') : [];
    await prisma.grant.create({
      data: {
        userId: user.id,
        clientId: client.id,
        scopes: requestedScopes
      }
    });

    const code = generateAuthCode();
    await saveAuthCode(code, {
      userId: user.id,
      clientId: client.clientId,
      redirectUri: redirect_uri,
      scopes: requestedScopes
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    redirectUrl.searchParams.append('state', state);

    res.redirect(302, redirectUrl.toString());
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

