import { getChatGPTUser } from '../../chatgpt-auth';
import { db, settings, id, now, age, publicColumns, publicProfile, isBlocked } from '../../../lib/store';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store, private'}});
class AppError extends Error { constructor(message:string,public status=400){super(message)} }
function fail(message:string,status=400):never{throw new AppError(message,status)}
const str=(v:any,min=1,max=120):string=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail('Please complete all required fields.');return v.trim();};
function hasContact(text:string){return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\s().-]*){8,}|https?:\/\/|www\./i.test(text);}
function choice(v:any,opts:string[]){if(!opts.includes(v)) fail('Please choose a valid option.');return v;}
async function profile(userId:string){return await db().prepare('SELECT * FROM profiles WHERE user_id=?').bind(userId).first<any>();}
async function active(userId:string){const p=await profile(userId);if(!p||p.status!=='active')fail('Complete registration and your fee or waiver before connecting.',403);return p;}
async function connection(cid:string,pid:string,accepted=false){const c=await db().prepare('SELECT * FROM connections WHERE id=? AND (sender=? OR receiver=?)').bind(cid,pid,pid).first<any>();if(!c)fail('Connection not found.',404);if(accepted&&c.status!=='accepted')fail('Both people must consent before chatting.',403);if(await isBlocked(c.sender,c.receiver))fail('This connection is unavailable.',403);return c;}
export async function GET(req:Request){try{
  const user=await getChatGPTUser(); if(!user) return json({signedIn:false,me:null,matches:[],requests:[],support:[]});
  const p=await profile(user.userId);const admin=!!settings().ADMIN_EMAIL&&settings().ADMIN_EMAIL?.toLowerCase()===user.email.toLowerCase();
  const url=new URL(req.url);
  if(url.searchParams.has('chat')){if(!p)fail('Register first.',403);await connection(url.searchParams.get('chat')!,p.id,true);const {results}=await db().prepare('SELECT id,sender,body,created_at FROM messages WHERE connection_id=? ORDER BY created_at DESC LIMIT 200').bind(url.searchParams.get('chat')).all();return json({messages:results.reverse()});}
  let matches:any[]=[], requests:any[]=[];
  if(p?.status==='active'){
    const rows=await db().prepare(`SELECT ${publicColumns} FROM profiles WHERE status='active' AND id<>? AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker=? AND b.blocked=profiles.id) OR (b.blocked=? AND b.blocker=profiles.id)) LIMIT 200`).bind(p.id,p.id,p.id).all<any>();matches=rows.results.map(publicProfile);
    const rowsC=await db().prepare('SELECT * FROM connections WHERE sender=? OR receiver=? ORDER BY created_at DESC LIMIT 200').bind(p.id,p.id).all<any>();
    for(const c of rowsC.results){if(await isBlocked(c.sender,c.receiver))continue;const other=await db().prepare('SELECT * FROM profiles WHERE id=?').bind(c.sender===p.id?c.receiver:c.sender).first<any>();if(!other)continue;const accepted=c.status==='accepted'&&other.status==='active';requests.push({id:c.id,other:publicProfile(other),direction:c.receiver===p.id?'incoming':'outgoing',status:c.status,note:c.note,createdAt:c.created_at,...(accepted?{details:{name:other.name,email:other.email},photoShared:!!(c.sender===other.id?c.sender_photo:c.receiver_photo),myPhotoShared:!!(c.sender===p.id?c.sender_photo:c.receiver_photo)}:{})});}
  }
  const tickets=(await db().prepare('SELECT id,category,message,status,coupon,created_at FROM support WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.userId).all()).results;
  const adminTickets=admin?(await db().prepare('SELECT * FROM support ORDER BY created_at DESC LIMIT 100').all()).results:undefined;
  return json({signedIn:true,me:p?{...publicProfile(p),name:p.name,email:p.email,dob:p.dob,status:p.status,fee:p.fee,prefMin:p.pref_min,prefMax:p.pref_max,prefCity:p.pref_city}:null,matches,requests,support:tickets,admin,adminTickets,paymentsReady:!!(settings().RAZORPAY_KEY_ID&&settings().RAZORPAY_KEY_SECRET)});
}catch(e){console.error('app GET failed',e instanceof Error?e.message:'Unknown');return json({error:e instanceof AppError?e.message:'We could not load your information. Please try again.'},e instanceof AppError?e.status:503);}}
export async function POST(req:Request){try{
  if(req.headers.get('origin')!==new URL(req.url).origin)fail('Please refresh the page and try again.',403);
  const user=await getChatGPTUser();if(!user)fail('Sign in to continue.',401);
  if(Number(req.headers.get('content-length')||0)>12000)fail('Request too large.',413);
  const raw=await req.text();if(raw.length>12000)fail('Request too large.',413);const b=JSON.parse(raw);
  if(b.action==='register'||b.action==='updateProfile'){
    const existing=await profile(user.userId);
    if(b.action==='register'&&existing)fail('You already have a profile.');
    if(b.action==='updateProfile'&&!existing)fail('Create a profile first.',403);
    if(b.oath!==true||b.guardianConsent!==true)fail('Please agree to the oath, terms, and profile consent.');
    const dob=str(b.dob,10,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(dob)||new Date(dob+'T00:00:00Z').toISOString().slice(0,10)!==dob||age(dob)<18||age(dob)>100)fail('The person whose profile is created must be aged 18 or above.');
    const name=str(b.name,2,100),gender=choice(b.gender,['Woman','Man']),city=str(b.city),profession=str(b.profession),education=str(b.education),sect=choice(b.sect,['Shia Ithna Ashariyya','Shia Ismaili','Shia Bohra','Other Shia']),language=str(b.language),marital=choice(b.marital,['Never married','Divorced','Widowed']),manager=choice(b.manager,['Self','Parent','Sibling','Guardian']),about=str(b.about,30,1000);
    if(!Array.isArray(b.values)||b.values.length<1||b.values.length>5||b.values.some((v:any)=>!['Faith & spirituality','Family-oriented','Education','Kindness','Career','Community','Simple living'].includes(v)))fail('Choose at least one value.');
    const min=Number(b.prefMin),max=Number(b.prefMax);if(!Number.isInteger(min)||!Number.isInteger(max)||min<18||max>100||min>max)fail('Please choose a valid age preference.');
    if([city,profession,education,language,about].some(hasContact))fail('Keep contact details out of your discovery profile. Share them only after acceptance.');
    if(b.action==='updateProfile'){await db().prepare('UPDATE profiles SET name=?,dob=?,gender=?,city=?,profession=?,education=?,sect=?,language=?,marital=?,manager=?,about=?,"values"=?,pref_min=?,pref_max=?,pref_city=?,oath_at=? WHERE user_id=?').bind(name,dob,gender,city,profession,education,sect,language,marital,manager,about,JSON.stringify(b.values),min,max,typeof b.prefCity==='string'?b.prefCity.trim().slice(0,120):'',now(),user.userId).run();return json({ok:true});}
    const pid='SH-'+crypto.randomUUID().slice(0,8).toUpperCase();
    await db().prepare('INSERT INTO profiles (id,user_id,name,email,dob,gender,city,profession,education,sect,language,marital,manager,about,"values",pref_min,pref_max,pref_city,oath_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(pid,user.userId,name,user.email,dob,gender,city,profession,education,sect,language,marital,manager,about,JSON.stringify(b.values),min,max,typeof b.prefCity==='string'?b.prefCity.trim().slice(0,120):'',now(),now()).run();return json({ok:true});
  }
  if(b.action==='support'){
    const category=choice(b.category,['Fee waiver','Safety concern','General enquiry']),message=str(b.message,10,1200);
    const recent=await db().prepare('SELECT COUNT(*) AS n FROM support WHERE user_id=? AND created_at>?').bind(user.userId,new Date(Date.now()-86400000).toISOString()).first<any>();if(recent.n>=5)fail('You have already contacted us today. Please wait for a reply.',429);
    await db().prepare('INSERT INTO support (id,user_id,email,category,message,created_at) VALUES (?,?,?,?,?,?)').bind(id(),user.userId,user.email,category,message,now()).run();return json({ok:true});
  }
  if(b.action==='issueCoupon'||b.action==='resolveTicket'){
    if(!settings().ADMIN_EMAIL||settings().ADMIN_EMAIL?.toLowerCase()!==user.email.toLowerCase())fail('Administrator access required.',403);
    const ticket=await db().prepare('SELECT * FROM support WHERE id=?').bind(str(b.ticketId)).first<any>();if(!ticket)fail('Enquiry not found.',404);
    if(b.action==='resolveTicket'){await db().prepare("UPDATE support SET status='resolved' WHERE id=?").bind(ticket.id).run();return json({ok:true});}
    if(ticket.category!=='Fee waiver'||ticket.coupon)fail('This enquiry already has a coupon or is not a waiver request.');
    const code='SU-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase();
    await db().batch([db().prepare('INSERT INTO coupons (code,user_id,created_at) VALUES (?,?,?)').bind(code,ticket.user_id,now()),db().prepare("UPDATE support SET status='approved',coupon=? WHERE id=?").bind(code,ticket.id)]);return json({ok:true,code});
  }
  if(b.action==='redeem'){
    const p=await profile(user.userId);if(!p||p.fee!=='unpaid')fail('No registration fee is outstanding.');
    const code=str(b.code).toUpperCase();const result=await db().batch([db().prepare('UPDATE coupons SET redeemed_at=? WHERE code=? AND user_id=? AND redeemed_at IS NULL').bind(now(),code,user.userId),db().prepare("UPDATE profiles SET fee='waived',status='active' WHERE id=? AND fee='unpaid' AND EXISTS(SELECT 1 FROM coupons WHERE code=? AND user_id=? AND redeemed_at IS NOT NULL)").bind(p.id,code,user.userId)]);
    if(!result[0].meta.changes)fail('That coupon is invalid or has already been used.');return json({ok:true});
  }
  const p=await active(user.userId);
  if(b.action==='preferences'){
    const min=Number(b.min),max=Number(b.max);if(!Number.isInteger(min)||!Number.isInteger(max)||min<18||max>100||min>max)fail('Choose a valid age range.');const city=typeof b.city==='string'?b.city.trim().slice(0,120):'';await db().prepare('UPDATE profiles SET pref_min=?,pref_max=?,pref_city=? WHERE id=?').bind(min,max,city,p.id).run();return json({ok:true});
  }
  if(b.action==='request'){
    const target=str(b.target);if(target===p.id||await isBlocked(p.id,target))fail('This profile is unavailable.');
    const other=await db().prepare("SELECT id FROM profiles WHERE id=? AND status='active'").bind(target).first();if(!other)fail('Profile not available.',404);
    if(b.consent!==true)fail('Confirm your consent to share your name and email on acceptance.');
    const count=await db().prepare('SELECT COUNT(*) AS n FROM connections WHERE sender=? AND created_at>?').bind(p.id,new Date(Date.now()-86400000).toISOString()).first<any>();if(count.n>=10)fail('Please wait until tomorrow to send more requests.',429);
    if(hasContact(str(b.note,1,500)))fail('Keep contact details out of your request. Share them after acceptance.');
    const pair=[p.id,target].sort().join(':');const existing=await db().prepare('SELECT id FROM connections WHERE pair=?').bind(pair).first();if(existing)fail('A request between these profiles already exists.');
    await db().prepare('INSERT INTO connections (id,sender,receiver,pair,note,created_at) VALUES (?,?,?,?,?,?)').bind(id(),p.id,target,pair,str(b.note,1,500),now()).run();return json({ok:true});
  }
  if(['accept','decline','withdraw','close','photoConsent','message','block'].includes(b.action)){
    const c=await connection(str(b.connectionId),p.id,['message','photoConsent'].includes(b.action));
    if(b.action==='accept'||b.action==='decline'){
      if(c.receiver!==p.id||c.status!=='pending')fail('Only the recipient can respond to a pending request.',403);
      if(b.action==='accept'&&b.consent!==true)fail('Confirm your consent to share your name and email.');
      const other=await db().prepare("SELECT id FROM profiles WHERE id=? AND status='active'").bind(c.sender).first();if(!other)fail('This profile is unavailable.');
      await db().prepare('UPDATE connections SET status=?,accepted_at=? WHERE id=? AND status=\'pending\'').bind(b.action==='accept'?'accepted':'declined',b.action==='accept'?now():null,c.id).run();return json({ok:true});
    }
    if(b.action==='withdraw'||b.action==='close'){
      if(b.action==='withdraw'&&(c.sender!==p.id||c.status!=='pending'))fail('Only pending sent requests can be withdrawn.');
      await db().prepare("UPDATE connections SET status='closed',sender_photo=0,receiver_photo=0 WHERE id=?").bind(c.id).run();return json({ok:true});
    }
    if(b.action==='photoConsent'){if(typeof b.share!=='boolean')fail('Choose a valid sharing option.');await db().prepare(`UPDATE connections SET ${c.sender===p.id?'sender_photo':'receiver_photo'}=? WHERE id=? AND status='accepted'`).bind(b.share?1:0,c.id).run();return json({ok:true});}
    if(b.action==='message'){
      const body=str(b.body,1,2000),cutoff=new Date(Date.now()-60000).toISOString();const count=await db().prepare('SELECT COUNT(*) AS n FROM messages WHERE sender=? AND created_at>?').bind(p.id,cutoff).first<any>();if(count.n>=20)fail('Please wait a moment before sending more messages.',429);
      await db().prepare('INSERT INTO messages (id,connection_id,sender,body,created_at) VALUES (?,?,?,?,?)').bind(id(),c.id,p.id,body,now()).run();return json({ok:true});
    }
    if(b.action==='block'){
      const other=c.sender===p.id?c.receiver:c.sender;await db().batch([db().prepare('INSERT OR IGNORE INTO blocks (id,blocker,blocked,reason,created_at) VALUES (?,?,?,?,?)').bind(id(),p.id,other,str(b.reason||'Personal boundary'),now()),db().prepare("UPDATE connections SET status='closed',sender_photo=0,receiver_photo=0 WHERE id=?").bind(c.id)]);return json({ok:true});
    }
  }
  fail('Unknown action.');
}catch(e){console.error('app POST failed',e instanceof Error?e.message:'Unknown');return json({error:e instanceof AppError?e.message:'We could not save your changes. Please try again.'},e instanceof AppError?e.status:503);}}
