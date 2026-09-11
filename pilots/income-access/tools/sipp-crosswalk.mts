import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { SOURCES } from './sipp-metadata-capture.mts';

type SchemaEntry = { varnum: number; name: string; label: string; dtype: string };
type Inputs = { capture: any; bytes: Record<string, Uint8Array> };
const hash = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const CAPTURE_HASH = 'eebe89e932e84237900eb3ef0569e0bc93a9a6564eae2d0139b64a7b76dfdac6';
const HASHES: Record<string, string> = {
  dictionary: '571e53b4ec3ebb11bebddbb7190fc1084f5364b8a1ec5fbd7ca8e2f69e7cc752',
  'primary-schema': '6cdc23c537ba1431540e62994f0c05e05e62920e785384872bf5b7c23fe8c241',
  guide: '0f0bfbc9bbd0de97d8cfd07ec3128925159c9696d259893e04aa1e6f5d17ba41',
  'replicate-weights': '818e434ae1ac25b0be5b370826950ca46d2f538e38c49860a28e6cc25d2a8d60',
  'longitudinal-weights': 'ddd6eaada51c2be6904ae5aacf8f41f83e8303a50c6c90f3a33a0661de8c1c95',
};

// These annotations are manually reviewed interpretations/transcriptions, not PDF-parser output.
// page is the printed page number; the PDF has a one-page offset in a 1-based viewer.
const annotation = (page: number, universe: string | null, file: string, statusFlag: string | null, caveat: string, extra = {}) => ({
  sourceId: 'dictionary', printedPage: page, pdfPageOneBased: page + 1,
  method: 'agent-reviewed-dictionary-annotation', independentlyReviewed: false,
  universe, file, statusFlag, caveat, ...extra,
});
const endGate = '((THHLDSTATUS in (1,2) & (EJB1_EMONTH<12 | (EJB1_EMONTH=12 & RJB1_CFLG=0))) | (THHLDSTATUS in (3,4,5,6) & (EJB1_EMONTH<LAST_MONTH | (EJB1_EMONTH=LAST_MONTH & RJB1_CFLG=0))))';
const earningsUniverse = 'EJB(n)_BMONTH <= MONTHCODE <= EJB(n)_EMONTH for at least one n=(1,...,8)';
const ANNOTATIONS: Record<string, any> = {
  SSUID: annotation(1247, 'All persons', 'Household', null, 'Scrambled sample-unit key, not a person or household denominator; combine with PNUM and release context.'),
  SPANEL: annotation(1239, 'All persons', 'Household', null, 'Panel year is not the observation year. Published weight dictionaries disagree about allowed panel years.', { allowedValues: [2022, 2023, 2024, 2025] }),
  SWAVE: annotation(1240, 'All persons', 'Household', null, 'Interview wave is not a calendar month.', { minimum: 1, maximum: 4 }),
  PNUM: annotation(1241, 'All persons', 'Person', null, 'Person number is unique within sample unit, not globally.', { minimum: 101, maximum: 499 }),
  MONTHCODE: annotation(1248, 'All persons', 'Person-month', null, 'Reference month needs reference year from release context, not panel year.', { minimum: 1, maximum: 12 }),
  RIN_UNIV: annotation(1245, 'THHLDSTATUS in (1,2,3,4)', 'Person-month', null, 'Monthly survey-frame membership can change. It does not resolve the project population denominator.', { allowedValues: [1, 2] }),
  WPFINWGT: annotation(3255, 'All persons', 'Person-month', null, 'Final person weight is not automatically the correct weight for a longitudinal transition cohort.'),
  RMESR: annotation(2488, 'TAGE >= 15', 'Person-month', 'AMESR', 'Eight employment-state categories include partial months, layoff and search. Neither a job nor its absence directly establishes viable income access.', { allowedValues: [1, 2, 3, 4, 5, 6, 7, 8], stormCodeMapping: null }),
  RMNUMJOBS: annotation(2579, 'TAGE >= 15', 'Person-month', 'AMNUMJOBS', 'Jobs held are observed arrangements, not the set of viable alternatives.', { minimum: 0, maximum: 17 }),
  EJB1_JOBID: annotation(2581, 'EJB1_SCRNR=1 & AJB1_SCRNR=1 & AJB1_BMONTH=1 & EJB1_BMONTH <= MONTHCODE <= EJB1_EMONTH', 'Person-month', 'AJB1_JOBID', 'Linkage candidate within person and across waves, not proof of complete job-history coverage.', { minimum: 101, maximum: 407 }),
  EJB7_JOBID: annotation(2587, null, 'Person-month', 'AJB7_JOBID', 'Explicitly suppressed; blank universe is unknown/not published, not all persons.', { suppressed: true }),
  EJB1_RSEND: annotation(1773, `EJB1_JBORSE in (1,3) & ${endGate}`, 'Person-month', 'AJB1_RSEND', 'Employer-job exit reason, not business exit. Reasons include job switching and retirement. Do not turn a repeated spell reason into repeated events.', { allowedValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], involuntaryCodeMapping: null }),
  EJB1_RENDB: annotation(1780, `EJB1_JBORSE=2 & ${endGate}`, 'Person-month', 'AJB1_RENDB', 'Business exit only. Employer and business exit reason codes have different meanings; no shared numeric mapping.', { allowedValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], involuntaryCodeMapping: null }),
  ROVERLAPMN: annotation(2621, 'ENJFLAG=1', 'Person-month', null, 'Multiple non-employment spells can share a month. Earlier-spell dates do not recover every event.', { allowedValues: [1, 2] }),
  TPEARN: annotation(2580, earningsUniverse, 'Person-month', 'APEARN', 'Includes earnings and business profits/losses; varies with calendar month length. Not opportunity, disposable income or a living-standard measure.', { minimum: -99999999, maximum: 99999999, zeroFillOutsideUniverse: false }),
  TPEARN_ALT: annotation(2630, earningsUniverse, 'Person-month', 'APEARN_ALT', 'Alternative calendar-length treatment needs a predeclared sensitivity comparison, not post-hoc choice of the most alarming series.', { minimum: -99999999, maximum: 99999999, zeroFillOutsideUniverse: false }),
};

