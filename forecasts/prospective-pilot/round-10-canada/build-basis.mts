import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCanadaBasis, jsonBytes } from './basis.mts';
const args=process.argv.slice(2);if(args.length>1||args.some(a=>a!=='--check'))throw new Error('usage: build-basis.mts [--check]');
for(const [name,document] of Object.entries(buildCanadaBasis())){
  const path=resolve(import.meta.dirname,name+'.json'),bytes=jsonBytes(document);
  if(args[0]==='--check'){if(!readFileSync(path).equals(bytes))throw new Error('Canadian basis replay drift: '+name);}
  else writeFileSync(path,bytes);
}
