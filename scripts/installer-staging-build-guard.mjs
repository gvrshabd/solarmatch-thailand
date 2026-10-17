import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/** Read only the built entrypoint's reachable ESM graph, never stale glob matches. */
export async function assertProtectedStagingBuild(root,expected){
  const directory=await realpath(path.resolve(root,'dist/server'));
  const built=JSON.parse(await readFile(path.join(directory,'wrangler.json'),'utf8'));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const sorted=value=>Object.fromEntries(Object.entries(value??{}).sort(([a],[b])=>a.localeCompare(b)));
  const databases=value=>(value??[]).map(({binding,database_name,database_id})=>({binding,database_name,database_id}));
  if(built.name!==expected.name||built.account_id!==expected.account_id||built.topLevelName!==expected.name
    ||path.resolve(built.configPath??'')!==path.resolve(root,'staging/wrangler.jsonc')
    ||built.main!=='index.js'||built.no_bundle!==true||built.preview_urls!==false
    ||built.assets?.run_worker_first!==true||built.assets?.binding!==expected.assets?.binding
    ||!same(built.triggers?.crons,[])||!same(sorted(built.vars),sorted(expected.vars))
    ||!same(databases(built.d1_databases),databases(expected.d1_databases))
    ||!same(built.r2_buckets,expected.r2_buckets))throw Error('Built staging identity, bindings or Access configuration mismatch.');
  if(!expected.vars?.STAGING_ACCESS_AUD||!expected.vars?.ACCESS_AUD
    ||expected.vars.INSTALLER_PLATFORM_MODE!=='sandbox')throw Error('Missing protected staging audiences.');
  const visited=new Map(),pending=[path.join(directory,'index.js')];
  while(pending.length){
    const filename=await realpath(pending.pop());
    const relative=path.relative(directory,filename);
    if(relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!['.js','.mjs'].includes(path.extname(filename)))throw Error('Built module escapes staging server graph.');
    if(visited.has(filename))continue;
    const source=await readFile(filename,'utf8');
    visited.set(filename,source);
    if(visited.size>2000)throw Error('Unexpected staging module graph size.');
    const parsed=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    if(parsed.parseDiagnostics.length)throw Error('Invalid JavaScript in staging module graph.');
    function visit(node){
      let specifier;
      if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))specifier=node.moduleSpecifier;
      else if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)specifier=node.arguments[0];
      if(specifier&&(ts.isStringLiteral(specifier)||ts.isNoSubstitutionTemplateLiteral(specifier))&&specifier.text.startsWith('.'))pending.push(path.resolve(path.dirname(filename),specifier.text));
      ts.forEachChild(node,visit);
    }
    visit(parsed);
  }
  const entry=visited.get(path.join(directory,'index.js'))??'';
  if(!['SolarMatch HTTPS staging','Access denied','Collection disabled'].every(marker=>entry.includes(marker)))throw Error('Build is not the protected staging entrypoint.');
  const audienceModules=[...visited].filter(([,source])=>source.includes('STAGING_ACCESS_AUD')).map(([filename])=>path.relative(directory,filename));
  if(!audienceModules.length)throw Error('Reachable staging Access audience verification is missing.');
  return {modules:visited.size,audienceModules};
}
