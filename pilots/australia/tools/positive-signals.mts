import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { deriveMeasurements, digest } from './primary-care.mts';
import { buildBasket } from './primary-care-basket.mts';
import { computeMetricChecksum } from '../../../contracts/agency-map/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const output = resolve(root, 'pilots/australia/data/positive-signals-2026-09-09.r3.json');
const schema = JSON.parse(readFileSync(resolve(root, 'contracts/agency-map/schema/condition-agency-map.schema.json'), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
ajv.addSchema(schema);
const validateMetric = ajv.compile({ $ref: `${schema.$id}#/$defs/metric` });

export function derivePositiveSignals() {
  const measurements = deriveMeasurements();
  const { basket } = buildBasket();
  const conditions = basket.items.flatMap((item: any) => item.conditions);
  const selections = [
    { id: 'gp-fully-bulk-billed', direction: 'increase', conditionSeries: 'gp-cost-delay', lowers: 'A larger share of attending patients had no out-of-pocket charge for all their Medicare GP attendances during the year. This narrows an observed price exposure, not every cost of care.' },
    { id: 'gp-cost-delay', direction: 'decrease', conditionSeries: 'gp-cost-delay', lowers: 'The estimated share reporting GP delay or non-use due to cost was lower. Other barriers and the remaining cost barrier are not removed.' },
    { id: 'prescription-cost-delay', direction: 'decrease', conditionSeries: 'prescription-cost-delay', lowers: 'The estimated share reporting prescription delay or non-use due to cost was lower. The source does not identify a particular medicine or prove continuous treatment.' },
  ];
  const signals = selections.map(selection => {
    const source = measurements.series.find((s: any) => s.id === selection.id);
    const observations = ['2023-24', '2024-25'].map(period => {
      const matches = source.points.filter((p: any) => p.geography === 'NSW' && p.period === period);
      if (matches.length !== 1) throw new Error(`Expected one NSW ${selection.id} observation for ${period}`);
      return structuredClone(matches[0]);
    });
    const condition = conditions.find((c: any) => c.series_id === selection.conditionSeries);
    if (!condition) throw new Error(`No basket condition for ${selection.conditionSeries}`);
    const change = Number((observations[1].value - observations[0].value).toFixed(10));
    const metric: any = {
      metric_id: `metric.au.positive.${selection.id}`,
      measure: source.id,
      unit: 'percent', denominator: source.population, population: source.population,
      geography: 'New South Wales, Australia', period: '2023-24 and 2024-25 financial years',
      aggregation: 'Published state-level patient-year administrative share or survey-weighted estimate; difference is percentage points, not percentage change.',
      direction: selection.direction,
      collection_process_id: 'collection.pc.rogs-2026-primary-care',
      source_refs: [source.source_url],
      evaluation_rule: 'Compare retained NSW 2024-25 estimate with 2023-24 using the original denominator. Favorable direction alone is not a causal effect or a statistically tested difference.',
      verification: 'external-unverified',
    };
    metric.metric_checksum = computeMetricChecksum(metric);
    if (!validateMetric(metric)) throw new Error(ajv.errorsText(validateMetric.errors));
    return {
      id: `signal.au.positive.${selection.id}`, status: 'measured',
      measurement_status_meaning: 'Published observations reproduced from retained primary-source bytes; actor control and personal agency remain unverified.',
      metric, observations, change_percentage_points: change,
      favorable_observed_direction: selection.direction === 'increase' ? change > 0 : change < 0,
      significance_of_change: 'not_assessed',
      uncertainty: selection.id === 'gp-fully-bulk-billed'
        ? 'Administrative patient-year share; no sampling interval supplied in selected table. Claims coverage and service-definition limitations remain.'
        : 'Original 95% confidence-interval half-widths accompany each estimate. No covariance or publisher test of this year-to-year NSW difference is retained; no significance claim.',
      condition_category: source.condition_category,
      condition_definition_ref: condition.condition_definition_ref,
      condition_binding: selection.id === selection.conditionSeries ? 'same-series-historical-observation-not-current-truth' : 'related-price-context-not-executable-predicate',
      condition_lowered: selection.lowers, for_whom: source.population,
      owner: source.owner, owner_verification: 'institutional-role-description-not-verified-control-or-causal-attribution',
      source_artifact_hash: source.source_artifact_hash, source_url: source.source_url,
      evidence_ceiling: source.evidence_ceiling,
      current_personal_access_established: false,
    };
  });
  return {
    id: 'australia-positive-signals-2026-09-09.r3', provenance: 'commissioned-agent-proposal',
    construction_revision: {
      supersedes_path: 'pilots/australia/data/positive-signals-2026-09-09.r2.json',
      supersedes_sha256: digest(readFileSync(resolve(root, 'pilots/australia/data/positive-signals-2026-09-09.r2.json'))),
      reason: 'Rebind unchanged positive observations to the primary-care construction revision enforcing observation domains. All prior artifacts remain retained, with their original condition references.',
      source_values_changed: false,
      basket_path: 'pilots/australia/basket/primary-care.r3.json',
      kernel_manifest_hash: basket.kernel_manifest_hash,
    },
    status: 'research-draft', observation_period: '2023-24 to 2024-25',
    source_capture_path: 'pilots/australia/sources/primary-care/2026-09-09/capture.json',
    source_capture_sha256: digest(readFileSync(resolve(root, 'pilots/australia/sources/primary-care/2026-09-09/capture.json'))),
    agency_metric_contract: 'contracts/agency-map/schema/condition-agency-map.schema.json#/$defs/metric',
    agency_measured: false, action_authorised: false, synthetic_actor_claims_changed: false,
    selection_limitation: 'Post hoc favorable-series selection requested for balance, not a preregistered effect test or representative assessment of all access conditions. Worsening and unchanged evidence remains in the full primary-care measurement.',
    counting_rule: 'Three distinct original measures, no complements counted as additional observations. GP measures concern overlapping people and are not independent agency gains; no composite score or sum.',
    signals,
  };
}

export function validatePositiveSignals(value: unknown) {
  try {
    const expected = derivePositiveSignals();
    return { valid: isDeepStrictEqual(value, expected), errors: isDeepStrictEqual(value, expected) ? [] : ['Positive signals differ from retained-source derivation and governed metric contract'] };
  } catch (error) { return { valid: false, errors: [String(error)] }; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const expected = JSON.stringify(derivePositiveSignals(), null, 2) + '\n';
    if (process.argv.includes('--check')) {
      if (readFileSync(output, 'utf8') !== expected) throw new Error('Retained positive observation artifact differs');
    } else writeFileSync(output, expected);
    console.log('Three retained positive-direction measures reproduced; personal agency remains unmeasured.');
  } catch (error) { console.error(error); process.exitCode = 1; }
}
