#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const pilot = resolve(root, "pilots", "australia");
const baselinePath = resolve(process.argv[2] || resolve(pilot, "data", "nero-clerical-2026-08.r2.json"));
const outputPath = resolve(process.argv[3] || resolve(pilot, "web", "index.html"));
const templatePath = resolve(pilot, "web", "index.template.html");
const schemaPath = resolve(pilot, "schema", "nero-baseline.schema.json");
const policyPath = resolve(pilot, "schema", "nero-baseline-policy.json");
const POLICY_SHA256 = "d247039b0ab2952957dad402ae0bb61b16e85271265a6520099a8fbddb13ae4b";
const AUSTRALIA_SOURCE_HOSTS = new Set(["www.jobsandskills.gov.au"]);

function hasAllowedSource(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
      !parsed.port && AUSTRALIA_SOURCE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function monthNumber(date) {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date || "");
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : NaN;
}

function roundedPercent(value) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function expectedChange(observations, months) {
  const latest = observations.at(-1);
  if (!latest || latest.value === null) return null;
  const targetMonth = monthNumber(latest.date) - months;
  const previous = observations.find((point) => monthNumber(point.date) === targetMonth);
  if (!previous || previous.value === null) return null;
  const absolute = latest.value - previous.value;
  return {
    from_date: previous.date,
    from_value: previous.value,
    absolute,
    percent: previous.value === 0 ? null : roundedPercent((absolute / previous.value) * 100),
  };
}

function displayProjection(baseline) {
  return {
    title: baseline.title,
    epistemic_class: baseline.epistemic_class,
    measurement_type: baseline.measurement_type,
    scope: {
      occupation_classification: baseline.scope?.occupation_classification,
      geography_classification: baseline.scope?.geography_classification,
      occupation_codes: baseline.scope?.occupation_codes,
    },
    public_warning: baseline.public_warning,
    interpretation_limit: baseline.interpretation_limit,
    revision_policy: baseline.revision_policy,
  };
}

