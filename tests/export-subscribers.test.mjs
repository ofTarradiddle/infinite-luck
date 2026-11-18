import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { subscribersToCsv, normalizeSubscriberRecords, loadSubscriberRecords, exportSubscribers } from '../scripts/export-subscribers.mjs';

const exportRecord = (email = 'coffee@example.com', subscribedAt = '2026-11-17T12:00:00Z', consent = 'oF Nectar coffee updates') => ({ email, subscribedAt, consent, source: 'website' });

test('CSV export normalizes and deduplicates subscribers, preserves earliest consent time and guards formulas', () => {
  const csv = subscribersToCsv([exportRecord('Coffee@Example.COM'), exportRecord('coffee@example.com', '2026-11-16T12:00:00Z'), exportRecord('=formula@example.com'), exportRecord('+tag@example.com')]);
  assert.match(csv, /^email,subscribed_at,consent\r\n/);
  assert.match(csv, /"coffee@example.com","2026-11-16T12:00:00.000Z","oF Nectar coffee updates"/);
  assert.equal((csv.match(/"coffee@example.com"/g) || []).length, 1);
  assert.match(csv, /"'=formula@example.com"/);
  assert.match(csv, /"'\+tag@example.com"/);
  assert.ok(csv.endsWith('\r\n'));
  assert.throws(() => normalizeSubscriberRecords([exportRecord('bad-email')]));
  assert.throws(() => normalizeSubscriberRecords([exportRecord('coffee@example.com', 'not-a-date')]));
  assert.throws(() => normalizeSubscriberRecords([{ ...exportRecord(), consent: false }]));
  assert.throws(() => normalizeSubscriberRecords(Array(10_001).fill(exportRecord())));
});

test('legacy and current consent remain unchanged when normalizing and exporting historical records', () => {
  const legacy = exportRecord('legacy@example.com', '2026-11-16T12:00:00Z', 'Nectar coffee updates');
  const current = exportRecord('current@example.com');
  const records = [legacy, current, exportRecord('legacy@example.com', '2026-11-17T12:00:00Z')];
  const normalized = normalizeSubscriberRecords(records);
  assert.equal(normalized.length, 2);
  assert.equal(normalized.find(record => record.email === legacy.email).consent, 'Nectar coffee updates');
  assert.equal(normalized.find(record => record.email === current.email).consent, 'oF Nectar coffee updates');
  const csv = subscribersToCsv(records);
  assert.match(csv, /"legacy@example.com","2026-11-16T12:00:00.000Z","Nectar coffee updates"/);
  assert.match(csv, /"current@example.com","2026-11-17T12:00:00.000Z","oF Nectar coffee updates"/);
  assert.equal(records[0], legacy);
  assert.equal(legacy.consent, 'Nectar coffee updates');
});

test('local export writes a private CSV and fails clearly when no data exists', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nectar-export-test-'));
  try {
    await assert.rejects(loadSubscriberRecords({}, directory), /No local subscriber list/);
    await mkdir(path.join(directory, '.nectar-data'));
    await writeFile(path.join(directory, '.nectar-data/subscribers.json'), JSON.stringify([exportRecord()]));
    const result = await exportSubscribers({}, directory);
    assert.equal(result.count, 1);
    assert.match(await readFile(result.filename, 'utf8'), /coffee@example.com/);
    assert.equal((await stat(result.filename)).mode & 0o777, 0o600);
    assert.equal((await stat(path.join(directory, 'exports'))).mode & 0o777, 0o700);
    await assert.rejects(loadSubscriberRecords({ GITLAB_TOKEN: 'partial-config' }, directory), /Set both/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('GitLab export verifies a private project and fetches hashed records without returning secrets', async () => {
  const originalFetch = globalThis.fetch;
  const email = 'coffee@example.com';
  const filename = `subscribers/${createHash('sha256').update(email).digest('hex')}.json`;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return Response.json({ visibility: 'private' });
    if (calls.length === 2) return Response.json([{ type: 'blob', path: filename }, { type: 'blob', path: 'subscribers/README.md' }]);
    return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(exportRecord())).toString('base64') });
  };
  try {
    const records = await loadSubscriberRecords({ GITLAB_PROJECT_ID: 'nectar/private', GITLAB_TOKEN: 'secret-test' });
    assert.equal(records.length, 1);
    assert.equal(records[0].email, email);
    assert.match(calls[1].url, /path=subscribers&ref=main&per_page=100&page=1/);
    assert.equal(calls[2].options.headers['PRIVATE-TOKEN'], 'secret-test');
    assert.equal(calls[2].options.redirect, 'error');
    let reads = 0;
    globalThis.fetch = async () => { reads += 1; return Response.json({ visibility: 'public' }); };
    await assert.rejects(loadSubscriberRecords({ GITLAB_PROJECT_ID: 'nectar/public', GITLAB_TOKEN: 'secret-test' }), /private GitLab project/);
    assert.equal(reads, 1);
  } finally { globalThis.fetch = originalFetch; }
});
