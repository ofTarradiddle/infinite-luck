import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/newsletter-worker.mjs';
import { handleNewsletter } from '../server/newsletter.mjs';

const standaloneEnv = { PUBLIC_ORIGIN: 'https://www.ofnectar.com', GITLAB_PROJECT_ID: 'nectar/private-list', GITLAB_TOKEN: 'secret-test-token' };
const standaloneRequest = (method = 'POST', headers = {}, path = '/api/subscribe', origin = 'https://www.ofnectar.com') => new Request(`https://nectar-newsletter.example.workers.dev${path}`, {
  method,
  headers: { Origin: origin, ...(!['GET', 'OPTIONS', 'HEAD'].includes(method) ? { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' } : {}), ...headers },
  ...(!['GET', 'OPTIONS', 'HEAD'].includes(method) ? { body: JSON.stringify({ email: 'coffee@example.com', consent: true, website: '' }) } : {}),
});

test('standalone Worker allows only exact configured HTTPS or loopback frontend origins', async () => {
  for (const origin of ['https://evil.example', 'https://ofnectar.com', 'https://www.ofnectar.com.evil.example', 'null']) {
    const response = await worker.fetch(standaloneRequest('GET', {}, '/api/newsletter-status', origin), standaloneEnv);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  for (const configured of ['http://www.ofnectar.com', 'https://www.ofnectar.com/subpath', 'https://user:pass@www.ofnectar.com', 'https://www.ofnectar.com?key=secret']) {
    assert.equal((await worker.fetch(standaloneRequest(), { ...standaloneEnv, PUBLIC_ORIGIN: configured })).status, 503);
  }
  const local = await worker.fetch(standaloneRequest('GET', {}, '/api/newsletter-status', 'http://localhost:3000'), { PUBLIC_ORIGIN: 'http://localhost:3000' });
  assert.equal(local.status, 200);
  assert.equal(local.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
});

test('JSON POST preflight is strict and never allows wildcard origins or credentials', async () => {
  const allowed = await worker.fetch(standaloneRequest('OPTIONS', { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' }), standaloneEnv);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'https://www.ofnectar.com');
  assert.equal(allowed.headers.get('Access-Control-Allow-Methods'), 'POST');
  assert.equal(allowed.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  assert.equal(allowed.headers.get('Access-Control-Allow-Credentials'), null);
  assert.match(allowed.headers.get('Vary'), /Origin/);
  for (const headers of [
    { 'Access-Control-Request-Method': 'DELETE', 'Access-Control-Request-Headers': 'content-type' },
    { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type' },
    { 'Access-Control-Request-Method': 'POST' },
  ]) assert.equal((await worker.fetch(standaloneRequest('OPTIONS', headers), standaloneEnv)).status, 403);
});

test('status, missing routes and method errors carry CORS only for the permitted frontend', async () => {
  const status = await worker.fetch(standaloneRequest('GET', {}, '/api/newsletter-status'), standaloneEnv);
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { configured: true, storage: 'gitlab' });
  const missing = await worker.fetch(standaloneRequest('GET', {}, '/private-subscribers'), standaloneEnv);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('Access-Control-Allow-Origin'), 'https://www.ofnectar.com');
  const method = await worker.fetch(standaloneRequest('GET'), standaloneEnv);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('Access-Control-Allow-Origin'), 'https://www.ofnectar.com');
});

test('cross-origin frontend signup reaches private GitLab only after strict adapter origin verification', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return Response.json({ visibility: 'private' });
    if (calls.length === 2) return Response.json({}, { status: 404 });
    return Response.json({}, { status: 201 });
  };
  try {
    const response = await worker.fetch(standaloneRequest(), standaloneEnv);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://www.ofnectar.com');
    assert.equal((await response.json()).ok, true);
    assert.equal(calls.length, 3);
    assert.equal(calls[2].options.method, 'POST');
    assert.equal(JSON.parse(JSON.parse(calls[2].options.body).content).consent, 'Nectar coffee updates');
    // The shared same-origin handler still rejects the identical cross-site signal.
    const direct = await handleNewsletter(standaloneRequest(), standaloneEnv);
    assert.equal(direct.status, 403);
    assert.equal(calls.length, 3);
  } finally { globalThis.fetch = originalFetch; }
});

test('storage failures remain errors with readable CORS and no false acknowledgement', async () => {
  const response = await worker.fetch(standaloneRequest(), { PUBLIC_ORIGIN: 'https://www.ofnectar.com' });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://www.ofnectar.com');
  assert.equal((await response.json()).ok, undefined);
});
