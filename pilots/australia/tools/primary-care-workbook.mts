import { inflateRawSync } from 'node:zlib';

// Read-only, deliberately limited OOXML extraction for the retained 10A workbook.
// No evaluation, recalculation, external relationships or workbook modification.
function decode(text: string) {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function zipEntries(bytes: Buffer) {
  if (!Buffer.isBuffer(bytes)) throw new Error('ZIP byte snapshot required');
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) !== 0 || bytes.readUInt16LE(end + 6) !== 0) throw new Error('Unsupported ZIP directory');
  const count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12);
  let offset = bytes.readUInt32LE(end + 16);
  if (count === 65535 || offset + size !== end || bytes.readUInt16LE(end + 8) !== count) throw new Error('Invalid ZIP directory bounds');
  const entries = new Map<string, { offset: number; compressed: number; expanded: number; method: number; crc: number }>();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid ZIP directory entry');
    const length = bytes.readUInt16LE(offset + 28), extra = bytes.readUInt16LE(offset + 30), comment = bytes.readUInt16LE(offset + 32);
    const next = offset + 46 + length + extra + comment;
    if (next > end || bytes.readUInt16LE(offset + 8) & 1) throw new Error('Invalid or encrypted ZIP entry');
    const name = bytes.subarray(offset + 46, offset + 46 + length).toString('utf8');
    if (entries.has(name)) throw new Error('Duplicate ZIP entry');
    entries.set(name, { offset: bytes.readUInt32LE(offset + 42), compressed: bytes.readUInt32LE(offset + 20), expanded: bytes.readUInt32LE(offset + 24), method: bytes.readUInt16LE(offset + 10), crc: bytes.readUInt32LE(offset + 16) });
    offset = next;
  }
  if (offset !== end) throw new Error('ZIP directory size mismatch');
  return (name: string) => {
    const e = entries.get(name);
    if (!e || e.offset + 30 > end || bytes.readUInt32LE(e.offset) !== 0x04034b50 || ![0, 8].includes(e.method) || e.expanded > 16 * 1024 * 1024) throw new Error(`Unsupported ZIP member: ${name}`);
    const nameLength = bytes.readUInt16LE(e.offset + 26);
    const start = e.offset + 30 + nameLength + bytes.readUInt16LE(e.offset + 28);
    if (start + e.compressed > end || bytes.subarray(e.offset + 30, e.offset + 30 + nameLength).toString('utf8') !== name || bytes.readUInt16LE(e.offset + 8) !== e.method) throw new Error('ZIP local entry mismatch');
    const compressed = bytes.subarray(start, start + e.compressed);
    const result = e.method === 8 ? inflateRawSync(compressed, { maxOutputLength: 16 * 1024 * 1024 }) : compressed;
    if (result.length !== e.expanded) throw new Error('ZIP expanded size mismatch');
    let crc = 0xffffffff;
    for (const value of result) { crc ^= value; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    if (((crc ^ 0xffffffff) >>> 0) !== e.crc) throw new Error('ZIP member CRC mismatch');
    return new TextDecoder('utf-8', { fatal: true }).decode(result);
  };
}
export function readWorkbookTables(bytes: Buffer, tableNumbers: number[]) {
  const xml = zipEntries(bytes);
  const text = (value: string) => [...value.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => decode(m[1])).join('');
  const shared = [...xml('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => text(m[1]));
  const workbook = xml('xl/workbook.xml');
  const relationships = xml('xl/_rels/workbook.xml.rels');
  return Object.fromEntries(tableNumbers.map(number => {
    const name = `Table 10A.${number}`;
    const sheet = [...workbook.matchAll(/<sheet\s[^>]*\/>/g)].find(m => m[0].includes(`name="${name}"`))?.[0];
    const id = sheet?.match(/r:id="([^"]+)"/)?.[1];
    const relation = [...relationships.matchAll(/<Relationship\s[^>]*\/>/g)].find(m => m[0].includes(`Id="${id}"`))?.[0];
    const target = relation?.match(/Target="([^"]+)"/)?.[1];
    if (!id || !target || !/^worksheets\/sheet\d+\.xml$/.test(target)) throw new Error(`Unsupported workbook table relationship: ${name}`);
    const cells = [...xml(`xl/${target}`).matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].filter(m => m[2] !== undefined).map(m => {
      const address = m[1].match(/\br="([A-Z]+\d+)"/)?.[1];
      const type = m[1].match(/\bt="([^"]+)"/)?.[1];
      const raw = m[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (!address || m[2].includes('<f')) throw new Error(`Unsupported formula or address: ${name} ${address}`);
      const value = type === 's' ? shared[Number(raw)] : type === 'inlineStr' ? text(m[2]) : raw === undefined ? '' : decode(raw);
      if (value === undefined) throw new Error(`Missing shared string: ${name} ${address}`);
      return { address, text: value, kind: type === 's' || type === 'inlineStr' ? 'text' : 'number' };
    }).filter(c => c.text !== '');
    return [`10A.${number}`, cells];
  }));
}
