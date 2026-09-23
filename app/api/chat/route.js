import { errorPayload, handleChat, ValidationError } from '../../../src/handoff-api.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const result = await handleChat(await request.json(), AbortSignal.timeout(12_000));
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : error.status || 502;
    return Response.json(error instanceof ValidationError ? { error: 'validation_failed', message: error.message } : errorPayload(error), { status });
  }
}
