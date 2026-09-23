import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const publicRoot = join(root, 'public');
const providerTimeoutMs = 12_000;
const maxBodyBytes = 256 * 1024;

const ALLOWED_AGENTS = Object.freeze({ sales: 'SALES_AGENT_STUDIO_AGENT_ID', support: 'SUPPORT_AGENT_STUDIO_AGENT_ID' });
const ALLOWED_DESTINATIONS = new Set(Object.keys(ALLOWED_AGENTS));
const MIME_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
});

// Load .env without depending on dotenv. Values are used only by server-side provider calls.
const envFile = await readFile(join(root, '.env'), 'utf8').catch(() => '');
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match || process.env[match[1]]) continue;
  process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function publicConfig() {
  return {
    configured: Boolean(process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_AGENT_STUDIO_API_KEY &&
      process.env.SALES_AGENT_STUDIO_AGENT_ID && process.env.SUPPORT_AGENT_STUDIO_AGENT_ID),
    agents: { sales: 'Sales', support: 'Support' },
    timeoutMs: providerTimeoutMs,
  };
}

function readJson(req) {
  return new Promise((resolveBody, rejectBody) => {
    let received = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBodyBytes) {
        rejectBody(new Error('Request body is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        rejectBody(new Error('Request body must be valid JSON.'));
      }
    });
    req.on('error', rejectBody);
  });
}

function text(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required.`);
  const result = value.trim();
  if (result.length > maxLength) throw new ValidationError(`${field} is too long.`);
  return result;
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') return '';
  return text(value, field, maxLength);
}

function validateAgent(agent) {
  if (typeof agent !== 'string' || !ALLOWED_DESTINATIONS.has(agent)) {
    throw new ValidationError('Unknown agent destination. Choose Sales or Support.');
  }
  return agent;
}

function validateContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Approved user and tenant context is required.');
  }
  const keys = Object.keys(value);
  const allowed = new Set(['userId', 'tenantId', 'plan']);
  if (keys.some((key) => !allowed.has(key))) throw new ValidationError('Context contains an unapproved field.');
  const result = {
    userId: text(value.userId, 'context.userId', 120),
    tenantId: text(value.tenantId, 'context.tenantId', 120),
  };
  if (value.plan !== undefined) result.plan = text(value.plan, 'context.plan', 80);
  const bytes = Buffer.byteLength(JSON.stringify(result));
  if (bytes > 2_000) throw new ValidationError('Approved context is too large.');
  return result;
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new ValidationError('The conversation must contain between 1 and 12 messages.');
  }
  return value.map((message, index) => {
    if (!message || !['user', 'assistant'].includes(message.role)) {
      throw new ValidationError(`messages[${index}].role is invalid.`);
    }
    return {
      id: typeof message.id === 'string' ? message.id.slice(0, 120) : `msg_${randomUUID()}`,
      role: message.role,
      content: text(message.content, `messages[${index}].content`, 4_000),
      parts: [{ type: 'text', text: text(message.content, `messages[${index}].content`, 4_000) }],
    };
  });
}

function validateChatBody(body) {
  return {
    agent: validateAgent(body.agent),
    messages: validateMessages(body.messages),
    conversationId: optionalText(body.conversationId, 'conversationId', 120) || `chat_${randomUUID()}`,
  };
}

function validateHandoffBody(body) {
  const destination = validateAgent(body.destination);
  if (destination !== 'support') throw new ValidationError('This demo only permits Sales to request Support.');
  const sourceAgent = body.sourceAgent === undefined ? 'sales' : validateAgent(body.sourceAgent);
  if (sourceAgent !== 'sales') throw new ValidationError('Only the Sales agent can request this handoff.');
  return {
    destination,
    latestQuestion: text(body.latestQuestion, 'latestQuestion', 4_000),
    summary: text(body.summary, 'summary', 2_000),
    context: validateContext(body.context),
    sourceAgent,
    conversationId: optionalText(body.conversationId, 'conversationId', 120) || `handoff_${randomUUID()}`,
  };
}

function providerReady(agent) {
  const envName = ALLOWED_AGENTS[agent];
  return Boolean(process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_AGENT_STUDIO_API_KEY && process.env[envName]);
}

function providerUrl(agent) {
  const appId = encodeURIComponent(process.env.ALGOLIA_APPLICATION_ID);
  const agentId = encodeURIComponent(process.env[ALLOWED_AGENTS[agent]]);
  return `https://${appId}.algolia.net/agent-studio/1/agents/${agentId}/completions?stream=false&compatibilityMode=ai-sdk-5`;
}

function providerError(status, detail) {
  const error = new Error(detail || 'Agent Studio request failed.');
  error.kind = status === 429 ? 'rate_limited' : status >= 500 ? 'provider_unavailable' : 'provider_rejected';
  error.status = status;
  return error;
}

function responseText(payload) {
  if (Array.isArray(payload?.parts)) {
    const parts = payload.parts.filter((part) => part?.type === 'text' && typeof part.text === 'string');
    if (parts.length) return parts.map((part) => part.text).join('');
  }
  if (typeof payload?.content === 'string') return payload.content;
  if (Array.isArray(payload?.messages)) {
    const message = payload.messages.find((item) => item?.role === 'assistant');
    if (typeof message?.content === 'string') return message.content;
  }
  return '';
}

