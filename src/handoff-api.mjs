import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const dotenvPath of [resolve(repoRoot, '..', '.env'), resolve(repoRoot, '.env')]) {
  const contents = await readFile(dotenvPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  for (const line of contents.split(/\r?\n/u)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/u, '$2');
  }
}

const providerTimeoutMs = 12_000;
const allowedAgents = Object.freeze({ sales: 'SALES_AGENT_STUDIO_AGENT_ID', support: 'SUPPORT_AGENT_STUDIO_AGENT_ID' });
const allowedDestinations = new Set(Object.keys(allowedAgents));
const specialistLabels = Object.freeze({ sales: 'Sales', support: 'Support' });
const transferTargets = Object.freeze({ sales: 'support', support: 'sales' });
const transferToolNames = Object.freeze({ sales: 'transfer_to_support', support: 'transfer_to_sales' });

export class ValidationError extends Error {}

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
  if (typeof agent !== 'string' || !allowedDestinations.has(agent)) {
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
  if (Buffer.byteLength(JSON.stringify(result)) > 2_000) throw new ValidationError('Approved context is too large.');
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
    const content = text(message.content, `messages[${index}].content`, 4_000);
    return {
      id: typeof message.id === 'string' ? message.id.slice(0, 120) : `msg_${randomUUID()}`,
      role: message.role,
      parts: [{ type: 'text', text: content }],
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
  return Boolean(process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_AGENT_STUDIO_API_KEY && process.env[allowedAgents[agent]]);
}

function providerUrl(agent) {
  const appId = encodeURIComponent(process.env.ALGOLIA_APPLICATION_ID);
  const agentId = encodeURIComponent(process.env[allowedAgents[agent]]);
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

function responseTransfer(payload, agent) {
  const toolName = transferToolNames[agent];
  const part = Array.isArray(payload?.parts)
    ? payload.parts.find((candidate) => candidate?.type === `tool-${toolName}` && (typeof candidate.tool_call_id === 'string' || typeof candidate.toolCallId === 'string'))
    : null;
  if (!part) return null;
  return {
    destination: transferTargets[agent],
    toolCallId: part.tool_call_id || part.toolCallId,
    reason: typeof part.input?.reason === 'string' ? part.input.reason.slice(0, 300) : '',
  };
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
    body: JSON.stringify({ id: conversationId || `alg_cnv_${randomUUID()}`, messages }),
    signal,
  });
  if (!response.ok) throw providerError(response.status, (await response.text().catch(() => '')).slice(0, 240));
  const payload = await response.json();
  const transfer = responseTransfer(payload, agent);
  if (transfer) return { transfer, messageId: payload.messageId || payload.id || null };
  const content = responseText(payload);
  if (!content) {
    const error = new Error('Agent Studio returned no assistant text.');
    error.kind = 'provider_invalid_response';
    throw error;
  }
  return { content, messageId: payload.messageId || payload.id || null };
}

async function callWithRetry(agent, messages, signal, conversationId) {
  for (let attempts = 1; attempts <= 2; attempts += 1) {
    try {
      return { ...(await callAgent(agent, messages, signal, conversationId)), attempts };
    } catch (error) {
      if (signal?.aborted || !['rate_limited', 'provider_unavailable'].includes(error.kind) || attempts === 2) throw error;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 300);
        signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason || new Error('Request cancelled.')); }, { once: true });
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

function transferOpening(agent) {
  return `Hi, I'm a ${specialistLabels[agent]} specialist. I just caught up on your conversation; let's see how I can help.`;
}

function transferContinuation(agent) {
  return [
    `You are now the ${specialistLabels[agent]} specialist receiving an application-owned transfer.`,
    'Write the next helpful response from here. Do not repeat the specialist introduction or mention internal routing.',
  ].join(' ');
}

export function publicConfig() {
  return {
    configured: Boolean(process.env.ALGOLIA_APPLICATION_ID && process.env.ALGOLIA_AGENT_STUDIO_API_KEY && process.env.SALES_AGENT_STUDIO_AGENT_ID && process.env.SUPPORT_AGENT_STUDIO_AGENT_ID),
    agents: { sales: 'Sales', support: 'Support' },
    timeoutMs: providerTimeoutMs,
  };
}

export async function handleChat(body, signal) {
  const input = validateChatBody(body || {});
  const result = await callWithRetry(input.agent, input.messages, signal, input.conversationId);
  return { ...result, agent: input.agent };
}

export async function handleHandoff(body, signal) {
  const input = validateHandoffBody(body || {});
  const startedAt = Date.now();
  const content = handoffPrompt(input);
  const handoffMessage = {
    id: `msg_${randomUUID()}`,
    role: 'user',
    parts: [{ type: 'text', text: content }],
  };
  const result = await callWithRetry(input.destination, [handoffMessage], signal, input.conversationId);
  return {
    ...result,
    agent: input.destination,
    handoff: {
      id: `handoff_${randomUUID()}`,
      sourceAgent: input.sourceAgent,
      destination: input.destination,
      latencyMs: Date.now() - startedAt,
      contextBytes: Buffer.byteLength(JSON.stringify(input.context)),
    },
  };
}

export async function handleTransfer(body, signal) {
  const sourceAgent = validateAgent(body?.sourceAgent);
  const destination = validateAgent(body?.destination);
  if (destination !== transferTargets[sourceAgent]) {
    throw new ValidationError(`A ${specialistLabels[sourceAgent]} specialist can only transfer to the ${specialistLabels[destination]} specialist.`);
  }
  const messages = validateMessages(body?.messages);
  const conversationId = optionalText(body?.conversationId, 'conversationId', 120) || `transfer_${randomUUID()}`;
  const opening = transferOpening(destination);
  const result = await callWithRetry(destination, [
    ...messages,
    { id: `msg_${randomUUID()}`, role: 'assistant', parts: [{ type: 'text', text: opening }] },
    { id: `msg_${randomUUID()}`, role: 'user', parts: [{ type: 'text', text: transferContinuation(destination) }] },
  ], signal, conversationId);
  return {
    ...result,
    agent: destination,
    opening,
    transfer: result.transfer ? { ...result.transfer, sourceAgent: destination } : null,
  };
}

export function errorPayload(error) {
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
