import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, retrieveMetadata } from '../tools/sipp-metadata-capture.mts';

test('the bounded acquisition list contains documentation only, never respondent files', () => {
  assert.equal(SOURCES.length, 5);
  assert.ok(SOURCES.every(s => !/\.zip|\.gz|\/data\/datasets\/.*\.(dat|csv|sas|dta)$/i.test(s.url)));
  assert.ok(SOURCES.every(s => s.maxBytes <= 5_000_000));
});

test('source identity is fixed and arbitrary or microdata URLs are rejected before fetch', async () => {
  let called = false;
  await assert.rejects(() => retrieveMetadata({ ...SOURCES[0], url: 'https://www2.census.gov/respondent-data.zip' }, async () => { called = true; }), /listed metadata/);
  assert.equal(called, false);
});

test('capture records bytes, a digest, content type and a non-authentication boundary', async () => {
  const source = SOURCES.find(s => s.id === 'primary-schema');
  const r = await retrieveMetadata(source, async (url, options) => {
    assert.equal(url, source.url);
    assert.equal(options.redirect, 'error');
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(r.receipt.bytes, 2);
  assert.match(r.receipt.sha256, /^[a-f0-9]{64}$/);
  assert.equal(r.receipt.publisherAuthenticated, false);
  assert.equal(r.receipt.kind, 'public-documentation-not-microdata');
});

test('bad status, wrong media, oversized body and invalid PDF fail visibly', async () => {
  const json = SOURCES.find(s => s.id === 'primary-schema');
  const pdf = SOURCES.find(s => s.id === 'dictionary');
  for (const response of [
    new Response('no', { status: 403 }),
    new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }),
    new Response('[]', { headers: { 'content-type': 'application/json', 'content-length': '1000001' } }),
    new Response(' '.repeat(1_000_001), { headers: { 'content-type': 'application/json' } }),
    new Response('{}', { headers: { 'content-type': 'application/json' } }),
    new Response('', { headers: { 'content-type': 'application/json' } }),
  ]) await assert.rejects(() => retrieveMetadata(json, async () => response));
  await assert.rejects(() => retrieveMetadata(pdf, async () => new Response('not a PDF', { headers: { 'content-type': 'application/pdf' } })), /PDF/);
});
