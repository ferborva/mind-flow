import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  buildNeroBaseline,
  parseCsvLine,
} from "../tools/build-nero-baseline.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

const SOURCE = {
  archive_url: "https://www.jobsandskills.gov.au/sites/default/files/2026-09/2026-08_nero.zip",
  release_period: "2026-08",
  released_at: "2026-09-02",
  retrieved_at: "2026-09-08T00:00:00Z",
  checksum: `sha256:${"a".repeat(64)}`,
};

test("CSV parsing preserves quoted commas and escaped quotes", () => {
  assert.deepEqual(
    parseCsvLine('"1","NSW",117,"Sydney, City","5311","General ""Office"" Clerks",2026-08-15,120'),
    ["1", "NSW", "117", "Sydney, City", "5311", 'General "Office" Clerks', "2026-08-15", "120"],
  );
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
    join(root, "pilots", "australia", "data", "nero-clerical-2026-08.json"),
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
