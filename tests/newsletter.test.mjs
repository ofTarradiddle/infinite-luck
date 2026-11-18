import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { handleNewsletter, getNewsletterStatus } from '../server/newsletter.mjs';
import { createLocalSubscriberStore } from '../server/local-subscribers.mjs';

const newsletterEnv = { GITLAB_PROJECT_ID: 'nectar/private-list', GITLAB_TOKEN: 'secret-test-token' };
const newsletterPayload = { email: 'Coffee@example.com', consent: true, website: '' };
const signupRequest = (payload = newsletterPayload, headers = {}, url = 'https://nectar.example/api/subscribe') => new Request(url, {
  method: 'POST', headers: { Origin: 'https://nectar.example', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload),
});
const gitlabRecord = (email = 'coffee@example.com', consent = 'oF Nectar coffee updates') => ({ encoding: 'base64', content: Buffer.from(JSON.stringify({ email, subscribedAt: '2026-11-17T12:00:00.000Z', consent, source: 'website' })).toString('base64') });
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('newsletter status exposes configuration only, with no secrets or list route', async () => {
  assert.deepEqual(getNewsletterStatus(), { configured: false, storage: null });
  assert.deepEqual(getNewsletterStatus(newsletterEnv), { configured: true, storage: 'gitlab' });
  assert.deepEqual(getNewsletterStatus({}, { saveSubscriber() {} }), { configured: true, storage: 'local' });
  assert.equal(getNewsletterStatus({ ...newsletterEnv, GITLAB_API_URL: 'http://gitlab.example/api/v4' }).configured, false);
  const status = await handleNewsletter(new Request('https://nectar.example/api/newsletter-status'), newsletterEnv);
  assert.deepEqual(await status.json(), { configured: true, storage: 'gitlab' });
  assert.equal(await handleNewsletter(new Request('https://nectar.example/api/subscribers'), newsletterEnv), null);
  assert.equal((await handleNewsletter(new Request('https://nectar.example/api/subscribe'), newsletterEnv)).status, 405);
});

test('signup requires same-origin JSON, valid email, empty honeypot and explicit consent before any write', async () => {
  let writes = 0;
  const store = { async saveSubscriber() { writes += 1; } };
  const invalid = [
    { email: 'not-an-email', consent: true },
    { email: 'coffee@example.com', consent: false },
    { email: 'coffee@example.com' },
    { email: 'coffee@example.com', consent: 'true' },
    { email: 'coffee@example.com', consent: true, website: 'bot.example' },
    { email: 'coffee\n@example.com', consent: true },
    { email: '..coffee@example.com', consent: true },
    { email: `${'x'.repeat(65)}@example.com`, consent: true },
    ['coffee@example.com'], null,
  ];
  for (const payload of invalid) assert.equal((await handleNewsletter(signupRequest(payload), {}, store)).status, 400);
  assert.equal((await handleNewsletter(signupRequest(newsletterPayload, { Origin: 'https://evil.example' }), {}, store)).status, 403);
  assert.equal((await handleNewsletter(signupRequest(newsletterPayload, { 'Sec-Fetch-Site': 'cross-site' }), {}, store)).status, 403);
  assert.equal((await handleNewsletter(signupRequest(newsletterPayload, { 'Content-Type': 'text/plain' }), {}, store)).status, 415);
  assert.equal((await handleNewsletter(signupRequest(newsletterPayload), { PUBLIC_ORIGIN: 'https://canonical.example' }, store)).status, 403);
  assert.equal(writes, 0);
});

test('oversized and malformed bodies are rejected, including streamed bodies without a length', async () => {
  const oversized = new Request('https://nectar.example/api/subscribe', { method: 'POST', headers: { Origin: 'https://nectar.example', 'Content-Type': 'application/json' }, body: 'x'.repeat(2200) });
  assert.equal((await handleNewsletter(oversized)).status, 413);
  const malformed = new Request('https://nectar.example/api/subscribe', { method: 'POST', headers: { Origin: 'https://nectar.example', 'Content-Type': 'application/json' }, body: '{' });
  assert.equal((await handleNewsletter(malformed)).status, 400);
});

test('success is sent only after durable normalized storage succeeds', async () => {
  let email;
  const success = await handleNewsletter(signupRequest({ ...newsletterPayload, email: '  Coffee@Example.COM  ' }), {}, { async saveSubscriber(value) { email = value; } });
  assert.equal(success.status, 200);
  assert.equal(email, 'coffee@example.com');
  assert.equal((await success.json()).ok, true);
  const failed = await handleNewsletter(signupRequest(), {}, { async saveSubscriber() { throw new Error('sensitive storage error'); } });
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /sensitive|coffee@example|secret-test-token/);
  assert.equal((await handleNewsletter(signupRequest())).status, 503);
});

