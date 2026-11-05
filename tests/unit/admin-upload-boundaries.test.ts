import { describe, expect, it, vi } from 'vitest';
import { limitedUploadForm, rasterImageMatchesType, UploadTooLarge } from '@/lib/server/admin-upload';
const storage = vi.hoisted(() => ({ put: vi.fn() }));
const dimensions = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/admin-api', () => ({ requireAdminRequest: async () => ({ email: 'synthetic@example.test' }), isAdminError: () => false }));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => ({ MEDIA: storage }), requireDatabase: vi.fn(() => { throw new Error('unexpected_database_access'); }) }));
vi.mock('image-size', () => ({ imageSize: dimensions }));
import { POST as uploadMedia } from '@/app/admin/api/media/route';
import { POST as uploadContract } from '@/app/admin/api/partner-contracts/route';

describe('administrator upload boundaries', () => {
  it('rejects relabeled SVG at the media route before invoking the image parser or storage', async () => {
    const form = new FormData();
    form.set('file', new File(['<svg width="1" height="1"></svg>'], 'image.png', { type: 'image/png' }));
    form.set('purpose', 'synthetic'); form.set('altEn', 'Synthetic'); form.set('altTh', 'Synthetic');
    const response = await uploadMedia(new Request('https://example.test/admin/api/media', { method: 'POST', body: form }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_image_content' });
    expect(dimensions).not.toHaveBeenCalled(); expect(storage.put).not.toHaveBeenCalled();
  });

  it('returns 413 at both upload routes before multipart parsing or storage', async () => {
    for (const handler of [uploadMedia, uploadContract]) {
      const request = new Request('https://example.test/admin/api/upload', { method: 'POST', body: 'small', headers: { 'content-length': '20000000', 'content-type': 'multipart/form-data; boundary=synthetic' } });
      expect((await handler(request)).status).toBe(413);
    }
    expect(storage.put).not.toHaveBeenCalled();
  });
  it('parses an allowed multipart envelope and rejects oversized extra fields', async () => {
    const form = new FormData();
    form.set('file', new File(['synthetic contract'], 'contract.pdf', { type: 'application/pdf' }));
    const request = new Request('https://example.test/upload', { method: 'POST', body: form });
    expect((await limitedUploadForm(request, 4096)).get('file')).toBeInstanceOf(File);
    form.set('ignored', 'x'.repeat(4096));
    const oversized = new Request('https://example.test/upload', { method: 'POST', body: form });
    // Serialize the fixture fully before cancellation (Node's multipart fixture
    // producer otherwise enqueues after cancellation; edge requests are streams).
    const bytes = await oversized.arrayBuffer();
    await expect(limitedUploadForm(new Request(oversized.url, { method: 'POST', body: bytes, headers: oversized.headers }), 4096)).rejects.toBeInstanceOf(UploadTooLarge);
  });

  it('counts streamed bytes without trusting Content-Length and cancels without waiting', async () => {
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(33)); }, cancel });
    const request = new Request('https://example.test/upload', { method: 'POST', body, duplex: 'half', headers: { 'content-length': '1' } } as RequestInit);
    await expect(limitedUploadForm(request, 32)).rejects.toBeInstanceOf(UploadTooLarge);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('rejects oversized declared bodies before reading', async () => {
    const request = new Request('https://example.test/upload', { method: 'POST', body: 'small', headers: { 'content-length': '1000' } });
    await expect(limitedUploadForm(request, 100)).rejects.toBeInstanceOf(UploadTooLarge);
  });

  it('rejects SVG, ICNS and JXL relabeled as supported images before format parsing', () => {
    for (const bytes of [new TextEncoder().encode('<svg width="1" height="1"></svg>'), new TextEncoder().encode('icns'), new Uint8Array([0xff, 0x0a])]) {
      for (const type of ['image/png', 'image/jpeg', 'image/webp']) expect(rasterImageMatchesType(bytes, type)).toBe(false);
    }
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(rasterImageMatchesType(png, 'image/png')).toBe(true);
    expect(rasterImageMatchesType(png, 'image/jpeg')).toBe(false);
    expect(rasterImageMatchesType(new Uint8Array([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(true);
    expect(rasterImageMatchesType(new TextEncoder().encode('RIFF0000WEBP'), 'image/webp')).toBe(true);
  });
});
