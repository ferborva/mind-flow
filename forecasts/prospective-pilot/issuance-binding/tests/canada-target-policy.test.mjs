import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCanadaDraft } from '../../round-10-canada/draft.mts';
import { assertCanadaDraftTarget, resolveCanadaNativeCell } from '../../round-10-canada/target-policy.mjs';
test('fixed target rejects relabelled past reference year, SA substitution and clock drift',()=>{
  assert.equal(assertCanadaDraftTarget(deriveCanadaDraft()),true);
  for(const mutate of [d=>d.target.time='2025M10',d=>d.target.native_threshold='7.3',d=>d.target.source='StatCan-SA',d=>d.question='Will unemployment fall?',d=>d.clocks.observation_window.starts_at='2026-09-01T00:00:00Z',d=>d.issuance_authorised=true]){
    const d=deriveCanadaDraft();mutate(d);assert.throws(()=>assertCanadaDraftTarget(d));
  }
});
test('native outcome comparator rejects absent/conflicting/changed cells, never substitutes',()=>{
  const d=deriveCanadaDraft();const row={...d.target,obs_value:'7.302'};delete row.native_threshold;delete row.operator;
  assert.equal(resolveCanadaNativeCell([row]),1);
  assert.equal(resolveCanadaNativeCell([{...row,obs_value:'7.301'}]),0);
  assert.throws(()=>resolveCanadaNativeCell([]));
  assert.throws(()=>resolveCanadaNativeCell([row,row]));
  assert.throws(()=>resolveCanadaNativeCell([{...row,note_source:'changed'}]));
  assert.throws(()=>resolveCanadaNativeCell([{...row,obs_value:''}]));
});
