import { getChatGPTUser } from '../../chatgpt-auth';
import { db,settings,id,isBlocked } from '../../../lib/store';
export const dynamic='force-dynamic';
const error=(message:string,status=400)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{
  const user=await getChatGPTUser();if(!user)return error('Sign in required.',401);
  const me=await db().prepare('SELECT id FROM profiles WHERE user_id=?').bind(user.userId).first<any>();if(!me)return error('Profile required.',403);
  const target=new URL(req.url).searchParams.get('profile');const p=await db().prepare('SELECT id,photo_key,status FROM profiles WHERE id=?').bind(target).first<any>();if(!p?.photo_key)return error('Photo unavailable.',404);
  if(p.id!==me.id){
    if(p.status!=='active'||await isBlocked(p.id,me.id))return error('Photo unavailable.',403);
    const c=await db().prepare("SELECT sender,receiver,sender_photo,receiver_photo FROM connections WHERE status='accepted' AND ((sender=? AND receiver=?) OR (sender=? AND receiver=?))").bind(me.id,p.id,p.id,me.id).first<any>();
    if(!c||!(c.sender===p.id?c.sender_photo:c.receiver_photo))return error('This photo has not been shared with you.',403);
  }
  const photo=await settings().BUCKET?.get(p.photo_key);if(!photo)return error('Photo unavailable.',404);
  return new Response(photo.body,{headers:{'Content-Type':photo.httpMetadata?.contentType||'image/jpeg','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Vary':'Cookie'}});
}catch{return error('Photos are temporarily unavailable.',503);}}
export async function POST(req:Request){try{
  if(req.headers.get('origin')!==new URL(req.url).origin)return error('Refresh the page and try again.',403);
  const user=await getChatGPTUser();if(!user)return error('Sign in required.',401);
  const p=await db().prepare('SELECT id,photo_key FROM profiles WHERE user_id=?').bind(user.userId).first<any>();if(!p)return error('Create your profile first.',403);
  if(!settings().BUCKET)return error('Photo storage is unavailable.',503);
  const type=req.headers.get('content-type');if(!['image/jpeg','image/png'].includes(type||''))return error('Choose a JPEG or PNG image.');
  if(Number(req.headers.get('content-length')||0)>5*1024*1024)return error('Choose a photo smaller than 5 MB.',413);
  const buffer=await req.arrayBuffer();if(buffer.byteLength>5*1024*1024)return error('Choose a photo smaller than 5 MB.',413);
  const bytes=new Uint8Array(buffer);const valid=type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
  if(!valid)return error('This file is not a supported image.');
  const key='private/'+p.id+'/'+id();await settings().BUCKET!.put(key,buffer,{httpMetadata:{contentType:type!}});
  await db().prepare('UPDATE profiles SET photo_key=? WHERE id=?').bind(key,p.id).run();
  // A new photo needs fresh permission in every connection.
  await db().batch([db().prepare('UPDATE connections SET sender_photo=0 WHERE sender=?').bind(p.id),db().prepare('UPDATE connections SET receiver_photo=0 WHERE receiver=?').bind(p.id)]);
  if(p.photo_key)await settings().BUCKET!.delete(p.photo_key);return Response.json({ok:true});
}catch{return error('We could not upload your photo. Try again.',503);}}
export async function DELETE(req:Request){try{
  if(req.headers.get('origin')!==new URL(req.url).origin)return error('Refresh the page and try again.',403);
  const user=await getChatGPTUser();if(!user)return error('Sign in required.',401);
  const p=await db().prepare('SELECT id,photo_key FROM profiles WHERE user_id=?').bind(user.userId).first<any>();if(!p)return error('Profile required.',403);
  await db().batch([db().prepare('UPDATE profiles SET photo_key=NULL WHERE id=?').bind(p.id),db().prepare('UPDATE connections SET sender_photo=0 WHERE sender=?').bind(p.id),db().prepare('UPDATE connections SET receiver_photo=0 WHERE receiver=?').bind(p.id)]);
  if(p.photo_key)await settings().BUCKET?.delete(p.photo_key);return Response.json({ok:true});
}catch{return error('We could not remove your photo.',503);}}
