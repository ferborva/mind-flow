import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { retainSourceAttempt } from './income-retain.mts';

const args=process.argv.slice(2);
if(args.length!==1)throw new Error('provide exactly one new retention directory');
await mkdir(resolve(args[0]));
const sources={
  'pip-update-calendar':'https://worldbank.github.io/PIP_data_updates/',
  'pip-data360-metadata':'https://data360files.worldbank.org/data360-data/metadata/WB_PIP/WB_PIP_HEADCOUNT_IPL.pdf',
  'statcan-release-calendar':'https://www150.statcan.gc.ca/n1/release-diffusion/2026-eng.pdf',
};
for(const [id,url] of Object.entries(sources))console.log(JSON.stringify(await retainSourceAttempt(args[0],id,url,{maxBytes:15_000_000})));
