import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { deriveReviewedMeasurements } from '../../pilots/australia/tools/primary-care-review.mts';
import { SMALL_BASE_THRESHOLD, withRetainedNumerator } from '../../pilots/australia/tools/measurement-depth.mts';

const categories = ['price', 'permission', 'proximity', 'availability', 'capability'];
const hosts = new Set(['assets.pc.gov.au', 'www.abs.gov.au', 'www9.health.gov.au']);
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
    return `<tr data-condition-category="${category}"><td>${escapeHtml(category)}</td><td>${escapeHtml(label)}<br><strong>${escapeHtml(values)}</strong><br>${escapeHtml(geography)} · ${escapeHtml(period)} · ${escapeHtml(series.measurement_role)}</td><td>${escapeHtml(series.population)}<br>${escapeHtml(series.evidence_ceiling)}</td><td>Owner role: ${escapeHtml(series.owner)}. Control not verified.</td><td>${link(series.source_url, source.publisher)}<br>Released ${escapeHtml(source.publication_date ?? 'date unverified')}; retained ${escapeHtml(source.http_date)}<br>Licence ${escapeHtml(source.licence_review_status)}<br>${escapeHtml(series.source_artifact_hash)}</td></tr>`;
  }).join('\n');
  const diagnosis = derived.binding_diagnosis;
  const context = derived.longer_window_context.map(item => `<li>${escapeHtml(item.series_id)}: ${escapeHtml(item.earlier.value)}% (${escapeHtml(item.earlier.period)}) to ${escapeHtml(item.latest.value)}% (${escapeHtml(item.latest.period)}), NSW. ${escapeHtml(item.comparability)}</li>`).join('\n');
  return `<section class="section" id="primary-care" aria-labelledby="primary-care-title">
<div class="section-head"><div><div class="eyebrow">Essential-access basket / GP consultation</div><h2 id="primary-care-title">Five conditions, different evidence.</h2></div><p>${escapeHtml(diagnosis.public_summary)}</p></div>
<p>These are retained indicators, not five personal-access diagnoses. Price and urgent-care estimates cover different survey subsets; the 2018 capability context is national, and the permission row is a rule parameter observed at retrieval. Owner roles describe institutions, not verified control or authorised action.</p>
<p>Small base flags precede values with retained numerators below ${SMALL_BASE_THRESHOLD}. This display caution is not a significance test. Survey respondent numerators are not retained; a missing flag does not establish a large sample. FTE is workload, not a count of doctors.</p>
<div class="table-wrap"><table id="gp-condition-table"><thead><tr><th>Condition</th><th>Observation and period</th><th>Population and measurement limit</th><th>Owner role</th><th>Retained source</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>${escapeHtml(derived.series.find(s => s.id === 'gp-fte-remoteness').rate_denominator_definition)} ${escapeHtml(derived.coverage_ceiling)} The other three basket items still lack complete item-specific coverage.</p>
<p>${escapeHtml(derived.ecological_join.evidence_ceiling)} The August 2026 NERO model is attached as separate ecological context, not individual evidence.</p>
<p><a href="../data/positive-signals-current.json">Current positive-signal research binding</a>: its broad historical kernel scope does not establish access for excluded very-remote residents. CSV and workbook corroboration comes from the same publisher, not independent evidence of personal access.</p>
<details><summary>Longer-window context and definitions</summary><p>The three favourable one-year movements were selected post hoc. Change significance and agency effects are not established; survey confidence intervals are retained, not tests of change.</p><ul>${context}</ul><p>${link(derived.workbook_footnotes.workbook.source_url, '10A workbook: complete definitions and footnotes')} · ${escapeHtml(derived.workbook_footnotes.workbook.sha256)}. Corrected measurement record: <a href="../data/primary-care-2026-09-10.json">JSON</a>. Historical basket mapping: <a href="../basket/primary-care.r3.json">r3</a>.</p></details>
</section>`;
}
