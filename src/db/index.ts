import { createClient } from '@libsql/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.TURSO_DATABASE_URL || 'file:spanju.db';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

export const db = createClient({
  url: dbUrl,
  authToken: authToken,
});

export const isTursoCloud = dbUrl.startsWith('libsql://');
