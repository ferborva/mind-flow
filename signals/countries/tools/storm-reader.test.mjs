import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIncomeContext } from './render-country-view.mjs';
import { loadStormReview } from './storm-criterion.mts';

test('existing Markdown reader exposes fifty dated diagnoses without inventing people or bindings', () => {
  const text = renderIncomeContext(loadStormReview());
  assert.equal((text.match(/\| cannot-say \|/g) ?? []).length, 50);
  assert.match(text, /49.*nowcast/);
  assert.match(text, /not a measured storm panel/);
  assert.match(text, /ARG.*No national PIP observation/);
  assert.match(text, /Direct disruption.*Household exposure/);
  assert.doesNotMatch(text, /storm detected|zero storms|all clear/i);
});
test('coherent-looking verdict and native value mutations cannot enter the reader', () => {
  const review = loadStormReview();
  review.latest[0].state = 'candidate';
  assert.throws(() => renderIncomeContext(review), /replay/);
  const changed = loadStormReview();
  changed.latest[0].native_context[0].value = 99;
  assert.throws(() => renderIncomeContext(changed), /replay/);
});
