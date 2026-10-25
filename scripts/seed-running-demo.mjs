import assert from 'node:assert/strict';

const origin = process.env.APP_URL || 'http://localhost:3000';
const login = await fetch(origin+'/api/admin/auth', {
  method:'POST', headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({mode:'signin',email:'admin@example.test',password:'SukoonDemo123!'}),
});
assert.equal(login.status,200,'Local demo administrator must be available');
const cookie=login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
try {
  const response=await fetch(origin+'/api/admin', {
    method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({action:'seedDemoProfiles'}),
  });
  const result=await response.json();
  assert.equal(response.status,200,result.error);
  console.log(`Development sample profiles ready in the server database: ${result.count}`);
} finally {
  await fetch(origin+'/auth/signout',{method:'POST',headers:{Cookie:cookie,Origin:origin},redirect:'manual'});
}
