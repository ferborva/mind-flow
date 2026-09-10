import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual as same } from 'node:util';
import { computeConditionDefinitionHash, computeEventHash, computeManifestHash, validateExecutableIfKernel } from '../../../contracts/executable-if/validate.mjs';
import { projectExecutableIfEvolution, computeExecutableIfEvolutionManifestHash, validateExecutableIfEvolution } from '../../../contracts/evolution/project-executable-if.mjs';
import { auditPrimaryCareThresholds } from './audit-primary-care.mts';

const root = resolve(import.meta.dirname, '../../..');
const originalPath = 'pilots/australia/basket/primary-care.kernel.r3.json';
const currentPath = 'pilots/australia/basket/primary-care.kernel.current.json';
const positivePath = 'pilots/australia/data/positive-signals-2026-09-09.r3.json';
const consumerPath = 'pilots/australia/data/positive-signals-current.json';
const overlayPath = 'contracts/evolution/fixtures/australia-primary-care.current.json';
const workbookPath = 'pilots/australia/sources/primary-care/2026-09-10/pc-primary-care-tables.xlsx';
const workbookHash = 'sha256:99c6ff08e0a48026b780370aa4d02a8edb36b1b11049dd6ce92087005481a36c';
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const bytes = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const hash = (value: Buffer | string) => 'sha256:' + createHash('sha256').update(value).digest('hex');
const original = read(originalPath);
const originalConsumer = read(positivePath);
const costId = 'condition.au.gp.cost';
const definitionRef = (d: any) => ({ condition_id: d.condition_id, definition_version: d.definition_version, definition_hash: d.definition_hash });

export function appendCorroborationRequirement(kernel: any, recordedAt: string) {
  if (kernel.events.length !== original.events.length) throw new Error('Review event already appended or unexpected history');
  if (!same(kernel, original)) throw new Error('Append requires the exact retained pre-event kernel');
  const after = structuredClone(kernel);
  const previous = kernel.current_state.find((s: any) => s.condition_id === costId);
  const prior = kernel.events.flatMap((e: any) => e.introduced_definitions).find((d: any) => d.definition_hash === previous.condition_definition_ref.definition_hash);
  const definition = structuredClone(prior);
  definition.definition_version = '1.3.0';
  definition.effective_from = recordedAt;
  definition.predicates.measure.source_policy.minimum_distinct_artifact_hashes = 2;
  definition.definition_hash = computeConditionDefinitionHash(definition);
  const next = { ...previous, state_version: previous.state_version + 1, condition_definition_ref: definitionRef(definition) };
  const event: any = {
    sequence: kernel.events.length + 1, event_id: 'event.au.primary-care.12',
    operation: 'definition-revised', recorded_at: recordedAt, recorded_by: 'Ren (AI agent)',
    reason: `Review of retained RoGS workbook ${workbookPath} (${workbookHash}), table10A.26 C23, revealed phased very-remote exclusion missing from the CSV-only interpretation. Require two distinct retained numeric artifacts (CSV and footnoted workbook) before this research predicate can be assessed. This is a new evidence-policy choice, not proof of independent sources or full-population coverage. Broad-scope representativeness remains unestablished; no eligible observations are manufactured.`,
    previous_states: [previous], new_states: [next], introduced_definitions: [definition],
    identity_change: { kind: 'none' }, authority_effect: 'none', action_authorised: false,
    previous_event_hash: kernel.events.at(-1).event_hash, event_hash: '',
  };
  event.event_hash = computeEventHash(event);
  after.events.push(event);
  after.current_state = after.current_state.map((s: any) => s.condition_id === costId ? next : s);
  after.manifest_hash = computeManifestHash(after);
  const validation = validateExecutableIfKernel(after);
  if (!validation.machine_valid || !validation.integrity_valid) throw new Error(JSON.stringify(validation.errors));
  return after;
}

export function rebindPositiveConsumer(consumer: any, kernel: any) {
  if (!same(consumer, originalConsumer)) throw new Error('Rebind requires exact retained pre-event consumer');
  const result = structuredClone(consumer);
  result.id = 'australia-positive-signals-current';
  result.construction_revision = {
    supersedes_path: positivePath, supersedes_sha256: hash(readFileSync(resolve(root, positivePath))),
    reason: 'Explicitly rebind the existing historical-context consumer after the appended evidence-policy event; source values are unchanged and do not establish the revised predicate.',
    source_values_changed: false, basket_path: 'pilots/australia/basket/primary-care.r3.json',
    kernel_path: currentPath, kernel_manifest_hash: kernel.manifest_hash,
  };
  result.current_condition_truth_established = false;
  result.scope_and_comparison_limit = 'RoGS table10A.26 C23 and10A.33 C24: very-remote collection phased out in2023-24 and excluded in2024-25. Raw two-point differences are not common-population effects. The kernel broad-scope predicate remains unestablished; rebind is not empirical satisfaction.';
  result.definition_evolution_status = 'one-actual-appended-event-and-consumer-rebind; earlier-eleven-events-remain-construction-history';
  for (const signal of result.signals) {
    const current = kernel.current_state.find((s: any) => s.condition_id === signal.condition_definition_ref.condition_id && s.lifecycle === 'active');
    if (!current) throw new Error('Consumer condition is not active');
    signal.condition_definition_ref = structuredClone(current.condition_definition_ref);
    if (signal.condition_binding.startsWith('same-series')) signal.condition_binding = 'same-series-historical-context-not-evaluated-under-current-definition';
  }
  return result;
}

