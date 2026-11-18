/** Owner-only CLI export. Nothing in this script is served by the website. */
import { mkdir, lstat, readFile, writeFile, rename, chmod, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const exportRoot = fileURLToPath(new URL('../', import.meta.url));
const exportLimit = 10_000;

function exportNormalizeEmail(value) {
  if (typeof value !== 'string') throw new Error('A subscriber email is invalid.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || /[^\x21-\x7e]/.test(email) || !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email)) throw new Error('A subscriber email is invalid.');
  const [local, domain] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || domain.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error('A subscriber email is invalid.');
  return email;
}

export function normalizeSubscriberRecords(records) {
  if (!Array.isArray(records) || records.length > exportLimit) throw new Error('Subscriber data must contain at most 10,000 records.');
  const unique = new Map();
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.subscribedAt !== 'string' ||
        !Number.isFinite(Date.parse(record.subscribedAt)) || record.consent !== 'Nectar coffee updates') throw new Error('A subscriber record is invalid.');
    const email = exportNormalizeEmail(record.email);
    const normalized = { email, subscribedAt: new Date(record.subscribedAt).toISOString(), consent: record.consent };
    const previous = unique.get(email);
    if (!previous || normalized.subscribedAt < previous.subscribedAt) unique.set(email, normalized);
  }
  return [...unique.values()].sort((a, b) => a.email.localeCompare(b.email));
}

function exportCsvCell(value) {
  // Quoting alone does not stop spreadsheet formulas; prefix dangerous cells.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function subscribersToCsv(records) {
  const rows = normalizeSubscriberRecords(records).map(record => [record.email, record.subscribedAt, record.consent].map(exportCsvCell).join(','));
  return 'email,subscribed_at,consent\r\n' + (rows.length ? rows.join('\r\n') + '\r\n' : '');
}

function exportGitLabConfig(env) {
  if (!env.GITLAB_PROJECT_ID && !env.GITLAB_TOKEN) return null;
  if (!env.GITLAB_PROJECT_ID?.trim() || !env.GITLAB_TOKEN?.trim()) throw new Error('Set both GITLAB_PROJECT_ID and GITLAB_TOKEN to export the GitLab list.');
  const api = new URL(env.GITLAB_API_URL || 'https://gitlab.com/api/v4');
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) throw new Error('GITLAB_API_URL must be an HTTPS API root.');
  const branch = (env.GITLAB_BRANCH || 'main').trim();
  if (!branch || /[\x00-\x1f\x7f]/.test(env.GITLAB_PROJECT_ID + env.GITLAB_TOKEN + branch)) throw new Error('The GitLab export configuration is invalid.');
  return { api: api.href.replace(/\/$/, ''), project: env.GITLAB_PROJECT_ID.trim(), token: env.GITLAB_TOKEN.trim(), branch };
}

async function exportGitLabRequest(url, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { headers: { 'PRIVATE-TOKEN': config.token }, redirect: 'error', signal: controller.signal });
    if (!response.ok) {
      if (response.status === 404) throw new Error('The GitLab subscriber project, branch, or folder was not found.');
      throw new Error('GitLab export failed. Check the private project and token permissions.');
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('GitLab export timed out. Please try again.');
    // Preserve only our own generic errors, never provider bodies or request details.
    if (error.message.startsWith('The GitLab subscriber') || error.message.startsWith('GitLab export failed')) throw error;
    throw new Error('GitLab export could not connect. Please try again.');
  } finally { clearTimeout(timeout); }
}

async function exportGitLabRecords(config) {
  const base = `${config.api}/projects/${encodeURIComponent(config.project)}`;
  const project = await exportGitLabRequest(base, config);
  if (project.visibility !== 'private') throw new Error('Subscriber exports require a private GitLab project.');
  const files = [];
  for (let page = 1; page <= 101; page += 1) {
    const query = new URLSearchParams({ path: 'subscribers', ref: config.branch, per_page: '100', page: String(page) });
    const entries = await exportGitLabRequest(`${base}/repository/tree?${query}`, config);
    if (!Array.isArray(entries)) throw new Error('The GitLab subscriber folder response is invalid.');
    if (page === 101 && entries.length) throw new Error('The export exceeds the 10,000-record limit.');
    for (const entry of entries) if (entry.type === 'blob' && /^subscribers\/[a-f0-9]{64}\.json$/.test(entry.path)) files.push(entry.path);
    if (files.length > exportLimit) throw new Error('The export exceeds the 10,000-record limit.');
    if (entries.length < 100) break;
  }
  const records = new Array(files.length);
  let next = 0;
  async function readNext() {
    while (next < files.length) {
      const index = next++;
      const filename = files[index];
      const data = await exportGitLabRequest(`${base}/repository/files/${encodeURIComponent(filename)}?ref=${encodeURIComponent(config.branch)}`, config);
      if (data.encoding !== 'base64' || typeof data.content !== 'string' || data.content.length > 20_000) throw new Error('A GitLab subscriber record is invalid.');
      let record;
      try { record = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')); } catch { throw new Error('A GitLab subscriber record is invalid.'); }
      const normalized = normalizeSubscriberRecords([record])[0];
      const digest = createHash('sha256').update(normalized.email).digest('hex');
      if (filename !== `subscribers/${digest}.json`) throw new Error('A GitLab subscriber filename does not match its record.');
      records[index] = record;
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, files.length) }, readNext));
  return records;
}

export async function loadSubscriberRecords(env = process.env, projectRoot = exportRoot) {
  const config = exportGitLabConfig(env);
  if (config) return normalizeSubscriberRecords(await exportGitLabRecords(config));
  const filename = path.join(projectRoot, '.nectar-data/subscribers.json');
  let content;
  try {
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 10_000_000) throw new Error('The local subscriber data is invalid.');
    content = await readFile(filename, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('No local subscriber list exists yet. Collect a signup locally or configure the private GitLab list.');
    throw new Error('The local subscriber list could not be read.');
  }
  let records;
  try { records = JSON.parse(content); } catch { throw new Error('The local subscriber list contains invalid JSON.'); }
  return normalizeSubscriberRecords(records);
}

export async function exportSubscribers(env = process.env, projectRoot = exportRoot) {
  const records = await loadSubscriberRecords(env, projectRoot);
  const directory = path.join(projectRoot, 'exports');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('The exports directory is invalid.');
  await chmod(directory, 0o700);
  const filename = path.join(directory, 'subscribers.csv');
  const temporary = path.join(directory, `.subscribers-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, subscribersToCsv(records), { mode: 0o600, flag: 'wx' });
    await rename(temporary, filename);
    await chmod(filename, 0o600);
  } finally { await unlink(temporary).catch(() => {}); }
  return { count: records.length, filename };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { count, filename } = await exportSubscribers();
    console.log(`Exported ${count} subscriber${count === 1 ? '' : 's'} to ${filename}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
