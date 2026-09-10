import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { retainSourceAttempt } from '../../../signals/countries/tools/income-retain.mts';

const args=process.argv.slice(2);
if(args.length!==1)throw new Error('provide exactly one new retention directory');
await mkdir(resolve(args[0]));
const sources={
  'ilo-canada-reported':'https://rplumber.ilo.org/data/indicator?id=UNE_DEAP_SEX_AGE_RT_M&ref_area=CAN&source=BA%3A147&sex=SEX_T&classif1=AGE_YTHADULT_YGE15&timefrom=2016&format=.csv&type=both',
  'ilo-api-schema':'https://rplumber.ilo.org/openapi.json',
};
for(const [id,url] of Object.entries(sources))console.log(JSON.stringify(await retainSourceAttempt(args[0],id,url,{maxBytes:2_000_000})));
