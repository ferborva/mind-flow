import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, canonicalJson } from '../../observatory-comparison/render-model.mjs';

type Material = { id: string; label: string; value: string };
type Option = { id: string; label: string; assessment: string; feedback: string };
type Task = { id: string; title: string; prompt: string; options: Option[] };
type Pack = { id: string; materials: Material[]; tasks: Task[]; material_digest: string; source_refs: unknown; study_boundary: string };
type Layout = 'conventional' | 'station';
export const SOURCE_REF = Object.freeze({ path: 'experiments/decision-experience/task-pack.json', sha256: 'sha256:8e8a29867e73c86c6d556705c67804b725c32c6730f8f786f28b7e9bfff814f0' });
const edition = 'decision-experience.static-reasoning-slice/2.0.0';
const groups = [
  { id: 'reading', label: 'Read the change and its boundary', ids: ['scope', 'before', 'after', 'change', 'denominator', 'vintage', 'storm', 'authority'] },
  { id: 'limits', label: 'Identify what is still missing', ids: ['limits', 'missing'] },
  { id: 'gates', label: 'Separate inquiry, conclusion and action', ids: ['if', 'forecast'] },
  { id: 'source', label: 'Inspect the source and challenge the reading', ids: ['source', 'correction'] },
];
const escape = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const reviewBoundary = 'Materials review only. No responses are collected. Recruitment and assignment are not implemented. Not a crisis warning or personal advice.';
const comparisonLimit = 'Static, single-country reasoning slice. This is not the interactive station and has not been tested with people.';

