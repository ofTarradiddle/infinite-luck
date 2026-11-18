/** Local development persistence. Keep this directory outside public/ and Git. */
import { constants } from 'node:fs';
import { mkdir, lstat, open, readFile, rename, unlink, chmod } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const localSubscriberQueues = new Map();
const localSubscriberConsent = 'Nectar coffee updates';
const localSubscriberAcceptedConsents = new Set([localSubscriberConsent, 'oF Nectar coffee updates']);

function localSubscriberEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function localSubscriberRecords(value) {
  if (!Array.isArray(value)) throw new Error('Local subscriber data is invalid.');
  const seen = new Set();
  for (const record of value) {
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        typeof record.email !== 'string' || localSubscriberEmail(record.email) !== record.email ||
        typeof record.subscribedAt !== 'string' || !Number.isFinite(Date.parse(record.subscribedAt)) ||
        !localSubscriberAcceptedConsents.has(record.consent) || record.source !== 'website' || seen.has(record.email)) {
      throw new Error('Local subscriber data is invalid.');
    }
    seen.add(record.email);
  }
  return value;
}

/** Returns an async saveSubscriber(email) store; no read route is exposed. */
export function createLocalSubscriberStore(directory) {
  if (typeof directory !== 'string' || !directory) throw new Error('A local subscriber directory is required.');
  const target = path.resolve(directory);
  const filename = path.join(target, 'subscribers.json');

  async function writeSubscriber(email) {
    await mkdir(target, { recursive: true, mode: 0o700 });
    const directoryStat = await lstat(target);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('Local subscriber directory is invalid.');
    await chmod(target, 0o700);
    let records = [];
    try {
      const fileStat = await lstat(filename);
      if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size > 10_000_000) throw new Error('Local subscriber data is invalid.');
      await chmod(filename, 0o600);
      records = localSubscriberRecords(JSON.parse(await readFile(filename, 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (records.some(record => record.email === email)) return;
    records.push({ email, subscribedAt: new Date().toISOString(), consent: localSubscriberConsent, source: 'website' });
    const temporary = path.join(target, `.subscribers-${randomUUID()}.tmp`);
    let file;
    try {
      file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
      await file.writeFile(JSON.stringify(records, null, 2) + '\n', 'utf8');
      await file.sync();
      await file.close();
      file = null;
      await rename(temporary, filename);
      await chmod(filename, 0o600);
      // Persist the rename where supported by the local filesystem.
      const folder = await open(target, constants.O_RDONLY);
      try { await folder.sync(); } finally { await folder.close(); }
    } catch (error) {
      await file?.close().catch(() => {});
      await unlink(temporary).catch(() => {});
      throw error;
    }
  }

  return {
    async saveSubscriber(value) {
      const email = localSubscriberEmail(value);
      if (!email) throw new Error('A valid email address is required.');
      const previous = localSubscriberQueues.get(target) || Promise.resolve();
      const task = previous.catch(() => {}).then(() => writeSubscriber(email));
      localSubscriberQueues.set(target, task);
      try { await task; }
      finally { if (localSubscriberQueues.get(target) === task) localSubscriberQueues.delete(target); }
    },
  };
}
