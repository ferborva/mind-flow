#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  createWriteStream,
  openSync,
  readSync,
  statSync,
} from "node:fs";
import { once } from "node:events";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Readable, Transform } from "node:stream";
import { pathToFileURL } from "node:url";
import { createInflateRaw } from "node:zlib";

const DEFAULT_OCCUPATIONS = Object.freeze(["5311", "5511", "5512", "5513", "5411"]);
const AUSTRALIA_SOURCE_HOSTS = new Set(["www.jobsandskills.gov.au"]);
const EXPECTED_COLUMNS = Object.freeze([
  "",
  "state_name",
  "sa4_code",
  "sa4_name",
  "anzsco4_code",
  "anzsco4_name",
  "date",
  "nsc_emp",
]);
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_MAX_END_SIZE = 65_557;

const CRC32_TABLE = Object.freeze(Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return value >>> 0;
}));

function compareText(left, right) {
  return String(left).localeCompare(String(right), "en", { numeric: true });
}

export function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === ',') {
      fields.push(field);
      field = "";
    } else if (character === '"') {
      if (field.length) throw new Error("invalid quote inside an unquoted CSV field");
      quoted = true;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("unterminated quoted CSV field");
  fields.push(field.replace(/\r$/, ""));
  return fields;
}

function readRange(path, start, length) {
  if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length) || length < 0) {
    throw new Error("ZIP range must use non-negative safe integers");
  }
  const buffer = Buffer.alloc(length);
  const descriptor = openSync(path, "r");
  try {
    const bytesRead = readSync(descriptor, buffer, 0, length, start);
    if (bytesRead !== length) throw new Error("ZIP ended before the declared range");
  } finally {
    closeSync(descriptor);
  }
  return buffer;
}

function zipEntries(path) {
  const size = statSync(path).size;
  const tailSize = Math.min(size, ZIP_MAX_END_SIZE);
  const tailStart = size - tailSize;
  const tail = readRange(path, tailStart, tailSize);
  let endOffset = -1;
  for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
    if (tail.readUInt32LE(offset) === ZIP_END_SIGNATURE &&
        offset + 22 + tail.readUInt16LE(offset + 20) === tail.length) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("ZIP end-of-central-directory record is missing");

  const diskNumber = tail.readUInt16LE(endOffset + 4);
  const centralDisk = tail.readUInt16LE(endOffset + 6);
  const diskEntries = tail.readUInt16LE(endOffset + 8);
  const totalEntries = tail.readUInt16LE(endOffset + 10);
  const centralSize = tail.readUInt32LE(endOffset + 12);
  const centralOffset = tail.readUInt32LE(endOffset + 16);
  if (diskNumber !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    throw new Error("multi-disk ZIP archives are unsupported");
  }
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are unsupported");
  }
  if (centralOffset + centralSize > tailStart + endOffset) {
    throw new Error("ZIP central directory exceeds the archive boundary");
  }

  const central = readRange(path, centralOffset, centralSize);
  const entries = [];
  const paths = new Set();
  let cursor = 0;
  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > central.length || central.readUInt32LE(cursor) !== ZIP_CENTRAL_SIGNATURE) {
      throw new Error("ZIP central directory entry is malformed");
    }
    const flags = central.readUInt16LE(cursor + 8);
    const compression_method = central.readUInt16LE(cursor + 10);
    const crc32 = central.readUInt32LE(cursor + 16);
    const compressed_byte_length = central.readUInt32LE(cursor + 20);
    const uncompressed_byte_length = central.readUInt32LE(cursor + 24);
    const nameLength = central.readUInt16LE(cursor + 28);
    const extraLength = central.readUInt16LE(cursor + 30);
    const commentLength = central.readUInt16LE(cursor + 32);
    const local_header_offset = central.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > central.length) throw new Error("ZIP central directory fields exceed its boundary");
    if ((flags & 0x1) !== 0) throw new Error("encrypted ZIP members are unsupported");
    if (![0, 8].includes(compression_method)) {
      throw new Error(`unsupported ZIP compression method ${compression_method}`);
    }
    const memberPath = central.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (!memberPath || memberPath.includes("\u0000") || paths.has(memberPath)) {
      throw new Error("ZIP member paths must be non-empty and unique");
    }
    paths.add(memberPath);

    const local = readRange(path, local_header_offset, 30);
    if (local.readUInt32LE(0) !== ZIP_LOCAL_SIGNATURE ||
        local.readUInt16LE(8) !== compression_method) {
      throw new Error(`ZIP local header mismatch for ${memberPath}`);
    }
    const localNameLength = local.readUInt16LE(26);
    const localExtraLength = local.readUInt16LE(28);
    const localName = readRange(path, local_header_offset + 30, localNameLength).toString("utf8");
    if (localName !== memberPath) throw new Error(`ZIP local name mismatch for ${memberPath}`);
    const data_offset = local_header_offset + 30 + localNameLength + localExtraLength;
    if (data_offset + compressed_byte_length > centralOffset) {
      throw new Error(`ZIP member data exceeds the archive boundary: ${memberPath}`);
    }
    entries.push({
      path: memberPath,
      compression_method,
      crc32,
      compressed_byte_length,
      uncompressed_byte_length,
      data_offset,
    });
    cursor = next;
  }
  if (cursor !== central.length) throw new Error("ZIP central directory has trailing bytes");
  return entries;
}

