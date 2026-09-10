import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { deriveCanadaDraft, serializeCanadaDraft } from '../../round-10-canada/draft.mts';
test('retained native source reproduces an unissued draft and both baselines',()=>{
  const draft=deriveCanadaDraft();
  assert.equal(draft.issuance_authorised,false);
  assert.equal(draft.status,'draft-not-issued');
  assert.equal(draft.companion.storm_panel_admitted,false);
  assert.equal(draft.baselines.direction,0.483333);
  assert.equal(draft.baselines.naive,0.5);
  assert.equal(draft.reference.value,'7.302');
  assert.equal(draft.target.time,'2026M10');
  assert.equal(draft.history.observations.length,128);
  assert.equal(readFileSync(new URL('../../round-10-canada/preregistration-draft.json',import.meta.url),'utf8'),serializeCanadaDraft(draft));
});
test('draft producer refuses unknown CLI options',()=>{
  assert.throws(()=>execFileSync(process.execPath,[new URL('../../round-10-canada/draft.mts',import.meta.url).pathname,'--garbage'],{stdio:'pipe'}));
});
