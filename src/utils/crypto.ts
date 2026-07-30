import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const SALT_ROUNDS = 10;

// Load RSA Keys with support for environment variables in Production
const getPrivateKey = (): string => {
  if (process.env.RSA_PRIVATE_KEY) {
    return process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  const privateKeyPath = path.join(__dirname, '../../private_key.pem');
  return fs.readFileSync(privateKeyPath, 'utf8');
};

const getPublicKey = (): string => {
  if (process.env.RSA_PUBLIC_KEY) {
    return process.env.RSA_PUBLIC_KEY.replace(/\\n/g, '\n');
  }
  const publicKeyPath = path.join(__dirname, '../../public_key.pem');
  return fs.readFileSync(publicKeyPath, 'utf8');
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const generateClientCredentials = () => {
  const clientId = `client_${crypto.randomBytes(12).toString('hex')}`;
  const clientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
  return { clientId, clientSecret };
};

export const generateAuthCode = () => {
  return `ac_${crypto.randomBytes(24).toString('hex')}`;
};

export const signToken = (payload: object, expiresIn: string | number): string => {
  const jwtid = crypto.randomUUID();
  const issuer = process.env.ISSUER_URL || 'http://localhost:3000';
  return jwt.sign(payload, getPrivateKey(), { 
    algorithm: 'RS256', 
    expiresIn: expiresIn as any, 
    jwtid,
    issuer 
  });
};

export const verifyToken = (token: string) => {
  const issuer = process.env.ISSUER_URL || 'http://localhost:3000';
  return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'], issuer });
};

export { getPublicKey };
