import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { deriveReviewedMeasurements } from '../../pilots/australia/tools/primary-care-review.mts';
import { SMALL_BASE_THRESHOLD, withRetainedNumerator, deriveMeasurementDepth } from '../../pilots/australia/tools/measurement-depth.mts';

const categories = ['price', 'permission', 'proximity', 'availability', 'capability'];
const hosts = new Set(['assets.pc.gov.au', 'www.abs.gov.au', 'www9.health.gov.au', 'www.pbs.gov.au', 'www.aihw.gov.au']);
export function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function link(url, label) {
  const source = new URL(url);
  if (source.protocol !== 'https:' || source.username || source.password || source.port || !hosts.has(source.hostname)) throw new Error('Primary-care source host is not allowed');
  return `<a href="${escapeHtml(url)}" rel="noopener" target="_blank">${escapeHtml(label)}</a>`;
}
export function formatObservation(point) {
  if (point.numerator != null && (!Number.isFinite(point.numerator) || point.numerator < 0)) throw new Error('Invalid measurement numerator');
  const flag = point.numerator != null && point.numerator < SMALL_BASE_THRESHOLD ? `Small base (${point.numerator} ${point.numerator_unit ?? 'observations'}; below ${SMALL_BASE_THRESHOLD}): ` : '';
  const units = { percent: '%', months: ' months', 'FTE-per-100000': ' FTE per 100,000' };
  const interval = point.published_95ci_half_width == null ? '' : ` (95% CI ±${point.published_95ci_half_width} percentage points)`;
  return `${flag}${point.value}${units[point.unit] ?? ` ${point.unit}`}${interval}`;
}
export function renderPrimaryCare(root) {
  const dataPath = 'pilots/australia/data/primary-care-2026-09-10.json';
  const bytes = readFileSync(resolve(root, dataPath), 'utf8');
  const derived = deriveReviewedMeasurements();
  const depth = deriveMeasurementDepth();
  if (bytes !== JSON.stringify(derived, null, 2) + '\n') throw new Error('Primary-care display artifact does not reproduce');
  const basketBytes = readFileSync(resolve(root, 'pilots/australia/basket/primary-care.r3.json'));
  if (createHash('sha256').update(basketBytes).digest('hex') !== '6d2a20844719fd9851c28c5ec961a4c0f6bb049adea7f382454eaad15da8f65e') throw new Error('Primary-care basket mapping differs from retained r3');
  const basket = JSON.parse(basketBytes.toString());
  const gp = basket.items.find(item => item.id === 'gp-consultation');
  if (!gp || gp.conditions.length !== 5 || new Set(gp.conditions.map(c => c.condition_category)).size !== 5) throw new Error('Expected exactly five GP categories');
  const rows = categories.map(category => {
    const binding = gp.conditions.find(condition => condition.condition_category === category);
    const series = derived.series.find(series => series.id === binding?.series_id);
    if (!series || series.condition_category !== category) throw new Error(`Unbound GP category ${category}`);
    const period = category === 'proximity' ? '2024' : category === 'capability' ? '2018' : category === 'permission' ? '2026-09-09' : '2024-25';
    const geography = ['permission', 'capability'].includes(category) ? 'Aust' : 'NSW';
    const points = series.points.filter(point => point.period === period && point.geography === geography);
    if (!points.length) throw new Error(`Missing GP display observation ${category}`);
    const values = points.map(point => {
      return `${category === 'proximity' ? `${point.remoteness}: ` : ''}${formatObservation(withRetainedNumerator(point))}`;
    }).join('; ');
    const source = derived.source_reviews.find(source => source.id === series.source_id);
    if (!source) throw new Error(`Missing GP source ${category}`);
    const label = category === 'price' ? 'Delayed or missed needed GP care due to cost' : category === 'permission' ? 'Routine telehealth rule parameter, with alternatives and exceptions' : category === 'proximity' ? 'Reported ASGS workforce-rate proxy, not MMM' : category === 'availability' ? 'Urgent GP care obtained within four hours' : 'Difficulty navigating the health system, national context';
    return `<tr data-condition-category="${category}"><th scope="row">${escapeHtml(category)}</th><td>${escapeHtml(label)}<br><strong>${escapeHtml(values)}</strong><br>${escapeHtml(geography)} · ${escapeHtml(period)} · ${escapeHtml(series.measurement_role)}</td><td>${escapeHtml(series.population)}<br>${escapeHtml(series.evidence_ceiling)}</td><td>Owner role: ${escapeHtml(series.owner)}. Control not verified.</td><td>${link(series.source_url, source.publisher)}<br>Released ${escapeHtml(source.publication_date ?? 'date unverified')}; retained ${escapeHtml(source.http_date)}<br>Licence ${escapeHtml(source.licence_review_status)}<br>${escapeHtml(series.source_artifact_hash)}</td></tr>`;
  }).join('\n');
  const diagnosis = derived.binding_diagnosis;
  const context = depth.histories.map(item => {
    const interval = item.latest_change.change_95ci;
    const history = item.points.map(point => `${point.period}: ${formatObservation(point)}`).join('; ');
    return `<li><strong>${escapeHtml(item.label)}</strong>, ${escapeHtml(item.geography)}. ${escapeHtml(item.latest_change.explanation)} Latest change ${escapeHtml(item.latest_change.difference_percentage_points)} percentage points${interval ? `, approximate 95% change interval [${escapeHtml(interval.join(', '))}]` : ''}. ${escapeHtml(item.comparability)}<br>${escapeHtml(history)}<br>${link(item.source_url, 'Retained series source')} · ${escapeHtml(item.source_artifact_hash)}</li>`;
  }).join('\n');
  const itemTables = depth.items.map(item => {
    const rows = item.conditions.map(condition => {
      let observation = condition.observation;
      if (item.id === 'atorvastatin-prescription' && condition.condition_category === 'price') {
        const point = derived.series.find(s => s.id === 'prescription-cost-delay').points.find(p => p.geography === 'NSW' && p.period === '2024-25');
        observation += ` ${formatObservation(point)}. PBS 2026 general contribution up to AUD ${depth.policy.general_copayment}; concessional up to AUD ${depth.policy.concessional_copayment}. Calendar-year safety-net thresholds AUD ${depth.policy.general_safety_net} and AUD ${depth.policy.concessional_safety_net}, respectively. ${depth.policy.evidence_ceiling}`;
      }
      if (item.id === 'after-hours-gp' && ['price', 'availability'].includes(condition.condition_category)) {
        const id = condition.condition_category === 'price' ? 'after-hours-cost-main-reason' : 'after-hours-delay';
        const series = depth.after_hours_series.find(s => s.id === id);
        observation += ` Australia 2024-25: ${formatObservation(series.points.at(-1))}. ${series.population} ${series.evidence_ceiling}`;
      }
      const source = depth.source_reviews.find(s => s.id === condition.source_id);
      const supportingLinks = condition.source_refs.slice(1).map(ref => {
        const support = depth.source_reviews.find(s => s.id === ref.source_id);
        return `<br>${link(ref.source_url, ref.label)}<br>${escapeHtml(ref.source_artifact_hash)}; retained ${escapeHtml(support.http_date)}; licence ${escapeHtml(support.licence_review_status)}`;
      }).join('');
      return `<tr data-condition-category="${escapeHtml(condition.condition_category)}"><th scope="row">${escapeHtml(condition.condition_category)} (${escapeHtml(condition.status)})</th><td>${escapeHtml(observation)}</td><td><strong>Missing series:</strong> ${escapeHtml(condition.missing_series)}<br>${escapeHtml(condition.why_missing)}</td><td>${link(condition.source_url, source.publisher)}<br>Retained ${escapeHtml(source.http_date)}; licence ${escapeHtml(source.licence_review_status)}<br>${escapeHtml(condition.source_artifact_hash)}${supportingLinks}</td></tr>`;
    }).join('\n');
    return `<h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.geography)}. ${escapeHtml(item.binding_summary)}</p><div class="table-wrap"><table id="${escapeHtml(item.id)}-condition-table"><thead><tr><th>Condition</th><th>Retained observation</th><th>Evidence needed to identify the binding condition today</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join('\n');
  return `<section class="section" id="primary-care" aria-labelledby="primary-care-title">
<div class="section-head"><div><div class="eyebrow">Essential-access basket / GP consultation</div><h2 id="primary-care-title">Five conditions, different evidence.</h2></div><p>${escapeHtml(diagnosis.public_summary)}</p></div>
<p>These are retained indicators, not five personal-access diagnoses. Price and urgent-care estimates cover different survey subsets; the 2018 capability context is national, and the permission row is a rule parameter observed at retrieval. Owner roles describe institutions, not verified control or authorised action.</p>
<p>Small base flags precede values with retained numerators below ${SMALL_BASE_THRESHOLD}. This display caution is not a significance test. Survey respondent numerators are not retained; a missing flag does not establish a large sample. FTE is workload, not a count of doctors.</p>
<div class="table-wrap"><table id="gp-condition-table"><thead><tr><th>Condition</th><th>Observation and period</th><th>Population and measurement limit</th><th>Owner role</th><th>Retained source</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>${escapeHtml(derived.series.find(s => s.id === 'gp-fte-remoteness').rate_denominator_definition)} ${escapeHtml(derived.coverage_ceiling)} GP urgency is respondent-defined; the reported waiting clock starts at making an appointment, excluding earlier attempts to book (RoGS 10A.43 C54-C55).</p>
<p>${escapeHtml(derived.ecological_join.evidence_ceiling)} The August 2026 NERO model is attached as separate ecological context, not individual evidence.</p>
<p><a href="../data/positive-signals-current.json">Current positive-signal research binding</a>: its broad historical kernel scope does not establish access for excluded very-remote residents. CSV and workbook corroboration comes from the same publisher, not independent evidence of personal access.</p>
${itemTables}
<details><summary>Longer-window context, significance and definitions</summary><p>The favourable one-year signals were selected post hoc. Approximate tests use the ${link(depth.significance_method.source_url, 'ABS difference-of-estimates method')}: standard error equals the published 95% margin divided by 1.96, with zero covariance assumed between annual estimates. No multiple-comparison adjustment is applied. These tests assess sampling variation, not agency or a common-population effect.</p><ul>${context}</ul><p>${link(derived.workbook_footnotes.workbook.source_url, '10A workbook: complete definitions and footnotes')} · ${escapeHtml(derived.workbook_footnotes.workbook.sha256)}. Corrected measurement record: <a href="../data/primary-care-2026-09-10.json">JSON</a>. Historical basket mapping: <a href="../basket/primary-care.r3.json">r3</a>.</p></details>
</section>`;
}
