import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function checkChoices(text) {
  assert.match(text, /[Ff]ive (?:reversible )?assumptions/);
  for (const name of ['Dependants', 'Ranking', 'Which shifts', 'Direction', 'Threshold basis']) assert.ok(text.includes(name), name);
  assert.match(text, /working definition/);
  assert.doesNotMatch(text, /Fernando defines|now defines the storm|Fernando's definition, verbatim/);
}
test('programme and weather seed enumerate five provisional choices without hardening the captured hedge', () => {
  for (const path of ['meta/abundance-transition-programme.md', 'seeds/the-weather-station-watches-the-world.md']) {
    const text = read(path);
    checkChoices(text);
    assert.throws(() => checkChoices(text.replaceAll('Direction', 'Omitted')));
    assert.throws(() => checkChoices(text.replaceAll('working definition', 'settled definition')));
  }
  assert.match(read('seeds/storms-are-social-contract-shifts.md'), /working definition/);
});
test('index inventories pipeline captures and seeds, excluding operator and raw documents', () => {
  const index = read('meta/index.md');
  for (const [directory, type, label] of [['capture', 'capture', 'Captures'], ['seeds', 'seed', 'Seeds']]) {
    const names = readdirSync(resolve(root, directory)).filter(name => name.endsWith('.md') && new RegExp(`^type: ${type}$`, 'm').test(read(`${directory}/${name}`)));
    assert.ok(index.includes(`| ${label} | ${names.length} |`));
    for (const name of names) assert.ok(index.includes(`\`${name.slice(0, -3)}\``), name);
  }
  assert.match(read('meta/themes.md'), /storms-as-social-contract-shifts/);
});
function checkPublication(draft, sheet) {
  assert.match(draft, /^status: review$/m);
  assert.ok(sheet.includes(hash(draft)));
  assert.equal((sheet.match(/\| Pending \|/g) ?? []).length, 7);
}
test('Name the If is lifecycle review while all seven approvals are pending, with an exact sign-off hash', () => {
  const draft = read('drafts/name-the-if.md');
  const sheet = read('reviews/name-the-if-sign-off.md');
  checkPublication(draft, sheet);
  assert.throws(() => checkPublication(draft.replace('status: review', 'status: ready'), sheet));
  assert.throws(() => checkPublication(draft, sheet.replace(hash(draft), '0'.repeat(64))));
  assert.throws(() => checkPublication(draft, sheet.replace('| Pending |', '| Approved |')));
  assert.match(sheet, /checked 9 September, rechecked 10 September 2026/);
  assert.match(read('meta/backlog.md'), /downside of the frame/);
});
test('unsealed Canadian note discloses human account and PDF-reader boundary', () => {
  const note = read('forecasts/prospective-pilot/round-10-canada/issuance-note.md');
  assert.match(note, /human GitHub account `ferbo-atl`/);
  assert.match(note, /agent[\s\S]*token/);
  assert.match(note, /COLLABORATOR/);
  assert.match(note, /does not establish repository ownership/);
  assert.match(note, /PDF reader/);
  assert.match(note, /not machine-checked/);
  assert.match(note, /metadata-only author-case/);
});
test('operations and provenance notes expose closure and integration limits', () => {
  const operations = read('reviews/round-10-forecast-operations.md');
  assert.match(operations, /remove.*nero-intake\.yml/);
  assert.match(operations, /publish job alone/);
  assert.match(operations, /rerun the complete workflow/);
  const progress = read('reviews/round-10-progress.md');
  assert.match(progress, /self-posted, editable and externally unverified/);
  assert.match(progress, /direct merges.*lane PR/);
  const hygiene = read('reviews/round-10-hygiene.md');
  assert.match(hygiene, /Ren \(AI agent\)[\s\S]*Ren/);
  assert.match(hygiene, /covers editions 1\.0\.0 and 1\.1\.0/);
});
