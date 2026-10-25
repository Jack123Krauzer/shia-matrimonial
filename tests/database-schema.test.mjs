import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { setupDatabase,checkDatabase } from '../lib/database-schema.mjs';

test('libSQL schema setup preserves records and cascades private photo deletion',async()=>{
  const client=createClient({url:'file::memory:'});
  try{
    await setupDatabase(client);await checkDatabase(client);
    await client.execute({sql:'INSERT INTO users (id,email,password) VALUES (?,?,?)',args:['test-user','test@example.invalid','not-a-real-password']});
    await setupDatabase(client);
    assert.equal((await client.execute('SELECT count(*) AS total FROM users')).rows[0].total,1);
    await client.execute({sql:'INSERT INTO profiles (id,user_id,name,email,dob,gender,city,profession,education,sect,language,marital,manager,about,"values",oath_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',args:['test-profile','test-user','Test','test@example.invalid','1998-01-01','Woman','Mumbai','Architect','Degree','Shia Ithna Ashariyya','Urdu','Never married','Self','Synthetic private profile used only in an isolated test.','[]',new Date().toISOString()]});
    const bytes=new Uint8Array([1,2,3,4]);
    await client.execute({sql:'INSERT INTO photos (key,profile_id,data) VALUES (?,?,?)',args:['test-photo','test-profile',bytes]});
    const data=(await client.execute('SELECT data FROM photos')).rows[0].data;
    assert.deepEqual(new Uint8Array(data),bytes);
    await client.execute("DELETE FROM profiles WHERE id='test-profile'");
    assert.equal((await client.execute('SELECT count(*) AS total FROM photos')).rows[0].total,0);
  }finally{
    client.close();
  }
});
