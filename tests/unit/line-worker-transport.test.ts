import {readFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {expect,it} from 'vitest';

const require=createRequire(realpathSync('node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
// Compile the actual provider implementation into Workerd, not Node fetch mocks.
// The outbound service is a synthetic local handler: no real provider requests.
function source(file:string){return ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;\s*$/gm,'');}
const providerSource=source('lib/installer/providers/common.ts')+'\n'+source('lib/installer/providers/line.ts');
const runtime={modules:true,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat']};

it('sends invitations and requests link tokens in Workerd without unsupported redirect modes',async()=>{
  const requests:string[]=[];
  const mf=new Miniflare({...runtime,script:providerSource+`
    export default {async fetch(){
      const owner='U'+'1'.repeat(32);
      const modes=[];const transport=(url,init)=>{modes.push(init.redirect);return fetch(url,init);};
      const config={mode:'sandbox',outboundEnabled:true,accessToken:'synthetic-token',sandboxRecipients:[owner],fetch:transport};
      const invite=await sendAccountLinkInvitation(owner,'https://staging.example.test/installers','00000000-0000-4000-8000-000000000001',config);
      const token=await requestLinkToken(owner,config);
      const notification=await sendEnquiryNotification({to:owner,reference:'SM-SYNTHETIC',product:'shared_residential',credits:2,trial:false,enquiryUrl:'https://staging.example.test/installers/enquiry/synthetic',retryKey:'00000000-0000-4000-8000-000000000002'},config);
      return Response.json({invitation:invite.status,token:token.linkToken,notification:notification.status,redirectModes:modes});
    }};`,outboundService:async(request:Request)=>{
      requests.push(request.url);
      expect(request.headers.get('Authorization')).toBe('Bearer synthetic-token');
      return request.url.endsWith('/linkToken')?Response.json({linkToken:'synthetic-link-token'}):Response.json({},{headers:{'x-line-request-id':'synthetic-request'}});
    }});
  try{
    const result=await(await mf.dispatchFetch('http://localhost/')).json();
    expect(result).toEqual({invitation:'accepted',token:'synthetic-link-token',notification:'accepted',redirectModes:['manual','manual','manual']});
    expect(requests).toHaveLength(3);
  }finally{await mf.dispose();}
});

it('rejects provider redirects in Workerd without following them or forwarding credentials',async()=>{
  const requests:string[]=[];
  const mf=new Miniflare({...runtime,script:providerSource+`
    export default {async fetch(){try{
      await requestLinkToken('U'+'1'.repeat(32),{mode:'sandbox',outboundEnabled:true,accessToken:'synthetic-token',sandboxRecipients:['U'+'1'.repeat(32)]});
      return Response.json({unexpectedSuccess:true});
    }catch(e){return Response.json({code:e.code});}}};`,outboundService:async(request:Request)=>{
      requests.push(request.url);return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/steal-token'}});
    }});
  try{
    expect(await(await mf.dispatchFetch('http://localhost/')).json()).toEqual({code:'provider_http_302'});
    expect(requests).toHaveLength(1);expect(requests[0]).toContain('https://api.line.me/');
  }finally{await mf.dispose();}
});