async function callAgent(agent, messages, signal, conversationId) {
  if (!providerReady(agent)) {
    const error = new Error('Agent Studio is not configured. Add the server-side values from .env.example.');
    error.kind = 'not_configured';
    throw error;
  }
  const response = await fetch(providerUrl(agent), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-Application-Id': process.env.ALGOLIA_APPLICATION_ID,
      'X-Algolia-API-Key': process.env.ALGOLIA_AGENT_STUDIO_API_KEY,
    },
    body: JSON.stringify({ id: conversationId || messages[0]?.conversationId || `alg_cnv_${randomUUID()}`, messages }),
    signal,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw providerError(response.status, detail.slice(0, 240));
  }
  const payload = await response.json();
  const content = responseText(payload);
  if (!content) {
    const error = new Error('Agent Studio returned no assistant text.');
    error.kind = 'provider_invalid_response';
    throw error;
  }
  return { content, messageId: payload.messageId || payload.id || null };
}

async function callWithRetry(agent, messages, signal, conversationId) {
  let attempts = 0;
  while (attempts < 2) {
    attempts += 1;
    try {
      return { ...(await callAgent(agent, messages, signal, conversationId)), attempts };
    } catch (error) {
      if (signal.aborted || !['rate_limited', 'provider_unavailable'].includes(error.kind) || attempts === 2) throw error;
      await new Promise((resolveRetry, rejectRetry) => {
        const timer = setTimeout(resolveRetry, 300);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          rejectRetry(signal.reason || new Error('Request cancelled.'));
        }, { once: true });
      });
    }
  }
  throw new Error('Agent Studio request failed.');
}

function handoffPrompt({ latestQuestion, summary, context }) {
  return [
    'You are receiving a narrowly scoped application-owned handoff from Sales.',
    'Answer the latest question as Support. Do not infer or request additional identity data.',
    '',
    `Latest question:\n${latestQuestion}`,
    `Sales summary:\n${summary}`,
    `Approved context:\n${JSON.stringify(context)}`,
  ].join('\n');
}

function errorPayload(error) {
  const known = new Set(['not_configured', 'rate_limited', 'provider_unavailable', 'provider_rejected', 'provider_invalid_response']);
  return {
    error: known.has(error.kind) ? error.kind : error.name === 'AbortError' ? 'cancelled' : 'request_failed',
    message: error.kind === 'not_configured'
      ? error.message
      : error.kind === 'rate_limited'
        ? 'Agent Studio is rate limiting this demo. Retry when ready.'
        : error.kind === 'provider_unavailable'
          ? 'Agent Studio is temporarily unavailable. Retry in a moment.'
          : error.kind === 'provider_rejected'
            ? 'Agent Studio rejected the request. Check the agent and API key configuration.'
            : error.message || 'The request could not be completed.',
  };
}

async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(publicRoot, requested));
  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}/`)) return json(res, 404, { error: 'not_found' });
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    json(res, 404, { error: 'not_found' });
  }
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Agent Studio request timed out.')), providerTimeoutMs);
  req.on('aborted', () => controller.abort(new Error('Request cancelled.')));

  try {
    if (req.method === 'GET' && requestUrl.pathname === '/api/config') {
      json(res, 200, publicConfig());
      return;
    }
    if (req.method === 'POST' && (requestUrl.pathname === '/api/chat' || requestUrl.pathname === '/api/handoff')) {
      const body = await readJson(req);
      if (requestUrl.pathname === '/api/chat') {
        const input = validateChatBody(body);
        const result = await callWithRetry(input.agent, input.messages, controller.signal, input.conversationId);
        json(res, 200, { ...result, agent: input.agent });
      } else {
        const input = validateHandoffBody(body);
        const startedAt = Date.now();
        const handoffMessage = {
          id: `msg_${randomUUID()}`,
          role: 'user',
          content: handoffPrompt(input),
          parts: [{ type: 'text', text: handoffPrompt(input) }],
          conversationId: input.conversationId,
        };
        const result = await callWithRetry(input.destination, [handoffMessage], controller.signal, input.conversationId);
        json(res, 200, {
          ...result,
          agent: input.destination,
          handoff: {
            id: `handoff_${randomUUID()}`,
            sourceAgent: input.sourceAgent,
            destination: input.destination,
            latencyMs: Date.now() - startedAt,
            contextBytes: Buffer.byteLength(JSON.stringify(input.context)),
          },
        });
      }
      return;
    }
    if (req.method === 'GET') {
      await serveStatic(req, res, requestUrl.pathname);
      return;
    }
    json(res, 405, { error: 'method_not_allowed' });
  } catch (error) {
    if (error instanceof ValidationError) {
      json(res, 400, { error: 'validation_failed', message: error.message });
    } else if (error.name === 'AbortError' || controller.signal.aborted) {
      json(res, 504, { error: 'timeout', message: 'The Agent Studio request timed out or was cancelled.' });
    } else {
      json(res, error.status || 502, errorPayload(error));
    }
  } finally {
    clearTimeout(timeout);
  }
});

class ValidationError extends Error {}

server.listen(port, '127.0.0.1', () => {
  console.log(`Specialized agent handoff demo listening on http://localhost:${port}`);
});
