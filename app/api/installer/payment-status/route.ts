import { z } from 'zod';
import { getInstallerSession } from '@/lib/installer/auth';
import { membership } from '@/lib/installer/portal-data';
import { readPaymentOrder, reconcileOrder, type StoredPaymentOrder } from '@/lib/installer/payments';
import { assertPlatformRequest, platformBody, platformJson } from '@/lib/installer/platform';
import { requireDatabase } from '@/lib/server/runtime';
import { allowInstallerRequest } from '@/lib/installer/rate-limit';

export const dynamic='force-dynamic';
const orderIdSchema=z.string().uuid();
function projection(order:StoredPaymentOrder) {
  return {id:order.id,status:order.status,amountMinor:order.amount_minor,currency:order.currency,credits:order.credits,credited:!!order.credited_at,receiptReference:order.receipt_reference};
}
async function companyFor(request:Request,db:D1Database) {
  const session=await getInstallerSession(request);
  if(!session?.user.emailVerified)return null;
  const company=await membership(db,session.user.id);
  return company?{id:String(company.id),userId:session.user.id}:null;
}
function failure(error:unknown) {
  if(error instanceof Error&&error.message==='payment_order_not_found')return platformJson({error:'payment_order_not_found'},404);
  return platformJson({error:'payment_status_unavailable'},503);
}
export async function GET(request:Request) {
  try {
    assertPlatformRequest(request);
    const orderId=orderIdSchema.safeParse(new URL(request.url).searchParams.get('orderId'));
    if(!orderId.success)return platformJson({error:'invalid_order'},400);
    const db=requireDatabase(),company=await companyFor(request,db);
    if(!company)return platformJson({error:'verified_account_required'},401);
    return platformJson({order:projection(await readPaymentOrder(db,company.id,orderId.data))});
  } catch(error){return failure(error);}
}
export async function POST(request:Request) {
  try {
    const body=z.object({orderId:orderIdSchema}).strict().parse(await platformBody(request,256));
    const db=requireDatabase(),company=await companyFor(request,db);
    if(!company)return platformJson({error:'verified_account_required'},401);
    // Deny a foreign order before spending a provider read or revealing its state.
    await readPaymentOrder(db,company.id,body.orderId);
    if(!await allowInstallerRequest(db,`payment-status:${company.userId}`,15,60))return platformJson({error:'too_many_requests'},429);
    const order=await reconcileOrder(db,company.id,body.orderId,request);
    return platformJson({order:projection(order)});
  } catch(error){return failure(error);}
}