function styles(layout: Layout | 'reviewer') {
  const common = `*{box-sizing:border-box;min-width:0}html{font-size:100%}body{font:18px/1.55 system-ui;margin:0 auto;max-width:1120px;padding:clamp(12px,3vw,32px);overflow-wrap:anywhere}h1{font-size:2em;line-height:1.12;margin:.5em 0}h2{font-size:1.3em;line-height:1.25}h3{font-size:1em;line-height:1.35}p{margin:.5em 0 1em}a{color:inherit;text-underline-offset:.18em}a:focus-visible{outline:3px solid #a87920;outline-offset:4px}.boundary{padding:1em;border:2px solid currentColor;font-size:.9em}.scope-note{font-size:.92em}nav{display:flex;flex-wrap:wrap;gap:.5em 1em;padding:1em 0;border-block:1px solid #7c9290}section{margin:2em 0}footer{border-top:1px solid #7c9290;margin-top:2em;padding-top:1em;font-size:.9em}table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{vertical-align:top;text-align:left;padding:.7em .5em;border-bottom:1px solid #a1afad;overflow-wrap:anywhere}th{width:31%;font-weight:600}.task{padding:1em 0;border-top:1px solid #9aacaa}.task li{margin:.65em 0}.task ul{padding-left:1.35em}.option-notice{font-size:.9em;font-style:italic}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85em}.reader-note{padding:1em;background:#e9efec;color:#193029}@media(max-width:760px){body{padding:14px}h1{font-size:1.65em}.reading-workspace{display:block!important}.native-readings{display:block!important}.material{margin:.6em 0!important}th,td{padding:.65em .25em}th{width:36%}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
  if (layout !== 'station') return common + 'body{background:#fff;color:#192c2c}header{max-width:900px}.material-table{margin:1em 0}.review-answer{padding:1em;border:1px solid #96aaa5;margin:1em 0}';
  return common + `body{background:#091719;color:#e7f3ed}.eyebrow{font-size:.8em;letter-spacing:.09em;text-transform:uppercase;color:#bbd8cd}h1{font-family:Georgia,serif;font-weight:400;color:#d8efd9}.reading-workspace{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:1em;align-items:start}.native-readings{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.8em}.material{border:1px solid #52716b;border-radius:.4em;padding:.85em;background:#102729}.material h3{margin:0 0 .5em;font-weight:500;color:#c3d7ce}.native-readings .material{grid-column:1/-1}.native-readings [data-material-id=before],.native-readings [data-material-id=after]{grid-column:auto}.native-readings [data-material-id=before] p,.native-readings [data-material-id=after] p{font-size:2em;line-height:1.15;margin:.25em 0;color:#ddf2d2}.reading-verdict .material{margin-bottom:.8em;border-left:3px solid #badcb8}.reasoning-pair{display:grid;gap:.8em}.boundary{color:#d4e5d7}.task{border-color:#52716b}.reader-note{background:#1a3534;color:#e7f3ed}`;
}

function header(title: string, layout: Layout | 'reviewer') {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${layout === 'station' ? 'dark' : 'light'}"><title>${escape(title)}</title><style>${styles(layout)}</style></head><body><header><p class="eyebrow">RESEARCH MATERIALS / PRESENTATION EDITION 2.0.0</p><h1>${escape(title)}</h1><p class="boundary">${reviewBoundary}</p><p class="scope-note">${comparisonLimit}</p></header>`;
}

function row(material: Material, layout: Layout) {
  if (layout === 'conventional') return `<tr data-material-id="${escape(material.id)}"><th scope="row" data-material-label>${escape(material.label)}</th><td data-material-value>${escape(material.value)}</td></tr>`;
  return `<article class="material" data-material-id="${escape(material.id)}"><h3 data-material-label>${escape(material.label)}</h3><p data-material-value>${escape(material.value)}</p></article>`;
}

export function renderPresentation(pack: Pack, layout: Layout) {
  if (!['conventional', 'station'].includes(layout)) throw new Error('Unsupported layout');
  const materialMap = new Map(pack.materials.map(m => [m.id, m]));
  const sections = groups.map(group => {
    const items = group.ids.map(id => { const m = materialMap.get(id); if (!m) throw new Error('Missing material: ' + id); return m; });
    let body: string;
    if (layout === 'conventional') body = `<table class="material-table" aria-labelledby="section-${group.id}"><tbody>${items.map(m => row(m, layout)).join('\n')}</tbody></table>`;
    else if (group.id === 'reading') body = `<div class="reading-workspace"><div class="native-readings">${items.slice(0, 6).map(m => row(m, layout)).join('\n')}</div><div class="reading-verdict">${items.slice(6).map(m => row(m, layout)).join('\n')}</div></div>`;
    else body = `<div class="reasoning-pair">${items.map(m => row(m, layout)).join('\n')}</div>`;
    return `<section id="${group.id}" data-section-id="${group.id}" aria-labelledby="section-${group.id}"><h2 id="section-${group.id}">${escape(group.label)}</h2>${body}</section>`;
  }).join('\n');
  const taskBody = pack.tasks.map(task => `<article class="task" data-task-id="${escape(task.id)}"><h3 data-task-title>${escape(task.title)}</h3><p data-task-prompt>${escape(task.prompt)}</p><p class="option-notice">These are task alternatives, not endorsed claims or instructions. Some deliberately contain unsupported inferences.</p><ul>${task.options.map(option => `<li data-option-id="${escape(option.id)}">${escape(option.label)}</li>`).join('\n')}</ul></article>`).join('\n');
  return `${header('What changed. What follows?', layout)}
<nav aria-label="Reasoning sections">${groups.map(g => `<a href="#${g.id}">${escape(g.label)}</a>`).join('')}<a href="#tasks">Consider the questions and options</a></nav>
<main>${sections}
<section id="tasks" data-section-id="tasks" aria-labelledby="section-tasks"><h2 id="section-tasks">Consider the questions and options</h2><p>Review the following questions without submitting an answer. No answers, identities, timing or choices are recorded.</p>${taskBody}</section>
<p class="reader-note">This source-bound case does not validate a crisis detector, a personal recommendation or the full station experience. Comprehension, visible parity and usefulness remain unassessed.</p></main>
<footer><p>${reviewBoundary}</p><p><a href="../../../dashboard/station/">Return to the research station</a> (outside the proposed comparison). No response or approval is sent by following this local link.</p></footer></body></html>
`;
}

function renderReviewer(pack: Pack) {
  return `${header('Reviewer answer sheet', 'reviewer')}<main><p class="boundary">REVIEWER ANSWER SHEET. Not a validated coding rubric. Do not show these proposed answers before any future held-out task.</p><p>These are the original author's proposed classifications and feedback, retained separately from the two presentation layouts. They are not participant responses or evidence of scoring reliability.</p>${pack.tasks.map(task => `<section><h2>${escape(task.title)}</h2><p>${escape(task.prompt)}</p>${task.options.map(option => `<article class="review-answer"><h3>${escape(option.label)}</h3><p>Proposed classification: ${escape(option.assessment)}</p><p>Proposed feedback: ${escape(option.feedback)}</p></article>`).join('\n')}</section>`).join('\n')}<p>Multiple bounded choices can be defensible. A new operational study still needs independently reviewed held-out cases and a coding manual; this page does not approve them.</p></main><footer><p>${reviewBoundary}</p><a href="../../../dashboard/station/">Return to the research station</a></footer></body></html>
`;
}

export function verifyPresentation(html: string, pack: Pack, layout: Layout) {
  if (digest(JSON.stringify(pack, null, 2) + '\n') !== SOURCE_REF.sha256) throw new Error('Source package mismatch: matching HTML cannot authorise a changed fact pack');
  if (html !== renderPresentation(pack, layout)) throw new Error('Presentation differs from the exact source-bound edition');
  return true;
}

export function buildPresentation(sourceBytes: Buffer) {
  if (digest(sourceBytes) !== SOURCE_REF.sha256) throw new Error('Source package mismatch: reviewed repinning is required');
  const pack: Pack = JSON.parse(sourceBytes.toString('utf8'));
  const materialIds = groups.flatMap(group => group.ids);
  if (pack.materials.length !== 14 || new Set(materialIds).size !== 14 || pack.tasks.length !== 3
    || materialIds.some(id => pack.materials.filter(m => m.id === id).length !== 1)) throw new Error('Source material inventory mismatch');
  const visibleTasks = pack.tasks.map(t => ({ id: t.id, title: t.title, prompt: t.prompt, options: t.options.map(o => ({ id: o.id, label: o.label })) }));
  const conventional = renderPresentation(pack, 'conventional'), station = renderPresentation(pack, 'station'), reviewer = renderReviewer(pack);
  const manifest = {
    id: 'round-11.static-reasoning-slice.presentation-v2', edition, author: 'Ren (AI agent)', provenance: 'commissioned-proposal',
    classification: 'unapproved-static-materials-review', source_ref: SOURCE_REF,
    source_fact_pack_id: pack.id, source_material_digest: pack.material_digest,
    visible_material_digest: digest(canonicalJson({ materials: materialIds.map(id => pack.materials.find(m => m.id === id)), tasks: visibleTasks })),
    section_order: [...groups.map(g => g.id), 'tasks'], material_ids: materialIds, task_ids: pack.tasks.map(t => t.id),
    presentation_layout_count: 2, experimental_arms_delivered: 0,
    treatment: 'Static visual encoding and reading-workspace organisation, with identical facts, questions, options, section order and neutral labels.',
    estimand_boundary: 'A future separately approved comparison could estimate the effect of this static single-country reasoning presentation on specified unaided interpretation tasks, not the effect of the integrated interactive station.',
    omitted_capabilities: ['country-lens-year-interaction', 'multi-country-discovery', 'historical-matrix-navigation', 'forecast-ledger-journey', 'construct-migration-interaction', 'preparation-execution', 'real-transition-outcomes'],
    rendered_outputs: [{ path: 'conventional.html', sha256: digest(conventional) }, { path: 'station.html', sha256: digest(station) }, { path: 'reviewer.html', sha256: digest(reviewer) }],
    exact_template_parity_verified: true, visible_parity_verified: false, assistive_presentation_verified: false,
    actual_station_equivalence_established: false, human_testing_completed: false,
    assignment_implemented: false, recruitment_allowed: false, participant_data_collection: 'disabled',
    statistical_power_established: false, ethics_approval: false, authority_effect: 'none', public_release_approved: false,
    boundary: 'No human gate is removed. Exact bytes and templates are not evidence of equal visibility, comprehension, research approval or useful decisions.',
  };
  return { pack, manifest, conventional, station, reviewer };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || !['--write', '--check'].includes(process.argv[2])) throw new Error('Use --write or --check');
    const result = buildPresentation(readFileSync(new URL('../task-pack.json', import.meta.url)));
    const outputs = [['conventional.html', result.conventional], ['station.html', result.station], ['reviewer.html', result.reviewer], ['manifest.json', JSON.stringify(result.manifest, null, 2) + '\n']];
    for (const [name, content] of outputs) {
      const file = new URL(name, import.meta.url);
      if (process.argv[2] === '--write') writeFileSync(file, content);
      else if (readFileSync(file, 'utf8') !== content) throw new Error('Generated presentation differs: ' + name);
    }
    console.log('Static reasoning-slice edition reproduces: 14 facts, three tasks, two layouts. Human gates remain blocked.');
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
