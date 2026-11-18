import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleCommerce } from '../server/commerce.mjs';
import { handleNewsletter } from '../server/newsletter.mjs';
import { createLocalSubscriberStore } from '../server/local-subscribers.mjs';
import { contentTypeFor, secureResponse } from '../server/security.mjs';

const publicDir = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const port = Number(process.env.PORT || 3000);
const hasGitLabIdentity = Boolean(process.env.GITLAB_TOKEN?.trim() || process.env.GITLAB_PROJECT_ID?.trim());
const subscriberStore = hasGitLabIdentity ? null : createLocalSubscriberStore(path.resolve(publicDir, '../.nectar-data'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');

async function staticResponse(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url).pathname); }
  catch { return new Response('Bad request', { status: 400 }); }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) return new Response('Not found', { status: 404 });
  const filename = path.resolve(publicDir, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(publicDir + path.sep) && filename !== path.join(publicDir, 'index.html')) return new Response('Not found', { status: 404 });
  try {
    if (!(await stat(filename)).isFile()) return new Response('Not found', { status: 404 });
    const content = await readFile(filename);
    const etag = '"' + createHash('sha256').update(content).digest('hex').slice(0, 24) + '"';
    const headers = { 'Content-Type': contentTypeFor(filename), 'Cache-Control': 'no-store', ETag: etag };
    return new Response(request.method === 'HEAD' ? null : content, { headers });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return new Response('Not found', { status: 404 });
    throw error;
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || `localhost:${port}`;
    const url = new URL(incoming.url || '/', `http://${host}`);
    const chunks = [];
    let bytes = 0;
    for await (const chunk of incoming) {
      bytes += chunk.length;
      if (bytes > 32768) {
        outgoing.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        outgoing.end('Request too large');
        return;
      }
      chunks.push(chunk);
    }
    const method = incoming.method || 'GET';
    const request = new Request(url, {
      method,
      headers: incoming.headers,
      ...(!['GET', 'HEAD'].includes(method) ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = secureResponse(
      url.pathname === '/api' || url.pathname.startsWith('/api/')
        ? (await handleNewsletter(request, process.env, subscriberStore) || await handleCommerce(request, process.env) || new Response('Not found', { status: 404 }))
        : await staticResponse(request),
      request,
    );
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Local request failed:', error.message);
    outgoing.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    outgoing.end(JSON.stringify({ error: 'Something went wrong. Please try again.' }));
  }
});
server.on('error', (error) => {
  console.error(`Unable to start local preview: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`oF Nectar preview: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
