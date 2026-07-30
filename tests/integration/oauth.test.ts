import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/db';

describe('OAuth Integration Tests', () => {
  beforeAll(async () => {
    // Ensure DB is clean or setup test client
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should reject invalid client on token exchange', async () => {
    const res = await request(app)
      .post('/oauth/token')
      .send({
        grant_type: 'authorization_code',
        code: 'invalid_code',
        redirect_uri: 'http://localhost/callback',
        client_id: 'invalid_client',
        client_secret: 'invalid_secret'
      });
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_client');
  });
});
