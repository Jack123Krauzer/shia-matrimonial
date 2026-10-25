import { ensureAdminUser, signIn } from '@/lib/auth';
import { fail, handleError, json, sameOrigin, str } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req:Request) {
  try {
    sameOrigin(req);
    const raw=await req.text();
    if(raw.length>3000)fail('Request too large.',413);
    const body=JSON.parse(raw);
    const email=str(body.email,3,254);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a valid email address.');
    if(typeof body.password!=='string'||body.password.length<6||body.password.length>128)fail('Enter a valid password.');
    await ensureAdminUser();
    await signIn(email,body.password,{adminOnly:true});
    return json({ok:true,redirect:'/admin'});
  } catch(error){return handleError(error);}
}