export function assessPositiveBinding(consumer: any, kernel: any) {
  try {
    const validation = validateExecutableIfKernel(kernel);
    if (!validation.machine_valid || !validation.integrity_valid) return { valid: false, code: 'KERNEL_INVALID', errors: ['Invalid kernel'] };
    const expectedIds = originalConsumer.signals.map((s: any) => s.id);
    const signals = consumer?.signals;
    const ids = Array.isArray(signals) ? signals.map((s: any) => s?.id) : [];
    const errors: string[] = [];
    if (!same([...ids].sort(), [...expectedIds].sort())) errors.push('Consumer signal membership differs');
    for (const expected of originalConsumer.signals) {
      const signal = signals?.find((s: any) => s?.id === expected.id);
      const state = kernel.current_state.find((s: any) => s.condition_id === expected.condition_definition_ref.condition_id && s.lifecycle === 'active');
      if (!state || !same(signal?.condition_definition_ref, state.condition_definition_ref)) errors.push(`Current definition binding differs: ${expected.id}`);
    }
    return { valid: errors.length === 0, code: errors.length ? 'CONSUMER_DEFINITION_BINDING_MISMATCH' : null,
      errors, threshold_audit: auditPrimaryCareThresholds(kernel) };
  } catch (error) { return { valid: false, code: 'CONSUMER_DEFINITION_BINDING_MISMATCH', errors: [String(error)] }; }
}

// Byte fidelity is a separate reproduction gate. Passing definition binding
// does not approve changed measurements, ceilings, prose or serialisation.
export function assessPositiveParity(consumerBytes: string, kernel: any) {
  try {
    const validation = validateExecutableIfKernel(kernel);
    if (!validation.machine_valid || !validation.integrity_valid) return { valid: false, code: 'KERNEL_INVALID', errors: ['Invalid kernel'] };
    const expected = same(kernel, original) ? originalConsumer : rebindPositiveConsumer(originalConsumer, kernel);
    const valid = consumerBytes === bytes(expected);
    return { valid, code: valid ? null : 'CONSUMER_BYTE_PARITY_MISMATCH', errors: valid ? [] : ['Retained consumer bytes differ from reproduction'] };
  } catch (error) { return { valid: false, code: 'CONSUMER_BYTE_PARITY_MISMATCH', errors: [String(error)] }; }
}

function outputs(kernel: any) {
  const overlay = projectExecutableIfEvolution(kernel, {
    artifact_path: currentPath, artifact_sha256: hash(bytes(kernel)),
    // Fixed clock captured for this Round 09 presentation revision. It is not
    // the source vintage or a new kernel-event clock.
    generated_at: '2026-09-10T00:43:48Z',
    ledger_id: 'ledger.au.primary-care.current',
  });
  overlay.publication_anchor.checkpoint_uri = 'https://github.com/ferborva/mind-flow/pull/16';
  overlay.manifest_hash = computeExecutableIfEvolutionManifestHash(overlay);
  const valid = validateExecutableIfEvolution(overlay, { sourceKernel: kernel, sourceKernelArtifactSha256: hash(bytes(kernel)) });
  if (!valid.ledger_valid) throw new Error(JSON.stringify(valid));
  return [[currentPath, kernel], [consumerPath, rebindPositiveConsumer(originalConsumer, kernel)], [overlayPath, overlay]] as const;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (hash(readFileSync(resolve(root, workbookPath))) !== workbookHash) throw new Error('Footnoted workbook bytes differ');
    const args = process.argv.slice(2);
    if (args.length !== 1 || !['--append', '--check', '--refresh-overlay'].includes(args[0])) throw new Error('Use --append once, --check, or explicitly --refresh-overlay after a reviewed projection change');
    if (args[0] === '--refresh-overlay') {
      // Reproduce only the presentation overlay, never rewrite the kernel,
      // consumer, original events or their recorded timestamps.
      const kernel = read(currentPath);
      const overlay = outputs(kernel).find(([path]) => path === overlayPath)![1];
      writeFileSync(resolve(root, overlayPath), bytes(overlay));
      console.log('Refreshed the current AU overlay only; kernel and consumer bytes unchanged.');
      process.exit(0);
    }
    const check = args[0] === '--check';
    const recordedAt = check ? read(currentPath).events.at(-1).recorded_at : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const generated = outputs(appendCorroborationRequirement(original, recordedAt));
    if (!check && generated.some(([path]) => existsSync(resolve(root, path)))) throw new Error('Current records already exist; append a separately reviewed event rather than overwrite');
    if (check) {
      const binding = assessPositiveBinding(read(consumerPath), read(currentPath));
      if (!binding.valid) throw new Error(`${binding.code}: ${binding.errors.join('; ')}`);
      const parity = assessPositiveParity(readFileSync(resolve(root, consumerPath), 'utf8'), read(currentPath));
      if (!parity.valid) throw new Error(`${parity.code}: ${parity.errors.join('; ')}`);
    }
    for (const [path, value] of generated) {
      if (check) { if (readFileSync(resolve(root, path), 'utf8') !== bytes(value)) throw new Error(`Retained evolution drift: ${path}`); }
      else writeFileSync(resolve(root, path), bytes(value), { flag: 'wx' });
    }
    const assessment = assessPositiveBinding(read(consumerPath), read(currentPath));
    if (!assessment.valid) throw new Error(JSON.stringify(assessment.errors));
    console.log(`One persisted AU event and explicit positive-consumer rebind verified. Threshold review: ${assessment.threshold_audit?.status}; no current access, empirical plausibility or population-comparability claim.`);
  } catch (error) { console.error(error); process.exitCode = 1; }
}
