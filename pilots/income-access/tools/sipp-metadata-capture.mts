import { mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

type Source = { id: string; url: string; media: string; maxBytes: number; file: string };
export const SOURCES: readonly Source[] = Object.freeze([
  { id: 'dictionary', url: 'https://www2.census.gov/programs-surveys/sipp/tech-documentation/data-dictionaries/2025/2025_SIPP_Data_Dictionary.pdf', media: 'application/pdf', maxBytes: 5_000_000, file: 'dictionary.pdf' },
  { id: 'primary-schema', url: 'https://www2.census.gov/programs-surveys/sipp/data/datasets/2025/pu2025_schema.json', media: 'application/json', maxBytes: 1_000_000, file: 'primary-schema.json' },
  { id: 'guide', url: 'https://www2.census.gov/programs-surveys/sipp/tech-documentation/methodology/2025_SIPP_Users_Guide.pdf', media: 'application/pdf', maxBytes: 3_500_000, file: 'guide.pdf' },
  { id: 'replicate-weights', url: 'https://www2.census.gov/programs-surveys/sipp/tech-documentation/data-dictionaries/2025/rw2025_dictionary.txt', media: 'text/plain', maxBytes: 100_000, file: 'replicate-weights.txt' },
  { id: 'longitudinal-weights', url: 'https://www2.census.gov/programs-surveys/sipp/tech-documentation/data-dictionaries/2025/lgtwgt2025_dictionary.txt', media: 'text/plain', maxBytes: 100_000, file: 'longitudinal-weights.txt' },
].map(Object.freeze));

/** Explicit bounded documentation capture, never called by tests or the offline replay. */
export async function retrieveMetadata(source: Source, fetcher: typeof fetch = fetch) {
  const registered = SOURCES.find(s => s.id === source?.id);
  if (!registered || JSON.stringify(source) !== JSON.stringify(registered)) throw new Error('Only the exact listed metadata source is permitted');
  const startedAt = new Date().toISOString();
  const response = await fetcher(source.url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (response.status !== 200) throw new Error(`Metadata HTTP ${response.status}: ${source.id}`);
  const contentType = response.headers.get('content-type')?.split(';')[0].trim();
  if (contentType !== source.media) throw new Error(`Unexpected metadata content type: ${source.id}`);
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > source.maxBytes)) throw new Error(`Metadata length exceeds bound: ${source.id}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Metadata response has no body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > source.maxBytes) throw new Error(`Metadata body exceeds bound: ${source.id}`);
      chunks.push(value);
    }
  } catch (error) { await reader.cancel(); throw error; }
  const bytes = Buffer.concat(chunks);
  if (!bytes.length) throw new Error('Empty metadata');
  if (source.media === 'application/pdf' && !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Invalid metadata PDF signature');
  if (source.media === 'application/json' && !Array.isArray(JSON.parse(bytes.toString('utf8')))) throw new Error('Metadata schema must be an array');
  return { bytes, receipt: {
    id: source.id, url: source.url, file: source.file, startedAt, endedAt: new Date().toISOString(),
    status: response.status, contentType, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    kind: 'public-documentation-not-microdata', publisherAuthenticated: false, clockTrusted: false,
  } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--capture') throw new Error('Explicit --capture required; offline replay is a different command');
    const dir = fileURLToPath(new URL('../sources/sipp-2025-2026-09-11/', import.meta.url));
    let exists = false;
    try { await access(dir); exists = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (exists) throw new Error('Capture directory already exists; never overwrite retained evidence');
    const captured = [];
    for (const source of SOURCES) captured.push(await retrieveMetadata(source));
    await mkdir(dir, { recursive: true });
    for (const item of captured) await writeFile(resolve(dir, item.receipt.file), item.bytes, { flag: 'wx' });
    const manifest = { schemaVersion: '1.0.0', id: 'sipp-2025.metadata.2026-09-11', kind: 'public-documentation-not-microdata', recordsAcquired: 0, sources: captured.map(x => x.receipt) };
    await writeFile(resolve(dir, 'capture.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
