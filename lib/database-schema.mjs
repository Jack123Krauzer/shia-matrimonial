import { readFile } from 'node:fs/promises';

export async function setupDatabase(client) {
  const schema=(await readFile(new URL('../prisma/schema.sql',import.meta.url),'utf8'))
    .replace(/CREATE TABLE /g,'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE UNIQUE INDEX /g,'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/CREATE INDEX /g,'CREATE INDEX IF NOT EXISTS ');
  await client.batch(schema.split(';').map(sql=>sql.trim()).filter(Boolean),'write');
}

export async function checkDatabase(client) {
  await client.execute('SELECT 1');
  const result=await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  const existing=new Set(result.rows.map(row=>row.name));
  const missing=['users','profiles','sessions','connections','messages','support','coupons','orders','blocks','photos'].filter(table=>!existing.has(table));
  if(missing.length)throw new Error('Missing tables: '+missing.join(', ')+'. Run npm run db:setup.');
}
