import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {stagingDesignAsset,stagingReviewPolicy} from '../lib/server/staging-design-review.ts';

const root=path.resolve('.wrangler/homeowner-v3-staging-assets');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(!stagingDesignAsset(url.pathname))return res.writeHead(404).end();
    let name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
    if(!path.extname(name))name+='.html';
    const file=path.resolve(root,'.'+name);
    if(!file.startsWith(root+path.sep))return res.writeHead(404).end();
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','Content-Security-Policy':stagingReviewPolicy(url.pathname)}).end(data);
  }catch{res.writeHead(404).end();}
}).listen(4176,'127.0.0.1',()=>console.log('Local isolated v3 viewer: http://127.0.0.1:4176/design-review/'));
