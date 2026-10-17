import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';

// Serves the original reference bytes locally; never rewrites or packages them.
const root=path.resolve('docs/design-v3/prototype');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const target=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
    if(!target.startsWith(root+path.sep)||!types[path.extname(target)]){res.writeHead(403).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)],'Cache-Control':'no-store'}).end(await readFile(target));
  }catch{res.writeHead(404).end();}
}).listen(4175,'127.0.0.1',()=>console.log('Untouched V3 reference: http://127.0.0.1:4175/#home'));