function validateSemantics(baseline, policy) {
  const errors = [];
  if (baseline.correction) {
    const bytes = readFileSync(resolve(pilot, "data", "nero-clerical-2026-08.json"));
    const predecessor = JSON.parse(bytes);
    const expected = structuredClone(predecessor);
    expected.scope.occupation_classification_verification_status = "unverified_external_review_required";
    const { correction, ...corrected } = baseline;
    if (correction.supersedes_sha256 !== `sha256:${createHash("sha256").update(bytes).digest("hex")}` ||
        !same(corrected, expected)) {
      errors.push("classification correction must bind its unchanged predecessor measurements");
    }
  }
  if (!hasAllowedSource(baseline.source?.archive_url)) {
    errors.push("source host is outside the Australia evidence allowlist");
  }
  if (baseline.publication_status !== policy.publication_status ||
      baseline.source_bytes_status !== policy.source_bytes_status) {
    errors.push("publication and source-byte status must match the pinned policy");
  }
  if (!same(baseline.source, policy.source)) {
    errors.push("source metadata must match the pinned policy");
  }
  if (!same(displayProjection(baseline), policy.display)) {
    errors.push("display metadata must match the pinned policy");
  }
  if (baseline.id !== `nero-clerical-baseline-${baseline.source?.release_period}`) {
    errors.push("baseline id must match source release_period");
  }
  const releasedAt = Date.parse(`${baseline.source?.released_at}T00:00:00Z`);
  const retrievedAt = Date.parse(baseline.source?.retrieved_at);
  if (!Number.isFinite(releasedAt) || !Number.isFinite(retrievedAt) || releasedAt > retrievedAt) {
    errors.push("source released_at must not follow retrieved_at");
  }
  const availability = baseline.source?.release_availability;
  if (availability?.kind === "first-seen-interval") {
    const firstSeen = Date.parse(availability.first_seen_at_utc);
    const notSeen = availability.not_seen_as_of_utc === null
      ? null : Date.parse(availability.not_seen_as_of_utc);
    if (!Number.isFinite(firstSeen) || firstSeen > retrievedAt) {
      errors.push("release availability first_seen_at_utc must not follow retrieved_at");
    }
    if (notSeen !== null && (!Number.isFinite(notSeen) || notSeen >= firstSeen)) {
      errors.push("release availability not_seen_as_of_utc must be earlier than first_seen_at_utc");
    }
    if (releasedAt > firstSeen) {
      errors.push("source released_at must not follow release availability");
    }
  } else if (availability?.kind === "verified-publisher-timestamp") {
    const timestamp = Date.parse(availability.timestamp_utc);
    if (!Number.isFinite(timestamp) || timestamp > retrievedAt ||
        availability.timestamp_utc.slice(0, 10) !== baseline.source.released_at) {
      errors.push("release availability publisher timestamp must align with released_at and retrieval");
    }
  }
  const series = baseline.series || [];
  if (baseline.scope?.series_count !== series.length) {
    errors.push(`scope.series_count ${baseline.scope?.series_count} does not match ${series.length} series`);
  }

  const declaredOccupations = new Set(baseline.scope?.occupation_codes || []);
  const seriesKeys = new Set();
  for (const entry of series) {
    const key = `${entry.occupation_code}|${entry.sa4_code}`;
    if (seriesKeys.has(key)) errors.push(`series keys must be unique: ${key}`);
    seriesKeys.add(key);
    if (!declaredOccupations.has(entry.occupation_code)) {
      errors.push(`series ${key} occupation ${entry.occupation_code} is not declared in scope`);
    }

    const observations = entry.recent_observations || [];
    for (let index = 1; index < observations.length; index += 1) {
      if (observations[index].date <= observations[index - 1].date) {
        errors.push(`series ${key} observation dates must be strictly increasing`);
        break;
      }
    }
    const lastObservation = observations.at(-1);
    if (!lastObservation || entry.latest.date !== lastObservation.date ||
        entry.latest.value !== lastObservation.value || entry.latest.status !== lastObservation.status) {
      errors.push(`series ${key} latest must match its last observation`);
    }
    if (observations.some(({ date }) => date.slice(0, 7) > baseline.source.release_period)) {
      errors.push(`series ${key} observation must not follow source release_period`);
    }
    if (!same(entry.change_12m, expectedChange(observations, 12))) {
      errors.push(`series ${key} change_12m must be recomputed from observations`);
    }
    if (!same(entry.change_60m, expectedChange(observations, 60))) {
      errors.push(`series ${key} change_60m must be recomputed from observations`);
    }
  }
  return errors;
}

try {
  const template = readFileSync(templatePath, "utf8");
  const placeholderCount = template.split("__NERO_BASELINE__").length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Expected one __NERO_BASELINE__ placeholder, found ${placeholderCount}`);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const policyBytes = readFileSync(policyPath);
  const policyDigest = createHash("sha256").update(policyBytes).digest("hex");
  if (policyDigest !== POLICY_SHA256) {
    throw new Error("pinned Australia baseline policy checksum mismatch");
  }
  const policy = JSON.parse(policyBytes.toString("utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(baseline)) {
    throw new Error(`baseline schema validation failed: ${ajv.errorsText(validate.errors)}`);
  }
  const semanticErrors = validateSemantics(baseline, policy);
  if (semanticErrors.length) {
    throw new Error(`baseline semantic validation failed: ${semanticErrors.join("; ")}`);
  }
  const serialised = JSON.stringify(baseline).replaceAll("</", "<\\/");
  writeFileSync(outputPath, template.replace("__NERO_BASELINE__", serialised), "utf8");
  process.stdout.write(`Built ${outputPath} from ${baselinePath}\n`);
} catch (error) {
  process.stderr.write(`Australia pilot build failed: ${error.message}\n`);
  process.exitCode = 1;
}
