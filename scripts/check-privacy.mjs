import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

// Exercise the actual route implementations with isolated SQLite and identity fixtures.
const sql=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(query){let args=[];return {bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}}}}},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
let viewer=null;
const photoBytes=new Uint8Array([255,216,255,0]);
const env={DB,ADMIN_EMAIL:'admin@example.invalid',BUCKET:{async get(){return {body:photoBytes,httpMetadata:{contentType:'image/jpeg'}}},async put(){},async delete(){}}};
const modules=new Map();
function load(file){if(modules.has(file))return modules.get(file);const module={exports:{}};modules.set(file,module.exports);const source=ts.transpileModule(fs.readFileSync(file,'utf8').replaceAll("e instanceof Error?e.message:'Unknown'","String(e)"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const require=(name)=>{if(name==='cloudflare:workers')return {env};if(name.endsWith('chatgpt-auth'))return {getChatGPTUser:async()=>viewer};if(name.endsWith('lib/store'))return load('lib/store.ts');throw Error('Unexpected test dependency: '+name)};vm.runInNewContext(source,{module,exports:module.exports,require,Response,Request,URL,Date,JSON,Uint8Array,TextEncoder,crypto:webcrypto,console:{log(){},error(){}}});return module.exports;}
const app=load('app/api/app/route.ts'),photo=load('app/api/photo/route.ts');
async function call(user,action,data={},method='POST'){viewer=user?{userId:user,email:user==='admin'?'admin@example.invalid':user+'@example.invalid'}:null;const req=new Request('https://test.invalid/api/app',{method,headers:{Origin:'https://test.invalid','Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({action,...data})}:{})});const r=await app[method](req);return {status:r.status,data:await r.json()};}
const form={name:'Member A',dob:'1998-02-01',gender:'Man',city:'Mumbai',profession:'Engineer',education:'Degree',sect:'Shia Ithna Ashariyya',language:'Urdu, English',marital:'Never married',manager:'Self',about:'I value faith and family, kindness, and a thoughtful approach to marriage.',values:['Family-oriented'],prefMin:23,prefMax:35,prefCity:'',oath:true,guardianConsent:true};
assert.equal((await call(null,null,{},'GET')).data.signedIn,false);
assert.equal((await call(null,'register',form)).status,401);
assert.equal((await call('underage','register',{...form,dob:'2015-02-01'})).status,400);
assert.equal((await call('a','register',form)).status,200);
assert.equal((await call('a','register',form)).status,400);
assert.equal((await call('a','request',{target:'anything',note:'Hello',consent:true})).status,403);
assert.equal((await call('b','register',{...form,name:'Member B',gender:'Woman'})).status,200);
assert.equal((await call('c','register',{...form,name:'Member C'})).status,200);
for(const user of ['a','b','c']){
  await call(user,'support',{category:'Fee waiver',message:'Please grant a registration fee waiver.'});
  const admin=await call('admin',null,{},'GET');const ticket=admin.data.adminTickets.find(x=>x.user_id===user);
  assert.equal((await call(user,'issueCoupon',{ticketId:ticket.id})).status,403);
  const issued=await call('admin','issueCoupon',{ticketId:ticket.id});assert.equal(issued.status,200);
  if(user==='a')assert.equal((await call('b','redeem',{code:issued.data.code})).status,400);
  assert.equal((await call(user,'redeem',{code:issued.data.code})).status,200);
  assert.equal((await call(user,'redeem',{code:issued.data.code})).status,400);
}
let a=(await call('a',null,{},'GET')).data,b=(await call('b',null,{},'GET')).data,c=(await call('c',null,{},'GET')).data;
const other=a.matches.find(x=>x.id===b.me.id);assert.ok(other);for(const field of ['name','email','dob','photo_key','user_id'])assert.equal(other[field],undefined);
assert.equal((await call('a','request',{target:b.me.id,note:'Assalamu alaikum.',consent:false})).status,400);
assert.equal((await call('a','request',{target:b.me.id,note:'Contact +919876543210',consent:true})).status,400);
assert.equal((await call('a','request',{target:b.me.id,note:'Assalamu alaikum. I would like to connect.',consent:true})).status,200);
b=(await call('b',null,{},'GET')).data;const pending=b.requests[0];assert.equal(pending.details,undefined);
viewer={userId:'b',email:'b@example.invalid'};assert.equal((await app.GET(new Request('https://test.invalid/api/app?chat='+pending.id))).status,403);
assert.equal((await call('a','accept',{connectionId:pending.id,consent:true})).status,403);
assert.equal((await call('c','accept',{connectionId:pending.id,consent:true})).status,404);
assert.equal((await call('b','accept',{connectionId:pending.id,consent:false})).status,400);
assert.equal((await call('b','accept',{connectionId:pending.id,consent:true})).status,200);
a=(await call('a',null,{},'GET')).data;b=(await call('b',null,{},'GET')).data;
assert.equal(a.requests[0].details.name,'Member B');assert.equal(b.requests[0].details.email,'a@example.invalid');
assert.equal((await call('c','message',{connectionId:pending.id,body:'Unauthorized'})).status,404);
assert.equal((await call('a','message',{connectionId:pending.id,body:'Assalamu alaikum.'})).status,200);
viewer={userId:'b',email:'b@example.invalid'};const chat=await app.GET(new Request('https://test.invalid/api/app?chat='+pending.id));assert.equal((await chat.json()).messages.length,1);
sql.prepare('UPDATE profiles SET photo_key=? WHERE id=?').run('private-test-key',b.me.id);
viewer={userId:'a',email:'a@example.invalid'};const photoRequest=new Request('https://test.invalid/api/photo?profile='+b.me.id);assert.equal((await photo.GET(photoRequest)).status,403);
await call('b','photoConsent',{connectionId:pending.id,share:true});viewer={userId:'a',email:'a@example.invalid'};assert.equal((await photo.GET(photoRequest)).status,200);
await call('a','close',{connectionId:pending.id});a=(await call('a',null,{},'GET')).data;assert.equal(a.requests[0].details,undefined);
viewer={userId:'a',email:'a@example.invalid'};assert.equal((await photo.GET(photoRequest)).status,403);
assert.equal((await call('a','message',{connectionId:pending.id,body:'After closure'})).status,403);
console.log('Privacy checks passed: adult registration, fee gating, account-bound coupons, anonymous projections, request ownership, two-sided consent, chat authorization, per-connection photos, and revocation.');
