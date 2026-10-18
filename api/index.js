import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import { verifyToken } from './middleware/auth.js';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { getPrisma } from './prisma.js';
import { envValue, getJwtSecret, getMasterPassword } from './env.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// Vercel rewrites /api/(.*) to this function file. Restore the original
// /api/... path for the express router regardless of the rewrite form.
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '/api');
  }
  next();
});

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) return null;
  return createClient(url, key);
}

async function verifyDatabaseConnection() {
  const prisma = getPrisma();
  if (prisma) {
    try {
      const schemaVersion = await prisma.settings.findFirst();
      return { configured: true, verified: true, method: 'prisma', schemaReady: true, schemaVersion };
    } catch (err) {
      console.warn('Prisma verification failed, checking database reachability:', err.message);
      try {
        await prisma.$queryRaw`SELECT 1`;
        // Database itself is reachable, but schema tables are not ready yet
        return {
          configured: true,
          verified: true,
          method: 'prisma',
          schemaReady: false,
          hint: 'Database is reachable, but tables are missing. Run `npx prisma db push` to push the schema.',
          error: err.message
        };
      } catch (dbErr) {
        throw new Error(`Database connection failed: ${dbErr.message}`);
      }
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    // Nothing configured — this is a supported state (local-first mode).
    // Report it explicitly instead of failing so the client can inform the user.
    return {
      configured: false,
      verified: false,
      method: 'none',
      schemaReady: false,
      hint: 'No database configured. Vertex will run in local-only mode (data stays in this browser). Set DATABASE_URL in .env to enable cloud sync.',
    };
  }

  // Prisma creates quoted "Settings"; PostgREST also accepts lowercase.
  // Reachability check — a missing table still proves auth + network work.
  const { error: pingError } = await supabase.from('_vertex_connection_test').select('*').limit(1);
  if (
    pingError &&
    !pingError.message.includes('Could not find') &&
    pingError.code !== 'PGRST205'
  ) {
    throw new Error(`Supabase connection failed: ${pingError.message}`);
  }

  const { error: settingsError } = await supabase.from('settings').select('schema_version').limit(1);
  const schemaReady = !settingsError;

  return {
    configured: true,
    verified: true,
    method: 'supabase',
    schemaReady,
    ...(schemaReady ? {} : { hint: 'Run `npx prisma db push` after setting DATABASE_URL in .env.' }),
  };
}

// Baseline security headers for all API responses.
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Referrer-Policy', 'no-referrer');
  next();
});

// CORS: same-origin by default — no headers are needed. Set CORS_ORIGINS
// (comma-separated allowlist) only when the API is called from another origin.
const allowedOrigins = envValue('CORS_ORIGINS')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = origin && allowedOrigins.includes(origin);

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(isAllowed || !origin ? 200 : 403);
  }
  next();
});

const api = express.Router();

/** Constant-time string comparison — avoids leaking the master key via timing. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// ==========================================
// AUTHENTICATION
// ==========================================

api.post('/auth/login', (req, res) => {
  try {
    const masterPassword = getMasterPassword();
    const jwtSecret = getJwtSecret();

    // Fail closed: in production, missing or placeholder secrets disable login
    // entirely instead of falling back to shipped defaults.
    if (!masterPassword || !jwtSecret) {
      console.error('[vertex] Auth is not configured. Set MASTER_PASSWORD and JWT_SECRET in the deployment environment.');
      return res.status(503).json({
        error: { code: 'SERVER_MISCONFIGURED', message: 'Server authentication is not configured. Contact the administrator.' },
      });
    }

    const password = String(req.body?.password ?? '').trim();
    if (!password || !safeEqual(password, masterPassword)) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid Master Key' } });
    }

    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '30d' });
    res.json({ data: { token } });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ==========================================
// SYSTEM (public during initial setup — runs before login)
// ==========================================

api.get('/system/verify', async (req, res) => {
  try {
    const result = await verifyDatabaseConnection();
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({
      error: { code: 'DB_VERIFY_FAILED', message: err.message },
    });
  }
});

api.post('/system/seed', async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.json({ data: { seeded: true, method: 'client' } });
    }

    try {
      const existing = await prisma.client.count();
      if (existing === 0) {
        const client = await prisma.client.create({
          data: {
            name: 'Acme Design Co',
            email: 'hello@acme.design',
            company: 'Acme Design Co',
            status: 'Active',
          },
        });

        await prisma.project.create({
          data: {
            client_id: client.id,
            name: 'Brand Refresh',
            status: 'In Progress',
          },
        });
      }
      res.json({ data: { seeded: true, method: 'prisma' } });
    } catch (err) {
      console.warn('Prisma seeding failed, falling back to client-side seed:', err.message);
      // Fallback gracefully to client-side seeding if DB tables are not migrated
      res.json({
        data: {
          seeded: true,
          method: 'client',
          warning: 'Prisma seeding failed (tables might be missing). Fell back to client-side demo data.',
          error: err.message
        }
      });
    }
  } catch (err) {
    res.status(500).json({
      error: { code: 'SEED_FAILED', message: err.message },
    });
  }
});

// ==========================================
// PROTECTED ROUTES
// ==========================================

api.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.json({ data: { projectsCount: 0 } });
    }
    const projectsCount = await prisma.project.count({ where: { status: 'In Progress' } });
    res.json({ data: { projectsCount } });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

app.use('/api', api);

export default app;
