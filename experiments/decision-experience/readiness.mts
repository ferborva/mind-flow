import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, canonicalJson } from '../observatory-comparison/render-model.mjs';

type SourceRef = { path: string; sha256: string; pointer?: string };
type Material = { id: string; label: string; value: string };
type Task = { id: string; title: string; prompt: string; options: { id: string; label: string; assessment: string; feedback: string }[] };
type RenderPack = { materials: Material[]; tasks: Task[]; study_boundary: string; outcome_boundary: string };
type Requirement = { status: string; owner_role: string; label?: string; reference?: string };
type Proposal = { schema_version: string; id: string; sources: Record<string, SourceRef>; requirements: Record<string, Requirement>; analysis: { power_plan: string | null; smallest_worthwhile_effect: number | null } };
export const REQUIREMENTS = ['accountable-human-lead', 'ethics-determination', 'privacy-consent-withdrawal', 'affected-party-governance', 'accessibility-visible-parity', 'compensation-support', 'independent-safety-monitor', 'analysis-power-plan', 'missingness-multiplicity', 'allocation-and-coding', 'preregistration-freeze'];

export function evaluateReadiness(input: unknown) {
  const p = input as Proposal | null;
  const valid = p?.schema_version === '1.0.0' && p.id === 'round-11.decision-experience.preparation'
    && p.requirements && !Array.isArray(p.requirements) && p.analysis && p.sources;
  const blockers: { id: string; label: string; owner_role: string }[] = [];
  if (!valid) blockers.push({ id: 'invalid-proposal', label: 'Malformed or unsupported preparation record', owner_role: 'Engineering reviewer' });
  for (const id of REQUIREMENTS) {
    const r = valid ? p.requirements[id] : undefined;
    // A reference is a claim, not an authenticated approval. No success pathway exists here.
    blockers.push({ id, label: r?.label || `Independently establish ${id}`, owner_role: r?.owner_role || 'Human owner not appointed' });
  }
  blockers.push({ id: 'external-authority-verifier', label: 'This preparation format cannot authenticate appointments or approve recruitment. A separately reviewed operational protocol is required.', owner_role: 'Human programme authority and independent reviewer' });
  return {
    schema_version: '1.0.0', status: 'blocked', blockers,
    prerequisite_claims_received: valid ? REQUIREMENTS.filter(id => p.requirements[id]?.status === 'independently-reviewed' && p.requirements[id]?.reference).length : 0,
    prerequisites_complete: false, recruitment_allowed: false, participant_data_collection: 'disabled',
    human_testing_completed: false, statistical_power_established: false, authority_effect: 'none',
  };
}

function loadBound(root: string, ref: SourceRef) {
  if (!ref || typeof ref.path !== 'string' || isAbsolute(ref.path) || ref.path.split(/[\\/]/).includes('..')) throw new Error('Unsafe source path');
  const path = resolve(root, ref.path);
  const rel = relative(realpathSync(root), realpathSync(path));
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Unsafe source path');
  const bytes = readFileSync(path);
  if (digest(bytes) !== ref.sha256) throw new Error(`Source digest mismatch: ${ref.path}`);
  return JSON.parse(bytes.toString('utf8'));
}

