import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const decisions = ['affected-share', 'severity', 'persistence', 'denominator', 'household-treatment', 'viable-alternative', 'beneficial-transition'];
const candidateCountries = { 'usa-sipp': 'USA', 'aus-hilda': 'AUS', 'gbr-ukhls': 'GBR' };
const requiredGates = ['construct', 'variables', 'rights', 'analysis', 'acquisition', 'admission'];
const officialHosts = ['census.gov', 'www.census.gov', 'www2.census.gov', 'www.govinfo.gov', 'melbourneinstitute.unimelb.edu.au', 'doc.ukdataservice.ac.uk', 'ukdataservice.ac.uk'];
const fail = message => { throw new Error(`Income-access feasibility: ${message}`); };
const text = (value, label) => {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${label} requires non-empty text`);
};
const exactKeys = (object, keys, label) => {
  if (!object || typeof object !== 'object' || Array.isArray(object)) fail(`${label} requires an object`);
  for (const key of Object.keys(object)) if (!keys.includes(key)) fail(`${label}: unknown field ${key}`);
  for (const key of keys) if (!Object.hasOwn(object, key)) fail(`${label}: missing ${key}`);
};
const list = (value, label) => {
  if (!Array.isArray(value) || !value.length) fail(`${label} requires a non-empty array`);
};
const strings = (value, label) => {
  list(value, label); value.forEach(item => text(item, label));
  if (new Set(value).size !== value.length) fail(`${label} has duplicate entries`);
};
const date = (value, label) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} requires an ISO date`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(`${label} is not a calendar date`);
};

