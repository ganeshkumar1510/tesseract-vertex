import 'dotenv/config';
import express from 'express';
import { verifyToken } from './middleware/auth.js';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { getPrisma } from './prisma.js';
import { getJwtSecret, getMasterPassword } from './env.js';

const app = express();
app.use(express.json());

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
      return { verified: true, method: 'prisma', schemaReady: true, schemaVersion };
    } catch (err) {
      console.warn('Prisma verification failed, checking database reachability:', err.message);
      try {
        await prisma.$queryRaw`SELECT 1`;
        // Database itself is reachable, but schema tables are not ready yet
        return {
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
    throw new Error(
      'Database not configured. Set DATABASE_URL in .env (with your Supabase password), or set SUPABASE_URL and SUPABASE_ANON_KEY.'
    );
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
    verified: true,
    method: 'supabase',
    schemaReady,
    ...(schemaReady ? {} : { hint: 'Run `npx prisma db push` after setting DATABASE_URL in .env.' }),
  };
}

// Add CORS headers for Vercel / Mobile App future-proofing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const api = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

api.post('/auth/login', (req, res) => {
  try {
    const password = String(req.body?.password ?? '').trim();
    const masterPassword = getMasterPassword();

    if (!password || password !== masterPassword) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid Master Key' } });
    }

    const token = jwt.sign({ role: 'admin' }, getJwtSecret(), { expiresIn: '30d' });
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
