import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildStation } from './projection.mjs';

export function serialiseStation(station) {
  return 'window.WEATHER_STATION = ' + JSON.stringify(station).replaceAll('<', '\\u003c') + ';\n';
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(x => x !== '--check')) throw new Error('Use no argument to build, or --check');
  const output = serialiseStation(buildStation());
  const target = new URL('data.js', import.meta.url);
  if (args.includes('--check')) {
    if (readFileSync(target, 'utf8') !== output) throw new Error('Station projection differs; rebuild and review');
  } else writeFileSync(target, output);
  console.log('Weather Station: retained inputs replayed; research-only projection verified');
}
