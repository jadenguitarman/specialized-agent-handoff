import { publicConfig } from '../../../src/handoff-api.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(publicConfig(), { headers: { 'Cache-Control': 'no-store' } });
}