export function buildPackage(root: string, p: Proposal) {
  if (evaluateReadiness(p).blockers.some(b => b.id === 'invalid-proposal')) throw new Error('Invalid proposal');
  const measurements = loadBound(root, p.sources.measurements);
  const storm = loadBound(root, p.sources.storm);
  const protocol = loadBound(root, p.sources.protocol);
  const manifest = loadBound(root, p.sources.manifest);
  const familyIndex = measurements.families.findIndex((f: { id: string }) => f.id === 'income-employment-population.v1');
  const family = measurements.families[familyIndex];
  const receipt = measurements.receipts.find((r: { id: string }) => r.id === family.source_id);
  const body = { path: `${measurements.source_directory}/${receipt.id}.body`, sha256: receipt.body_sha256 };
  // Raw evidence is CSV. Hash the bytes directly; do not claim publisher authentication.
  if (digest(readFileSync(resolve(root, body.path))) !== body.sha256) throw new Error('Source digest mismatch: retained CSV body');
  const observations = [2024, 2025].map(year => {
    const index = family.observations.findIndex((o: { iso3: string; year: number }) => o.iso3 === 'USA' && o.year === year);
    if (index < 0) throw new Error(`USA ${year} observation missing`);
    return { ...family.observations[index], source_ref: { ...p.sources.measurements, pointer: `/families/${familyIndex}/observations/${index}` }, raw_source_ref: body };
  });
  const assessmentIndex = storm.latest.findIndex((r: { country: string }) => r.country === 'USA');
  const assessment = storm.latest[assessmentIndex];
  if (!assessment || assessment.period.from !== 2024 || assessment.period.to !== 2025) throw new Error('Unexpected country assessment scope');
  const change = assessment.native_context.find((x: { family_id: string }) => x.family_id === family.id).native_change_pp;
  const materials: Material[] = [
    { id: 'scope', label: 'Place and period', value: 'United States. Annual comparison: 2024 to 2025. This is a retained historical comparison, not live conditions.' },
    { id: 'before', label: '2024 employment-to-population ratio', value: `${observations[0].source_value}%` },
    { id: 'after', label: '2025 employment-to-population ratio', value: `${observations[1].source_value}%` },
    { id: 'change', label: 'Native indicator change', value: `${change} percentage points. This is a stock-share change, not a count of people losing access to income.` },
    { id: 'denominator', label: 'Whom this statistic covers', value: family.denominator },
    { id: 'vintage', label: 'Measurement vintage', value: `${family.vintage}. Captured ${receipt.ended_at}. A capture date is not an observation date. Row-level actual-versus-projected status is not established.` },
    { id: 'limits', label: 'What this cannot establish', value: family.limitation },
    { id: 'storm', label: 'Storm assessment', value: `${assessment.state}: qualifying evidence is missing. This means neither a confirmed storm nor confirmed stability.` },
    { id: 'missing', label: 'Evidence needed', value: assessment.missing_evidence.join('; ') },
    { id: 'if', label: 'The decision boundary', value: 'Investigate possible income-access disruption IF comparable direct evidence identifies the same population, period, severity and viable alternative routes. Native context does not satisfy that IF.' },
    { id: 'forecast', label: 'Forecast boundary', value: 'No forecast probability is issued by this task. A forecast concerns a future event and cannot set the current IF state.' },
    { id: 'authority', label: 'Authority boundary', value: 'No personal, employer or government action is authorised. A proposed option is not a commitment. Declining to act on this material does not establish safety.' },
    { id: 'source', label: 'Source and trace', value: `ILO modelled estimates. ${receipt.url} | ${body.path} | ${body.sha256}. Retained hashes establish byte identity, not publisher authentication.` },
    { id: 'correction', label: 'Challenge route', value: 'Repository review only: https://github.com/ferborva/mind-flow/issues. Do not post personal information. No response-time promise, adjudication service or participant support service is established.' },
  ];
  const tasks = [
    { id: 'read-the-change', title: 'Read the change without inventing a person', prompt: 'Explain the change, its denominator and one inference these facts cannot support.', options: [
      { id: 'stock-share', label: 'The employment share fell by 0.353 percentage points among people aged 15+.', assessment: 'supported-context', feedback: 'Correct for this retained indicator. It does not identify individual losses, hours or income routes.' },
      { id: 'people-lost', label: '0.353% of all Americans lost their means of earning income.', assessment: 'unsupported-inference', feedback: 'Different denominator and different construct. Stock changes do not identify gross personal transitions.' },
    ] },
    { id: 'read-the-unknown', title: 'What does cannot-say change?', prompt: 'What would you tell someone asking whether this country is safe from a storm?', options: [
      { id: 'gap', label: 'The proposed storm criterion is unassessed because qualifying evidence is missing.', assessment: 'supported-boundary', feedback: 'Neither safety nor crisis follows. Name the missing evidence before changing the claim.' },
      { id: 'safe', label: 'The system found no storm, so there is no need to prepare.', assessment: 'unsupported-inference', feedback: 'Missing evidence is not a finding of stability. Preparation also requires context, authority and feasible choices.' },
    ] },
    { id: 'choose-next-step', title: 'Choose a next step, or challenge the premise', prompt: 'Fictional desk-research rehearsal: a research team has limited capacity. Which option could it justify, and under what conditions? These are proposed research choices, not advice to affected people.', options: [
      { id: 'investigate', label: 'Scope a direct-measurement feasibility check.', assessment: 'defensible-with-conditions', feedback: 'Defensible IF the team has capacity and the expected information would change a decision. No participant contact or acquisition is authorised here.' },
      { id: 'wait', label: 'Defer this investigation and monitor the next comparable release.', assessment: 'defensible-with-conditions', feedback: 'Defensible IF opportunity cost warrants it, an owner and review date are set, and the missing-evidence warning remains. Waiting is not proof of safety.' },
      { id: 'warn', label: 'Issue a national crisis warning now.', assessment: 'unsupported-inference', feedback: 'This evidence does not identify qualifying disruption, affected population or warning skill. Authority is also absent.' },
    ] },
  ];
  const script = ['Restate the population and period without adding facts.', 'Name what remains unknown and what evidence would change your interpretation.', 'Compare the proposed options, including deferral, prerequisites and refusal.', 'Identify what neither the material nor the facilitator is authorised to decide.'];
  const materialDigest = digest(canonicalJson({ materials, tasks }));
  const taskPack = {
    schema_version: '1.0.0', id: 'round-11.decision-rehearsal.usa-2024-2025', classification: 'retained-context-with-agent-proposed-rehearsals',
    source_refs: p.sources, source_authentication_established: false, observations, native_change_pp: change,
    storm_assessment: assessment.state, storm_source_ref: { ...p.sources.storm, pointer: `/latest/${assessmentIndex}` },
    materials, tasks, material_digest: materialDigest, neutral_script: script,
    arms: [ ['conventional', false], ['conventional', true], ['station', false], ['station', true] ].map(([layout, facilitated]) => ({ id: `${layout}-${facilitated ? 'facilitated' : 'self-serve'}`, layout, facilitated, allocation_weight: 1, material_digest: materialDigest, script_digest: facilitated ? digest(canonicalJson(script)) : null })),
    harm_stops: manifest.safety.stop_rules,
    feedback_role: 'author-proposed-rehearsal-not-validated-rubric',
    outcome_boundary: 'Interpretation and appropriate boundary recognition, not aesthetic preference or thesis agreement. No human responses or benefit have been measured.',
    proposed_primary_endpoint: protocol.analysis.primary_endpoint,
    study_boundary: 'Materials review only. Recruitment blocked. No responses are collected. No personal advice. Not a crisis warning.',
  };
  const rendered = { conventional: renderMaterial(taskPack, 'conventional'), station: renderMaterial(taskPack, 'station') };
  for (const kind of ['conventional', 'station'] as const) assertMaterialParity(rendered[kind], taskPack, kind);
  const readiness = { ...evaluateReadiness(p), generated_from: { proposal_sha256: digest(canonicalJson(p)), material_digest: materialDigest }, parity: { exact_material_match: true, browser_visibility_verified: false, assisted_output_verified: false }, task_count: tasks.length, proposed_arm_count: taskPack.arms.length };
  return { taskPack, rendered, readiness };
}

