import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const config=JSON.parse(readFileSync('.installer-test/preview-ipv4.jsonc','utf8'));
if(config.name!=='solarmatch-installer-local-test'||config.d1_databases?.[0]?.database_id!=='00000000-0000-0000-0000-000000000006')throw Error('Isolated fictitious configuration required');
function open(name){
 const directory=path.resolve('.wrangler',name,'v3/d1/miniflare-D1DatabaseObject');
 const files=readdirSync(directory).filter(file=>/^[a-f0-9]{64}\.sqlite$/.test(file));
 if(files.length!==1)throw Error('Expected one isolated local database');
 return new DatabaseSync(path.join(directory,files[0]),{readOnly:true});
}
const original=open('installer-demo'),candidate=open('installer-design-v2');
try{
 const changed=[];let compared=0;
 const tables=original.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' AND name<>'d1_migrations'").all();
 for(const {name}of tables){
  const columns=original.prepare('PRAGMA table_info(['+name+'])').all().map(x=>x.name);
  const sql='SELECT '+columns.map(column=>'['+column+']').join(',')+' FROM ['+name+'] ORDER BY rowid';
  if(JSON.stringify(original.prepare(sql).all())!==JSON.stringify(candidate.prepare(sql).all()))changed.push(name);
  compared++;
 }
 const permittedMetadata=['public_request_limits','installer_auth_rate_limit'];
 const unexpected=changed.filter(name=>!permittedMetadata.includes(name));
 console.log(JSON.stringify({readOnly:true,syntheticOnly:true,originalStore:'installer-demo',candidateStore:'installer-design-v2',tablesCompared:compared,changedTables:changed,unexpectedChanges:unexpected,expectedSchemaDelta:'0019 workspace fields and privacy triggers'}));
 if(unexpected.length)process.exitCode=1;
}finally{original.close();candidate.close();}
