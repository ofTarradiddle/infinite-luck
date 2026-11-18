/**
 * Durable notification signups. Production uses a private GitLab project;
 * local development may inject a filesystem store. No emails are sent here.
 * Required GitLab settings: GITLAB_TOKEN (secret, api scope), GITLAB_PROJECT_ID.
 * Optional: GITLAB_API_URL (HTTPS API root), GITLAB_BRANCH (default main).
 */

const NEWSLETTER_MAX_BYTES = 2048;
const newsletterAttempts = new Map();

function newsletterJson(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

function newsletterConfig(env) {
  try {
    const api = new URL(env.GITLAB_API_URL || 'https://gitlab.com/api/v4');
    if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) return null;
    const project = typeof env.GITLAB_PROJECT_ID === 'string' ? env.GITLAB_PROJECT_ID.trim() : '';
    const token = typeof env.GITLAB_TOKEN === 'string' ? env.GITLAB_TOKEN.trim() : '';
    const branch = typeof env.GITLAB_BRANCH === 'string' ? env.GITLAB_BRANCH.trim() : 'main';
    if (!project || !token || !branch || /[\x00-\x1f\x7f]/.test(project + token + branch)) return null;
    return { api: api.href.replace(/\/$/, ''), project, token, branch };
  } catch { return null; }
}

export function getNewsletterStatus(env = {}, storeOverride = null) {
  if (typeof storeOverride?.saveSubscriber === 'function') return { configured: true, storage: 'local' };
  return newsletterConfig(env) ? { configured: true, storage: 'gitlab' } : { configured: false, storage: null };
}

function newsletterNormalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || /[^\x21-\x7e]/.test(email)) return null;
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || parts[0].length > 64 || parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..')) return null;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(parts[0])) return null;
  const labels = parts[1].split('.');
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  if (!/^[a-z]{2,63}$/.test(labels.at(-1))) return null;
  return email;
}

async function newsletterReadBody(request) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > NEWSLETTER_MAX_BYTES)) return { status: 413 };
  if (!request.body) return { status: 400 };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > NEWSLETTER_MAX_BYTES) { await reader.cancel(); return { status: 413 }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
  } catch { return { status: 400 }; }
  finally { reader.releaseLock(); }
}

function newsletterSameOrigin(request, env) {
  try {
    const origin = new URL(env.PUBLIC_ORIGIN || request.url);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
        (env.PUBLIC_ORIGIN && (origin.pathname !== '/' || origin.search || origin.hash))) return false;
    return request.headers.get('origin') === origin.origin && request.headers.get('sec-fetch-site') !== 'cross-site';
  } catch { return false; }
}

function newsletterThrottled(request) {
  // Cloudflare supplies this header. Local development does not share one bucket.
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return false;
  const now = Date.now();
  const prior = newsletterAttempts.get(ip);
  const entry = prior && prior.until > now ? prior : { count: 0, until: now + 60_000 };
  entry.count += 1;
  newsletterAttempts.set(ip, entry);
  if (newsletterAttempts.size > 5000) newsletterAttempts.delete(newsletterAttempts.keys().next().value);
  return entry.count > 10;
}

async function newsletterDigest(email) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function newsletterExistingRecord(payload, email) {
  try {
    if (payload.encoding !== 'base64' || typeof payload.content !== 'string') return false;
    const content = Uint8Array.from(atob(payload.content.replace(/\s/g, '')), char => char.charCodeAt(0));
    const record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content));
    return record.email === email && record.consent === 'Nectar coffee updates' && record.source === 'website' &&
      typeof record.subscribedAt === 'string' && Number.isFinite(Date.parse(record.subscribedAt));
  } catch { return false; }
}

async function newsletterSaveGitLab(email, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const projectUrl = `${config.api}/projects/${encodeURIComponent(config.project)}`;
  const options = { headers: { 'PRIVATE-TOKEN': config.token }, signal: controller.signal, redirect: 'error' };
  try {
    // Check every signup rather than caching visibility; never write into a public project.
    const projectResponse = await fetch(projectUrl, options);
    if (!projectResponse.ok || (await projectResponse.json()).visibility !== 'private') throw new Error('Private subscriber storage unavailable');
    const filename = `subscribers/${await newsletterDigest(email)}.json`;
    const fileUrl = `${projectUrl}/repository/files/${encodeURIComponent(filename)}`;
    const readUrl = `${fileUrl}?ref=${encodeURIComponent(config.branch)}`;
    const existing = await fetch(readUrl, options);
    if (existing.ok) {
      if (!newsletterExistingRecord(await existing.json(), email)) throw new Error('Subscriber record could not be verified');
      return;
    }
    if (existing.status !== 404) throw new Error('Subscriber storage unavailable');
    const record = { email, subscribedAt: new Date().toISOString(), consent: 'Nectar coffee updates', source: 'website' };
    const created = await fetch(fileUrl, {
      ...options,
      method: 'POST',
      headers: { ...options.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: config.branch, content: JSON.stringify(record, null, 2) + '\n', commit_message: 'Add coffee notification signup' }),
    });
    if (created.ok) return;
    // A simultaneous signup for this address can create the same file first.
    if (created.status === 400 || created.status === 409) {
      const retry = await fetch(readUrl, options);
      if (retry.ok && newsletterExistingRecord(await retry.json(), email)) return;
    }
    throw new Error('Subscriber storage unavailable');
  } finally { clearTimeout(timeout); }
}

/** Supported routes return Response; unknown routes return null. */
export async function handleNewsletter(request, env = {}, storeOverride = null) {
  const pathname = new URL(request.url).pathname;
  if (pathname === '/api/newsletter-status') {
    if (request.method !== 'GET') return newsletterJson({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
    return newsletterJson(getNewsletterStatus(env, storeOverride));
  }
  if (pathname !== '/api/subscribe') return null;
  if (request.method !== 'POST') return newsletterJson({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  if (!newsletterSameOrigin(request, env)) return newsletterJson({ error: 'Please sign up from the Nectar website.' }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return newsletterJson({ error: 'Please send a valid signup.' }, 415);
  if (newsletterThrottled(request)) return newsletterJson({ error: 'Please wait a minute before trying again.' }, 429, { 'Retry-After': '60' });
  const parsed = await newsletterReadBody(request);
  if (parsed.status) return newsletterJson({ error: parsed.status === 413 ? 'Please send a shorter signup.' : 'Please send a valid signup.' }, parsed.status);
  const body = parsed.body;
  const email = newsletterNormalizeEmail(body?.email);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !email || body.consent !== true ||
      (body.website !== undefined && (typeof body.website !== 'string' || body.website !== ''))) {
    return newsletterJson({ error: 'Enter a valid email and agree to receive Nectar updates.' }, 400);
  }
  try {
    if (typeof storeOverride?.saveSubscriber === 'function') await storeOverride.saveSubscriber(email);
    else {
      const config = newsletterConfig(env);
      if (!config) throw new Error('Subscriber storage is not configured');
      await newsletterSaveGitLab(email, config);
    }
    return newsletterJson({ ok: true, message: 'You’re on the list. Look out for a little Nectar.' });
  } catch {
    return newsletterJson({ error: 'We could not save your signup right now. Please try again later.' }, 503);
  }
}
