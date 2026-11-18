import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPages } from '../scripts/build-pages.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nectar-pages-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function write(filename, content) {
    const file = path.join(root, filename);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  const index = '<!doctype html><html><head><link rel="canonical" href="https://www.ofnectar.com/"><meta property="og:url" content="https://www.ofnectar.com/"><link rel="stylesheet" href="/styles.css"><script type="module" src="/app.js"></script></head><body><img src="/assets/coffee.webp"></body></html>';
  await write('CNAME', 'www.ofnectar.com\n');
  await write('public/index.html', index);
  await write('public/app.js', "import { cart } from './cart.js';\nimport { email } from './store-config.js';\nconsole.log(cart, email);\n");
  await write('public/cart.js', 'export const cart = [];\n');
  await write('public/store-config.js', "export const email = 'orders@ofnectar.com';\n");
  await write('public/styles.css', 'body { font-family: sans-serif; }\n');
  await write('public/assets/coffee.webp', new Uint8Array([82, 73, 70, 70, 0, 1, 2, 255]));
  await write('public/assets/fonts/nectar.ttf', new Uint8Array([0, 1, 2, 3]));
  await write('public/sitemap.xml', '<urlset><url><loc>https://www.ofnectar.com/</loc></url></urlset>');
  return { root, write, index };
}

test('Pages export retains root-domain HTML, module imports and binary public assets', async t => {
  const { root, index } = await fixture(t);
  const result = await buildPages({ rootDirectory: root });
  assert.equal(result.directory, path.join(root, 'dist/pages'));
  assert.equal(result.domain, 'www.ofnectar.com');
  assert.equal(await readFile(path.join(result.directory, 'CNAME'), 'utf8'), 'www.ofnectar.com\n');
  assert.equal(await readFile(path.join(result.directory, '.nojekyll'), 'utf8'), '');
  assert.equal(await readFile(path.join(result.directory, 'index.html'), 'utf8'), index);
  assert.match(await readFile(path.join(result.directory, 'app.js'), 'utf8'), /from '\.\/cart\.js'/);
  assert.match(await readFile(path.join(result.directory, 'store-config.js'), 'utf8'), /orders@ofnectar\.com/);
  assert.match(await readFile(path.join(result.directory, 'sitemap.xml'), 'utf8'), /https:\/\/www\.ofnectar\.com\//);
  assert.deepEqual(await readFile(path.join(result.directory, 'assets/coffee.webp')), Buffer.from([82, 73, 70, 70, 0, 1, 2, 255]));
  assert.deepEqual(await readFile(path.join(result.directory, 'assets/fonts/nectar.ttf')), Buffer.from([0, 1, 2, 3]));
});

test('Pages artifact excludes server data, private files, PNG originals, and all symlinks', async t => {
  const { root, write } = await fixture(t);
  await write('.env', 'GITLAB_TOKEN=private-secret');
  await write('.nectar-data/subscribers.json', '[{"email":"private@example.com"}]');
  await write('server/newsletter.mjs', 'server-only implementation');
  await write('.openai/hosting.json', '{"project_id":"private-site"}');
  await write('public/.env', 'accidentally placed secret');
  await write('public/assets/.private/list.txt', 'private subscriber data');
  await write('public/assets/original.png', 'large original image');
  await write('public/assets/original.PNG', 'large original image');
  await symlink(path.join(root, '.env'), path.join(root, 'public/exposed-secret.txt'));
  await symlink(path.join(root, '.nectar-data'), path.join(root, 'public/linked-subscribers'));
  const result = await buildPages({ rootDirectory: root });
  const files = await readdir(result.directory, { recursive: true });
  for (const forbidden of ['.env', '.nectar-data', 'subscribers.json', 'server', '.openai', '.private', 'original.png', 'original.PNG', 'exposed-secret.txt', 'linked-subscribers']) {
    assert.equal(files.some(file => file.split(path.sep).includes(forbidden)), false, forbidden);
  }
  assert.equal(files.includes('.nojekyll'), true);
});

test('rebuild removes stale Pages files while preserving the independent Worker output', async t => {
  const { root, write } = await fixture(t);
  await write('dist/server/index.js', 'export default { fetch() {} };');
  await write('dist/.openai/hosting.json', '{"worker":"metadata"}');
  await write('dist/pages/stale-secret.json', 'obsolete artifact');
  const result = await buildPages({ rootDirectory: root });
  assert.equal(await readFile(path.join(root, 'dist/server/index.js'), 'utf8'), 'export default { fetch() {} };');
  assert.equal(await readFile(path.join(root, 'dist/.openai/hosting.json'), 'utf8'), '{"worker":"metadata"}');
  await assert.rejects(readFile(path.join(result.directory, 'stale-secret.json')), { code: 'ENOENT' });
});

test('the intentional root social card is published while nested PNG originals stay excluded', async t => {
  const { root, write } = await fixture(t);
  const card = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  await write('public/og.png', card);
  await write('public/assets/og.png', 'not the approved social card');
  const result = await buildPages({ rootDirectory: root });
  assert.deepEqual(await readFile(path.join(result.directory, 'og.png')), Buffer.from(card));
  await assert.rejects(readFile(path.join(result.directory, 'assets/og.png')), { code: 'ENOENT' });
});

test('invalid configuration or missing entry modules fail before deleting an existing Pages artifact', async t => {
  const { root, write } = await fixture(t);
  await write('dist/pages/previous.html', 'previous working artifact');
  await write('CNAME', 'https://www.ofnectar.com/path');
  await assert.rejects(buildPages({ rootDirectory: root }), /single hostname/);
  assert.equal(await readFile(path.join(root, 'dist/pages/previous.html'), 'utf8'), 'previous working artifact');
  await write('CNAME', 'www.ofnectar.com\n');
  await rm(path.join(root, 'public/app.js'));
  await assert.rejects(buildPages({ rootDirectory: root }), /public\/app\.js is missing/);
  assert.equal(await readFile(path.join(root, 'dist/pages/previous.html'), 'utf8'), 'previous working artifact');
});
