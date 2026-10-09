const headerBase = Object.freeze({
  'Cache-Control': 'no-store',
  Vary: 'Origin',
});

function allowedOrigins() {
  return new Set(
    String(process.env.EMBED_ALLOWED_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isAllowedEmbedOrigin(origin) {
  return !origin || allowedOrigins().has(origin);
}

export function corsHeaders(origin, extra = {}) {
  const headers = { ...headerBase, ...extra };
  if (origin && isAllowedEmbedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

export function preflightHeaders(origin) {
  return corsHeaders(origin, { 'Access-Control-Max-Age': '600' });
}
