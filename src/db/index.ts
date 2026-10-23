import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const defaultLocalDb = process.env.VERCEL ? 'file:/tmp/spanju.db' : 'file:spanju.db';
const dbUrl = process.env.TURSO_DATABASE_URL || defaultLocalDb;
const authToken = process.env.TURSO_AUTH_TOKEN || '';

export const db = createClient({
  url: dbUrl,
  authToken: authToken,
});

export const isTursoCloud = dbUrl.startsWith('libsql://');
