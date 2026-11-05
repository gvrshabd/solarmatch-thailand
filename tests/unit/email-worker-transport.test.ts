import {readFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {expect,it} from 'vitest';
// The compiler is Node-side test tooling, not a Vite-transformed application module.
const ts=createRequire(import.meta.url)('typescript') as typeof import('typescript');
const require=createRequire(realpathSync('node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
function source(file:string){return ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;\s*$/gm,'');}
const implementation=source('lib/installer/providers/common.ts')+'\n'+source('lib/installer/providers/email.ts');
it.each([200,302])('auth email works in actual Workerd and rejects redirects (%s)',async status=>{
 const calls:{url:string;authorization:string|null}[]=[];
 const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],
 script:implementation+`
 export default {async fetch(){try{
 const result=await sendAuthEmail({to:'synthetic@example.test',kind:'verification',url:'https://staging.example.test/verify?token=synthetic'},
 {mode:'sandbox',outboundEnabled:true,token:'synthetic-only',from:'sender@example.test',baseUrl:'https://staging.example.test'});
 return Response.json(result);
 }catch(error){return Response.json({error:error.code});}}};`,
 outboundService:async(request:Request)=>{
  calls.push({url:request.url,authorization:request.headers.get('Authorization')});
  return status===200?Response.json({id:'synthetic-email'}):new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/collect'}});
 }});
 try{
  const result=await(await mf.dispatchFetch('http://localhost/')).json();
  expect(result).toEqual(status===200?{providerMessageId:'synthetic-email'}:{error:'auth_email_http_302'});
  expect(calls).toEqual([{url:'https://api.resend.com/emails',authorization:'Bearer synthetic-only'}]);
 }finally{await mf.dispose();}
});
