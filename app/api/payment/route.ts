import { getChatGPTUser } from '../../chatgpt-auth';
import { db,settings,now } from '../../../lib/store';
export const dynamic='force-dynamic';
const error=(message:string,status=400)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
async function razor(path:string,body?:unknown){
  const s=settings();const r=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa(s.RAZORPAY_KEY_ID+':'+s.RAZORPAY_KEY_SECRET),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw new Error('Payment provider is temporarily unavailable.');return r.json() as Promise<any>;
}
async function markPaid(pid:string,oid:string,paymentId:string){await db().batch([db().prepare("UPDATE orders SET status='paid',payment_id=? WHERE id=? AND profile_id=?").bind(paymentId,oid,pid),db().prepare("UPDATE profiles SET fee='paid',status='active' WHERE id=? AND fee='unpaid'").bind(pid)]);}
export async function POST(req:Request){try{
  if(req.headers.get('origin')!==new URL(req.url).origin)return error('Refresh the page and try again.',403);
  const user=await getChatGPTUser();if(!user)return error('Sign in required.',401);
  const p=await db().prepare('SELECT id,fee FROM profiles WHERE user_id=?').bind(user.userId).first<any>();if(!p)return error('Create your profile first.');if(p.fee!=='unpaid')return Response.json({paid:true});
  const s=settings();if(!s.RAZORPAY_KEY_ID||!s.RAZORPAY_KEY_SECRET)return error('Payments are not open yet. Your profile is saved. You can request a fee waiver or return when payments open.',503);
  const raw=await req.text();if(raw.length>3000)return error('Request too large.',413);const b=JSON.parse(raw);
  if(b.action==='status'){
    const orders=(await db().prepare("SELECT id FROM orders WHERE profile_id=? AND status='created' ORDER BY created_at DESC LIMIT 10").bind(p.id).all<any>()).results;
    for(const o of orders){const payments=await razor('orders/'+encodeURIComponent(o.id)+'/payments');const paid=payments.items?.find((x:any)=>x.status==='captured'&&x.order_id===o.id&&x.amount===10000&&x.currency==='INR');if(paid){await markPaid(p.id,o.id,paid.id);return Response.json({paid:true});}}
    return Response.json({paid:false});
  }
  if(b.action==='verify'){
    if(typeof b.razorpay_order_id!=='string'||typeof b.razorpay_payment_id!=='string'||typeof b.razorpay_signature!=='string'||!/^[a-f0-9]{64}$/i.test(b.razorpay_signature))return error('Payment verification failed.');
    const o=await db().prepare('SELECT id,status FROM orders WHERE id=? AND profile_id=?').bind(b.razorpay_order_id,p.id).first<any>();if(!o)return error('This payment order does not belong to your profile.',403);
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(s.RAZORPAY_KEY_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const signature=new Uint8Array(b.razorpay_signature.match(/.{2}/g).map((x:string)=>parseInt(x,16)));
    const valid=await crypto.subtle.verify('HMAC',key,signature,new TextEncoder().encode(o.id+'|'+b.razorpay_payment_id));if(!valid)return error('Payment verification failed.',403);
    const payment=await razor('payments/'+encodeURIComponent(b.razorpay_payment_id));if(payment.status!=='captured'||payment.order_id!==o.id||payment.amount!==10000||payment.currency!=='INR')return error('Payment is not yet captured. Please use Check payment in a moment.');
    await markPaid(p.id,o.id,payment.id);return Response.json({paid:true});
  }
  if(b.action!=='order')return error('Unknown payment action.');
  const count=await db().prepare('SELECT COUNT(*) AS n FROM orders WHERE profile_id=? AND created_at>?').bind(p.id,new Date(Date.now()-86400000).toISOString()).first<any>();if(count.n>=5)return error('Please check your previous payment or try tomorrow.',429);
  const order=await razor('orders',{amount:10000,currency:'INR',receipt:crypto.randomUUID(),notes:{profile_id:p.id}});
  await db().prepare('INSERT INTO orders (id,profile_id,created_at) VALUES (?,?,?)').bind(order.id,p.id,now()).run();return Response.json({orderId:order.id,key:s.RAZORPAY_KEY_ID,amount:10000,currency:'INR'});
}catch(e){console.error('Payment failed',e instanceof Error?e.message:'Unknown');return error('We could not complete this payment step. Your profile is saved; please try again or check payment status.',503);}}
