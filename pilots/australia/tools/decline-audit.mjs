import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const DEFAULT_OCCUPATIONS = new Set(["5311", "5411", "5511", "5512", "5513"]);

function round(value, places = 6) {
  const scale = 10 ** places;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}

function monthNumber(date) {
  const match = /^(\d{4})-(\d{2})-15$/.exec(date);
  if (!match) throw new Error(`Invalid NERO reference date: ${date}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Invalid NERO reference date: ${date}`);
  return year * 12 + month - 1;
}

function emptyMetric() {
  return {
    numerator: 0,
    denominator: 0,
    share: null,
    first_eligible_date: null,
    last_eligible_date: null,
  };
}

function add(metric, date, matched) {
  metric.denominator += 1;
  if (matched) metric.numerator += 1;
  if (metric.first_eligible_date === null || date < metric.first_eligible_date) {
    metric.first_eligible_date = date;
  }
  if (metric.last_eligible_date === null || date > metric.last_eligible_date) {
    metric.last_eligible_date = date;
  }
}

function finish(metric) {
  return {
    ...metric,
    share: metric.denominator === 0 ? null : round(metric.numerator / metric.denominator),
  };
}

function emptyEra() {
  return {
    monthly_change: emptyMetric(),
    three_decline: emptyMetric(),
    twelve_month_decline_10_percent: emptyMetric(),
    three_decline_and_twelve_month_decline_10_percent: emptyMetric(),
  };
}

function finishEra(era) {
  return Object.fromEntries(Object.entries(era).map(([name, metric]) => [name, finish(metric)]));
}

function normaliseRow(row) {
  const occupationCode = String(row.occupation_code);
  const sa4Code = String(row.sa4_code);
  if (row.value === null || row.value === undefined ||
      (typeof row.value === "string" && row.value.trim() === "")) {
    throw new Error(`Invalid NERO value for ${occupationCode}:${sa4Code}:${row.date}`);
  }
  const value = Number(row.value);
  monthNumber(row.date);
  if (!/^\d{4}$/.test(occupationCode) || !/^\d{3}$/.test(sa4Code)) {
    throw new Error("Every audit row needs a four-digit occupation and three-digit SA4 code.");
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid NERO value for ${occupationCode}:${sa4Code}:${row.date}`);
  }
  return { occupationCode, sa4Code, date: row.date, value };
}

export function auditDeclineRuns(rows, {
  negativeControlStart = "2016-09-15",
  negativeControlEnd = "2022-11-15",
} = {}) {
  monthNumber(negativeControlStart);
  monthNumber(negativeControlEnd);
  if (negativeControlStart > negativeControlEnd) {
    throw new Error("negativeControlStart must not follow negativeControlEnd.");
  }

  const series = new Map();
  for (const rawRow of rows) {
    const row = normaliseRow(rawRow);
    const key = `${row.occupationCode}:${row.sa4Code}`;
    if (!series.has(key)) series.set(key, []);
    series.get(key).push(row);
  }

  const whole = emptyEra();
  const before = emptyEra();
  const negative = emptyEra();
  const later = emptyEra();

  for (const [key, observations] of series) {
    observations.sort((left, right) => left.date.localeCompare(right.date));
    for (let index = 1; index < observations.length; index += 1) {
      if (monthNumber(observations[index].date) !== monthNumber(observations[index - 1].date) + 1) {
        throw new Error(`Non-contiguous NERO series: ${key}`);
      }
    }

    for (let index = 0; index < observations.length; index += 1) {
      const current = observations[index];
      const era = current.date < negativeControlStart
        ? before
        : current.date <= negativeControlEnd
          ? negative
          : later;

      if (index >= 1) {
        const negativeMonthlyChange = current.value < observations[index - 1].value;
        add(whole.monthly_change, current.date, negativeMonthlyChange);
        add(era.monthly_change, current.date, negativeMonthlyChange);
      }

      if (index >= 3) {
        const threeDeclines =
          observations[index].value < observations[index - 1].value &&
          observations[index - 1].value < observations[index - 2].value &&
          observations[index - 2].value < observations[index - 3].value;
        add(whole.three_decline, current.date, threeDeclines);
        add(era.three_decline, current.date, threeDeclines);
      }

      if (index >= 12 && observations[index - 12].value !== 0) {
        const annualChange = (current.value - observations[index - 12].value) /
          observations[index - 12].value;
        const annualDecline = annualChange <= -0.1;
        add(whole.twelve_month_decline_10_percent, current.date, annualDecline);
        add(era.twelve_month_decline_10_percent, current.date, annualDecline);

        if (index >= 3) {
          const threeDeclines =
            observations[index].value < observations[index - 1].value &&
            observations[index - 1].value < observations[index - 2].value &&
            observations[index - 2].value < observations[index - 3].value;
          add(
            whole.three_decline_and_twelve_month_decline_10_percent,
            current.date,
            threeDeclines && annualDecline,
          );
          add(
            era.three_decline_and_twelve_month_decline_10_percent,
            current.date,
            threeDeclines && annualDecline,
          );
        }
      }
    }
  }

  return {
    calculation_version: "1.0.0",
    series_count: series.size,
    negative_control_bounds: {
      start_inclusive: negativeControlStart,
      end_inclusive: negativeControlEnd,
      assignment: "Current reference date determines the era after metric eligibility is established.",
    },
    whole_archive: finishEra(whole),
    pre_control_era: finishEra(before),
    negative_control_era: finishEra(negative),
    later_era: finishEra(later),
  };
}

export function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      fields.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  fields.push(current);
  if (quoted) throw new Error("Unterminated quoted CSV field.");
  return fields;
}

export async function auditNeroCsv(path, occupationCodes = DEFAULT_OCCUPATIONS) {
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let header;
  const rows = [];
  for await (const line of lines) {
    if (!header) {
      header = parseCsvLine(line);
      continue;
    }
    const fields = parseCsvLine(line);
    const record = Object.fromEntries(header.map((name, index) => [name, fields[index]]));
    if (!occupationCodes.has(record.anzsco4_code)) continue;
    rows.push({
      occupation_code: record.anzsco4_code,
      sa4_code: record.sa4_code,
      date: record.date,
      value: record.nsc_emp,
    });
  }
  return auditDeclineRuns(rows);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    process.stderr.write("Usage: node pilots/australia/tools/decline-audit.mjs <NERO CSV>\n");
    process.exitCode = 1;
  } else {
    try {
      const result = await auditNeroCsv(csvPath);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
