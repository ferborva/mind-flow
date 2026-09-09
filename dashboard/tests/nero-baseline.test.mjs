import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  buildNeroBaseline,
  inspectZipArchive,
  parseCsvLine,
  rowsFromZip,
} from "../tools/build-nero-baseline.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

const SOURCE = {
  archive_url: "https://www.jobsandskills.gov.au/sites/default/files/2026-09/2026-08_nero.zip",
  release_period: "2026-08",
  released_at: "2026-09-02",
  retrieved_at: "2026-09-08T00:00:00Z",
  checksum: `sha256:${"a".repeat(64)}`,
  release_availability: {
    kind: "first-seen-interval",
    not_seen_as_of_utc: null,
    first_seen_at_utc: "2026-09-08T00:00:00Z",
    evidence: "First recorded during retrieval; no independently evidenced earlier absence check.",
  },
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function singleMemberZip(name, content) {
  const nameBytes = Buffer.from(name);
  const source = Buffer.from(content);
  const compressed = deflateRawSync(source);
  const checksum = crc32(source);
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(checksum, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(source.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  nameBytes.copy(local, 30);

  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(source.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  nameBytes.copy(central, 46);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length + compressed.length, 16);
  return Buffer.concat([local, compressed, central, end]);
}

test("CSV parsing preserves quoted commas and escaped quotes", () => {
  assert.deepEqual(
    parseCsvLine('"1","NSW",117,"Sydney, City","5311","General ""Office"" Clerks",2026-08-15,120'),
    ["1", "NSW", "117", "Sydney, City", "5311", 'General "Office" Clerks', "2026-08-15", "120"],
  );
});

test("ZIP handling is in-process, validates member bytes and yields the CSV", async () => {
  const temporary = mkdtempSync(resolve(tmpdir(), "mind-flow-zip-test-"));
  const archivePath = resolve(temporary, "fixture.zip");
  const csv = ',state_name,sa4_code,sa4_name,anzsco4_code,anzsco4_name,date,nsc_emp\n"1",NSW,117,Sydney,5311,Clerks,2026-08-15,100\n';
  writeFileSync(archivePath, singleMemberZip("fixture/data.csv", csv));

  try {
    const members = await inspectZipArchive(archivePath, { verifyContent: true });
    assert.deepEqual(members.map(({ path, uncompressed_byte_length }) => ({
      path,
      uncompressed_byte_length,
    })), [{ path: "fixture/data.csv", uncompressed_byte_length: Buffer.byteLength(csv) }]);

    const rows = [];
    for await (const row of await rowsFromZip(archivePath)) rows.push(row);
    assert.deepEqual(rows, [["1", "NSW", "117", "Sydney", "5311", "Clerks", "2026-08-15", "100"]]);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }

  const builderSource = readFileSync(resolve(root, "dashboard/tools/build-nero-baseline.mjs"), "utf8");
  assert.doesNotMatch(builderSource, /node:child_process|\bspawn\s*\(|\bunzip\b/);
});

test("baseline keeps occupation-region series separate and exposes model limits", () => {
  const rows = [
    ["1", "NSW", "117", "Sydney - City and Inner South", "5311", "General Clerks", "2025-08-15", "100"],
    ["2", "NSW", "117", "Sydney - City and Inner South", "5311", "General Clerks", "2026-07-15", "108"],
    ["3", "NSW", "117", "Sydney - City and Inner South", "5311", "General Clerks", "2026-08-15", "110"],
    ["4", "NSW", "117", "Sydney - City and Inner South", "5511", "Accounting Clerks", "2026-08-15", "40"],
    ["5", "VIC", "201", "Ballarat", "5311", "General Clerks", "2026-08-15", ""],
    ["6", "NSW", "117", "Sydney - City and Inner South", "1111", "Chief Executives", "2026-08-15", "80"],
  ];

  const result = buildNeroBaseline(rows, {
    occupationCodes: ["5311", "5511"],
    source: SOURCE,
    recentMonths: 13,
  });

  assert.equal(result.epistemic_class, "modelled-estimate");
  assert.equal(result.measurement_type, "modelled-nowcast");
  assert.equal(result.publication_status, "research_draft_unverified");
  assert.equal(result.source_bytes_status, "not_retained_unverified");
  assert.equal(result.series.length, 3);
  assert.deepEqual(
    result.series.map(({ occupation_code, sa4_code }) => [occupation_code, sa4_code]),
    [["5311", "117"], ["5311", "201"], ["5511", "117"]],
  );
  assert.equal(result.series[0].latest.value, 110);
  assert.equal(result.series[0].change_12m.absolute, 10);
  assert.equal(result.series[0].change_12m.percent, 10);
  assert.deepEqual(result.series[1].latest, {
    date: "2026-08-15",
    value: null,
    status: "suppressed-or-unavailable",
  });
  assert.match(result.public_warning, /must not be summed or combined/i);
  assert.match(result.interpretation_limit, /does not measure AI adoption/i);
});

test("baseline rejects duplicate cells, invalid values and mismatched release periods", () => {
  const valid = [
    ["1", "NSW", "117", "Sydney", "5311", "General Clerks", "2026-08-15", "100"],
  ];

  assert.throws(
    () => buildNeroBaseline([...valid, ...valid], { occupationCodes: ["5311"], source: SOURCE }),
    /duplicate NERO cell/i,
  );

  const invalidValue = structuredClone(valid);
  invalidValue[0][7] = "one hundred";
  assert.throws(
    () => buildNeroBaseline(invalidValue, { occupationCodes: ["5311"], source: SOURCE }),
    /invalid employment value/i,
  );

  const wrongPeriod = structuredClone(valid);
  wrongPeriod[0][6] = "2026-09-15";
  assert.throws(
    () => buildNeroBaseline(wrongPeriod, { occupationCodes: ["5311"], source: SOURCE }),
    /later than release period/i,
  );
});

test("the frozen Australia baseline validates and preserves every scoped series", () => {
  const schema = JSON.parse(readFileSync(
    join(root, "pilots", "australia", "schema", "nero-baseline.schema.json"),
    "utf8",
  ));
  const baseline = JSON.parse(readFileSync(
    join(root, "pilots", "australia", "data", "nero-clerical-2026-08.r2.json"),
    "utf8",
  ));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  assert.equal(validate(baseline), true, ajv.errorsText(validate.errors));
  assert.equal(baseline.series.length, 5 * 88);
  assert.equal(new Set(baseline.series.map(
    (series) => `${series.occupation_code}|${series.sa4_code}`,
  )).size, baseline.series.length);
  assert.equal(baseline.series.every((series) => series.latest.date === "2026-08-15"), true);
});
