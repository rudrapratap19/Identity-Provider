import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load variables from demo/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const IDP_URL = process.env.IDP_URL || 'http://localhost:3000'; // For browser redirects
const IDP_SERVER_URL = process.env.IDP_SERVER_URL || IDP_URL; // For server-to-server API calls
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// In-memory session store for simplicity
const sessions: Record<string, { state: string, token?: any, user?: any }> = {};

app.use(express.json());

// Home page
app.get('/', (req, res) => {
  const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
  const session = sessionId ? sessions[sessionId] : null;

  if (session && session.user) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Demo Consumer App</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; background: #f4f4f5; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: auto; }
          pre { background: #eee; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Welcome, ${session.user.email}</h2>
          <p>You have successfully logged in via the Custom Identity Provider.</p>
          <h3>User Profile:</h3>
          <pre>${JSON.stringify(session.user, null, 2)}</pre>
          <h3>Token Payload:</h3>
          <pre>${JSON.stringify(session.token, null, 2)}</pre>
          <a href="/logout">Log Out</a>
        </div>
      </body>
      </html>
    `);
    return;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Demo Consumer App</title>
      <style>
        body { font-family: sans-serif; display: flex; justify-content: center; padding-top: 50px; background: #f4f4f5; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        a.button { display: inline-block; padding: 1rem 2rem; background: #0070f3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
        a.button:hover { background: #0051a8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Demo Consumer App</h2>
        <p>This is a third-party application.</p>
        <a class="button" href="/login">Sign in with Custom IdP</a>
      </div>
    </body>
    </html>
  `);
});

// Initiate Login
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const sessionId = crypto.randomUUID();
  sessions[sessionId] = { state };
  
  res.cookie('sessionId', sessionId, { httpOnly: true });

  const authUrl = new URL(`${IDP_URL}/oauth/authorize`);
  authUrl.searchParams.append('client_id', CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);

  res.redirect(authUrl.toString());
});

// OAuth Callback
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    res.send(`Error from IdP: ${error}`);
    return;
  }

  const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
  const session = sessionId ? sessions[sessionId] : null;

  if (!session || session.state !== state) {
    res.status(400).send('Invalid state parameter. CSRF protection failed.');
    return;
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(`${IDP_SERVER_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      res.status(400).send(`Token exchange failed: ${JSON.stringify(errData)}`);
      return;
    }

    const tokenData = await tokenResponse.json();
    session.token = tokenData;

    // Fetch User Profile
    const userinfoResponse = await fetch(`${IDP_SERVER_URL}/oauth/userinfo`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!userinfoResponse.ok) {
      res.status(400).send('Failed to fetch user info');
      return;
    }

    const userData = await userinfoResponse.json();
    session.user = userData;

    res.redirect('/');
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send('Internal server error during callback');
  }
});

// Logout
app.get('/logout', async (req, res) => {
  const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
  if (sessionId && sessions[sessionId]) {
    const tokenData = sessions[sessionId].token;
    delete sessions[sessionId];
    res.clearCookie('sessionId');

    // Optionally revoke the token at the IdP
    if (tokenData?.access_token) {
      try {
        await fetch(`${IDP_SERVER_URL}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: tokenData.access_token,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
          })
        });
      } catch (e) {
        console.error('Revocation failed', e);
      }
    }
  }
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Demo Consumer App running on http://localhost:${PORT}`);
});
