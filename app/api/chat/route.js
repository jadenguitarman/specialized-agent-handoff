import { errorPayload, handleChat, providerTimeoutMs, ValidationError } from '../../../src/handoff-api.mjs';
import { corsHeaders, isAllowedEmbedOrigin, preflightHeaders } from '../../../src/embed-cors.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(request) {
  const origin = request.headers.get('origin');
  return new Response(null, {
    status: isAllowedEmbedOrigin(origin) ? 204 : 403,
    headers: preflightHeaders(origin),
  });
}

export async function POST(request) {
  const origin = request.headers.get('origin');
  try {
    const result = await handleChat(await request.json(), AbortSignal.timeout(providerTimeoutMs));
    return Response.json(result, { headers: corsHeaders(origin) });
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : error.status || 502;
    return Response.json(error instanceof ValidationError ? { error: 'validation_failed', message: error.message } : errorPayload(error), { status, headers: corsHeaders(origin) });
  }
}
