import { redis } from '../config/redis';

interface AuthCodePayload {
  userId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

const AUTH_CODE_TTL = 300; // 5 minutes

export const saveAuthCode = async (code: string, payload: AuthCodePayload): Promise<void> => {
  const key = `auth_code:${code}`;
  await redis.set(key, JSON.stringify(payload), 'EX', AUTH_CODE_TTL);
};

export const getAndDeleteAuthCode = async (code: string): Promise<AuthCodePayload | null> => {
  const key = `auth_code:${code}`;
  
  // Use getdel to atomically read and delete the key for single-use guarantee
  const dataStr = await redis.getdel(key);
  
  if (!dataStr) {
    return null;
  }
  
  try {
    return JSON.parse(dataStr) as AuthCodePayload;
  } catch (error) {
    console.error('Error parsing auth code payload', error);
    return null;
  }
};
