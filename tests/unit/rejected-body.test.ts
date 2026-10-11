import {afterEach,expect,it,vi} from 'vitest';
import {discardRejectedBody} from '@/lib/server/rejected-body';
afterEach(()=>vi.useRealTimers());
it('discards a small rejected body without parsing it',async()=>{
  const request=new Request('https://example.test/admin/api/installer-platform',{method:'POST',body:'untrusted, not JSON'});
  await discardRejectedBody(request);expect(request.bodyUsed).toBe(true);
});
it('cancels oversized rejected input rather than buffering or validating it',async()=>{
  const cancel=vi.fn();
  const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(32769));},cancel});
  await discardRejectedBody(new Request('https://example.test',{method:'POST',body,duplex:'half'} as RequestInit));
  expect(cancel).toHaveBeenCalledOnce();
});
it('bounds cleanup of a stalled input even when cancellation never settles',async()=>{
  vi.useFakeTimers();const cancel=vi.fn(()=>new Promise<void>(()=>{}));
  const body=new ReadableStream<Uint8Array>({cancel});
  const cleanup=discardRejectedBody(new Request('https://example.test',{method:'POST',body,duplex:'half'} as RequestInit));
  await vi.advanceTimersByTimeAsync(100);await cleanup;expect(cancel).toHaveBeenCalledOnce();
});
it('handles absent and already locked bodies without interfering with their owner',async()=>{
  await discardRejectedBody(new Request('https://example.test'));
  const request=new Request('https://example.test',{method:'POST',body:'synthetic'});
  const reader=request.body!.getReader();await discardRejectedBody(request);expect((await reader.read()).value).toBeDefined();reader.releaseLock();
});
