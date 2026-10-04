import type { SupabaseClient } from '@supabase/supabase-js';
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const settings = () => process.env;
export function age(dob: string) {
  const birth = new Date(dob + 'T00:00:00Z'), today = new Date();
  let years = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}
export const publicColumns = 'id,dob,gender,city,profession,education,sect,language,marital,manager,about,values,photo_key';
export function publicProfile(p: any) {
  return { id: p.id, age: age(p.dob), gender: p.gender, city: p.city, profession: p.profession, education: p.education, sect: p.sect, language: p.language, marital: p.marital, manager: p.manager, about: p.about, values: p.values || [], hasPhoto: !!p.photo_key };
}
export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function fail(message: string, status = 400): never { throw new AppError(message, status); }
export function str(v: unknown, min = 1, max = 120): string {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) fail('Please complete all required fields.');
  return v.trim();
}
export function hasContact(text: string) { return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\s().-]*){8,}|https?:\/\/|www\./i.test(text); }
export function choice(v: unknown, opts: string[]) { if (typeof v !== 'string' || !opts.includes(v)) fail('Please choose a valid option.'); return v; }
export async function result<T = any>(query: PromiseLike<{ data: unknown; error: any }>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    if (error.code === '23505') fail('This record already exists.', 409);
    if (error.code === 'P0001') fail(error.message);
    console.error('Database operation failed', error.code);
    throw new AppError('We could not save or load your information. Please try again.', 503);
  }
  return data as T;
}
export async function profile(client: SupabaseClient, uid: string) { return result(client.from('profiles').select('*').eq('user_id', uid).maybeSingle()); }
export async function isBlocked(client: SupabaseClient, a: string, b: string) {
  const rows = await result<any[]>(client.from('blocks').select('id').or(`and(blocker.eq.${a},blocked.eq.${b}),and(blocker.eq.${b},blocked.eq.${a})`).limit(1));
  return !!rows.length;
}
export async function active(client: SupabaseClient, uid: string) {
  const p = await profile(client, uid);
  if (!p || p.status !== 'active') fail('Complete registration and your fee or waiver before connecting.', 403);
  return p;
}
export async function connection(client: SupabaseClient, cid: string, pid: string, accepted = false) {
  // Filter values are validated before reaching Supabase's filter grammar.
  const c = await result(client.from('connections').select('*').eq('id', cid).or(`sender.eq.${pid},receiver.eq.${pid}`).maybeSingle());
  if (!c) fail('Connection not found.', 404);
  if (accepted && c.status !== 'accepted') fail('Both people must consent before chatting.', 403);
  if (await isBlocked(client, c.sender, c.receiver)) fail('This connection is unavailable.', 403);
  return c;
}
export function recordId(v: unknown) { const value = str(v, 1, 80); if (!/^[a-zA-Z0-9-]+$/.test(value)) fail('Invalid record identifier.'); return value; }
export function requestOrigin(req: Request) {
  const url = new URL(req.url);
  return new URL(url.protocol + '//' + (req.headers.get('host') || url.host)).origin;
}
export function sameOrigin(req: Request) {
  const target = new URL(requestOrigin(req));
  let origin: URL;
  try { origin = new URL(req.headers.get('origin') || ''); } catch { fail('Please refresh the page and try again.', 403); }
  // Next.js can normalize the URL hostname to localhost on a self-hosted server.
  // Host is the browser's destination authority; forwarded-host is never trusted.
  if (origin.host !== (req.headers.get('host') || target.host) || origin.protocol !== target.protocol) fail('Please refresh the page and try again.', 403);
}
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store, private' } });
export function handleError(e: unknown) { if (e instanceof SyntaxError) return json({ error: 'Invalid request.' }, 400); if (!(e instanceof AppError)) console.error('Request failed', e instanceof Error ? e.message : 'Unknown'); return json({ error: e instanceof AppError ? e.message : 'The service is unavailable. Check the server configuration and try again.' }, e instanceof AppError ? e.status : 503); }

export async function readBody(req: Request, limit: number) {
  if (Number(req.headers.get('content-length') || 0) > limit) fail('Request too large.', 413);
  const reader = req.body?.getReader(); if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > limit) { await reader.cancel(); fail('Request too large.', 413); }
    parts.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  return bytes;
}