function verifiedEntryStream(path, entry) {
  let total = 0;
  let crc = 0xffffffff;
  const source = entry.compressed_byte_length === 0
    ? Readable.from([])
    : createReadStream(path, {
      start: entry.data_offset,
      end: entry.data_offset + entry.compressed_byte_length - 1,
    });
  const content = entry.compression_method === 8 ? source.pipe(createInflateRaw()) : source;
  return content.pipe(new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      for (const byte of chunk) crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
      callback(null, chunk);
    },
    flush(callback) {
      const checksum = (crc ^ 0xffffffff) >>> 0;
      if (total !== entry.uncompressed_byte_length) {
        callback(new Error(`ZIP member size mismatch for ${entry.path}`));
      } else if (checksum !== entry.crc32) {
        callback(new Error(`ZIP member CRC mismatch for ${entry.path}`));
      } else {
        callback();
      }
    },
  }));
}

export async function inspectZipArchive(path, { verifyContent = false } = {}) {
  const entries = zipEntries(path);
  if (verifyContent) {
    for (const entry of entries) {
      for await (const _chunk of verifiedEntryStream(path, entry)) {
        // Drain each member to recompute its declared length and CRC.
      }
    }
  }
  return entries;
}

function parseMonth(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`invalid NERO date ${date}`);
  const month = Number(match[1]) * 12 + Number(match[2]) - 1;
  if (Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new Error(`invalid NERO date ${date}`);
  }
  return month;
}

function parseReleaseMonth(releasePeriod) {
  const match = /^(\d{4})-(\d{2})$/.exec(releasePeriod || "");
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new Error("source release_period must use YYYY-MM");
  }
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function validateSource(source) {
  const required = [
    "archive_url", "release_period", "released_at", "retrieved_at", "checksum", "release_availability",
  ];
  for (const field of required) {
    if (!source?.[field]) throw new Error(`source.${field} is required`);
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(source.checksum)) {
    throw new Error("source.checksum must be a sha256 digest");
  }
  parseReleaseMonth(source.release_period);
  const releasedAt = Date.parse(`${source.released_at}T00:00:00Z`);
  const retrievedAt = Date.parse(source.retrieved_at);
  if (!Number.isFinite(releasedAt)) throw new Error("source.released_at is invalid");
  if (!Number.isFinite(retrievedAt)) throw new Error("source.retrieved_at is invalid");
  if (releasedAt > retrievedAt) throw new Error("source.released_at must not follow source.retrieved_at");
  const availability = source.release_availability;
  if (availability.kind !== "first-seen-interval") {
    throw new Error("source.release_availability must use a first-seen interval without claiming authentication");
  }
  const firstSeen = Date.parse(availability.first_seen_at_utc);
  const notSeen = availability.not_seen_as_of_utc === null
    ? null : Date.parse(availability.not_seen_as_of_utc);
  if (!Number.isFinite(firstSeen) || firstSeen > retrievedAt) {
    throw new Error("source.release_availability first_seen_at_utc must not follow retrieval");
  }
  if (notSeen !== null && (!Number.isFinite(notSeen) || notSeen >= firstSeen)) {
    throw new Error("source.release_availability absence check must precede first seen");
  }
  const archive = new URL(source.archive_url);
  if (archive.protocol !== "https:" || archive.username || archive.password || archive.port ||
      !AUSTRALIA_SOURCE_HOSTS.has(archive.hostname)) {
    throw new Error(`source host is outside the allowlist: ${archive.hostname}`);
  }
}

