/** Standalone signup API for the separately hosted GitHub Pages storefront. */
import { handleNewsletter } from './newsletter.mjs';

function newsletterWorkerOrigin(env) {
  try {
    if (typeof env.PUBLIC_ORIGIN !== 'string' || !env.PUBLIC_ORIGIN) return null;
    const origin = new URL(env.PUBLIC_ORIGIN);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && loopback)) ||
        origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    return origin.origin;
  } catch { return null; }
}

function newsletterWorkerReply(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function newsletterWorkerCors(response, origin, preflight = false) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', preflight ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers' : 'Origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  if (preflight) {
    headers.set('Access-Control-Allow-Methods', 'POST');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '600');
  }
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env = {}) {
    const origin = newsletterWorkerOrigin(env);
    if (!origin) return newsletterWorkerReply({ error: 'Signup is not configured yet.' }, 503);
    if (request.headers.get('Origin') !== origin) return newsletterWorkerReply({ error: 'Sign up from this website.' }, 403);
    const pathname = new URL(request.url).pathname;
    if (!['/api/subscribe', '/api/newsletter-status'].includes(pathname)) return newsletterWorkerCors(newsletterWorkerReply({ error: 'Not found.' }, 404), origin);
    if (request.method === 'OPTIONS') {
      const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      if (pathname !== '/api/subscribe' || request.headers.get('Access-Control-Request-Method') !== 'POST' ||
          requestedHeaders.length !== 1 || requestedHeaders[0] !== 'content-type') {
        return newsletterWorkerCors(newsletterWorkerReply({ error: 'This signup request is not allowed.' }, 403), origin);
      }
      return newsletterWorkerCors(new Response(null, { status: 204 }), origin, true);
    }
    const expectedMethod = pathname === '/api/subscribe' ? 'POST' : 'GET';
    if (request.method !== expectedMethod) {
      const response = newsletterWorkerReply({ error: 'Method not allowed.' }, 405);
      response.headers.set('Allow', pathname === '/api/subscribe' ? 'POST, OPTIONS' : 'GET');
      return newsletterWorkerCors(response, origin);
    }
    // The browser correctly labels the Pages -> Worker request cross-site.
    // Remove that signal only after independently verifying the exact Origin.
    const headers = new Headers(request.headers);
    headers.delete('Sec-Fetch-Site');
    const forwarded = new Request(request, { headers });
    try {
      const response = await handleNewsletter(forwarded, { ...env, PUBLIC_ORIGIN: origin });
      return newsletterWorkerCors(response || newsletterWorkerReply({ error: 'Not found.' }, 404), origin);
    } catch {
      return newsletterWorkerCors(newsletterWorkerReply({ error: 'We could not save your signup right now. Please try again later.' }, 503), origin);
    }
  },
};
