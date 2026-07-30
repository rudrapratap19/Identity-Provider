import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '../src/config/db';
import { hashPassword, generateClientCredentials } from '../src/utils/crypto';
import fs from 'fs';

async function setup() {
  try {
    console.log('Seeding test user...');
    const userEmail = 'test@example.com';
    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          passwordHash: await hashPassword('password123'),
        }
      });
      console.log('Created test user:', user.email);
    } else {
      console.log('Test user already exists.');
    }

    console.log('Registering Demo Application client...');
    const { clientId, clientSecret } = generateClientCredentials();
    const client = await prisma.client.create({
      data: {
        name: 'Demo Consumer App',
        clientId,
        clientSecretHash: await hashPassword(clientSecret),
        redirectUris: ['http://localhost:4000/callback']
      }
    });

    console.log('Successfully registered client!');
    console.log('Client ID:', clientId);
    console.log('Client Secret:', clientSecret);

    // Save credentials to demo/.env so the demo app can use them
    const envContent = `CLIENT_ID=${clientId}\nCLIENT_SECRET=${clientSecret}\nIDP_URL=http://localhost:3000\nPORT=4000\n`;
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('Saved credentials to demo/.env');

  } catch (err) {
    console.error('Setup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
