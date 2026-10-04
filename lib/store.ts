import { env } from 'cloudflare:workers';
export function db(): D1Database { if (!env.DB) throw new Error('Storage is temporarily unavailable.'); return env.DB; }
export function settings() { return env as Cloudflare.Env; }
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export function age(dob: string) {
  const birth=new Date(dob+'T00:00:00Z'), today=new Date();
  let years=today.getUTCFullYear()-birth.getUTCFullYear();
  if(today.getUTCMonth()<birth.getUTCMonth()||(today.getUTCMonth()===birth.getUTCMonth()&&today.getUTCDate()<birth.getUTCDate())) years--;
  return years;
}
export const publicColumns='id, dob, gender, city, profession, education, sect, language, marital, manager, about, "values", photo_key';
export function publicProfile(p: any) {
  return {id:p.id,age:age(p.dob),gender:p.gender,city:p.city,profession:p.profession,education:p.education,sect:p.sect,language:p.language,marital:p.marital,manager:p.manager,about:p.about,values:JSON.parse(p.values||'[]'),hasPhoto:!!p.photo_key};
}
export async function isBlocked(a:string,b:string) { return !!await db().prepare('SELECT id FROM blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)').bind(a,b,b,a).first(); }
