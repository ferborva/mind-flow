import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseCsv } from '../../../signals/countries/tools/measure.mjs';
import { assertCanadaNativeRow } from '../issuance-binding/country-baseline-execution.mjs';
export const CANADA_ABSENCE_PATH='forecasts/prospective-pilot/round-10-canada/absence-2026-09-10/ilo-canada-reported';
const sha=(bytes:Buffer)=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
export function retainedCanadaAbsence(path=CANADA_ABSENCE_PATH){
  if(path!==CANADA_ABSENCE_PATH)throw new Error('only the reviewed exact Canadian absence capture is allowed');
  const base=resolve(import.meta.dirname,'../../..',path),receiptBytes=readFileSync(base+'.receipt.json');
  if(sha(receiptBytes)!=='sha256:daffecee0910e44908c9e180a8a5cd9ca5132161028197f4c2b504e1971fc2b5')throw new Error('fresh absence receipt changed');
  const receipt=JSON.parse(receiptBytes.toString('utf8')),body=readFileSync(base+'.body');
  if(receipt.status!==200||receipt.body_sha256!==sha(body)||receipt.body_byte_length!==body.length||receipt.headers_sha256!==sha(readFileSync(base+'.headers.txt')))throw new Error('fresh absence capture incomplete or changed');
  const rows=parseCsv(body.toString('utf8'));
  if(rows.length!==128)throw new Error('fresh absence capture coverage changed');
  for(const row of rows){assertCanadaNativeRow(row);if(!/^\d{4}M(0[1-9]|1[0-2])$/.test(row.time)||row.time>='2026M10')throw new Error('future target is already known or native period changed');}
  // Protocol uses exact second UTC instants: round completion up, never backwards.
  const observedAt=new Date(Math.ceil(Date.parse(receipt.ended_at)/1000)*1000).toISOString().replace('.000Z','Z');
  return {path,receipt,body_sha256:sha(body),receipt_sha256:sha(receiptBytes),observedAt};
}
