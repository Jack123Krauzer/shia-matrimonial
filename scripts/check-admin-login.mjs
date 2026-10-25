import assert from 'node:assert/strict';

const origin=process.env.APP_URL||'http://localhost:3000';
async function adminLogin(email,password){
  return fetch(origin+'/api/admin/auth',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
}
const memberPage=await fetch(origin+'/auth').then(response=>response.text());
assert.doesNotMatch(memberPage,/Admin demo|admin@example\.test/);
const loginPage=await fetch(origin+'/admin/login');
assert.equal(loginPage.status,200);
assert.match(await loginPage.text(),/Admin sign in/);
const denied=await adminLogin('member@example.test','SukoonDemo123!');
assert.equal(denied.status,403,'Members cannot use administrator login');
assert.equal(denied.headers.get('set-cookie'),null,'A rejected member does not receive a new session');
const wrongPassword=await adminLogin('admin@example.test','incorrect-password');
assert.equal(wrongPassword.status,401);
assert.equal(wrongPassword.headers.get('set-cookie'),null);
const login=await adminLogin('admin@example.test','SukoonDemo123!');
assert.equal(login.status,200);
assert.equal((await login.json()).redirect,'/admin');
const cookie=login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
try {
  const dashboard=await fetch(origin+'/admin',{headers:{Cookie:cookie},redirect:'manual'});
  assert.equal(dashboard.status,200);
  const alreadySignedIn=await fetch(origin+'/admin/login',{headers:{Cookie:cookie},redirect:'manual'});
  assert.equal(alreadySignedIn.status,307);
  assert.equal(new URL(alreadySignedIn.headers.get('location'),origin).pathname,'/admin');
  const api=await fetch(origin+'/api/admin',{headers:{Cookie:cookie}});
  assert.equal(api.status,200);
} finally {
  const signout=await fetch(origin+'/auth/signout?from=admin',{method:'POST',headers:{Cookie:cookie,Origin:origin},redirect:'manual'});
  assert.equal(signout.status,303);
  assert.equal(new URL(signout.headers.get('location'),origin).pathname,'/admin/login');
}
const afterSignout=await fetch(origin+'/admin',{headers:{Cookie:cookie},redirect:'manual'});
assert.equal(afterSignout.status,307);
assert.equal(new URL(afterSignout.headers.get('location'),origin).pathname,'/admin/login');
console.log('PASS separate admin sign-in, role validation, invalid credentials, dashboard access, login redirect, and sign-out');
