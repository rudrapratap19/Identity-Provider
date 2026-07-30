import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { generateClientCredentials, hashPassword } from '../utils/crypto';

export const registerClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, redirectUris } = req.body;

    if (!name || !Array.isArray(redirectUris) || redirectUris.length === 0) {
      res.status(400).json({ error: 'invalid_request', error_description: 'Name and a non-empty array of redirectUris are required' });
      return;
    }

    // Generate credentials
    const { clientId, clientSecret: rawSecret } = generateClientCredentials();
    const clientSecretHash = await hashPassword(rawSecret);

    // Save to DB
    const client = await prisma.client.create({
      data: {
        name,
        clientId,
        clientSecretHash,
        redirectUris
      }
    });

    res.status(201).json({
      message: 'Client registered successfully',
      client: {
        id: client.id,
        name: client.name,
        clientId: client.clientId,
        clientSecret: rawSecret, // Return raw secret ONLY ONCE
        redirectUris: client.redirectUris,
        createdAt: client.createdAt
      }
    });
  } catch (error) {
    console.error('Client registration error:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};

export const getClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        clientId: true,
        name: true,
        redirectUris: true,
        createdAt: true
      }
    });
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
  }
};
