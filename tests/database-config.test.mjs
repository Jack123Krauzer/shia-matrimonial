import { test } from 'node:test';
import assert from 'node:assert/strict';
import { databaseConfig } from '../lib/database-config.mjs';

test('local development uses the existing root SQLite database',()=>{
  assert.deepEqual(databaseConfig({}),{url:'file:./dev.db',authToken:undefined,remote:false});
  assert.equal(databaseConfig({DATABASE_URL:'file:./custom.db'}).url,'file:./custom.db');
});
test('Turso overrides a local development URL and requires a token',()=>{
  const config=databaseConfig({DATABASE_URL:'file:./dev.db',TURSO_DATABASE_URL:' libsql://example.turso.io ',TURSO_AUTH_TOKEN:' token '});
  assert.equal(config.url,'libsql://example.turso.io');assert.equal(config.authToken,'token');assert.equal(config.remote,true);
  assert.throws(()=>databaseConfig({TURSO_DATABASE_URL:'libsql://example.turso.io'}),/TURSO_AUTH_TOKEN/);
  assert.throws(()=>databaseConfig({TURSO_AUTH_TOKEN:'token'}),/requires TURSO_DATABASE_URL/);
});
test('Vercel never falls back to an ephemeral local file',()=>{
  assert.throws(()=>databaseConfig({VERCEL:'1'}),/Vercel requires/);
  assert.throws(()=>databaseConfig({VERCEL:'1',DATABASE_URL:'file:/tmp/data.db'}),/Vercel requires/);
  assert.equal(databaseConfig({VERCEL:'1',TURSO_DATABASE_URL:'libsql://example.turso.io',TURSO_AUTH_TOKEN:'token'}).remote,true);
});
test('invalid protocols and credential-bearing URLs are rejected without exposing them',()=>{
  for(const url of ['postgresql://example/db','garbage','https://user:private-secret@example.com/db','file:./wrong.db']){
    assert.throws(()=>databaseConfig({TURSO_DATABASE_URL:url,TURSO_AUTH_TOKEN:'secret-token'}),error=>!error.message.includes('private-secret')&&!error.message.includes('secret-token'));
  }
});
