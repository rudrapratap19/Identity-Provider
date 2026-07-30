import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './config/db';
import userRoutes from './routes/userRoutes';
import clientRoutes from './routes/clientRoutes';
import oauthRoutes from './routes/oauthRoutes';

dotenv.config();

export const app = express();

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like mobile apps, curl, server-to-server) or allowed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 3. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Rate Limiting for Auth & Token Endpoints to prevent Brute-Force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'too_many_requests', error_description: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/oauth/token', authLimiter);
app.use('/api/users/login', authLimiter);

// 5. Routes
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/oauth', oauthRoutes);

app.get('/', (req, res) => {
  const issuer = process.env.ISSUER_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  
  res.json({
    name: 'Enterprise Identity Provider API',
    version: '1.0.0',
    status: 'running',
    issuer,
    frontendUrl,
    endpoints: {
      health: '/health',
      users: '/api/users',
      clients: '/api/clients',
      oauth: '/oauth'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});
