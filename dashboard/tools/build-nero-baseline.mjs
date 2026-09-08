#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { once } from "node:events";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_OCCUPATIONS = Object.freeze(["5311", "5511", "5512", "5513", "5411"]);
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
  const required = ["archive_url", "release_period", "released_at", "retrieved_at", "checksum"];
  for (const field of required) {
    if (!source?.[field]) throw new Error(`source.${field} is required`);
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(source.checksum)) {
    throw new Error("source.checksum must be a sha256 digest");
  }
  parseReleaseMonth(source.release_period);
  if (!Number.isFinite(Date.parse(source.released_at))) throw new Error("source.released_at is invalid");
  if (!Number.isFinite(Date.parse(source.retrieved_at))) throw new Error("source.retrieved_at is invalid");
  new URL(source.archive_url);
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
          .filter((point) => point.month >= cutoff)
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

async function rowsFromZip(path) {
  const process = spawn("unzip", ["-p", path, "*.csv"], { stdio: ["ignore", "pipe", "pipe"] });
  let errorOutput = "";
  process.stderr.setEncoding("utf8");
  process.stderr.on("data", (chunk) => { errorOutput += chunk; });
  const lines = createInterface({ input: process.stdout, crlfDelay: Infinity });
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
    const [code] = await once(process, "close");
    if (code !== 0) throw new Error(`unzip failed (${code}): ${errorOutput.trim()}`);
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