test('GitLab signups verify privacy, hash filenames and store consent without identity in commit messages', async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return jsonResponse({ visibility: 'private' });
    if (calls.length === 2) return jsonResponse({ message: 'Not found' }, 404);
    return jsonResponse({ file_path: 'stored' }, 201);
  };
  try {
    const result = await handleNewsletter(signupRequest(), newsletterEnv);
    assert.equal(result.status, 200);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, 'https://gitlab.com/api/v4/projects/nectar%2Fprivate-list');
    const hash = createHash('sha256').update('coffee@example.com').digest('hex');
    assert.ok(calls[1].url.endsWith(`/repository/files/subscribers%2F${hash}.json?ref=main`));
    assert.equal(calls[2].options.method, 'POST');
    assert.equal(calls[2].options.headers['PRIVATE-TOKEN'], 'secret-test-token');
    assert.equal(calls[2].options.redirect, 'error');
    const submitted = JSON.parse(calls[2].options.body);
    const record = JSON.parse(submitted.content);
    assert.equal(record.email, 'coffee@example.com');
    assert.equal(record.consent, 'oF Nectar coffee updates');
    assert.equal(record.source, 'website');
    assert.ok(Number.isFinite(Date.parse(record.subscribedAt)));
    assert.doesNotMatch(submitted.commit_message, /coffee@/);
    assert.doesNotMatch(await result.text(), /coffee@example|secret-test-token/);
  } finally { globalThis.fetch = originalFetch; }
});

test('public GitLab projects and provider errors never acknowledge or write a signup', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const response of [jsonResponse({ visibility: 'public' }), jsonResponse({ visibility: 'internal' }), jsonResponse({ message: 'private token leaked upstream' }, 403)]) {
      let calls = 0;
      globalThis.fetch = async () => { calls += 1; return response; };
      const result = await handleNewsletter(signupRequest(), newsletterEnv);
      assert.equal(result.status, 503);
      assert.equal(calls, 1);
      assert.doesNotMatch(await result.text(), /token leaked|secret-test-token/);
    }
    globalThis.fetch = async () => { throw new Error('fetch failed with secret-test-token'); };
    assert.equal((await handleNewsletter(signupRequest(), newsletterEnv)).status, 503);
  } finally { globalThis.fetch = originalFetch; }
});

test('duplicate signups and a concurrent create are idempotent only when the stored record verifies', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const race of [false, true]) {
      const responses = race
        ? [jsonResponse({ visibility: 'private' }), jsonResponse({}, 404), jsonResponse({}, 409), jsonResponse(gitlabRecord())]
        : [jsonResponse({ visibility: 'private' }), jsonResponse(gitlabRecord())];
      globalThis.fetch = async () => responses.shift();
      assert.equal((await handleNewsletter(signupRequest(), newsletterEnv)).status, 200);
      assert.equal(responses.length, 0);
    }
    const responses = [jsonResponse({ visibility: 'private' }), jsonResponse(gitlabRecord('someone-else@example.com'))];
    globalThis.fetch = async () => responses.shift();
    assert.equal((await handleNewsletter(signupRequest(), newsletterEnv)).status, 503);
  } finally { globalThis.fetch = originalFetch; }
});

test('local storage persists concurrent signups privately and survives a new store instance', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nectar-subscriber-test-'));
  try {
    const first = createLocalSubscriberStore(directory);
    const second = createLocalSubscriberStore(directory);
    await Promise.all([first.saveSubscriber('Coffee@Example.com'), second.saveSubscriber('second@example.com'), first.saveSubscriber('coffee@example.com')]);
    const filename = path.join(directory, 'subscribers.json');
    const records = JSON.parse(await readFile(filename, 'utf8'));
    assert.deepEqual(records.map(item => item.email).sort(), ['coffee@example.com', 'second@example.com']);
    assert.equal((await stat(filename)).mode & 0o777, 0o600);
    assert.equal((await stat(directory)).mode & 0o777, 0o700);
    assert.equal(records[0].consent, 'oF Nectar coffee updates');
    await createLocalSubscriberStore(directory).saveSubscriber('third@example.com');
    assert.equal(JSON.parse(await readFile(filename, 'utf8')).length, 3);
    await assert.rejects(first.saveSubscriber('bad-email'));
    await writeFile(filename, '{damaged', { mode: 0o600 });
    await assert.rejects(first.saveSubscriber('fourth@example.com'));
    assert.equal(await readFile(filename, 'utf8'), '{damaged');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('legacy GitLab consent is accepted as a duplicate without rewriting historical records', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? jsonResponse({ visibility: 'private' }) : jsonResponse(gitlabRecord('coffee@example.com', 'Nectar coffee updates'));
  };
  try {
    const response = await handleNewsletter(signupRequest(), newsletterEnv);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, message: 'You’re on the list.' });
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => !call.options.method || call.options.method === 'GET'));
  } finally { globalThis.fetch = originalFetch; }
});

test('local legacy records deduplicate unchanged and retain their consent when a new signup is appended', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nectar-legacy-consent-test-'));
  const filename = path.join(directory, 'subscribers.json');
  const legacy = { email: 'legacy@example.com', subscribedAt: '2026-11-16T12:00:00.000Z', consent: 'Nectar coffee updates', source: 'website' };
  const original = JSON.stringify([legacy], null, 2) + '\n';
  try {
    await writeFile(filename, original, { mode: 0o600 });
    const store = createLocalSubscriberStore(directory);
    await store.saveSubscriber('Legacy@Example.com');
    assert.equal(await readFile(filename, 'utf8'), original);
    await store.saveSubscriber('new@example.com');
    const records = JSON.parse(await readFile(filename, 'utf8'));
    assert.equal(records.length, 2);
    assert.deepEqual(records.find(record => record.email === legacy.email), legacy);
    assert.equal(records.find(record => record.email === 'new@example.com').consent, 'oF Nectar coffee updates');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
