import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const text = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const app = text('app.mjs');

test('review planning controls are explicitly labelled, local and independent of the historical chart', () => {
  const html = text('index.html');
  for (const id of ['review-clock', 'review-clock-apply', 'review-clock-reset', 'review-clock-status', 'review-desk-rows', 'review-trust']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /<label for="review-clock">[^<]*UTC/);
  assert.match(html, /id="review-clock"[^>]*type="text"/);
  assert.match(html, /id="review-clock-status"[^>]*role="status"/);
  assert.match(html, /untrusted browser clock/i);
  assert.match(html, /not a live feed/i);
  assert.match(html, /Required review role: unappointed/);
  assert.match(app, /from '\.\/review-clock\.mjs'/);
  assert.doesNotMatch(app.slice(app.indexOf('  function render()'), app.indexOf("  [['country-select'")), /updateReviewDesk/);
});

function harness(evaluator) {
  const start = app.indexOf('  function updateReviewDesk(');
  const end = app.indexOf('  function renderPreparation()', start);
  assert.ok(start >= 0 && end > start, 'isolated review UI update exists');
  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: 'old derived material', textContent: '', value: '', attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } });
    return nodes.get(id);
  };
  const context = { $, reviewDesk: evaluator, data: { forecasts: ['retained'], trustReview: { retained: true } }, esc: value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), sourceLink: path => '../../' + path };
  vm.createContext(context);
  vm.runInContext(app.slice(start, end), context);
  return { update: (...args) => context.updateReviewDesk(...args), $ };
}

const result = {
  asOf: '2026-11-06T00:00:00.000Z',
  forecasts: [{ id: 'canada', place: 'Canada <test>', attention: 'review-eligible', windowPhase: 'window-open', phaseLabel: 'Review window open', admissionBlocked: false, resolutionStatus: 'unresolved', nextReview: 'Inspect the eligible native series.', source: { path: 'forecasts/exact-issued.json', sha256: 'sha256:abc' }, issuedAt: '2026-09-10T07:56:37Z', resolveAfter: '2026-11-06T00:00:00Z', resolveBy: '2026-12-31T23:59:59Z', outcome: null, score: null, authority: 'none' }],
  trustReview: { reviewDate: '2026-09-16', calendarPosition: 'after', label: 'Date has passed in the planning calendar', sourceTimeZone: null, path: 'reviews/trust.md', sourceSha256: 'sha256:trust', acceptanceRenewed: false },
  clockAuthenticated: false, sourceAvailabilityChecked: false, liveLifecycleVerified: false,
};

test('review UI presents evaluator output, exact source bindings and no authority promotion', () => {
  const { update, $ } = harness((forecasts, trust, asOf) => {
    assert.equal(forecasts[0], 'retained'); assert.equal(trust.retained, true); assert.equal(asOf, 'input'); return result;
  });
  update('input', 'Entered planning time');
  assert.match($('review-desk-rows').innerHTML, /data-forecast-id="canada" data-window-phase="window-open" data-attention="review-eligible"/);
  assert.match($('review-desk-rows').innerHTML, /Canada &lt;test&gt;/);
  assert.match($('review-desk-rows').innerHTML, /Inspect the eligible native series/);
  assert.match($('review-desk-rows').innerHTML, /\.\.\/\.\.\/forecasts\/exact-issued.json/);
  assert.match($('review-desk-rows').innerHTML, /sha256:abc/);
  assert.match($('review-desk-rows').innerHTML, /2026-12-31T23:59:59Z/);
  assert.match($('review-trust').innerHTML, /2026-09-16/);
  assert.match($('review-trust').innerHTML, /sha256:trust/);
  assert.match($('review-trust').innerHTML, /no time zone or hour/i);
  assert.match($('review-trust').innerHTML, /not an expiry verdict/i);
  assert.equal($('review-trust').attributes['data-calendar-position'], 'after');
  assert.match($('review-clock-status').textContent, /2026-11-06T00:00:00.000Z/);
  assert.match($('review-clock-status').textContent, /Entered planning time/);
  assert.equal($('review-clock').attributes['aria-invalid'], 'false');
});

test('bad planning input clears only derived review output, not fixed forecast cards or the station', () => {
  const { update, $ } = harness(() => { throw new Error('Use a complete UTC timestamp'); });
  $('main').innerHTML = 'usable station'; $('forecast-cards').innerHTML = 'fixed records';
  $('review-trust').setAttribute('data-calendar-position', 'after');
  update('invalid', 'Entered planning time');
  assert.equal($('review-desk-rows').innerHTML, '');
  assert.equal($('review-trust').innerHTML, '');
  assert.equal($('review-trust').attributes['data-calendar-position'], undefined);
  assert.equal($('main').innerHTML, 'usable station');
  assert.equal($('forecast-cards').innerHTML, 'fixed records');
  assert.equal($('review-clock').attributes['aria-invalid'], 'true');
  assert.match($('review-clock-status').textContent, /Use a complete UTC timestamp/);
});

test('a preserved defect stays admission-blocked even when the displayed deadline has passed', () => {
  const defect = structuredClone(result);
  Object.assign(defect.forecasts[0], { attention: 'blocked-defect', windowPhase: 'deadline-passed', phaseLabel: 'Past the recorded resolution deadline', admissionBlocked: true, nextReview: 'Review the disclosed target defect.' });
  const { update, $ } = harness(() => defect);
  update('input', 'Entered planning time');
  assert.match($('review-desk-rows').innerHTML, /data-window-phase="deadline-passed" data-attention="blocked-defect"/);
  assert.match($('review-desk-rows').innerHTML, /Preserved defect: admission blocked/);
  assert.match($('review-desk-rows').innerHTML, /Past the recorded resolution deadline/);
  assert.doesNotMatch($('review-desk-rows').innerHTML, /Outcome: false|Voided|Scored/);
});

test('a corrected input restores the derived desk after a local planning failure', () => {
  const { update, $ } = harness((_forecasts, _trust, asOf) => { if (asOf === 'bad') throw new Error('Invalid UTC instant'); return result; });
  update('bad', 'Entered planning time');
  assert.equal($('review-clock').attributes['aria-invalid'], 'true');
  assert.equal($('review-desk-rows').innerHTML, '');
  update('input', 'Untrusted browser clock snapshot');
  assert.equal($('review-clock').attributes['aria-invalid'], 'false');
  assert.match($('review-desk-rows').innerHTML, /data-forecast-id="canada"/);
  assert.match($('review-clock-status').textContent, /Untrusted browser clock snapshot/);
});

test('planning time changes require explicit controls, with no polling or persistence', () => {
  assert.match(app, /review-clock-apply'\).addEventListener\('click'/);
  assert.match(app, /review-clock-reset'\).addEventListener\('click'/);
  assert.doesNotMatch(app, /setInterval|localStorage|sessionStorage/);
  assert.match(text('styles.css'), /\.review-clock-controls/);
  assert.match(text('styles.css'), /\.review-desk[^\n]*overflow-wrap:anywhere/);
});
test('the separate trust card states the required decision without inventing a disposition', () => {
  const {update,$} = harness(() => result);
  update('input','Entered planning time');
  assert.match($('review-trust').innerHTML, /renew, replace or reject/);
  assert.match($('review-trust').innerHTML, /No disposition is supplied here/);
});
