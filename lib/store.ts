export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const settings = () => process.env;
export function age(dob: string) {
  const birth = new Date(dob + 'T00:00:00Z'), today = new Date();
  let years = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years--;
  return years;
}
export function publicProfile(p: any) {
  const vals = typeof p.values === 'string' ? JSON.parse(p.values) : (p.values || []);
  return { id: p.id, age: age(p.dob), gender: p.gender, city: p.city, profession: p.profession, education: p.education, sect: p.sect, language: p.language, marital: p.marital, manager: p.manager, about: p.about, values: vals, hasPhoto: !!(p.photoKey || p.photo_key), isDemo: p.id.startsWith('DEMO-') };
}
export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function fail(message: string, status = 400): never { throw new AppError(message, status); }
export function str(v: unknown, min = 1, max = 120): string {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) fail('Please complete all required fields.');
  return v.trim();
}
export function hasContact(text: string) { return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\s().-]*){8,}|https?:\/\/|www\./i.test(text); }
export function choice(v: unknown, opts: string[]) { if (typeof v !== 'string' || !opts.includes(v)) fail('Please choose a valid option.'); return v; }
export function recordId(v: unknown) { const value = str(v, 1, 80); if (!/^[a-zA-Z0-9-]+$/.test(value)) fail('Invalid record identifier.'); return value; }
export function requestOrigin(req: Request) {
  const url = new URL(req.url);
  return new URL(url.protocol + '//' + (req.headers.get('host') || url.host)).origin;
}
export function sameOrigin(req: Request) {
  const target = new URL(requestOrigin(req));
  let origin: URL;
  try { origin = new URL(req.headers.get('origin') || ''); } catch { fail('Please refresh the page and try again.', 403); }
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
