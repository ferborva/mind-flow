import assert from 'node:assert/strict';
import test from 'node:test';
import { publisherClassification } from '../model.mjs';
test('publisher status and method remain distinct, even for a survey-labelled nowcast', () => {
  const label = publisherClassification({ estimateType: 'nowcast', estimationType: 'survey' });
  assert.match(label, /status: nowcast/);
  assert.match(label, /method: survey/);
  assert.doesNotMatch(label, /not a same-year survey/);
  assert.match(publisherClassification(null), /No retained point/);
});
test('an adapter absence label is not attributed to the publisher as a literal status', () => {
  const label = publisherClassification({ estimateType: 'modelled-vintage-no-row-actual-status', estimationType: 'ILO-modelled' });
  assert.match(label, /ILO modelled estimate/);
  assert.match(label, /not supplied/);
  assert.doesNotMatch(label, /Publisher status: modelled-vintage/);
});
