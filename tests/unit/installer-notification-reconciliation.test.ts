import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({PHONE_VERIFICATION_SECRET:'fixture-phone-secret-thirty-two-characters',INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_TEST_CLOCK_ENABLED:'false',INSTALLER_BASE_URL:'http://localhost:3000'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry,suppressEnquiry} from '@/lib/installer/deliveries';
import {reconcileNotification} from '@/lib/installer/notification-reconciliation';

describe('reviewed ambiguous homeowner SMS',()=>{
  let fixture:FixtureDatabase;
  beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));fixture=new FixtureDatabase();await seedFixture(fixture.d1());});
  afterEach(()=>{fixture.close();vi.useRealTimers();});
  async function ambiguous(phone='+66812345678') {
    const lead=await seedLead(fixture.d1(),phone);
    const delivery=await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1']);
    expect(delivery.allocated).toHaveLength(1);
    const id=`homeowner-${delivery.allocated[0]}`;
    fixture.sqlite.prepare("UPDATE installer_outbox SET state='needs-reconciliation' WHERE id=?").run(id);
    return {id,...lead};
  }
  it('accepts only valid provider evidence and audits one actual transition',async()=>{
    const {id}=await ambiguous();const reference=`SM${'a'.repeat(32)}`;
    await expect(reconcileNotification(fixture.d1(),'missing','accepted','Confirmed against provider transaction.',reference,'admin','local-test')).rejects.toThrow();
    expect(fixture.sqlite.prepare("SELECT count(*) AS total FROM audit_events WHERE action='installer.reconcile-notification'").get()).toMatchObject({total:0});
    await expect(reconcileNotification(fixture.d1(),id,'accepted','Confirmed against provider transaction.','bogus','admin','local-test')).rejects.toThrow();
    expect(await reconcileNotification(fixture.d1(),id,'accepted','Confirmed against provider transaction.',reference,'admin','local-test')).toMatchObject({state:'accepted'});
    await expect(reconcileNotification(fixture.d1(),id,'accepted','Repeated reconciliation attempt.',reference,'admin','local-test')).rejects.toThrow();
    expect(fixture.sqlite.prepare('SELECT state,provider_reference FROM installer_outbox WHERE id=?').get(id)).toMatchObject({state:'accepted',provider_reference:reference});
    expect(fixture.sqlite.prepare("SELECT count(*) AS total FROM audit_events WHERE action='installer.reconcile-notification'").get()).toMatchObject({total:1});
  });
  it('confirms not sent only for a still-consented delivery, without charge or retry',async()=>{
    const {id}=await ambiguous();
    const ledgerBefore=fixture.sqlite.prepare('SELECT count(*) AS total FROM installer_credit_ledger').get();
    await expect(reconcileNotification(fixture.d1(),id,'not-sent','Provider search confirms no accepted message.','SM'+ 'a'.repeat(32),'admin','local-test')).rejects.toThrow();
    expect(await reconcileNotification(fixture.d1(),id,'not-sent','Provider search confirms no accepted message.',undefined,'admin','local-test')).toMatchObject({state:'failed'});
    expect(fixture.sqlite.prepare('SELECT state,last_error FROM installer_outbox WHERE id=?').get(id)).toMatchObject({state:'failed',last_error:'confirmed_not_sent'});
    expect(fixture.sqlite.prepare('SELECT count(*) AS total FROM installer_credit_ledger').get()).toEqual(ledgerBefore);
    const second=await ambiguous('+66812345679');
    await suppressEnquiry(fixture.d1(),second.enquiryId,'Synthetic withdrawal before reconciliation','fixture');
    await expect(reconcileNotification(fixture.d1(),second.id,'accepted','Provider lookup confirmed accepted send.',`SM${'b'.repeat(32)}`,'admin','local-test')).rejects.toThrow();
  });
});
