import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyShockContext } from '../tools/shock-context.mts';
test('retained primary shock context has exact bytes and bounded historical claims',()=>{
  const result=verifyShockContext();
  assert.deepEqual(result.map(r=>r.id),['financial-crisis','pandemic']);
  assert.deepEqual(result.map(r=>r.body_sha256),['sha256:1d708913a541b422ab07f1e5aec92e0e4d43b7e5bb4337d4d6cf9013681edde3','sha256:ed40539faf2d71289c2ff7a734dc099a966e8beeef52df0600ee62c7b5b31e89']);
  assert.ok(result.every(r=>r.claim_ceiling==='Historical shock context only; not country-level storm ground truth'));
});
