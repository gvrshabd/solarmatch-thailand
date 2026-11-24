import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const worker = readFileSync('public/installers/installer-app-worker.js','utf8');
function navigation(path: string, mode = 'navigate', method = 'GET', online = false) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const response = new Response('server response', {status:401});
  const fetch = vi.fn(() => online ? Promise.resolve(response) : Promise.reject(new TypeError('offline')));
  const respondWith = vi.fn();
  runInNewContext(worker, {
    URL, Response, fetch, self: {location: {origin:'https://installer.example.test'}, addEventListener(type: string, listener: (event:unknown) => void) {listeners[type] = listener;} },
  });
  listeners.fetch({request:{url:new URL(path,'https://installer.example.test').href,method,mode}, respondWith});
  return {fetch, respondWith, response};
}
describe('installer app offline navigation', () => {
  it('preserves server responses including authentication failures', async () => {
    const {respondWith,response} = navigation('/installers/app','navigate','GET',true);
    expect(await respondWith.mock.calls[0][0]).toBe(response);
  });
  it.each(['/api/installer/portal','/enquiry','/installers','/installers/application','/en','https://external.example.test/installers/app'])('ignores %s', path => {
    expect(navigation(path).respondWith).not.toHaveBeenCalled();
  });
  it('never handles writes or background reads', () => {
    expect(navigation('/installers/app','navigate','POST').respondWith).not.toHaveBeenCalled();
    expect(navigation('/installers/app','cors').respondWith).not.toHaveBeenCalled();
  });
  it.each([['en','Check your connection'],['th','ตรวจสอบการเชื่อมต่อ']])('shows a private retry screen in %s',async (lang,title) => {
    const {respondWith} = navigation('/installers/app/enquiry/fictional-id?lang='+lang+'&token=private-marker');
    const response: Response = await respondWith.mock.calls[0][0];
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const html = await response.text();
    expect(html).toContain(title);
    expect(html).not.toMatch(/fictional-id|private-marker/);
  });
});