export async function loadRetained(): Promise<Inputs> {
  const base = new URL('../sources/sipp-2025-2026-09-11/', import.meta.url);
  const captureBytes = await readFile(new URL('capture.json', base));
  if (hash(captureBytes) !== CAPTURE_HASH) throw new Error('Retained capture receipt differs from pinned bytes');
  const bytes: Record<string, Uint8Array> = {};
  for (const source of SOURCES) bytes[source.id] = await readFile(new URL(source.file, base));
  return { capture: JSON.parse(captureBytes.toString('utf8')), bytes };
}

export function replayCrosswalk(input: Inputs) {
  if (hash(JSON.stringify(input.capture, null, 2) + '\n') !== CAPTURE_HASH) throw new Error('Capture receipt differs from pinned receipt');
  if (!isDeepStrictEqual(Object.keys(input.bytes).sort(), Object.keys(HASHES).sort())) throw new Error('Expected exact pinned metadata files');
  for (const source of SOURCES) {
    const receipt = input.capture.sources.find((s: any) => s.id === source.id);
    const bytes = input.bytes[source.id];
    if (receipt?.url !== source.url || receipt?.sha256 !== HASHES[source.id] || hash(bytes) !== HASHES[source.id] || bytes.length !== receipt?.bytes) throw new Error(`Source differs from pinned metadata: ${source.id}`);
  }
  const schema: SchemaEntry[] = JSON.parse(Buffer.from(input.bytes['primary-schema']).toString('utf8'));
  if (schema.length !== 5203) throw new Error('Expected pinned schema entry count, not participant count');
  const variables = Object.entries(ANNOTATIONS).map(([name, details]) => {
    const selected = schema.filter(row => row.name === name);
    if (selected.length !== 1) throw new Error(`Expected one schema metadata entry for ${name}`);
    return { ...selected[0], annotation: structuredClone(details) };
  });
  return {
    schemaVersion: '1.0.0', id: 'sipp-2025.variable-feasibility.round-11',
    status: 'metadata-crosswalk-not-measurement', authorship: 'Ren (AI agent): analysis proposal, not Fernando approval',
    captureId: input.capture.id, captureSha256: CAPTURE_HASH,
    sources: structuredClone(input.capture.sources), schemaEntries: schema.length,
    recordsAcquired: 0, admittedMeasurements: 0, nationalStormInference: false, liveWarningReady: false,
    replayScope: 'Original-byte identity, exact schema selection and retained agent annotations. Does not independently parse PDF semantics or validate the construct.',
    variables,
    timing: { releaseEdition: 2025, referenceYear: 2024, referenceYearBasis: 'Guide section 1.5.3, printed p13; release edition and panel year are not the reference year. Some non-employment topics refer to interview time.', outputGrain: 'person-month', collectionBasis: 'retrospective annual interview; employment spell collection', independentMonthlyMeasurement: false, guidePrintedPages: [13, 29, 69, 70, 71, 72], caveat: 'Many job-spell characteristics are copied to months in the spell. Some monthly-varying pay and edited recodes differ. Monthly output is not twelve independent interviews. Deduplicate events and preserve imputation flags.' },
    weights: { joinApproved: false, estimationApproved: false,
      crossSectionalCandidate: 'WPFINWGT; separate replicate text identifies REPWGT0 as equivalent',
      replicateFamily: 'REPWGT1 through REPWGT240; text abbreviates intermediate records, not 240 observed data values',
      longitudinalCandidates: [
        { name: 'FINYR2', referenceStart: '2023-01', referenceEnd: '2024-12' },
        { name: 'FINYR3', referenceStart: '2022-01', referenceEnd: '2024-12' },
        { name: 'FINYR4', referenceStart: '2021-01', referenceEnd: '2024-12' },
      ],
      panelRanges: { primary: [2022, 2023, 2024, 2025], replicateText: [2021, 2022, 2023, 2024], longitudinalText: [2022, 2023, 2024] },
      sourceConflict: 'Primary dictionary SPANEL range 2022-2025 differs from monthly replicate text 2021-2024. Do not silently shift years or approve a join. The longitudinal range 2022-2024 can reflect cohort eligibility, so its difference alone is not evidence of an error.',
      documentedMonthlyReplicateJoin: ['SSUID', 'PNUM', 'MONTHCODE'],
      documentedLongitudinalJoin: ['SSUID', 'PNUM'],
      joinBasis: 'Guide printed p157; documented keys are not empirically tested uniqueness or coverage.',
      grainCaution: 'Primary dictionary calls REPWGT[1:240] File: Person; separate replicate text includes MONTHCODE. Follow the guide monthly join candidate while retaining these distinct descriptions and testing grain before estimation.',
      longitudinalCaution: 'Longitudinal target populations, in-scope exits, imputed months and response adjustments require the guide and a statistician-reviewed estimator, not generic complete-case filtering.',
      dictionaryPrintedPages: [1239, 3255, 3256, 3257], guidePrintedPages: [154, 155, 156, 157, 158, 159, 160], annotationsIndependentlyReviewed: false,
    },
    unknowns: [
      'Resolve contradictory published panel-year ranges using authoritative correction/metadata before specifying a weight join.',
      'The retained primary schema has 5203 entries, while the guide p15 lists 5204 variables for 2025. Resolve edition completeness without inventing a missing field.',
      'Complete dependencies and code-value crosswalks for age, job screen/start/end/continuation, survey frame, missingness and allocation flags; no event extractor is approved.',
      'Audit suppression and multi-job coverage across every job line. This 16-variable subset is not a complete extraction specification.',
      'Define severity, persistence, viable alternatives, beneficial transitions, household transmission and the population denominator with the authorised reviewers.',
      'An observed job switch is not proof that an equally viable alternative was available before disruption. Retrospective survey outcomes do not identify the full opportunity set.',
      'Resolve cohort weights, attrition, top-coding, non-response, inflation/calendar treatment and uncertainty before any empirical estimate.',
      'Acquire no participant data until data-custody, permitted-use and acquisition gates pass. Public metadata availability grants no project approval.',
    ],
    nextGate: { status: 'pending', ownerRole: 'Survey-methods reviewer, unappointed', action: 'Review the exact metadata discrepancies and complete dependency/code mappings offline; seek a public authoritative correction if one exists. No provider contact or data acquisition is authorised by this record.' },
  };
}

export function validateCrosswalk(value: unknown, input: Inputs) {
  if (!isDeepStrictEqual(value, replayCrosswalk(input))) throw new Error('Retained crosswalk differs from pinned metadata replay and reviewed annotations');
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = replayCrosswalk(await loadRetained());
    const target = new URL('../sipp-crosswalk.v1.json', import.meta.url);
    if (process.argv.length === 3 && process.argv[2] === '--write-new') await writeFile(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    else if (process.argv.length === 2) validateCrosswalk(JSON.parse(await readFile(target, 'utf8')), await loadRetained());
    else throw new Error('Use no arguments for offline check, or --write-new for first generation only');
    console.log(JSON.stringify({ valid: true, variables: result.variables.length, metadataFiles: result.sources.length, recordsAcquired: 0, admittedMeasurements: 0, crosswalkSha256: hash(JSON.stringify(result, null, 2) + '\n') }));
  } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
