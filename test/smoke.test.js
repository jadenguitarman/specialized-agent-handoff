import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const port = 31_000 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, NODE_ENV: 'test', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

await once(server.stdout, 'data');

test.after(() => server.kill());

async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, payload: await response.json() };
}

test('serves the chat shell without exposing provider credentials', async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Specialized agent handoff/);

  const config = await fetch(`${baseUrl}/api/config`).then((result) => result.json());
  assert.equal(config.agents.sales, 'Sales');
  assert.equal(config.agents.support, 'Support');
  assert.equal(Object.hasOwn(config.agents, 'id'), false);
  assert.equal(Object.hasOwn(config, 'apiKey'), false);
});

test('rejects unknown destinations before any provider call', async () => {
  const result = await post('/api/handoff', {
    destination: 'billing',
    latestQuestion: 'Can I add seats?',
    summary: 'Sales discussed team growth.',
    context: { userId: 'demo-user-01', tenantId: 'northstar-demo' },
  });
  assert.equal(result.response.status, 400);
  assert.equal(result.payload.error, 'validation_failed');
});

test('rejects unapproved or missing context fields', async () => {
  const result = await post('/api/handoff', {
    destination: 'support',
    latestQuestion: 'How do I configure SAML?',
    summary: 'Customer needs setup help.',
    context: { userId: 'demo-user-01', tenantId: 'northstar-demo', email: 'not-approved' },
  });
  assert.equal(result.response.status, 400);
  assert.match(result.payload.message, /unapproved field/i);
});

test('rejects a handoff requested by a non-Sales source', async () => {
  const result = await post('/api/handoff', {
    sourceAgent: 'support',
    destination: 'support',
    latestQuestion: 'How do I configure SAML?',
    summary: 'Customer needs setup help.',
    context: { userId: 'demo-user-01', tenantId: 'northstar-demo' },
  });
  assert.equal(result.response.status, 400);
  assert.match(result.payload.message, /Sales agent/i);
});

test('reports missing provider configuration instead of fabricating a response', async () => {
  const result = await post('/api/chat', {
    agent: 'sales',
    conversationId: 'test-conversation',
    messages: [{ role: 'user', content: 'What is your team plan?' }],
  });
  assert.equal(result.response.status, 502);
  assert.equal(result.payload.error, 'not_configured');
});
