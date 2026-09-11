import { selectSeries, describeChange, preparationFor, formatValue, formatChange, publisherClassification } from './model.mjs';
import { caseFor } from './cases.mjs';
import { reviewDesk } from './review-clock.mjs';
import { researchBrief } from './brief.mjs';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sourceLink = path => '../../' + path;
const svgNS = 'http://www.w3.org/2000/svg';
const date = value => value ? new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Unknown';
function svgElement(tag, attrs, text) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

try {
  const data = window.WEATHER_STATION;
  if (!data || data.schemaVersion !== '1.0.0' || data.mode !== 'research' || data.authority !== 'none' || data.publicReleaseApproved !== false || data.forecastSkillEstablished !== false) throw new Error('Research projection contract missing or invalid');
  const query = new URLSearchParams(location.search);
  const state = { country: query.get('country') || 'AUS', compare: query.get('compare') || 'USA', family: query.get('family') || data.families[0].id, year: Number(query.get('year') || 2025) };
  // Invalid bookmarked context fails visibly rather than silently substituting another country.
  selectSeries(data, state.country, state.family); selectSeries(data, state.compare, state.family);
  describeChange(data, state.country, state.family, state.year);
  const country = code => data.countries.find(x => x.code === code);
  const family = () => data.families.find(x => x.id === state.family);
  const name = code => country(code).name;
  const comparison = code => describeChange(data, code, state.family, state.year);
  const countryOptions = data.countries.map(c => `<option value="${esc(c.code)}">${esc(c.name)} · ${esc(c.code)}</option>`).join('');
  $('country-select').innerHTML = countryOptions; $('compare-select').innerHTML = countryOptions;
  $('family-select').innerHTML = data.families.map(f => `<option value="${esc(f.id)}">${esc(f.label)}</option>`).join('');
  $('hero-stats').innerHTML = [[data.countries.length, 'economies in the proposed frame'], [formatValue(data.observationCount), 'retained indicator values'], [data.years.length - 1, 'annual comparison periods']].map(([number, label]) => `<div><strong>${number}</strong><span>${label}</span></div>`).join('');

  function renderField() {
    const svg = $('field-svg');
    const midX = 270, midY = 176;
    for (let i = 0; i < 5; i++) {
      const rx = 62 + i * 31, ry = 36 + i * 20;
      svg.append(svgElement('ellipse', { cx: midX, cy: midY, rx, ry, fill: 'none', stroke: '#335552', 'stroke-width': .7, transform: `rotate(-25 ${midX} ${midY})` }));
    }
    svg.append(svgElement('path', { d: 'M62 236 L478 116 M160 42 L380 310', stroke: '#294644', 'stroke-width': .6, 'stroke-dasharray': '3 6', fill: 'none' }));
    data.countries.forEach((c, i) => {
      const angle = i * 2.39996, r = 38 + Math.sqrt(i / 49) * 165;
      const x = midX + Math.cos(angle) * r, y = midY + Math.sin(angle) * r * .61;
      svg.append(svgElement('circle', { cx: x, cy: y, r: i < 8 ? 3 : 2, fill: i === 13 ? '#e6b582' : '#bdeaba', opacity: .4 + (i % 5) * .13 }));
      if ([0, 1, 2, 9, 13, 40].includes(i)) svg.append(svgElement('text', { x: x + 8, y: y - 6, fill: '#a5b9b5', 'font-size': 8, 'font-family': 'monospace' }, c.code));
    });
    svg.append(svgElement('text', { x: 270, y: 345, fill: '#7faaa3', 'font-size': 8, 'font-family': 'monospace', 'text-anchor': 'middle', 'letter-spacing': 1 }, 'SCHEMATIC · POSITIONS DO NOT ENCODE GEOGRAPHY OR RISK'));
  }

  function renderChart() {
    const svg = $('history-chart');
    const narrow = matchMedia('(max-width:760px)').matches;
    const left = narrow ? 40 : 50, right = narrow ? 325 : 827, tickFont = narrow ? 12 : 10;
    svg.setAttribute('viewBox', narrow ? '0 0 340 300' : '0 0 850 300');
    [...svg.children].filter(x => !['title', 'desc'].includes(x.tagName)).forEach(x => x.remove());
    const f = family(), series = [selectSeries(data, state.country, f.id), selectSeries(data, state.compare, f.id)];
    const values = series.flat().map(x => x.value);
    const min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1;
    const pad = Math.max((max - min) * .15, .3), lower = Math.max(0, min - pad), upper = Math.min(100, max + pad);
    const span = Math.max(upper - lower, .1);
    const X = year => left + (year - 2005) / 20 * (right - left), Y = value => 250 - (value - lower) / span * 225;
    $('history-title').textContent = `${f.fullLabel}: ${name(state.country)} and ${name(state.compare)}, 2005 to 2025`;
    $('history-desc').textContent = `Percent of each series' native denominator: ${f.denominator}. Selected-year values appear immediately below. Y-axis is fitted to the displayed data, not necessarily zero. No uncertainty intervals are supplied.`;
    for (let tick = 0; tick < 5; tick++) {
      const value = lower + span * tick / 4, y = Y(value);
      svg.append(svgElement('line', { x1: left, x2: right, y1: y, y2: y, stroke: '#274042', 'stroke-width': .7, 'stroke-dasharray': '2 5' }));
      svg.append(svgElement('text', { x: left - 10, y: y + 3, fill: '#91aaa5', 'font-size': tickFont, 'text-anchor': 'end', 'font-family': 'monospace' }, formatValue(value, 1)));
    }
    for (const year of (narrow ? [2005, 2015, 2025] : [2005, 2010, 2015, 2020, 2025])) svg.append(svgElement('text', { x: X(year), y: 279, fill: '#91aaa5', 'font-size': tickFont, 'text-anchor': 'middle', 'font-family': 'monospace' }, year));
    const colors = ['#bdeaba', '#e6b582'];
    series.forEach((points, index) => {
      let previous = null;
      const d = points.map(p => { const command = previous === p.year - 1 ? 'L' : 'M'; previous = p.year; return `${command}${X(p.year).toFixed(2)},${Y(p.value).toFixed(2)}`; }).join(' ');
      svg.append(svgElement('path', { d, fill: 'none', stroke: colors[index], 'stroke-width': index ? 1.7 : 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: index ? .85 : 1 }));
      const selected = points.find(p => p.year === state.year);
      if (selected) {
        svg.append(svgElement('circle', { cx: X(selected.year), cy: Y(selected.value), r: 9, fill: colors[index], opacity: .12 }));
        svg.append(svgElement('circle', { cx: X(selected.year), cy: Y(selected.value), r: 3.5, fill: colors[index], stroke: '#081315', 'stroke-width': 1.5 }));
      }
    });
    svg.append(svgElement('line', { x1: X(state.year), x2: X(state.year), y1: 15, y2: 250, stroke: '#aac7bc', opacity: .4, 'stroke-dasharray': '3 5' }));
    $('chart-label').textContent = f.fullLabel;
    $('chart-title').textContent = `${name(state.country)} / ${state.compare}`;
    $('chart-legend').innerHTML = `<span><i class="legend-dot"></i>${esc(name(state.country))}</span><span><i class="legend-dot compare"></i>${esc(name(state.compare))}</span>`;
    $('chart-note').textContent = `Native percent · ${f.denominator}. Fitted y-axis; no interval data. Same retained vintage, not real-time history.`;
    $('reading-grid').innerHTML = [state.country, state.compare].map(code => {
      const c = comparison(code);
      return `<div class="reading"><div class="place">${esc(name(code))} · ${state.year}</div><strong>${c.after ? formatValue(c.after.value) + '%' : 'Unavailable'}</strong><span class="change">${formatChange(c.change)}</span><small>${c.before ? `Previous year: ${formatValue(c.before.value)}%` : 'No retained earlier comparison'} · native denominator</small><small>${esc(c.gap || publisherClassification(c.after))}</small></div>`;
    }).join('');
  }

  function renderReadout() {
    const value = comparison(state.country);
    $('readout-title').textContent = name(state.country);
    $('storm-state').textContent = value.stormState === 'cannot-say' ? 'Cannot say' : value.stormState === 'not-assessed' ? 'Baseline only' : value.stormState;
    $('readout-explanation').textContent = value.stormState === 'not-assessed' ? '2005 supplies the baseline. The retained storm comparisons start in 2006.' : 'Missing measurement prevents a storm verdict. This is not an all-clear, and does not mean that people are unaffected.';
    $('missing-list').innerHTML = [['Disrupted income routes', 'UNMEASURED'], ['Linked household exposure', 'UNAVAILABLE'], ['Binding access condition', 'UNKNOWN']].map(([label, status]) => `<div>${label}<span>${status}</span></div>`).join('') + (value.beneficialShiftUnassessed ? '<div>Large beneficial shift<span>UNASSESSED</span></div>' : '');
  }

  const stories = [
    { country: 'PER', year: 2020, family: 0, title: 'Peru / 2020', prompt: 'A sharp movement. What does it establish?' },
    { country: 'IRL', year: 2009, family: 1, title: 'Ireland / 2009', prompt: 'Two indicators are not two populations.' },
    { country: 'KAZ', year: 2006, family: 2, title: 'Kazakhstan / 2006', prompt: 'A beneficial native shift is visible too.' },
    { country: 'ARG', year: 2025, family: 2, title: 'Argentina / 2025', prompt: 'An honest gap. No substitute country.' },
  ];
  $('story-rail').innerHTML = stories.map((s, i) => `<button class="story-chip" data-story="${i}"><b>${s.title} ↗</b><span>${s.prompt}</span></button>`).join('');
  $('story-rail').addEventListener('click', event => { const button = event.target.closest('[data-story]'); if (button) chooseStory(Number(button.dataset.story)); });
  function chooseStory(index) { const s = stories[index]; Object.assign(state, { country: s.country, year: s.year, family: data.families[s.family].id }); if (state.compare === s.country) state.compare = 'USA'; render(); $('explore').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  let tourIndex = 0;
  $('guided-tour').addEventListener('click', () => { chooseStory(tourIndex % stories.length); tourIndex++; $('guided-tour').textContent = 'Next evidence stop →'; });

  const matrixCursor = { country: state.country, year: Math.max(2006, state.year) };
  function renderMatrix() {
    const focused = $('matrix').contains(document.activeElement) ? { ...document.activeElement.dataset } : null;
    const years = data.years.slice(1);
    const cells = data.countries.flatMap(c => years.map(year => describeChange(data, c.code, state.family, year).change)).filter(x => x !== null);
    const bound = Math.max(1, ...cells.map(Math.abs));
    $('matrix').innerHTML = `<div class="matrix-row matrix-header"><span>Native change · ${esc(family().label)}</span>${years.map(y => `<span>${String(y).slice(2)}</span>`).join('')}</div>` + data.countries.map(c => `<div class="matrix-row"><button class="matrix-name" data-country="${c.code}">${esc(c.name)}</button>${years.map(year => {
      const v = describeChange(data, c.code, state.family, year).change;
      const alpha = v === null ? 0 : .1 + Math.min(Math.abs(v) / bound, 1) * .85;
      const color = v === null ? 'transparent' : v < 0 ? `rgb(230 181 130 / ${alpha})` : `rgb(117 189 187 / ${alpha})`;
      return `<button tabindex="${matrixCursor.country === c.code && matrixCursor.year === year ? 0 : -1}" class="matrix-cell" data-country="${c.code}" data-year="${year}" style="background:${color};${v === null ? 'border:1px dashed #355052' : ''}" aria-label="${esc(c.name)}, ${year}, ${formatChange(v)}, native indicator not disruption" title="${c.code} ${year}: ${formatChange(v)}"></button>`;
    }).join('')}</div>`).join('');
    if (focused?.country) $('matrix').querySelector(focused.year ? `.matrix-cell[data-country="${focused.country}"][data-year="${focused.year}"]` : `.matrix-name[data-country="${focused.country}"]`)?.focus({ preventScroll: true });
  }
  $('matrix').addEventListener('click', event => { const button = event.target.closest('[data-country]'); if (!button) return; state.country = button.dataset.country; if (button.dataset.year) state.year = Number(button.dataset.year); render(); $('history-chart').scrollIntoView({ block: 'center', behavior: 'auto' }); });
  $('matrix').addEventListener('focusin', event => {
    if (!event.target.matches('.matrix-cell')) return;
    matrixCursor.country = event.target.dataset.country; matrixCursor.year = Number(event.target.dataset.year);
    $('matrix').querySelectorAll('.matrix-cell').forEach(cell => { cell.tabIndex = cell === event.target ? 0 : -1; });
  });
  $('matrix').addEventListener('keydown', event => {
    if (!event.target.matches('.matrix-cell') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = data.countries.findIndex(c => c.code === matrixCursor.country);
    const nextIndex = Math.max(0, Math.min(data.countries.length - 1, index + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0)));
    const year = event.key === 'Home' ? 2006 : event.key === 'End' ? 2025 : Math.max(2006, Math.min(2025, matrixCursor.year + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0)));
    $('matrix').querySelector(`.matrix-cell[data-country="${data.countries[nextIndex].code}"][data-year="${year}"]`).focus();
  });

  function renderEvidence() {
    $('evidence-cards').innerHTML = data.families.map((nativeFamily, i) => {
      const f = { ...nativeFamily, label: nativeFamily.fullLabel };
      const point = selectSeries(data, state.country, f.id).find(x => x.year === state.year);
      return `<article class="evidence-card"><p class="eyebrow">0${i + 1} / ${f.coverage} of ${data.countries.length} economies</p><h3>${esc(f.label)}</h3><dl><dt>SELECTED READING</dt><dd>${esc(name(state.country))} · ${state.year} · ${point ? formatValue(point.value) + '%' : 'Unavailable, no substitution'}</dd><dt>DENOMINATOR</dt><dd>${esc(f.denominator)}</dd><dt>PUBLISHER VINTAGE</dt><dd>${esc(f.vintage)}</dd><dt>REFERENCE VS ACQUISITION</dt><dd>Reference year: ${state.year}. Retained response: ${date(f.acquiredAt)}. Retrieval does not make the reference period current.</dd><dt>WHAT IT CANNOT ESTABLISH</dt><dd>${esc(f.limitation)}</dd></dl><details><summary>Inspect lineage and classification</summary><p>${esc(point?.estimateType || 'No retained point')} · ${esc(point?.selector || 'No selector')}</p><span class="hash">${esc(f.sourceSha256)}</span><p>Retained local bytes; publisher identity not authenticated. Original native labels and limitations remain in the source audit.</p><a class="source-link" href="${esc(sourceLink(f.nativeSource))}">Retained source bytes ↗</a><a class="source-link" href="${esc(f.sourceUrl)}">Publisher endpoint ↗</a></details><a class="source-link" href="../../signals/countries/income-source-audit.md">Source &amp; licence audit ↗</a></article>`;
    }).join('');
    [...$('evidence-cards').querySelectorAll('details p:first-of-type')].forEach((node, index) => {
      const point = selectSeries(data, state.country, data.families[index].id).find(x => x.year === state.year);
      node.textContent = `${publisherClassification(point)} · ${point?.selector || 'No selector'}`;
    });
  }

  function renderConditions() {
    const conditions = [
      ['Price', 'Can the full cost be met without closing other essential options?'],
      ['Permission', 'Is the route genuinely available under the relevant rules?'],
      ['Proximity', 'Can people reach it, physically or through a usable connection?'],
      ['Availability', 'Does sufficient capacity exist when it is needed?'],
      ['Capability', 'Can people use the route, with the support they need?'],
    ];
    $('condition-grid').innerHTML = conditions.map(([title, question], i) => `<article class="condition"><span class="index">0${i + 1} / IF</span><h3>${title}</h3><p>${question}</p><small>INCOME-ACCESS DIAGNOSIS: UNKNOWN</small></article>`).join('');
    const m = data.migrations;
    $('migration-preview').innerHTML = `<p class="eyebrow">Meaning must survive revision</p><h3>${m.proposed_corrections} source-backed corrections. ${m.applied_corrections} applied.</h3><p>Urgent-care waiting time begins at appointment-making, not first attempted contact. Prescription cost delay covers a specific survey population. The new adapter inventories actual structured references and rejects stale bindings in adoption previews.</p><p>These are proposed corrections, not completed migrations or newly improved access. Independent review and an operational migration edition remain necessary.</p><a class="text-link" href="../../contracts/construct-migration/README.md">Inspect the correction mechanism ↗</a>`;
    const r = data.readerEdition;
    $('migration-preview').insertAdjacentHTML('beforeend', `<p>${r.existing_appended_kernel_events} appended definition ${r.existing_appended_kernel_events === 1 ? 'event remains' : 'events remain'} in the retained Australian log. The new reader metadata below does not increase that count.</p>`);
    $('migration-preview').insertAdjacentHTML('beforeend', `<p class="eyebrow">A new reader, with its own explicit adoption</p><h3>${r.applied_reader_metadata_adoptions} metadata bindings now use ${r.corrected_meanings_used} corrected meanings.</h3><p>This separate research reader rejects old meaning bindings and preserves historical context under its original identity. ${r.completed_kernel_corrections} completed kernel corrections; ${r.observations_transferred} observations transferred. A corrected interpretation is not evidence that access improved.</p><a class="text-link" href="${esc(sourceLink(r.page_path))}">Open the corrected research reader ↗</a>`);
  }

  function renderForecasts() {
    const pending = data.forecasts.filter(x => x.operationalStatus !== 'blocked-defect'), blocked = data.forecasts.filter(x => x.operationalStatus === 'blocked-defect');
    $('forecast-cards').innerHTML = pending.map(f => `<article class="forecast-card"><p class="eyebrow">${esc(f.country)} / Issued research · recorded outcome ${esc(f.resolutionStatus)}</p><h3>${esc(f.place)}</h3><p class="forecast-question">${esc(f.question)}</p><div class="probability">${formatValue(f.probability * 100, 2)}<small>%</small></div><p class="probability-note">Probability of this exact event, not a storm</p><div class="probability-bar" aria-hidden="true"><span style="width:${f.probability * 100}%"></span></div><div class="forecast-meta"><div>Reference comparator ${formatValue(f.referenceProbability * 100, 2)}% · naive ${formatValue(f.naiveProbability * 100, 2)}%</div><div>Issued ${date(f.issuedAt)}</div><div>Resolution ${date(f.resolveAfter)} to ${date(f.resolveBy)} (UTC bounds)</div><div>${esc(f.registration)}</div><div>No score or skill established.</div></div><a class="source-link" href="${esc(sourceLink(f.path))}">Exact issued record ↗</a></article>`).join('') + blocked.map(f => `<article class="forecast-card defect"><h3>Preserved, not hidden:<br>the defective predecessor</h3><p>${esc(f.defect)} Stored as issued; no score accepted. The corrected record does not erase this error.</p><a class="text-link" href="../../forecasts/prospective-pilot/round-09-nero/error-notice.md">Read the disclosure ↗</a></article>`).join('');
    [...$('forecast-cards').querySelectorAll('.forecast-card:not(.defect)')].forEach((card, index) => {
      const f = pending[index];
      card.querySelector('.forecast-question').insertAdjacentHTML('afterend', `<p class="forecast-question">${esc(f.targetScope.cohorts.join('; '))}</p>`);
      card.querySelector('.forecast-meta div:nth-child(3)').textContent = `Resolution dates: ${date(f.resolveAfter)} to ${date(f.resolveBy)}. Exact UTC bounds below.`;
      card.insertAdjacentHTML('beforeend', `<details><summary>Exact target and timing</summary><p>${esc(f.targetEvent)}</p><p>${esc(f.resolutionRule)}</p><p>Opens ${esc(f.resolveAfter)}<br>Closes ${esc(f.resolveBy)}</p></details>`);
    });
  }

  function updateReviewDesk(asOfUTC, clockOrigin) {
    // An invalid planning input invalidates only this derived view, never the fixed records.
    $('review-desk-rows').innerHTML = ''; $('review-trust').innerHTML = '';
    $('review-trust').removeAttribute('data-calendar-position');
    try {
      const desk = reviewDesk(data.forecasts, data.trustReview, asOfUTC);
      $('review-desk-rows').innerHTML = desk.forecasts.map(f => `<article class="review-row" data-forecast-id="${esc(f.id)}" data-window-phase="${esc(f.windowPhase)}" data-attention="${esc(f.attention)}"><div><h4>${esc(f.place)}</h4><p class="review-phase">${f.attention === 'blocked-defect' ? 'Preserved defect: admission blocked' : esc(f.phaseLabel)}</p><p>${esc(f.nextReview)}</p></div><details><summary>Retained record and review bounds</summary><p>Calendar position: ${esc(f.phaseLabel)}. Recorded outcome status: ${esc(f.resolutionStatus)}. ${f.admissionBlocked ? 'Admission blocked.' : 'Admission is not established by this desk.'}</p><dl><dt>Issued</dt><dd>${esc(f.issuedAt)}</dd><dt>Review opens, UTC</dt><dd>${esc(f.resolveAfter)}</dd><dt>Review closes, UTC (inclusive)</dt><dd>${esc(f.resolveBy)}</dd></dl><a class="source-link" href="${esc(sourceLink(f.source.path))}">Exact retained forecast record ↗</a><span class="hash">${esc(f.source.sha256)}</span></details></article>`).join('');
      const trust = desk.trustReview;
      $('review-trust').setAttribute('data-calendar-position', trust.calendarPosition);
      $('review-trust').innerHTML = `<p class="eyebrow">Separate engineering obligation / Receipt trust</p><h4>Review date: ${esc(trust.reviewDate)}</h4><p>${esc(trust.label)}</p><p>The recorded review must explicitly renew, replace or reject the temporary integrity-only decision. No disposition is supplied here.</p><p>UTC calendar display only. The source specifies no time zone or hour, so this is not an expiry verdict. A date comparison does not renew acceptance or establish that the review happened.</p><details><summary>Receipt-trust source</summary><a class="source-link" href="${esc(sourceLink(trust.path))}">Read the retained review requirement ↗</a><span class="hash">${esc(trust.sourceSha256)}</span></details>`;
      $('review-clock').setAttribute('aria-invalid', 'false');
      $('review-clock-status').textContent = `${clockOrigin}: ${desk.asOf}. Unauthenticated planning time, not a verified current-time or lifecycle check.`;
    } catch (error) {
      $('review-desk-rows').innerHTML = ''; $('review-trust').innerHTML = '';
      $('review-trust').removeAttribute('data-calendar-position');
      $('review-clock').setAttribute('aria-invalid', 'true');
      $('review-clock-status').textContent = `Review desk unavailable: ${error.message}. Correct the planning input or inspect the retained records. The station and fixed forecast cards remain available.`;
    }
  }

  function renderPreparation() {
    const p = preparationFor(data, state.country, state.year);
    $('preparation-cards').innerHTML = p.options.map((o, i) => `<article class="preparation-card"><p class="eyebrow">0${i + 1} / ${i === 2 ? 'Separate approval needed' : 'Proposed inquiry'}</p><h3>${esc(o.title)}</h3><dl><dt>START IF</dt><dd>${esc(o.startIf)}</dd><dt>STOP OR REVISE IF</dt><dd>${esc(o.stopIf)}</dd><dt>RELEVANT ROLE</dt><dd>${esc(o.ownerRole)}</dd><dt>NEXT QUESTION</dt><dd>${esc(o.next)}</dd></dl></article>`).join('');
    const study = data.study, pilot = data.pilot;
    $('pilot-card').innerHTML = `<p class="eyebrow">The measurement frontier</p><h3>From economic stocks<br>to people's actual routes.</h3><p>${pilot.candidates.length} longitudinal-source candidates have been assessed. The conditional recommendation is a US SIPP historical-method benchmark, not a selected live pilot. Monthly-format records may carry spell-level information; they are not independent monthly observations.</p><p>${pilot.evidenceAdmission.admittedMeasurements} admitted income-access measurements. Access, construct review and human decisions remain gated.</p><a class="text-link" href="../../research/round-11-income-access-feasibility.md">Compare the pilot routes ↗</a>`;
    $('study-card').innerHTML = `<p class="eyebrow">Preparing to test usefulness</p><h3>Does this help more<br>than a simple table?</h3><p>${study.task_count} matched tasks now have two layouts of a static reasoning slice. This is not a test of the full interactive station. ${study.blockers.length} readiness requirements remain unmet. Human testing has not happened. The station must earn its place.</p><a class="text-link" href="../../experiments/decision-experience/presentation-v2/station.html">Explore the static reasoning slice ↗</a><br><a class="text-link" href="../../experiments/decision-experience/presentation-v2/conventional.html">Compare the conventional release ↗</a><br><a class="text-link" href="../../experiments/decision-experience/README.md">Review scope, earlier rehearsals and study gates ↗</a>`;
    $('study-card').insertAdjacentHTML('beforeend', `<details><summary>What would make testing ready?</summary><ul>${study.blockers.map(b => `<li><strong>${esc(b.label)}</strong><br>Required role: ${esc(b.owner_role)}. Not appointed or approved here.</li>`).join('')}</ul></details>`);
    const metadata = data.sippMetadata;
    $('pilot-card').insertAdjacentHTML('beforeend', `<p><strong>${metadata.variables.length} SIPP variable definitions, bound to ${metadata.sources.length} retained documentation files.</strong> Zero respondent records. The crosswalk separates reference months, job spells, earnings, weight candidates and unknown alternatives. Published panel ranges and variable counts still need reconciliation.</p><a class="text-link" href="../../pilots/income-access/sipp-crosswalk.md">Inspect the measurement specification ↗</a><details><summary>What still prevents measurement?</summary><ul>${metadata.unknowns.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`);
  }

  function render() {
    try {
    $('country-select').value = state.country; $('compare-select').value = state.compare; $('family-select').value = state.family;
    $('year-control').value = state.year; $('year-value').textContent = state.year;
    renderChart(); renderReadout(); renderEvidence(); renderPreparation(); renderMatrix();
    const story = caseFor(data, state.country, state.family, state.year);
    $('case-narrative').hidden = !story;
    $('case-narrative').innerHTML = story ? `<p class="eyebrow">Evidence tour / ${esc(name(state.country))} / ${state.year}</p><h3>${esc(story.heading)}</h3><p>${esc(story.changeExplanation)}</p><div><section><h4>What this does not establish</h4><p>${esc(story.claimLimit)}</p></section><section><h4>The next useful question</h4><p>${esc(story.nextQuestion)}</p></section></div>` : '';
    const inquiry = researchBrief(data, state).inquiry;
    $('brief-handoff').innerHTML = `<p class="eyebrow">${inquiry.guidedCase ? 'Reviewed guided-case question' : 'Generic scope-bound question'} / Proposal only</p><h3 data-handoff-question>${esc(inquiry.question)}</h3><dl><dt>EVIDENCE THAT COULD CHANGE THE READING</dt><dd>${esc(inquiry.discriminatingEvidence)}</dd><dt>PROPOSED NEXT STEP</dt><dd><strong>${esc(inquiry.nextStep.verb)}</strong> ${esc(inquiry.nextStep.object)} <strong>IF</strong> ${esc(inquiry.nextStep.if)}</dd><dt>STOP IF</dt><dd>${esc(inquiry.stopIf)}</dd><dt>REVISE IF</dt><dd>${esc(inquiry.reviseIf)}</dd><dt>DEFER IF</dt><dd>${esc(inquiry.deferIf)}</dd><dt>EVIDENCE ADMISSION</dt><dd>${esc(inquiry.admitEvidenceOnlyIf)}</dd></dl><p>${esc(inquiry.owner.role)}: not appointed. Conditions not evaluated; no action taken. The download also includes exact retained source selectors, missing requirements and interpretation limits. Nothing is submitted.</p>`;
    const url = new URL(location.href); Object.entries(state).forEach(([key, value]) => url.searchParams.set(key, value)); history.replaceState(null, '', url);
    const c = comparison(state.country);
    $('selection-announcement').textContent = `${name(state.country)}, ${state.year}, ${family().label}: ${c.after ? formatValue(c.after.value) + ' percent' : 'unavailable'}. ${formatChange(c.change)}. ${c.stormState === 'cannot-say' ? 'Cannot assess a storm; required measurements missing.' : 'Baseline only.'}`;
    } catch (error) {
      $('load-status').hidden = false;
      $('load-status').textContent = `Station unavailable: ${error.message}. No fallback claims are shown.`;
      $('main').hidden = true; document.body.dataset.stationReady = 'false';
      throw error;
    }
  }
  [['country-select', 'country'], ['compare-select', 'compare'], ['family-select', 'family']].forEach(([id, key]) => $(id).addEventListener('change', event => { state[key] = event.target.value; render(); }));
  $('year-control').addEventListener('input', event => { state.year = Number(event.target.value); render(); });
  matchMedia('(max-width:760px)').addEventListener('change', () => renderChart());
  $('export-brief').addEventListener('click', () => {
    const brief = researchBrief(data, state);
    const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(brief, null, 2) + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = `weather-station-${state.country}-${state.year}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    $('export-status').textContent = 'Download requested with source references, scope, uncertainty and action limits. Check your browser for completion. Nothing was sent.';
  });
  $('review-clock-apply').addEventListener('click', () => updateReviewDesk($('review-clock').value, 'Entered planning time'));
  $('review-clock').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); updateReviewDesk($('review-clock').value, 'Entered planning time'); }
  });
  const resetReviewClock = () => {
    $('review-clock').value = new Date().toISOString();
    updateReviewDesk($('review-clock').value, 'Untrusted browser clock snapshot');
  };
  $('review-clock-reset').addEventListener('click', resetReviewClock);
  renderField(); renderConditions(); renderForecasts(); render(); resetReviewClock();
  $('main').hidden = false; $('load-status').hidden = true;
  document.body.dataset.stationReady = 'true';
} catch (error) {
  $('load-status').textContent = `Station unavailable: ${error.message}. No fallback data or claims are shown. Try the unmodified station URL or inspect the retained country reader.`;
  $('main').hidden = true;
  document.body.dataset.stationReady = 'false';
}