/** Validate an authored, metadata-only proposal. This does not authenticate sources or admit evidence. */
export function validateFeasibility(p) {
  exactKeys(p, ['schemaVersion', 'id', 'status', 'assessedAt', 'authorship', 'sources', 'candidates', 'recommendation', 'unresolvedDecisions', 'gates', 'evidenceAdmission'], 'proposal');
  if (p.schemaVersion !== '1.0.0' || p.id !== 'income-access-feasibility.round-11') fail('unsupported version or identity');
  if (p.status !== 'proposal-not-admitted') fail('this contract cannot promote the proposal');
  date(p.assessedAt, 'assessedAt'); text(p.authorship, 'authorship');
  exactKeys(p.evidenceAdmission, ['admittedMeasurements', 'nationalStormInference', 'liveWarningReady', 'microdataRetrieved'], 'evidenceAdmission');
  if (p.evidenceAdmission.admittedMeasurements !== 0 ||
      p.evidenceAdmission.nationalStormInference !== false ||
      p.evidenceAdmission.liveWarningReady !== false ||
      p.evidenceAdmission.microdataRetrieved !== false) fail('proposal evidence and warning boundary cannot be changed in v1');
  list(p.sources, 'sources');
  const ids = new Set();
  for (const source of p.sources) {
    exactKeys(source, ['id', 'publisher', 'title', 'url', 'assessedAt', 'publishedOrRevised', 'locator', 'finding', 'evidenceKind'], 'source');
    for (const key of ['id', 'publisher', 'title', 'locator', 'finding']) text(source[key], `source.${key}`);
    if (ids.has(source.id)) fail(`duplicate source ${source.id}`);
    ids.add(source.id);
    date(source.assessedAt, 'source.assessedAt');
    if (source.assessedAt > p.assessedAt) fail('source assessed after proposal');
    if (source.publishedOrRevised !== null) {
      date(source.publishedOrRevised, 'source.publishedOrRevised');
      if (source.publishedOrRevised > source.assessedAt) fail('source publication is in the future');
    }
    let url;
    try { url = new URL(source.url); } catch { fail(`source ${source.id} has invalid URL`); }
    if (url.protocol !== 'https:' || !officialHosts.includes(url.hostname) || url.username || url.password || url.port) fail('source URL must use a listed official HTTPS host');
    if (source.evidenceKind !== 'official-metadata-inspection-not-byte-capture') fail('source inspection must not claim byte-capture provenance');
  }
  list(p.candidates, 'candidates');
  const candidates = new Set();
  for (const candidate of p.candidates) {
    exactKeys(candidate, ['id', 'country', 'name', 'constructFit', 'longitudinal', 'denominator', 'timeliness', 'access', 'claimLimit', 'sourceIds', 'gaps'], 'candidate');
    for (const key of ['id', 'name', 'constructFit', 'longitudinal', 'denominator', 'timeliness', 'access', 'claimLimit']) text(candidate[key], `candidate.${key}`);
    if (!Object.hasOwn(candidateCountries, candidate.id) || candidateCountries[candidate.id] !== candidate.country) fail('candidate identity does not match country');
    if (candidates.has(candidate.id)) fail('duplicate candidate');
    candidates.add(candidate.id);
    strings(candidate.sourceIds, 'candidate.sourceIds');
    for (const id of candidate.sourceIds) if (!ids.has(id)) fail(`unresolved source ${id}`);
    strings(candidate.gaps, 'candidate.gaps');
  }
  exactKeys(p.recommendation, ['candidateId', 'scope', 'livePilotCountry', 'rationale', 'conditionalOn', 'counterargument', 'fallback'], 'recommendation');
  if (!candidates.has(p.recommendation.candidateId)) fail('recommendation candidate does not resolve');
  if (p.recommendation.scope !== 'historical-method-feasibility' || p.recommendation.livePilotCountry !== null) fail('recommendation cannot choose a live pilot or claim national detection');
  for (const key of ['rationale', 'counterargument', 'fallback']) text(p.recommendation[key], `recommendation.${key}`);
  strings(p.recommendation.conditionalOn, 'recommendation.conditionalOn');
  list(p.unresolvedDecisions, 'unresolvedDecisions');
  if (p.unresolvedDecisions.length !== decisions.length || new Set(p.unresolvedDecisions.map(d => d.id)).size !== decisions.length) fail('required decision set must remain complete and unique');
  for (const decision of p.unresolvedDecisions) {
    exactKeys(decision, ['id', 'question', 'value', 'status'], 'decision');
    if (!decisions.includes(decision.id) || decision.value !== null || decision.status !== 'unresolved') fail('decision must remain unresolved in this proposal');
    text(decision.question, 'decision.question');
  }
  list(p.gates, 'gates');
  if (p.gates.length !== requiredGates.length) fail('required gate set must remain complete');
  const gateIds = new Set();
  for (const gate of p.gates) {
    exactKeys(gate, ['id', 'requirement', 'ownerRole', 'status'], 'gate');
    for (const key of ['id', 'requirement', 'ownerRole']) text(gate[key], `gate.${key}`);
    if (gateIds.has(gate.id)) fail('duplicate gate');
    if (!requiredGates.includes(gate.id)) fail('unknown required gate identity');
    gateIds.add(gate.id);
    if (gate.status !== 'pending') fail('metadata proposal cannot approve gates');
  }
  return true;
}

export function summariseFeasibility(proposal) {
  validateFeasibility(proposal);
  return {
    status: proposal.status, candidateCount: proposal.candidates.length,
    recommendedCandidate: proposal.recommendation.candidateId,
    admittedMeasurements: proposal.evidenceAdmission.admittedMeasurements,
    nationalStormInference: proposal.evidenceAdmission.nationalStormInference,
    liveWarningReady: proposal.evidenceAdmission.liveWarningReady,
    unresolvedDecisionCount: proposal.unresolvedDecisions.length,
    pendingGateCount: proposal.gates.filter(g => g.status === 'pending').length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const proposal = JSON.parse(await readFile(new URL('../feasibility.v1.json', import.meta.url), 'utf8'));
    console.log(JSON.stringify(summariseFeasibility(proposal), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
