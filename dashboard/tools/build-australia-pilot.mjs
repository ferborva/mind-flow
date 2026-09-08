#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const pilot = resolve(root, "pilots", "australia");
const baselinePath = resolve(process.argv[2] || resolve(pilot, "data", "nero-clerical-2026-08.json"));
const outputPath = resolve(process.argv[3] || resolve(pilot, "web", "index.html"));
const templatePath = resolve(pilot, "web", "index.template.html");
const schemaPath = resolve(pilot, "schema", "nero-baseline.schema.json");

function validateSemantics(baseline) {
  const errors = [];
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
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(baseline)) {
    throw new Error(`baseline schema validation failed: ${ajv.errorsText(validate.errors)}`);
  }
  const semanticErrors = validateSemantics(baseline);
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