function escape(value: unknown) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
export function renderMaterial(pack: RenderPack, kind: 'conventional' | 'station'): string {
  if (!['conventional', 'station'].includes(kind)) throw new Error('Unsupported layout');
  const css = kind === 'station' ? 'body{background:#081720;color:#edf8fc}article{border:1px solid #487080;border-radius:12px;padding:1rem}a{color:#a6e8ff}' : 'body{background:white;color:#182028}article{border-bottom:1px solid #9ca9b0;padding:1rem 0}a{color:#144e79}';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Decision rehearsal: ${kind}</title><style>body{font:18px/1.55 system-ui;margin:auto;max-width:850px;padding:24px}*{box-sizing:border-box}p{overflow-wrap:anywhere}summary{cursor:pointer}summary:focus-visible{outline:3px solid #ad6516}h1{line-height:1.2}article{margin:16px 0}${css}</style></head><body>
<header><p>MATERIALS REVIEW ONLY</p><h1>What changed. What follows?</h1><p>${escape(pack.study_boundary)}</p><p>Same source-bound material; ${kind} presentation proposal. No timed exposure, assignment or recruitment is active.</p></header>
<main>${pack.materials.map(m => `<article data-material-id="${escape(m.id)}"><h2>${escape(m.label)}</h2><p>${escape(m.value)}</p></article>`).join('\n')}
<section><h2>Three decision rehearsals</h2>${pack.tasks.map(t => `<article><h3>${escape(t.title)}</h3><p>${escape(t.prompt)}</p>${t.options.map(o => `<details><summary>${escape(o.label)}</summary><p>Proposed feedback: ${escape(o.feedback)}</p></details>`).join('')}</article>`).join('')}</section>
<p>Feedback is shown for design review. This is not a held-out assessment or validated coding rubric. Do not use these exposed answers to measure unaided comprehension.</p></main>
<footer><p>${escape(pack.outcome_boundary)}</p><p>${escape(pack.study_boundary)}</p></footer></body></html>
`;
}

export function assertMaterialParity(html: string, pack: RenderPack, kind: 'conventional' | 'station') {
  if (html !== renderMaterial(pack, kind)) throw new Error(`Material template differs: ${kind}`);
  return true;
}

const ownPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === ownPath) {
  try {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const dir = fileURLToPath(new URL('./', import.meta.url));
    const proposal = JSON.parse(readFileSync(resolve(dir, 'proposal.json'), 'utf8'));
    const result = buildPackage(root, proposal);
    const outputs = new Map([
      ['task-pack.json', `${JSON.stringify(result.taskPack, null, 2)}\n`],
      ['readiness-summary.json', `${JSON.stringify(result.readiness, null, 2)}\n`],
      ['conventional.html', result.rendered.conventional], ['station.html', result.rendered.station],
    ]);
    if (process.argv.includes('--write')) for (const [name, bytes] of outputs) writeFileSync(resolve(dir, name), bytes);
    if (process.argv.includes('--check')) for (const [name, bytes] of outputs) if (readFileSync(resolve(dir, name), 'utf8') !== bytes) throw new Error(`Generated material differs: ${name}`);
    console.log(JSON.stringify(result.readiness, null, 2));
  } catch (cause) {
    console.error(`Decision-experience preparation failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    process.exitCode = 1;
  }
}
