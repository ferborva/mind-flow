import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCsv, selectRow, numericCell, verifyCapture } from './primary-care.mts';

// Display caution only: not a suppression, clinical or significance threshold.
export const SMALL_BASE_THRESHOLD = 10;
export function withRetainedNumerator(point: any): any {
  if (point.source_selectors?.Table_Number !== '10A.19') return point;
  const source = verifyCapture().artifacts.find((a: any) => a.id === 'pc-primary-care-dataset');
  const rows = parseCsv(readFileSync(resolve(import.meta.dirname, '../../..', source.path), 'utf8'));
  const selectors = { Table_Number: '10A.19', Year: point.period, Remoteness: point.remoteness, Description1: 'Full-time equivalent GPs', Description2: '', Unit: 'no.', Uncertainty: '' };
  const row = selectRow(rows, selectors);
  return { ...point, numerator: numericCell(row[point.geography]), numerator_unit: 'FTE', numerator_source_selectors: selectors };
}
