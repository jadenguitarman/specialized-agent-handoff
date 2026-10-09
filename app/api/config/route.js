import { publicConfig } from '../../../src/handoff-api.mjs';
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

export function GET(request) {
  return Response.json(publicConfig(), { headers: corsHeaders(request.headers.get('origin')) });
}
