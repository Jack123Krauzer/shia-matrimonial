import './env.mjs';
import { createClient } from '@libsql/client';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { databaseConfig } from '../lib/database-config.mjs';

import { setupDatabase as setup, checkDatabase as check } from '../lib/database-schema.mjs';

const config = databaseConfig();
const client = createClient({url:config.url,authToken:config.authToken});
try {
  const command=process.argv[2];
  if(command==='setup') { await setup(client);await check(client);console.log('Database tables are ready. Existing records were preserved.'); }
  else if(command==='check') { await check(client);console.log('Database connection and schema verified.'); }
  else if(command==='backup') {
    if(config.remote)throw new Error('db:backup prepares a local SQLite file for Turso import. Remove local TURSO_* settings temporarily or run it before adding them.');
    const directory=path.resolve('backups');
    await mkdir(directory,{recursive:true,mode:0o700});
    const destination=path.join(directory,'sukoon-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');
    await client.execute({sql:'VACUUM INTO ?',args:[destination]});
    const snapshot=createClient({url:'file:'+destination});
    let imported=0,missing=0;
    try {
      await setup(snapshot);
      const profiles=await snapshot.execute('SELECT id, photo_key FROM profiles WHERE photo_key IS NOT NULL');
      for(const profile of profiles.rows){
        const key=String(profile.photo_key);
        if(!/^[a-f0-9-]{36}\.jpg$/.test(key))throw new Error('An invalid legacy photo key was found. Backup was not prepared for import.');
        const existing=await snapshot.execute({sql:'SELECT key FROM photos WHERE profile_id=?',args:[profile.id]});
        if(existing.rows.length)continue;
        let bytes;
        try{bytes=await readFile(path.resolve(process.env.UPLOAD_DIR||'uploads',key));}
        catch(error){if(error.code==='ENOENT'){missing++;continue;}throw error;}
        await snapshot.execute({sql:'INSERT INTO photos (key,profile_id,data,created_at) VALUES (?,?,?,?)',args:[key,profile.id,bytes,new Date().toISOString()]});
        imported++;
      }
      await check(snapshot);
    }finally{snapshot.close();}
    console.log('Consistent private backup created: '+destination);
    console.log(`Legacy photos included: ${imported}.`);
    if(missing)console.warn(`${missing} legacy photo files were missing. Those members will need to re-upload their photos.`);
  } else throw new Error('Use setup, check, or backup.');
}catch(error){console.error(error.message);process.exitCode=1;}
finally{client.close();}
