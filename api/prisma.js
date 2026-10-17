import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma = null;
let bypassLogged = false;

export function databaseUrlConfigured() {
  const url = process.env.DATABASE_URL || '';
  return url.length > 0 && !url.includes('[YOUR-PASSWORD]');
}

export function getPrisma() {
  if (!databaseUrlConfigured()) {
    if (!bypassLogged) {
      console.info('[vertex] DATABASE_URL not configured — Prisma disabled, running in local-only mode.');
      bypassLogged = true;
    }
    return null;
  }
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const pool = new pg.Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}
