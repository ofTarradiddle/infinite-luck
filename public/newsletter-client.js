/** Public API URL only. GitLab tokens belong exclusively on the server. */
export function newsletterEndpoint(base, frontendOrigin) {
  if (!base) return new URL('/api/subscribe', frontendOrigin).href;
  try {
    const url = new URL(base);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password ||
        url.search || url.hash || url.pathname !== '/') throw new Error('Invalid API origin');
    return new URL('/api/subscribe', url.origin).href;
  } catch {
    throw new Error('The notification service is not ready yet. Please try again later.');
  }
}
