import nextEnv from '@next/env';

// Match Next.js precedence, including .env.local, without printing secrets.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
