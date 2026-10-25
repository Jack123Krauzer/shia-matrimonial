/** @param {Record<string, string | undefined>} env */
export function databaseConfig(env = process.env) {
  const tursoUrl = env.TURSO_DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim();
  const url = tursoUrl || env.DATABASE_URL?.trim() || 'file:./dev.db';
  if (authToken && !tursoUrl && !url.startsWith('libsql:') && !url.startsWith('https:')) {
    throw new Error('TURSO_AUTH_TOKEN requires TURSO_DATABASE_URL.');
  }
  if (url.startsWith('file:')) {
    if (env.VERCEL) throw new Error('Vercel requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Local SQLite files cannot persist there.');
    if (tursoUrl) throw new Error('TURSO_DATABASE_URL must be a libsql:// or https:// URL, not a local file.');
    return { url, authToken: undefined, remote: false };
  }
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('The database URL is invalid. Use libsql:// for Turso or file: for local SQLite.'); }
  if (!['libsql:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('Use a libsql:// or https:// Turso database URL and a separate TURSO_AUTH_TOKEN.');
  }
  if (!authToken) throw new Error('TURSO_AUTH_TOKEN is required for the hosted database.');
  return { url, authToken, remote: true };
}
