import { requireDatabase } from '@/lib/server/runtime';
import { platformJson } from '@/lib/installer/platform';
import { processLineWebhook } from '@/lib/installer/line-linking';
export async function POST(request:Request){try{
  const reader=request.body?.getReader();if(!reader)return platformJson({error:'invalid_payload'},400);
  const chunks:Uint8Array[]=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>100000){await reader.cancel();return platformJson({error:'payload_too_large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return platformJson(await processLineWebhook(requireDatabase(),request,new TextDecoder().decode(bytes)));
}catch{return platformJson({error:'line_event_not_verified'},400);}}
