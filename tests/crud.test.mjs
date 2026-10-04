import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const nativeRequire = createRequire(import.meta.url);
const tables = Object.fromEntries(['profiles','connections','messages','blocks','support','coupons','orders'].map(n=>[n,[]]));
let viewer = null;
function matches(row, filter) {
  if (filter.startsWith('and(')) return filter.slice(4,-1).split(',').every(f=>matches(row,f));
  const [key,op,...parts]=filter.split('.');return op==='eq'&&String(row[key])===parts.join('.');
}
function orFilters(filter) { return filter.match(/and\([^)]*\)|[^,]+/g); }
class Query {
  constructor(table){this.table=table;this.predicates=[];this.operation='select';this.columns='*';this.max=Infinity;}
  select(columns='*'){this.columns=columns;return this;}
  eq(k,v){this.predicates.push(r=>r[k]===v);return this;}
  in(k,values){this.predicates.push(r=>values.includes(r[k]));return this;}
  neq(k,v){this.predicates.push(r=>r[k]!==v);return this;}
  gt(k,v){this.predicates.push(r=>r[k]>v);return this;}
  or(f){this.predicates.push(r=>orFilters(f).some(part=>matches(r,part)));return this;}
  limit(n){this.max=n;return this;}
  order(k,{ascending=true}={}){this.sort={k,ascending};return this;}
  insert(value){this.operation='insert';this.value=value;return this;}
  update(value){this.operation='update';this.value=value;return this;}
  maybeSingle(){this.single=true;return this;}
  async execute(){
    if(this.operation==='insert'){
      const defaults={created_at:new Date().toISOString(),status:this.table==='profiles'?'pending':'pending',fee:'unpaid',photo_key:null,sender_photo:false,receiver_photo:false};
      const row={...defaults,...this.value};
      if(tables[this.table].some(r=>r.id===row.id||(this.table==='profiles'&&r.user_id===row.user_id)||(this.table==='connections'&&r.pair===row.pair)))return {data:null,error:{code:'23505'}};
      tables[this.table].push(row);return {data:null,error:null};
    }
    let rows=tables[this.table].filter(r=>this.predicates.every(p=>p(r)));
    if(this.operation==='update')rows.forEach(r=>Object.assign(r,this.value));
    if(this.sort)rows.sort((a,b)=>String(a[this.sort.k]).localeCompare(String(b[this.sort.k]))*(this.sort.ascending?1:-1));
    rows=rows.slice(0,this.max).map(r=>this.columns==='*'?{...r}:Object.fromEntries(this.columns.split(',').map(k=>[k,r[k]])));
    return {data:this.single?(rows[0]||null):rows,error:null};
  }
  then(resolve,reject){return this.execute().then(resolve,reject);}
}
const db={from:table=>new Query(table),async rpc(name,args){
  if(name==='send_connection_message'){tables.messages.push({id:crypto.randomUUID(),connection_id:args.p_connection,sender:args.p_profile,body:args.p_body,created_at:new Date().toISOString()});}
  else if(name==='delete_member_profile'){
    const p=tables.profiles.find(p=>p.user_id===args.p_user);if(p){tables.profiles=tables.profiles.filter(r=>r!==p);tables.connections=tables.connections.filter(r=>r.sender!==p.id&&r.receiver!==p.id);tables.messages=tables.messages.filter(r=>r.sender!==p.id);}
    return {data:p?.photo_key||null,error:null};
  }else if(name==='replace_member_photo'){
    const p=tables.profiles.find(p=>p.id===args.p_profile),old=p.photo_key;p.photo_key=args.p_key;
    tables.connections.forEach(c=>{if(c.sender===p.id)c.sender_photo=false;if(c.receiver===p.id)c.receiver_photo=false;});
    return {data:old,error:null};
  }else throw Error('Unexpected RPC: '+name);
  return {data:null,error:null};
}};
const modules=new Map();
function load(file){
  if(modules.has(file))return modules.get(file);
  const module={exports:{}};modules.set(file,module.exports);
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  function require(name){
    if(name==='server-only')return {};
    if(name.includes('supabase/server'))return {currentUser:async()=>viewer,database:()=>db,authConfigured:()=>true};
    if(name.endsWith('lib/store')||name==='./store')return load('lib/store.ts');
    if(name.endsWith('lib/photos'))return load('lib/photos.ts');
    if(name==='../app/route')return load('app/api/app/route.ts');
    return nativeRequire(name);
  }
  vm.runInNewContext(source,{module,exports:module.exports,require,Response,Request,Headers,URL,Date,JSON,Uint8Array,Buffer,TextEncoder,TextDecoder,crypto:webcrypto,process,console});
  return module.exports;
}
const app=load('app/api/app/route.ts'), profiles=load('app/api/profiles/route.ts'), photo=load('app/api/photo/route.ts'), photos=load('lib/photos.ts');
const form={name:'Member A',dob:'1998-02-01',gender:'Man',city:'Mumbai',profession:'Engineer',education:'Degree',sect:'Shia Ithna Ashariyya',language:'Urdu, English',marital:'Never married',manager:'Self',about:'I value faith and family, kindness, and a thoughtful approach to marriage.',values:['Family-oriented'],prefMin:23,prefMax:35,prefCity:'',oath:true,guardianConsent:true};
async function call(user,action,data={},method='POST',handler=app,query=''){
  viewer=user?{userId:user,email:user+'@example.invalid'}:null;
  const req=new Request('https://test.invalid/api/app'+query,{method,headers:{Origin:'https://test.invalid','Content-Type':'application/json','oai-authenticated-user-id':'forged-id','oai-authenticated-user-email':'forged@example.invalid'},...(method!=='GET'?{body:JSON.stringify({action,...data})}:{})});
  const r=await handler[method](req);return {status:r.status,data:await r.json()};
}
test('profile CRUD, anonymous projections, recipient consent, chat and local-photo access',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sukoon-photos-'));process.env.UPLOAD_DIR=directory;
  try{
    assert.equal((await call(null,null,{},'GET')).data.signedIn,false);
    assert.equal((await call(null,'register',form,'POST',profiles)).status,401);
    assert.equal((await call('a','register',{...form,dob:'invalid'},'POST',profiles)).status,400);
    assert.equal((await call('a','register',{...form,dob:'2018-01-01'},'POST',profiles)).status,400);
    assert.equal((await call('a','register',{...form,oath:false},'POST',profiles)).status,400);
    for(const u of ['a','b','c'])assert.equal((await call(u,'register',{...form,name:'Member '+u},'POST',profiles)).status,200);
    assert.equal((await call('a','register',form,'POST',profiles)).status,400);
    assert.equal((await call('a','updateProfile',{...form,name:'Updated A',user_id:'b',fee:'paid',status:'active'},'PATCH',profiles)).status,200);
    assert.equal(tables.profiles.find(p=>p.user_id==='b').name,'Member b');
    const pa=tables.profiles.find(p=>p.user_id==='a');assert.equal(pa.name,'Updated A');assert.equal(pa.fee,'unpaid');
    assert.equal((await call('a','request',{target:'anything',consent:true,note:'Hello'})).status,403);
    tables.profiles.forEach(p=>{p.status='active';p.fee='waived';});
    const pb=tables.profiles.find(p=>p.user_id==='b');
    const discovery=(await call('a',null,{},'GET')).data;
    for(const field of ['name','email','dob','photo_key','user_id'])assert.equal(discovery.matches[0][field],undefined);
    assert.equal((await call('a','request',{target:pb.id,consent:false,note:'Hello'})).status,400);
    assert.equal((await call('a','request',{target:pb.id,consent:true,note:'Call +919876543210'})).status,400);
    assert.equal((await call('a','request',{target:pb.id,consent:true,note:'Assalamu alaikum.'})).status,200);
    const link=tables.connections[0];
    assert.equal((await call('b',null,{},'GET')).data.requests[0].details,undefined);
    assert.equal((await call('a','accept',{connectionId:link.id,consent:true})).status,403);
    assert.equal((await call('c','accept',{connectionId:link.id,consent:true})).status,404);
    assert.equal((await call('a','message',{connectionId:link.id,body:'Before acceptance'})).status,403);
    assert.equal((await call('b','accept',{connectionId:link.id,consent:false})).status,400);
    assert.equal((await call('b','accept',{connectionId:link.id,consent:true})).status,200);
    assert.equal((await call('a',null,{},'GET')).data.requests[0].details.email,'b@example.invalid');
    assert.equal((await call('a','message',{connectionId:link.id,body:'Assalamu alaikum.'})).status,200);
    assert.equal((await call('b',null,{},'GET',app,'?chat='+link.id)).data.messages.length,1);
    assert.equal((await call('c',null,{},'GET',app,'?chat='+link.id)).status,404);
    assert.equal((await call('c','issueCoupon',{ticketId:crypto.randomUUID()})).status,403);
    const sharp=nativeRequire('sharp');const png=await sharp({create:{width:10,height:10,channels:3,background:'#234567'}}).png().toBuffer();
    viewer={userId:'b',email:'b@example.invalid'};
    const upload=await photo.POST(new Request('https://test.invalid/api/photo',{method:'POST',headers:{Origin:'https://test.invalid','Content-Type':'image/png'},body:png}));assert.equal(upload.status,200);
    const imageKey=pb.photo_key;assert.ok(fs.existsSync(path.join(directory,imageKey)));
    const meta=await sharp(await photos.readLocalPhoto(imageKey)).metadata();assert.equal(meta.format,'jpeg');assert.equal(meta.exif,undefined);
    viewer={userId:'a',email:'a@example.invalid'};
    const req=new Request('https://test.invalid/api/photo?profile='+pb.id);assert.equal((await photo.GET(req)).status,403);
    await call('b','photoConsent',{connectionId:link.id,share:true});viewer={userId:'a',email:'a@example.invalid'};assert.equal((await photo.GET(req)).status,200);
    await call('a','close',{connectionId:link.id});assert.equal((await call('a',null,{},'GET')).data.requests[0].details,undefined);
    viewer={userId:'a',email:'a@example.invalid'};assert.equal((await photo.GET(req)).status,403);
    assert.equal((await call('a','message',{connectionId:link.id,body:'After closure'})).status,403);
    assert.equal((await call('b','deleteProfile',{},'DELETE',profiles)).status,200);assert.equal(fs.existsSync(path.join(directory,imageKey)),false);
    assert.equal(tables.profiles.some(p=>p.user_id==='b'),false);assert.equal(tables.profiles.some(p=>p.user_id==='a'),true);
    assert.equal((await call('b',null,{},'GET',profiles)).data.profile,null);
    await assert.rejects(()=>photos.readLocalPhoto('../private.env'));
    process.env.VERCEL='1';await assert.rejects(()=>photos.writeLocalPhoto(png),/persistent disk/);delete process.env.VERCEL;
    const s=load('lib/store.ts');s.sameOrigin(new Request('http://localhost:3000',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}}));assert.equal(s.requestOrigin(new Request('http://localhost:3000',{headers:{host:'127.0.0.1:3000'}})),'http://127.0.0.1:3000');assert.throws(()=>s.sameOrigin(new Request('http://localhost:3000',{headers:{host:'127.0.0.1:3000',origin:'https://attacker.invalid'}})));await assert.rejects(()=>s.readBody(new Request('https://test.invalid',{method:'POST',body:'12345'}),3),/too large/);
  }finally{delete process.env.UPLOAD_DIR;delete process.env.VERCEL;fs.rmSync(directory,{recursive:true,force:true});}
});
