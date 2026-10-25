import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';

const origin=process.env.APP_URL || 'http://localhost:3000';
const email=`approval-check-${randomUUID()}@example.test`;
const password=randomUUID();
const sessions=[];
async function call(path,{cookie,body,method=body?'POST':'GET'}={}) {
  const response=await fetch(origin+path,{method,redirect:'manual',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  return {response,data};
}
async function login(accountEmail,accountPassword,mode='signin') {
  const {response,data}=await call(accountEmail==='admin@example.test'?'/api/admin/auth':'/api/auth',{body:{mode,email:accountEmail,password:accountPassword}});
  assert.equal(response.status,200,data.error);
  const cookie=response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie); sessions.push(cookie);
  assert.match(response.headers.get('set-cookie'),/HttpOnly/i);
  return {cookie,data};
}
let created=false;
try {
  const {cookie:admin}=await login('admin@example.test','SukoonDemo123!');
  const adminState=await call('/api/admin',{cookie:admin});
  assert.equal(adminState.data.canSeedDemo,true,'Run this check against local development only');
  const {cookie:viewer}=await login('member@example.test','SukoonDemo123!');
  const {cookie:applicant,data:signup}=await login(email,password,'signup'); created=true;
  assert.equal(signup.redirect,'/registration-confirmation');
  const confirmation=await fetch(origin+'/registration-confirmation',{headers:{Cookie:applicant}});
  assert.equal(confirmation.status,200);
  assert.match(await confirmation.text(),/activated only after an administrator/);
  const profile={name:'Review Test Member',dob:'1998-02-01',gender:'Woman',city:'Mumbai',profession:'Architect',education:'Bachelor’s degree',sect:'Shia Ithna Ashariyya',language:'Urdu, English',marital:'Never married',manager:'Self',about:'A synthetic integration test profile with serious intentions, shared family values and respectful communication.',values:['Family-oriented','Kindness'],prefMin:23,prefMax:36,prefCity:'',oath:true,guardianConsent:true,status:'active'};
  assert.equal((await call('/api/profiles',{cookie:applicant,body:profile})).response.status,200);
  const own=await call('/api/app',{cookie:applicant});
  assert.equal(own.data.me.status,'pending','Applicants cannot activate themselves');
  assert.equal(own.data.me.fee,'unpaid');
  assert.equal(own.data.matches.length,0);
  assert.match(own.response.headers.get('cache-control'),/no-store.*private/);
  const id=own.data.me.id;
  async function visible(expected){
    const {data}=await call('/api/app',{cookie:viewer});
    const match=data.matches.find(row=>row.id===id);
    assert.equal(Boolean(match),expected);
    if(match)for(const field of ['name','email','dob','userId'])assert.equal(field in match,false,'Private identity is excluded from discovery');
  }
  async function adminAction(body){return call('/api/admin',{cookie:admin,body});}
  async function review(){return (await call('/api/admin',{cookie:admin})).data.profiles.find(row=>row.id===id);}
  await visible(false);
  assert.equal((await call('/api/admin',{cookie:applicant,body:{action:'updateProfileStatus',profileId:id,status:'active',reviewed:true}})).response.status,403);
  assert.equal((await adminAction({action:'updateProfileStatus',profileId:id,status:'invalid'})).response.status,400);
  assert.equal((await adminAction({action:'updateProfileStatus',profileId:id,status:'active'})).response.status,400);
  assert.equal((await call('/api/app',{cookie:applicant,body:{action:'support',category:'Fee waiver',message:'Synthetic integration test fee waiver request.'}})).response.status,200);
  const ticket=(await call('/api/admin',{cookie:admin})).data.tickets.find(row=>row.email===email);
  const coupon=await adminAction({action:'issueCoupon',ticketId:ticket.id});
  assert.equal(coupon.response.status,200);
  assert.equal((await call('/api/app',{cookie:applicant,body:{action:'redeem',code:coupon.data.code}})).response.status,200);
  assert.equal((await review()).status,'pending','A waiver does not approve a profile');
  await visible(false);
  const firstReview=await review();
  assert.deepEqual(firstReview.reviewIssues,[]);
  assert.equal((await adminAction({action:'updateProfileStatus',profileId:id,status:'active',reviewed:true,reviewVersion:firstReview.oathAt})).response.status,200);
  await visible(true);
  const profilePage=await fetch(origin+'/discover?view=profile',{headers:{Cookie:applicant}});
  assert.match(await profilePage.text(),/Review Test Member/,'My profile renders the signed-in person’s saved details');
  assert.equal((await call('/api/profiles',{cookie:applicant,method:'PATCH',body:{...profile,profession:'Updated architect'}})).response.status,200);
  assert.equal((await review()).status,'pending','Edits require a fresh review');
  await visible(false);
  assert.equal((await adminAction({action:'updateProfileStatus',profileId:id,status:'active',reviewed:true,reviewVersion:firstReview.oathAt})).response.status,409);
  const updated=await review();
  assert.equal((await adminAction({action:'updateProfileStatus',profileId:id,status:'active',reviewed:true,reviewVersion:updated.oathAt})).response.status,200);
  assert.equal((await adminAction({action:'updateProfileStatus',profileId:id,status:'suspended'})).response.status,200);
  assert.equal((await adminAction({action:'updateProfileFee',profileId:id,fee:'paid'})).response.status,200);
  assert.equal((await review()).status,'suspended','Fee changes cannot undo suspension');
  await visible(false);
  assert.equal((await call('/api/app',{cookie:applicant,body:{action:'request',target:'DEMO-1001',note:'A respectful test introduction.',consent:true}})).response.status,403);
  assert.equal((await call('/api/profiles',{cookie:applicant,method:'PATCH',body:{...profile,dob:'2015-01-01'}})).response.status,400);
  console.log('PASS signup confirmation, validation, admin-only review, waiver separation, approval visibility, edit re-review, suspension, private identity');
} finally {
  for(const cookie of sessions)await fetch(origin+'/auth/signout',{method:'POST',headers:{Cookie:cookie,Origin:origin},redirect:'manual'});
  if(created){
    // Delete only the disposable synthetic account created by this test run.
    const db=new DatabaseSync((process.env.DATABASE_URL || 'file:./prisma/dev.db').replace(/^file:/,''));
    db.exec('PRAGMA foreign_keys = ON');
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    db.close();
  }
}