function normaliseRow(fields, releaseMonth) {
  if (!Array.isArray(fields) || fields.length !== EXPECTED_COLUMNS.length) {
    throw new Error(`NERO row requires ${EXPECTED_COLUMNS.length} columns`);
  }
  const [, stateName, sa4Code, sa4Name, occupationCode, occupationName, date, rawValue] = fields;
  if (![stateName, sa4Code, sa4Name, occupationCode, occupationName, date].every(Boolean)) {
    throw new Error("NERO row is missing identifying fields");
  }
  const month = parseMonth(date);
  if (month > releaseMonth) throw new Error(`NERO date ${date} is later than release period`);

  let value = null;
  if (rawValue !== "") {
    value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`invalid employment value ${rawValue}`);
    }
  }
  return {
    state_name: stateName,
    sa4_code: sa4Code,
    sa4_name: sa4Name,
    occupation_code: occupationCode,
    occupation_name: occupationName,
    date,
    month,
    value,
    status: value === null ? "suppressed-or-unavailable" : "reported-modelled-estimate",
  };
}

function shiftedMonth(date, offset) {
  const [year, month] = date.split("-").map(Number);
  return year * 12 + month - 1 - offset;
}

function roundedPercent(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function changeAt(series, months) {
  const latest = series.at(-1);
  if (!latest || latest.value === null) return null;
  const targetMonth = shiftedMonth(latest.date, months);
  const previous = series.find((point) => point.month === targetMonth);
  if (!previous || previous.value === null) return null;
  const absolute = latest.value - previous.value;
  return {
    from_date: previous.date,
    from_value: previous.value,
    absolute,
    percent: previous.value === 0 ? null : roundedPercent((absolute / previous.value) * 100),
  };
}

function publicPoint(point) {
  return { date: point.date, value: point.value, status: point.status };
}

export function buildNeroBaseline(rows, options = {}) {
  const occupationCodes = [...new Set((options.occupationCodes || DEFAULT_OCCUPATIONS).map(String))];
  if (!occupationCodes.length) throw new Error("at least one occupation code is required");
  validateSource(options.source);
  const releaseMonth = parseReleaseMonth(options.source.release_period);
  const selected = new Set(occupationCodes);
  const recentMonths = options.recentMonths ?? 25;
  if (!Number.isInteger(recentMonths) || recentMonths < 1) {
    throw new Error("recentMonths must be a positive integer");
  }

  const groups = new Map();
  const cells = new Set();
  for (const fields of rows) {
    if (!selected.has(String(fields?.[4]))) continue;
    const row = normaliseRow(fields, releaseMonth);
    const cell = `${row.occupation_code}|${row.sa4_code}|${row.date}`;
    if (cells.has(cell)) throw new Error(`duplicate NERO cell ${cell}`);
    cells.add(cell);
    const key = `${row.occupation_code}|${row.sa4_code}`;
    if (!groups.has(key)) {
      groups.set(key, {
        occupation_code: row.occupation_code,
        occupation_name: row.occupation_name,
        state_name: row.state_name,
        sa4_code: row.sa4_code,
        sa4_name: row.sa4_name,
        observations: [],
      });
    }
    const group = groups.get(key);
    if (
      group.occupation_name !== row.occupation_name ||
      group.state_name !== row.state_name ||
      group.sa4_name !== row.sa4_name
    ) {
      throw new Error(`classification changed inside NERO series ${key}`);
    }
    group.observations.push(row);
  }

  const series = [...groups.values()]
    .map((group) => {
      group.observations.sort((left, right) => left.month - right.month);
      const latest = group.observations.at(-1);
      const cutoff = latest ? latest.month - recentMonths + 1 : releaseMonth;
      const comparisonMonths = new Set(latest ? [latest.month - 12, latest.month - 60] : []);
      return {
        occupation_code: group.occupation_code,
        occupation_name: group.occupation_name,
        state_name: group.state_name,
        sa4_code: group.sa4_code,
        sa4_name: group.sa4_name,
        latest: latest ? publicPoint(latest) : null,
        change_12m: changeAt(group.observations, 12),
        change_60m: changeAt(group.observations, 60),
        recent_observations: group.observations
          .filter((point) => point.month >= cutoff || comparisonMonths.has(point.month))
          .map(publicPoint),
      };
    })
    .sort((left, right) => (
      compareText(left.occupation_code, right.occupation_code) ||
      compareText(left.sa4_code, right.sa4_code)
    ));

  if (!series.length) throw new Error("no selected NERO occupation rows were found");

  return {
    schema_version: "1.0.0",
    id: `nero-clerical-baseline-${options.source.release_period}`,
    title: "Australian clerical employment by occupation and SA4",
    publication_status: "research_draft_unverified",
    source_bytes_status: "not_retained_unverified",
    epistemic_class: "modelled-estimate",
    measurement_type: "modelled-nowcast",
    source: {
      publisher: "Jobs and Skills Australia",
      title: "Nowcast of Employment by Region and Occupation",
      licence: "CC BY 4.0",
      ...options.source,
    },
    scope: {
      occupation_classification: "ANZSCO 2013 version 1.3, 4-digit",
      geography_classification: "ASGS 2021 SA4, place of residence",
      occupation_codes: occupationCodes,
      series_count: series.length,
    },
    public_warning: "NERO occupation and region estimates must not be summed or combined. Direction and scale within each separate series are more informative than precise values.",
    interpretation_limit: "This descriptive modelled nowcast does not measure AI adoption, work redesign, individual worker flows, household access, agency or causation.",
    revision_policy: "Each release is a new vintage. Do not overwrite prior vintages or silently splice classification versions.",
    series,
  };
}

async function sha256(path) {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  stream.on("data", (chunk) => hash.update(chunk));
  await once(stream, "end");
  return `sha256:${hash.digest("hex")}`;
}

export async function rowsFromZip(path) {
  const entries = await inspectZipArchive(path);
  const csvEntries = entries.filter((entry) => !entry.path.endsWith("/") && /\.csv$/i.test(entry.path));
  if (csvEntries.length !== 1) throw new Error("NERO ZIP must contain exactly one CSV member");
  const lines = createInterface({ input: verifiedEntryStream(path, csvEntries[0]), crlfDelay: Infinity });
  let headerSeen = false;

  async function* generate() {
    for await (const line of lines) {
      const fields = parseCsvLine(line);
      if (!headerSeen) {
        headerSeen = true;
        if (JSON.stringify(fields) !== JSON.stringify(EXPECTED_COLUMNS)) {
          throw new Error(`unexpected NERO columns: ${fields.join(", ")}`);
        }
        continue;
      }
      yield fields;
    }
    if (!headerSeen) throw new Error("NERO CSV is empty");
  }

  return generate();
}

async function collectSelected(rows, occupationCodes) {
  const selected = new Set(occupationCodes);
  const output = [];
  for await (const row of rows) {
    if (selected.has(String(row[4]))) output.push(row);
  }
  return output;
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("arguments use --source PATH --output PATH --release-period YYYY-MM --released-at YYYY-MM-DD --retrieved-at ISO");
    }
    values[name.slice(2)] = value;
  }
  for (const required of ["source", "output", "release-period", "released-at", "retrieved-at", "archive-url"]) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }
  return values;
}

