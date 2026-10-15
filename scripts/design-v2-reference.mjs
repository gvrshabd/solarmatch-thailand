import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {stagingDesignAsset,reviewContentSecurityPolicy} from '../lib/server/staging-design-review.ts';
const root=path.resolve('docs/design-v2/prototype');
const comparisonRoot=path.resolve('docs/design-v2-comparison');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(pathname.startsWith('/design-review/')){
      if(!stagingDesignAsset(pathname)){res.writeHead(404).end();return;}
      const file=path.resolve('.wrangler/design-v2-staging-assets','.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
      const content=await readFile(file);
      res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','Content-Security-Policy':pathname.includes('/prototype/')?reviewContentSecurityPolicy:reviewContentSecurityPolicy.replace("connect-src 'none'","connect-src 'self'")}).end(content);return;
    }
    const comparison=pathname.startsWith('/comparison/');
    const base=comparison?comparisonRoot:root;
    const relative=comparison?pathname.slice('/comparison'.length):pathname;
    const target=path.resolve(base,'.'+(relative==='/'?'/index.html':relative));
    if(!target.startsWith(base+path.sep)||!types[path.extname(target)]){res.writeHead(403).end();return;}
    const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4174,'127.0.0.1',()=>console.log('Unmodified Design v2 reference: http://127.0.0.1:4174/#home'));
