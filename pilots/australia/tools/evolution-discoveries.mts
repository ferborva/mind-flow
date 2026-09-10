import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readWorkbookTables } from './primary-care-workbook.mts';
import { validateExecutableIfKernel } from '../../../contracts/executable-if/validate.mjs';

const root = resolve(import.meta.dirname, '../../..');
const output = 'pilots/australia/data/round-09-evolution-discoveries.json';
const workbookPath = 'pilots/australia/sources/primary-care/2026-09-10/pc-primary-care-tables.xlsx';
const workbookHash = 'sha256:99c6ff08e0a48026b780370aa4d02a8edb36b1b11049dd6ce92087005481a36c';
const digest = (value: string | Buffer) => 'sha256:' + createHash('sha256').update(value).digest('hex');

export function deriveEvolutionDiscoveries() {
  const raw = readFileSync(resolve(root, workbookPath));
  if (digest(raw) !== workbookHash) throw new Error('Discovery workbook hash mismatch');
  const tables = readWorkbookTables(raw, [33, 43]);
  const kernel = JSON.parse(readFileSync(resolve(root, 'pilots/australia/basket/primary-care.kernel.current.json'), 'utf8'));
  const validation = validateExecutableIfKernel(kernel);
  if (!validation.machine_valid || !validation.integrity_valid) throw new Error('Current kernel is invalid');
  if (kernel.events.length !== 12 || kernel.events.at(-1).event_hash !== 'sha256:047810fc6008a732a080de56ed62e5cc9457967e8d83fc249aabcdc650376a1c') throw new Error('Reassess discovery disposition after any new event');
  const definitions = [
    { id: 'urgent-appointment-clock', condition_id: 'condition.au.gp.timely', fields: [['10A.43', 'C54'], ['10A.43', 'C55']],
      discovery: 'Urgent GP waiting begins at appointment-making, not first attempted contact or onset of need. Urgency is respondent-defined and the population obtained urgent care.',
      blocker: 'Correcting a clock or estimand requires a new signal/typed-claim identity. definition-revised forbids changing signal references or meaning. An arbitrary window or evidence-count change would not encode the discovery.',
      needed_work: 'Design a versioned migration relating the old research proxy to an exact appointment-clock identity, with explicit downstream invalidation and replacement. Preserve the broader first-attempt access question as unmeasured.',
    },
    { id: 'prescription-denominator', condition_id: 'condition.au.prescription.cost', fields: [['10A.33', 'C17'], ['10A.33', 'C20'], ['10A.33', 'C24']],
      discovery: 'The crude annual measure covers people aged 15+ who received a GP prescription or needed prescribed medication. It is not completed atorvastatin fills. Very-remote collection changed across the compared years.',
      blocker: 'The old cohort is a single text label. narrowed requires a literal strict subset, not a replacement label with an asserted subset relation. definition-revised cannot change the scope or signal estimand.',
      needed_work: 'Review a new exact denominator identity and its relationship to the old aggregate proxy. A migration must invalidate consumers of the former meaning, not silently edit labels or add an unrelated parallel condition.',
    },
  ];
  return {
    id: 'round-09-evolution-discoveries', recorded_at: '2026-09-10T00:09:00Z', author: 'Ren',
    kernel_id: kernel.kernel_id, kernel_manifest_hash: kernel.manifest_hash,
    construction_event_count: 11, actual_appended_events: 1, new_events_appended: 0,
    required_total_actual_events: 3, gate_met: false,
    source_path: workbookPath, source_artifact_hash: workbookHash,
    source_url: 'https://assets.pc.gov.au/2026-01/rogs-2026-parte-section10-primary-and-community-health-data-tables_0.xlsx?VersionId=dhbsbDjTKGQMTdhUt6hXYhyRTwePk28I',
    discoveries: definitions.map(({ fields, ...definition }) => ({ ...definition,
      source_cells: fields.map(([table, address]) => `${table}!${address}`),
      source_text_hashes: fields.map(([table, address]) => {
        const cell = tables[table].find((c: any) => c.address === address);
        if (!cell || cell.kind !== 'text') throw new Error(`Missing discovery cell ${table}!${address}`);
        return { cell: `${table}!${address}`, sha256: digest(cell.text) };
      }), disposition: 'retained-discovery-requiring-migration-not-an-appended-event',
    })),
    authority_effect: 'none', action_authorised: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Use no args to reproduce, or --check');
    const result = JSON.stringify(deriveEvolutionDiscoveries(), null, 2) + '\n';
    if (args[0] === '--check') {
      if (readFileSync(resolve(root, output), 'utf8') !== result) throw new Error('Discovery disposition drift');
      console.log('Two retained discoveries reproduce; three-event gate remains unmet.');
    } else writeFileSync(resolve(root, output), result);
  } catch (error) { console.error(error); process.exitCode = 1; }
}
