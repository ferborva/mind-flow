import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const sha256 = (bytes: Uint8Array) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const destination = process.argv[2];
if (!destination) throw new Error('provide a new source directory');
await mkdir(resolve(destination)); // no overwrite of any prior capture
for (const [id, url] of Object.entries({
  'internet': 'https://api.worldbank.org/v2/country/all/indicator/IT.NET.USER.ZS?source=2&format=json&per_page=30000',
  'metadata': 'https://api.worldbank.org/v2/sources/2/series/IT.NET.USER.ZS/metadata?format=json',
})) {
  const started_at = new Date().toISOString();
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = Buffer.from(await response.arrayBuffer());
    const headers = Buffer.from([...response.headers].map(([k, v]) => `${k}: ${v}\n`).join(''));
    const receipt = { id, url, final_url: response.url, started_at, ended_at: new Date().toISOString(), status: response.status,
      body_sha256: sha256(body), body_byte_length: body.length, headers_sha256: sha256(headers),
      headers_representation: 'fetch response headers serialised as name: value; complete response body after HTTP content decoding', publisher_identity_verified: false };
    await writeFile(resolve(destination, `${id}.body`), body, { flag: 'wx' });
    await writeFile(resolve(destination, `${id}.headers.txt`), headers, { flag: 'wx' });
    await writeFile(resolve(destination, `${id}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify(receipt));
  } catch (error) { throw new Error(`failed ${id}; preserve partial capture and use a new directory`, { cause: error }); }
}