async function main() {
  if (process.argv[2] === "--inspect-zip") {
    if (process.argv.length !== 4) throw new Error("--inspect-zip requires exactly one archive path");
    const entries = await inspectZipArchive(resolve(process.argv[3]), { verifyContent: true });
    process.stdout.write(`${JSON.stringify(entries.map(({ path, uncompressed_byte_length }) => ({
      path,
      uncompressed_byte_length,
    })))}\n`);
    return;
  }
  const args = parseArguments(process.argv.slice(2));
  const sourcePath = resolve(args.source);
  const occupationCodes = args.occupations
    ? args.occupations.split(",").map((value) => value.trim()).filter(Boolean)
    : [...DEFAULT_OCCUPATIONS];
  const rows = await collectSelected(await rowsFromZip(sourcePath), occupationCodes);
  const result = buildNeroBaseline(rows, {
    occupationCodes,
    recentMonths: args["recent-months"] ? Number(args["recent-months"]) : 25,
    source: {
      archive_url: args["archive-url"],
      archive_name: basename(sourcePath),
      release_period: args["release-period"],
      released_at: args["released-at"],
      retrieved_at: args["retrieved-at"],
      checksum: await sha256(sourcePath),
      release_availability: {
        kind: "first-seen-interval",
        not_seen_as_of_utc: null,
        first_seen_at_utc: args["retrieved-at"],
        evidence: "The archive was first recorded during retrieval. No independently evidenced earlier absence check or publisher receipt is available.",
      },
    },
  });

  const output = createWriteStream(resolve(args.output), { encoding: "utf8" });
  output.end(`${JSON.stringify(result, null, 2)}\n`);
  await once(output, "finish");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
