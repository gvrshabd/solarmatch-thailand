import { platformBody,platformJson } from '@/lib/installer/platform';
import { readShareLink } from '@/lib/installer/share';
import { requireDatabase } from '@/lib/server/runtime';
import { z } from 'zod';
import {allowInstallerRequest,trustedShareAddress} from '@/lib/installer/rate-limit';
export async function POST(request:Request) {
  try { const {token}=z.object({token:z.string().regex(/^[A-Za-z0-9_-]{43}$/u)}).strict().parse(await platformBody(request,1024));const db=requireDatabase();if(!await allowInstallerRequest(db,`share:${trustedShareAddress(request)}`,60,60))return platformJson({error:'too_many_requests'},429);const result=await readShareLink(db,token);return result?platformJson(result):platformJson({error:'link_unavailable'},404); }
  catch{return platformJson({error:'link_unavailable'},404);}
}
