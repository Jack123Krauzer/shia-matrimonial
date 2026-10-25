import './env.mjs';
import { databaseConfig } from '../lib/database-config.mjs';

try {
  const config = databaseConfig();
  if (process.env.VERCEL && !config.remote) throw new Error('Vercel requires a hosted Turso database.');
  console.log(`Database configuration validated (${config.remote ? 'Turso' : 'local SQLite'}).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
