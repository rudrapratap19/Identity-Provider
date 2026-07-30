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

// 1. Security Headers (Helmet configured to permit landing page styling)
app.use(helmet({
  contentSecurityPolicy: false,
}));

// 2. Cross-Origin Resource Sharing (CORS)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
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

// 4. Rate Limiting for Auth & Token Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

// Root landing portal
app.get('/', (req, res) => {
  const issuer = process.env.ISSUER_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  
  // Return JSON if requested via API client/curl/Accept header
  if (req.headers.accept?.includes('application/json')) {
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
    return;
  }

  // HTML Landing Page for Browser Visitors
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Enterprise Identity Provider API</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          --card-bg: rgba(255, 255, 255, 0.04);
          --card-border: rgba(255, 255, 255, 0.1);
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --accent: #6366f1;
          --accent-hover: #4f46e5;
          --success: #34d399;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Outfit', sans-serif;
          background: var(--bg-gradient);
          color: var(--text-primary);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .container {
          width: 100%;
          max-width: 900px;
          background: var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          padding: 3rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          background: rgba(52, 211, 153, 0.15);
          color: var(--success);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }
        .dot {
          width: 8px;
          height: 8px;
          background: var(--success);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--success);
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(to right, #c7d2fe, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p.subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin-bottom: 2.5rem;
        }
        .btn-group {
          display: flex;
          gap: 1rem;
          margin-bottom: 3rem;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--accent);
          color: white;
        }
        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.08);
          color: var(--text-primary);
          border: 1px solid var(--card-border);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }
        .card {
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--card-border);
          padding: 1.25rem;
          border-radius: 14px;
        }
        .card h3 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 0.5rem;
        }
        .card p {
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-family: 'JetBrains Mono', monospace;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid var(--card-border);
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">
          <div class="dot"></div>
          System Operational • v1.0.0
        </div>
        
        <h1>Enterprise Identity Provider API</h1>
        <p class="subtitle">Secure OAuth 2.0 & OpenID Connect Authorization Server with RS256 JWT Token Engine.</p>

        <div class="btn-group">
          <a href="${frontendUrl}" target="_blank" class="btn btn-primary">
            Launch Admin Dashboard ↗
          </a>
          <a href="/health" class="btn btn-secondary">
            Health Check
          </a>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Authorization Endpoint</h3>
            <p>GET /oauth/authorize</p>
          </div>
          <div class="card">
            <h3>Token Exchange</h3>
            <p>POST /oauth/token</p>
          </div>
          <div class="card">
            <h3>User Info Endpoint</h3>
            <p>GET /oauth/userinfo</p>
          </div>
          <div class="card">
            <h3>Public Keys (JWKS)</h3>
            <p>GET /oauth/jwks.json</p>
          </div>
        </div>

        <div class="footer">
          <span>Issuer: <code>${issuer}</code></span>
          <span>OAuth 2.0 / OIDC Compliant</span>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});
