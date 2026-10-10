import {describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({})}));
import {assertInstallerJobEnvironment,processOutbox,runInstallerJobs} from '@/lib/installer/jobs';
describe('background job environment isolation',()=>{
  it.each([
    ['local-test',undefined],['local-test','https://example.test'],['local-test','ftp://localhost'],
    ['sandbox',undefined],['sandbox','http://example.test'],['sandbox','https://localhost'],
    ['sandbox','https://127.0.0.1'],['sandbox','https://[::1]'],['sandbox','https://user:secret@example.test'],
    ['sandbox','https://example.test/path'],['sandbox','https://example.test/?token=private'],
  ])('rejects %s with invalid base URL before any DB access',async(mode,base)=>{
    const prepare=vi.fn(),batch=vi.fn(),db={prepare,batch} as unknown as D1Database;
    const env={DB:db,INSTALLER_PLATFORM_MODE:mode,INSTALLER_BASE_URL:base};
    await expect(runInstallerJobs(env)).rejects.toThrow('platform_unavailable');
    await expect(processOutbox(db,env)).rejects.toThrow('platform_unavailable');
    expect(prepare).not.toHaveBeenCalled();expect(batch).not.toHaveBeenCalled();
  });
  it('permits explicitly configured loopback tests and HTTPS remote sandbox only',()=>{
    for(const base of ['http://localhost:3000','https://127.0.0.1:3000','http://[::1]:3000'])expect(()=>assertInstallerJobEnvironment({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:base})).not.toThrow();
    expect(()=>assertInstallerJobEnvironment({INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://example.test'})).not.toThrow();
  });
  it('keeps disabled scheduled jobs inert without touching DB',async()=>{
    const prepare=vi.fn(),db={prepare} as unknown as D1Database;await runInstallerJobs({DB:db,INSTALLER_PLATFORM_MODE:'off'});expect(prepare).not.toHaveBeenCalled();
  });
});
