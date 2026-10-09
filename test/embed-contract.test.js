import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);

test('ships a single-script widget with an explicit API base and handoff controls', async () => {
  const script = await readFile(new URL('public/embed.js', root), 'utf8');
  assert.match(script, /dataset\.apiBase/);
  assert.match(script, /\/api\/chat/);
  assert.match(script, /\/api\/transfer/);
  assert.match(script, /attachShadow/);
  assert.match(script, /dataset\.open/);
  assert.match(script, /desktop-persistent/);
  assert.match(script, /min-width: 768px/);
  assert.match(script, /renderMarkdown/);
  assert.match(script, /renderTable/);
  assert.match(script, /table-wrap/);
  assert.match(script, /On a support page/);
  assert.match(script, /On a product page/);
  assert.match(script, /composer-row/);
  assert.match(script, /text-align: center/);
  assert.doesNotMatch(script, /Viewing a support ticket database/);
  assert.doesNotMatch(script, /Viewing the plan pricing page/);
  assert.match(script, /role="radio"/);
  assert.match(script, /sample-question/);
  assert.match(script, /requestSubmit/);
  assert.match(script, /focusMessage/);
  assert.match(script, /typing-dot/);
  assert.match(script, /typing-entry/);
  assert.match(script, /\}, 500\)/);
  assert.match(script, /is typing/);
  assert.match(script, /Let me loop them in/);
  assert.doesNotMatch(script, /Contacting the \$\{specialistLabel/);
  assert.match(script, /Transferring to the/);
  assert.doesNotMatch(script, /Application-owned routing/);
  assert.doesNotMatch(script, /Connected to Agent Studio/);
  assert.doesNotMatch(script, /Switch to Support/);
});

test('documents cross-origin configuration without wildcard access', async () => {
  const env = await readFile(new URL('.env.example', root), 'utf8');
  const readme = await readFile(new URL('README.md', root), 'utf8');
  assert.match(env, /EMBED_ALLOWED_ORIGINS/);
  assert.match(readme, /data-api-base/);
  assert.match(readme, /does not allow arbitrary cross-origin callers/);
});
