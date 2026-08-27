export async function POST() {
  // Fail closed: the current prototype validates locally and must not accept contact data.
  return Response.json(
    { ok: false, code: 'LEAD_SUBMISSION_DISABLED', persisted: false },
    { status: 410, headers: { 'cache-control': 'no-store' } },
  );
}
