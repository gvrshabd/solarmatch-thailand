import { requireDatabase } from '@/lib/server/runtime';
import { assertPlatformRequest, platformJson } from '@/lib/installer/platform';
import { applyConfirmedPayment, paymentConfig, type StoredPaymentOrder } from '@/lib/installer/payments';
import { confirmPayment, verifyPaymentEvent } from '@/lib/installer/providers/payment';
export async function POST(request:Request) {
  try {
    if(assertPlatformRequest(request).mode!=='sandbox')return platformJson({error:'sandbox_payment_required'},403);
    const reader=request.body?.getReader(); if(!reader)return platformJson({error:'invalid_payload'},400);
    const chunks:Uint8Array[]=[];let length=0;
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>100000){await reader.cancel();return platformJson({error:'payload_too_large'},413);}chunks.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const raw=new TextDecoder().decode(bytes);
    const db=requireDatabase(),config={...await paymentConfig(db,request),sandboxEnabled:true};
    const event=await verifyPaymentEvent(raw,request.headers,config);
    const row=await db.prepare('SELECT * FROM installer_payment_orders WHERE provider_order_id=? AND provider=?').bind(event.chargeId,'omise').first<StoredPaymentOrder>();
    if(!row)return platformJson({received:true,matched:false});
    const payment=await confirmPayment({orderId:row.id,providerOrderId:event.chargeId,amountMinor:row.amount_minor,currency:row.currency},event.chargeId,config);
    await applyConfirmedPayment(db,row,payment,event.eventId);
    return platformJson({received:true});
  } catch { return platformJson({error:'payment_event_not_verified'},400); }
}
