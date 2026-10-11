/** Bounded HTTP cleanup only; never parse, log or act on a rejected payload. */
export async function discardRejectedBody(request: Request) {
  if (!request.body || request.body.locked) return;
  const reader = request.body.getReader();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // Cancellation itself can stall, so it must not hold up the rejection.
  const cancel = () => { void reader.cancel().catch(() => {}); };
  try {
    await Promise.race([
      (async () => {
        let bytes = 0;
        while (true) {
          const part = await reader.read();
          if (part.done) return;
          bytes += part.value.byteLength;
          if (bytes > 32 * 1024) { cancel(); return; }
        }
      })(),
      new Promise<void>(resolve => {
        timeout = setTimeout(() => { cancel(); resolve(); }, 100);
      }),
    ]);
  } catch {
    cancel();
  } finally {
    clearTimeout(timeout);
    try { reader.releaseLock(); } catch { /* Cancellation may still be settling. */ }
  }
}
