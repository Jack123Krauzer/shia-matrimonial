import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoLoginAllowed } from '../lib/demo-access.mjs';

test('production demo accounts require explicit opt-in',()=>{
  assert.equal(demoLoginAllowed({NODE_ENV:'production'}),false);
  assert.equal(demoLoginAllowed({NODE_ENV:'production',ENABLE_DEMO_ACCOUNTS:'false'}),false);
  assert.equal(demoLoginAllowed({NODE_ENV:'production',ENABLE_DEMO_ACCOUNTS:'true'}),true);
});
test('development retains demo access and other values cannot enable it',()=>{
  assert.equal(demoLoginAllowed({NODE_ENV:'development'}),true);
  for(const value of ['1','yes','TRUE',''])assert.equal(demoLoginAllowed({NODE_ENV:'production',ENABLE_DEMO_ACCOUNTS:value}),false);
});
