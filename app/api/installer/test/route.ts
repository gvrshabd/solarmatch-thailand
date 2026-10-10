import { assertPlatformRequest,platformJson,platformBody } from '@/lib/installer/platform';
import { requireDatabase } from '@/lib/server/runtime';
import { seedLocalInstallerFixtures } from '@/lib/installer/test-fixtures';
import {recordLocalPayment} from '@/lib/installer/payments';
import {z} from 'zod';
export const dynamic='force-dynamic';
/** Dedicated development view. Ordinary OTP responses never include a code. */
export async function GET(request:Request) {
  try {
    if (assertPlatformRequest(request).mode!=='local-test') return platformJson({error:'unavailable'},404);
    const messages=await requireDatabase().prepare('SELECT id,channel,recipient,body,created_at FROM installer_test_messages ORDER BY created_at DESC LIMIT 50').all();
    return platformJson({mode:'local-test',messages:messages.results});
  } catch {return platformJson({error:'unavailable'},404);}
}
export async function POST(request:Request) {
  try {
    if(assertPlatformRequest(request).mode!=='local-test') return platformJson({error:'unavailable'},404);
    const body=z.discriminatedUnion('action',[
      z.object({action:z.literal('seed')}).strict(),
      z.object({action:z.literal('payment'),orderId:z.string().uuid(),status:z.enum(['paid','failed','cancelled','reversed'])}).strict(),
    ]).parse(await platformBody(request,256));
    if(body.action==='payment') return platformJson(await recordLocalPayment(requireDatabase(),body.orderId,body.status,request));
    return platformJson(await seedLocalInstallerFixtures(request,requireDatabase()));
  } catch {return platformJson({error:'unavailable'},404);}
}
