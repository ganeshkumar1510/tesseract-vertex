/** Read env vars with optional surrounding quotes stripped (common .env typo). */
export function envValue(key, fallback = '') {
  const raw = process.env[key];
  if (raw == null || raw === '') return fallback;
  return raw.replace(/^["']+|["']+$/g, '').trim();
}

/** True on Vercel production or any NODE_ENV=production deployment. */
function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

const MASTER_PASSWORD_PLACEHOLDERS = new Set([
  'your-secure-password-1510',
  'change-me',
  '1510',
]);

/**
 * Master key used for /api/auth/login.
 * Precedence: MASTER_PASSWORD, then the legacy VITE_ADMIN_PIN fallback in dev.
 * In production, missing or placeholder values fail closed (returns null), so
 * login can never be unlocked with a shipped template default.
 */
export function getMasterPassword() {
  const master = envValue('MASTER_PASSWORD');
  if (master && !MASTER_PASSWORD_PLACEHOLDERS.has(master)) return master;

  if (isProduction()) return null;
  return envValue('VITE_ADMIN_PIN') || '1510';
}

const JWT_SECRET_PLACEHOLDERS = new Set([
  'vertex-secret-key',
  'change-me-to-a-long-random-string',
  'change-me',
  'secret',
]);

/**
 * JWT signing secret. In production, missing or placeholder values fail
 * closed (returns null): tokens can neither be issued nor verified.
 */
export function getJwtSecret() {
  const secret = envValue('JWT_SECRET');
  if (secret && !JWT_SECRET_PLACEHOLDERS.has(secret)) return secret;

  if (isProduction()) return null;
  return 'vertex-secret-key';
}
