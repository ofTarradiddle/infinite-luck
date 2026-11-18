import { copyFile, lstat, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));

async function publicFiles(directory, relative = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const source = path.join(directory, entry.name);
    const filename = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await publicFiles(source, filename));
    else if (entry.isFile() && !/\.png$/i.test(entry.name)) files.push({ source, filename });
  }
  return files;
}

async function regularDirectory(directory, label) {
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular directory.`);
}

/** Build only public assets for the custom-domain GitHub Pages deployment. */
export async function buildPages({ rootDirectory = defaultRoot } = {}) {
  const root = path.resolve(rootDirectory);
  const source = path.join(root, 'public');
  const dist = path.join(root, 'dist');
  const output = path.join(dist, 'pages');
  await regularDirectory(source, 'public/');
  const cnamePath = path.join(root, 'CNAME');
  const cnameStat = await lstat(cnamePath);
  if (!cnameStat.isFile() || cnameStat.isSymbolicLink()) throw new Error('CNAME must be a regular file.');
  const domain = (await readFile(cnamePath, 'utf8')).trim();
  const labels = domain.split('.');
  if (domain.length > 253 || labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    throw new Error('CNAME must contain a single hostname, such as www.ofnectar.com.');
  }
  const files = await publicFiles(source);
  for (const required of ['index.html', 'app.js', 'cart.js']) {
    if (!files.some(file => file.filename === required)) throw new Error(`public/${required} is missing.`);
  }
  await mkdir(dist, { recursive: true });
  await regularDirectory(dist, 'dist/');
  // The independent Worker build lives in dist/server; remove only this target.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of files) {
    const destination = path.join(output, file.filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(file.source, destination);
  }
  await writeFile(path.join(output, 'CNAME'), `${domain}\n`);
  await writeFile(path.join(output, '.nojekyll'), '');
  return { directory: output, domain, files: files.length + 2 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildPages();
  console.log(`Built GitHub Pages for ${result.domain}: ${result.files} files in dist/pages.`);
}
