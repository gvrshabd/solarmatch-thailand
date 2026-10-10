import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_AUTH_SECRET:'fixture-signing-secret-longer-than-thirty-two-characters'})}));
import {allowInstallerRequest,trustedShareAddress} from '@/lib/installer/rate-limit';
import {FixtureDatabase} from '../installer/fixtures';
let fixture:FixtureDatabase;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));fixture=new FixtureDatabase();});
afterEach(()=>{fixture.close();vi.useRealTimers();});
describe('installer request throttling',()=>{
  it('atomically limits concurrent requests per authenticated user, not every company globally',async()=>{
    const accepted=await Promise.all(Array.from({length:35},()=>allowInstallerRequest(fixture.d1(),'portal:verified-user-1',30,60)));
    expect(accepted.filter(Boolean)).toHaveLength(30);
    expect(await allowInstallerRequest(fixture.d1(),'portal:verified-user-2',30,60)).toBe(true);
    expect(String(fixture.sqlite.prepare('SELECT key_hash FROM public_request_limits LIMIT 1').get()?.key_hash)).not.toContain('verified-user');
    vi.setSystemTime(new Date('2026-10-11T03:01:00.000Z'));expect(await allowInstallerRequest(fixture.d1(),'portal:verified-user-1',30,60)).toBe(true);
  });
  it('ignores forged IP headers without trusted edge metadata',()=>{
    const request=new Request('https://example.test/api/installer/share',{headers:{'cf-connecting-ip':'1.2.3.4','x-forwarded-for':'8.8.8.8'}});
    expect(trustedShareAddress(request)).toBe('untrusted-origin');
    Object.defineProperty(request,'cf',{value:{colo:'BKK'}});expect(trustedShareAddress(request)).toBe('1.2.3.4');
    request.headers.set('cf-connecting-ip','1.2.3.4, 8.8.8.8');expect(trustedShareAddress(request)).toBe('edge-unknown');
    request.headers.set('cf-connecting-ip','2001:db8::1');expect(trustedShareAddress(request)).toBe('2001:db8::1');
    const local=new Request('http://localhost:3000/api/installer/share',{headers:{'cf-connecting-ip':'1.2.3.4'}});expect(trustedShareAddress(local)).toBe('local-loopback');
  });
});
