import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('..', import.meta.url);

test('ships a single-script widget with an explicit API base and handoff controls', async () => {
  const script = await readFile(new URL('public/embed.js', root), 'utf8');
  assert.match(script, /dataset\.apiBase/);
  assert.match(script, /\/api\/chat/);
  assert.match(script, /\/api\/handoff/);
  assert.match(script, /attachShadow/);
  assert.match(script, /Switch to Support/);
});

test('documents cross-origin configuration without wildcard access', async () => {
  const env = await readFile(new URL('.env.example', root), 'utf8');
  const readme = await readFile(new URL('README.md', root), 'utf8');
  assert.match(env, /EMBED_ALLOWED_ORIGINS/);
  assert.match(readme, /data-api-base/);
  assert.match(readme, /does not allow arbitrary cross-origin callers/);
});
