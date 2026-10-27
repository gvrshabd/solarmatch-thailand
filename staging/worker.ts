import application from '../worker';
import {stagingIdentity,stagingRoute,type StagingAccessEnv} from '../lib/server/staging-access';
import {stagingDesignAsset,stagingReviewPolicy} from '../lib/server/staging-design-review';

const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const stagingWorker = {
  async fetch(request:Request,env:StagingAccessEnv,context:ExecutionContext){
    const route=stagingRoute(request,env);
    if(route==='deny')return new Response('Unavailable',{status:503,headers});
    if(route==='local-only')return new Response('Not found',{status:404,headers});
    // Staging fixtures come only from the private management CLI, never a
    // homeowner submission or a remotely exposed phone/test bypass.
    if(['/api/leads','/api/phone-verification'].includes(new URL(request.url).pathname))return new Response('Collection disabled',{status:403,headers});
    if(route==='signed-webhook'){
      if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'POST'}});
      // Only this exact POST skips Access; the existing route verifies the raw
      // LINE signature, limits request size and deduplicates event IDs.
    }else if(!await stagingIdentity(request,env)){
      return new Response('Access denied',{status:403,headers});
    }
    // run_worker_first keeps assets private, but vinext's route entry does not
    // serve build assets directly. Only fetch the asset binding AFTER Access
    // verification; otherwise authenticated HTML has no CSS/hydration.
    const pathname=new URL(request.url).pathname;
    if(pathname.startsWith('/design-review/')){
      if(!stagingDesignAsset(pathname)||!env.ASSETS)return new Response('Not found',{status:404,headers});
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
      const asset=await env.ASSETS.fetch(request),safe=new Headers(asset.headers);
      for(const [key,value]of Object.entries(headers))safe.set(key,value);
      safe.set('Content-Security-Policy',stagingReviewPolicy(pathname));
      return new Response(asset.body,{status:asset.status,headers:safe});
    }
    const assetPath=pathname.startsWith('/_next/static/')||pathname.startsWith('/images/')||['/favicon.svg','/og.png','/llms.txt'].includes(pathname);
    let response=assetPath&&env.ASSETS
      ? await env.ASSETS.fetch(request)
      : await application.fetch(request,env,context);
    if(response.headers.get('Content-Type')?.includes('text/html')){
      response=new HTMLRewriter().on('body',{element(element){element.prepend('<aside role="note" style="padding:10px 16px;background:#153d32;color:#fff;text-align:center;font:14px system-ui">SolarMatch HTTPS staging — synthetic test data only. เว็บไซต์ทดสอบ SolarMatch — ใช้ข้อมูลจำลองเท่านั้น</aside>',{html:true});}}).transform(response);
    }
    const safe=new Headers(response.headers);for(const [key,value] of Object.entries(headers))safe.set(key,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers:safe});
  },
  // No scheduled handler or local-clock/fixture/admin bypass is exposed here.
};
export default stagingWorker;
