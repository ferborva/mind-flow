import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = new URL('../', import.meta.url);
const sourceDirectory = new URL('sources/imf-weo/2026-04/', directory);
const workbook = new URL('WEOApr2026all.xlsx', sourceDirectory);
const workbookHash = 'sha256:b29239cb48f8b895d1e526070c4fde01147bc8f6bd3b86f636363bb6bd87fe7a';
export const sha256 = (bytes: Uint8Array) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
type Row = Record<string, string>;
const decode = (text: string) => text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Read-only OOXML extraction. The pinned publisher archive contains external links;
// neither those links, macros, formulas nor embedded add-ins are executed.
// unzip verifies member CRC; its expanded output is bounded at 40 MB.
export function readWeoCountries(): Row[] {
  if (sha256(readFileSync(workbook)) !== workbookHash) throw new Error('retained WEO workbook hash mismatch');
  const xml = (member: string) => execFileSync('unzip', ['-p', fileURLToPath(workbook), member], { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
  if (!xml('xl/workbook.xml').includes('<sheet name="Countries" sheetId="10" r:id="rId2"') ||
      !xml('xl/_rels/workbook.xml.rels').includes('Target="worksheets/sheet2.xml"')) throw new Error('WEO country sheet relationship changed');
  const text = (body: string) => [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => decode(m[1])).join('');
  const shared = [...xml('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => text(m[1]));
  const rows: Row[] = [];
  const headers = new Map<string, string>();
  for (const match of xml('xl/worksheets/sheet2.xml').matchAll(/<row\s[^>]*>[\s\S]*?<\/row>/g)) {
    const row: Row = {};
    for (const cell of match[0].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const address = cell[1].match(/\br="([A-Z]+)(\d+)"/);
      if (!address || (cell[2] || '').includes('<f')) throw new Error('unsupported WEO cell/formula');
      const raw = cell[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      const type = cell[1].match(/\bt="([^"]+)"/)?.[1];
      const value = type === 's' ? shared[Number(raw)] : type === 'inlineStr' ? text(cell[2]) : decode(raw);
      if (value === undefined) throw new Error('missing WEO shared string');
      if (address[2] === '1') headers.set(address[1], value);
      else {
        const header = headers.get(address[1]);
        if (!header) throw new Error('WEO cell has no header');
        row[header] = value;
        row.source_row = address[2];
      }
    }
    if (row.source_row) rows.push(row);
  }
  if (headers.get('BW') !== '2025' || headers.get('E') !== 'INDICATOR.ID') throw new Error('WEO selectors changed');
  return rows;
}

export function rankCountries(rows: Row[]) {
  const seen = new Set<string>();
  const eligible: any[] = [], excluded: any[] = [];
  for (const row of rows.filter(row => row['INDICATOR.ID'] === 'NGDPD')) {
    const iso3 = row['COUNTRY.ID'];
    if (!/^[A-Z]{3}$/.test(iso3) || seen.has(iso3)) throw new Error('invalid or duplicate WEO country cell');
    seen.add(iso3);
    if (row.SERIES_CODE !== `${iso3}.NGDPD.A` || row.INDICATOR !== 'Gross domestic product (GDP), Current prices, US dollar') throw new Error('WEO native series/indicator mismatch');
    if (row.UNIT !== 'US dollar' || row.SCALE !== 'Billions' || row.FREQUENCY !== 'Annual') throw new Error('WEO unit/frequency mismatch');
    if (row.DATASET !== 'IMF.RES:WEO(9.0.0)' || row.PUBLICATION_DATE !== '2026-04-14T13:00:00Z') throw new Error('WEO vintage mismatch');
    const raw = row['2025'];
    if (raw === undefined || raw === '' || raw === 'n/a') { excluded.push({ iso3, name: row.COUNTRY, reason: 'missing-2025-NGDPD', source_row: row.source_row }); continue; }
    if (!/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) <= 0) throw new Error('invalid WEO ranking value');
    eligible.push({ iso3, name: row.COUNTRY, year: 2025, gdp_current_usd_billions: Number(raw), source_value: raw,
      source_sheet: 'Countries', source_cell: `BW${row.source_row}`, source_series_code: row.SERIES_CODE,
      publication_date: row.PUBLICATION_DATE, update_date: row.UPDATE_DATE,
      latest_actual_annual_data_raw: row.LATEST_ACTUAL_ANNUAL_DATA ?? null,
      methodology_notes_raw: row.METHODOLOGY_NOTES ?? null,
      reporting_year_raw: row.START_END_MONTHS_OF_REPORTING_YEAR ?? null,
      observation_status: 'historical-year-may-include-IMF-estimate-not-certified-actual',
      source_status_note: 'Do not infer actual/estimate status from the completed year; retained workbook metadata and appendix govern.' });
  }
  if (eligible.length < 50) throw new Error('fewer than 50 eligible economies');
  eligible.sort((a, b) => b.gdp_current_usd_billions - a.gdp_current_usd_billions || (a.iso3 < b.iso3 ? -1 : a.iso3 > b.iso3 ? 1 : 0));
  const ranking = eligible.map((country, index) => ({ rank: index + 1, ...country }));
  return { countries: ranking.slice(0, 50), excluded, eligible_count: eligible.length, cutoff_comparison: ranking.slice(49, 52) };
}

export function deriveCountrySet() {
  const capture = JSON.parse(readFileSync(new URL('capture.json', sourceDirectory), 'utf8'));
  for (const artifact of capture.artifacts) {
    if (sha256(readFileSync(new URL(artifact.file, sourceDirectory))) !== artifact.sha256 ||
        sha256(readFileSync(new URL(artifact.headers_file, sourceDirectory))) !== artifact.headers_sha256) throw new Error('retained source artifact hash mismatch');
  }
  return { id: 'country-set.v1', provenance: 'commissioned-proposal', author: 'Ren', created: '2026-09-10',
    fernando_chose_ranking: false, panel_admission: false,
    source_capture: 'capture/2026-09-10-where-the-money-sits-and-the-weather-station.md',
    ranking: { publisher: 'International Monetary Fund', database: 'World Economic Outlook', vintage: 'April 2026',
      reference_year: 2025, reference_year_reason: 'Proposed latest completed reference year, rather than the current-year projection. Fernando has not chosen this year.',
      indicator: 'NGDPD', unit: 'billions of current US dollars', limit: 50,
      universe: 'IMF Countries sheet economies, including separately reported non-sovereign economies; no country groups, sovereignty filter or substitutions.',
      order: 'descending unrounded retained numeric value; exact ties by ascending IMF three-letter country identifier',
      missing_policy: 'exclude and name; never substitute an earlier year, neighbour, other publisher or zero',
      estimate_warning: '2025 is not certified actual data: IMF estimates may remain even for historical years. No estimate is introduced by this producer.',
      latest_vintage_evidence: 'Retained IMF dataset landing page names April 2026 full database and separately lists July 2026 report update. Checked 2026-09-10; no claim about future releases.',
      evidence_ceiling: 'Proposed nominal economic-size sampling frame only, not welfare, access, storm detection or binding-category evidence.' },
    source: { file: 'signals/countries/sources/imf-weo/2026-04/WEOApr2026all.xlsx', sha256: workbookHash,
      manifest: 'signals/countries/sources/imf-weo/2026-04/capture.json', licence_status: capture.licence_status },
    open_question: 'Which GDP concept, ranking year, vintage and economy/sovereign-country universe should define the top 50? Proposed here, not decided for Fernando.',
    ...rankCountries(readWeoCountries()) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const bytes = `${JSON.stringify(deriveCountrySet(), null, 2)}\n`;
    const target = new URL('country-set.v1.json', directory);
    if (process.argv.includes('--check')) {
      if (readFileSync(target, 'utf8') !== bytes) throw new Error('country-set derived bytes differ');
      console.log('country-set retained-source reproduction passed');
    } else if (process.argv.includes('--write')) writeFileSync(target, bytes, { flag: 'wx' });
    else throw new Error('use --check or --write (new output only)');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
