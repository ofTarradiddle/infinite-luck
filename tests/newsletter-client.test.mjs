import test from 'node:test';
import assert from 'node:assert/strict';
import { newsletterEndpoint } from '../public/newsletter-client.js';

test('local development uses the same-origin signup route', () => {
  assert.equal(newsletterEndpoint('', 'http://localhost:3000'), 'http://localhost:3000/api/subscribe');
});

test('GitHub Pages uses the separately configured HTTPS signup API', () => {
  assert.equal(newsletterEndpoint('https://nectar-signups.example.workers.dev', 'https://www.ofnectar.com'), 'https://nectar-signups.example.workers.dev/api/subscribe');
});

test('public API configuration rejects credentials, insecure external URLs and embedded secrets', () => {
  for (const base of ['http://remote.example', 'https://user:secret@example.com', 'https://example.com/?token=secret', 'https://example.com/private', 'javascript:alert(1)', 'bad-url']) {
    assert.throws(() => newsletterEndpoint(base, 'https://www.ofnectar.com'), /notification service is not ready/);
  }
});
