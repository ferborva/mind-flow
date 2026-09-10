import { readFileSync, writeFileSync } from 'node:fs';
import { sha256 } from './country-set.mts';

// Record the already acquired bytes once. This command never downloads, refreshes
// or overwrites evidence. HTTP Date is retained as a provider clock, not a local
// request-start timestamp. No start time was instrumented for these curl calls.
const directory = new URL('../sources/imf-weo/2026-04/', import.meta.url);
const entries = [
  ['WEOApr2026all.xlsx', 'WEOApr2026all.response-headers.txt', 'https://data.imf.org/-/media/iData/External-Storage/Documents/2F78EE59F79143A7921E5E203D3AAA80/en/WEOApr2026all.xlsx', 'original-ranking-workbook'],
  ['landing.html', 'landing.response-headers.txt', 'https://data.imf.org/Datasets/WEO', 'latest-full-vintage-evidence'],
  ['appendix.pdf', 'appendix.response-headers.txt', 'https://data.imf.org/-/media/iData/External-Storage/Documents/4AA1F4D0624C46E98F95988F1F83E770/en/April-2026-WEO-Database-Appendix.pdf', 'vintage-specific-definitions-and-country-caveats'],
  ['terms.html', 'terms.response-headers.txt', 'https://www.imf.org/external/terms.htm', 'attempted-licence-acquisition-empty-body-not-terms'],
];
const capture = { id: 'imf-weo-april-2026-country-ranking-capture', retained_on: '2026-09-10',
  author: 'Ren', source_bytes_modified: false,
  acquisition: 'curl --fail --location --dump-header <headers> --output <body> <url>; local request start/end not instrumented; retained HTTP Date is not authenticated local acquisition time',
  licence_status: 'unverified-specific-permission: IMF copyright retained; terms URL returned HTTP 200 empty HTML body after redirect, not usable licence text. No open licence asserted.',
  licence_url: 'https://www.imf.org/external/terms.htm',
  artifacts: entries.map(([file, headers_file, requested_url, purpose]) => {
    const bytes = readFileSync(new URL(file, directory));
    const headers = readFileSync(new URL(headers_file, directory));
    return { file, headers_file, requested_url, purpose, bytes: bytes.length, sha256: sha256(bytes),
      headers_sha256: sha256(headers), http_date_headers: [...headers.toString('utf8').matchAll(/^date:\s*(.+)$/gmi)].map(m => m[1].trim()) };
  }) };
writeFileSync(new URL('capture.json', directory), `${JSON.stringify(capture, null, 2)}\n`, { flag: 'wx' });
