import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateFeasibility, summariseFeasibility } from '../tools/feasibility.mjs';

const proposal = JSON.parse(await readFile(new URL('../feasibility.v1.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(proposal);

test('retained feasibility proposal validates without admitting measurements', () => {
  assert.equal(validateFeasibility(proposal), true);
  assert.deepEqual(summariseFeasibility(proposal), {
    status: 'proposal-not-admitted', candidateCount: 3,
    recommendedCandidate: 'usa-sipp', admittedMeasurements: 0,
    nationalStormInference: false, liveWarningReady: false,
    unresolvedDecisionCount: 7, pendingGateCount: 6,
  });
});

test('proposal cannot promote research into an operational signal', () => {
  for (const mutate of [
    p => { p.status = 'admitted'; },
    p => { p.evidenceAdmission.admittedMeasurements = 1; },
    p => { p.evidenceAdmission.nationalStormInference = true; },
    p => { p.evidenceAdmission.liveWarningReady = true; },
    p => { p.evidenceAdmission.microdataRetrieved = true; },
    p => { p.gates[0].status = 'approved'; },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p));
  }
});

test('unanswered threshold, severity and household choices cannot be silently settled', () => {
  for (const decision of proposal.unresolvedDecisions) {
    const p = copy();
    p.unresolvedDecisions.find(d => d.id === decision.id).value = 5;
    assert.throws(() => validateFeasibility(p), /unresolved/);
  }
  const p = copy(); p.unresolvedDecisions.pop();
  assert.throws(() => validateFeasibility(p), /decision/);
});

test('citations must resolve to unique official dated source records', () => {
  for (const mutate of [
    p => { p.sources[0].url = 'javascript:alert(1)'; },
    p => { p.sources[0].url = 'https://census.gov.attacker.example/source'; },
    p => { p.sources[0].assessedAt = '2026-02-30'; },
    p => { p.sources.push(structuredClone(p.sources[0])); },
    p => { p.candidates[0].sourceIds.push('missing-source'); },
    p => { p.candidates[0].sourceIds = []; },
    p => { p.sources[0].locator = ''; },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p));
  }
});

test('each candidate retains every feasibility dimension and its hard gaps', () => {
  for (const field of ['constructFit', 'longitudinal', 'denominator', 'timeliness', 'access', 'claimLimit']) {
    const p = copy(); delete p.candidates[0][field];
    assert.throws(() => validateFeasibility(p), new RegExp(field));
  }
  const p = copy(); p.candidates[0].gaps = [];
  assert.throws(() => validateFeasibility(p), /gaps/);
});

test('recommendation remains conditional, scoped and attached to a candidate', () => {
  for (const mutate of [
    p => { p.recommendation.candidateId = 'missing'; },
    p => { p.recommendation.conditionalOn = []; },
    p => { p.recommendation.scope = 'national-storm-detection'; },
    p => { p.recommendation.livePilotCountry = 'USA'; },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p));
  }
});

test('unknown properties cannot smuggle approvals or personal records into this contract', () => {
  for (const mutate of [
    p => { p.measurements = [{ personId: 'x' }]; },
    p => { p.candidates[0].approved = true; },
    p => { p.evidenceAdmission.authority = 'agent'; },
    p => { p.sources[0].rawParticipant = {}; },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p), /unknown/);
  }
});

test('version, population scope and source-inspection basis are explicit', () => {
  for (const mutate of [
    p => { p.schemaVersion = '2.0.0'; },
    p => { p.sources[0].evidenceKind = 'retained-source-bytes'; },
    p => { p.candidates[0].country = 'WORLD'; },
    p => { p.candidates.push(structuredClone(p.candidates[0])); },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p));
  }
});

test('candidate-country identity and the full acquisition gate set cannot be weakened', () => {
  for (const mutate of [
    p => { p.candidates[0].country = 'AUS'; },
    p => { p.gates.pop(); },
    p => { p.gates[0].id = 'irrelevant-check'; },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p));
  }
});

test('authorship and gate prose cannot coherently assert a human decision or waive review', () => {
  for (const mutate of [
    p => { p.authorship = 'Fernando: final decision'; },
    p => { p.gates[0].ownerRole = 'Fernando, appointed and approved'; },
    p => { p.gates[0].requirement = 'No construct review necessary'; },
    p => {
      p.authorship = 'Fernando: final decision';
      for (const gate of p.gates) {
        gate.ownerRole = 'Fernando, appointed and approved';
        gate.requirement = 'No further review necessary';
      }
    },
  ]) {
    const p = copy(); mutate(p);
    assert.throws(() => validateFeasibility(p), /authorship|gate.*semantics/);
  }
  for (const original of proposal.gates) {
    for (const field of ['requirement', 'ownerRole']) {
      const p = copy();
      p.gates.find(gate => gate.id === original.id)[field] = 'Approved without further review';
      assert.throws(() => validateFeasibility(p), /gate.*semantics/);
    }
  }
});
