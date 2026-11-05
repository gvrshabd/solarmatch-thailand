export class UploadTooLarge extends Error {}

/** Bound the complete multipart envelope before the platform parses its parts. */
export async function limitedUploadForm(request: Request, maximumBytes: number): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing_upload');
  const cancel = () => { void reader.cancel().catch(() => {}); };
  if (Number(request.headers.get('content-length') ?? 0) > maximumBytes) {
    cancel();
    throw new UploadTooLarge();
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximumBytes) { cancel(); throw new UploadTooLarge(); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
}

/** Never dispatch untrusted formats to a parser based on a caller's MIME label. */
export function rasterImageMatchesType(bytes: Uint8Array, type: string): boolean {
  const matches = (offset: number, expected: number[]) => expected.every((value, index) => bytes[offset + index] === value);
  if (type === 'image/jpeg') return matches(0, [0xff, 0xd8, 0xff]);
  if (type === 'image/png') return matches(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === 'image/webp') return matches(0, [0x52, 0x49, 0x46, 0x46]) && matches(8, [0x57, 0x45, 0x42, 0x50]);
  return false;
}
