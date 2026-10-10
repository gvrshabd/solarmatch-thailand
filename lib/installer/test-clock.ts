import { getRuntimeEnv } from '@/lib/server/runtime';
import { assertPlatformRequest,isLoopback } from './platform';

/** Test-only clock; production refuses a database containing an active override. */
export async function installerAllocationNow(db:D1Database) {
  const row=await db.prepare('SELECT fixed_at FROM installer_test_clock WHERE id=1').first<{fixed_at:string|null}>();
  if(!row?.fixed_at)return new Date();
  const env=getRuntimeEnv();
  if(env.INSTALLER_PLATFORM_MODE!=='local-test'||env.INSTALLER_TEST_CLOCK_ENABLED!=='true'||!env.INSTALLER_BASE_URL||!isLoopback(env.INSTALLER_BASE_URL))throw new Error('test_clock_not_allowed');
  const date=new Date(row.fixed_at);
  if(!Number.isFinite(date.getTime()))throw new Error('invalid_test_clock');
  return date;
}
export async function setLocalTestClock(db:D1Database,request:Request,fixedAt:string|null) {
  if(assertPlatformRequest(request).mode!=='local-test'||getRuntimeEnv().INSTALLER_TEST_CLOCK_ENABLED!=='true')throw new Error('test_clock_not_allowed');
  if(fixedAt!==null&&(!Number.isFinite(Date.parse(fixedAt))||Math.abs(Date.parse(fixedAt)-Date.now())>86400000))throw new Error('test_clock_must_be_within_one_day');
  await db.prepare('UPDATE installer_test_clock SET fixed_at=? WHERE id=1').bind(fixedAt).run();
  return {mode:'local-test',fixedAt};
}
