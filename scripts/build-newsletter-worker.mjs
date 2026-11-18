import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'dist/newsletter');
const [newsletter, adapter] = await Promise.all([
  readFile(path.join(root, 'server/newsletter.mjs'), 'utf8'),
  readFile(path.join(root, 'server/newsletter-worker.mjs'), 'utf8'),
]);
const importStatement = "import { handleNewsletter } from './newsletter.mjs';";
if (!adapter.includes(importStatement)) throw new Error('The newsletter adapter import changed; update the build script.');
const source = '// Generated standalone newsletter Worker. Edit server/ instead.\n' + newsletter + '\n' + adapter.replace(importStatement, '') + '\n';
await mkdir(destination, { recursive: true });
const filename = path.join(destination, 'index.js');
await writeFile(filename + '.tmp', source);
await rename(filename + '.tmp', filename);
console.log('Built standalone newsletter Worker: dist/newsletter/index.js');
