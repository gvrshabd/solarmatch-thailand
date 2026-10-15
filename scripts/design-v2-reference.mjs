import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
const root=path.resolve('docs/design-v2/prototype');
const comparisonRoot=path.resolve('docs/design-v2-comparison');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const comparison=pathname.startsWith('/comparison/');
    const base=comparison?comparisonRoot:root;
    const relative=comparison?pathname.slice('/comparison'.length):pathname;
    const target=path.resolve(base,'.'+(relative==='/'?'/index.html':relative));
    if(!target.startsWith(base+path.sep)||!types[path.extname(target)]){res.writeHead(403).end();return;}
    const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(4174,'127.0.0.1',()=>console.log('Unmodified Design v2 reference: http://127.0.0.1:4174/#home'));
