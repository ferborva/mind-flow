#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const snapshotPath = resolve(process.argv[2] || resolve(dashboard, "snapshots", "2026-09-07.json"));
const outputPath = resolve(process.argv[3] || resolve(dashboard, "web", "index.html"));
const templatePath = resolve(dashboard, "web", "index.template.html");
const schemaPath = resolve(dashboard, "schema", "snapshot.schema.json");

function validateSemantics(snapshot) {
  const errors = [];
  const entities = snapshot.entities || [];
  const signals = snapshot.signals || [];
  const entityIds = new Set(entities.map(({ code }) => code));
  const signalIds = new Set(signals.map(({ id }) => id));
  const rawInputs = snapshot.reproducibility?.raw_inputs || [];
  const rawInputIds = new Set(rawInputs.map(({ id }) => id));
  const rawInputById = new Map(rawInputs.map((rawInput) => [rawInput.id, rawInput]));
  if (entityIds.size !== entities.length) errors.push("entity identifiers must be unique");
  if (signalIds.size !== signals.length) errors.push("signal identifiers must be unique");
  if (rawInputIds.size !== rawInputs.length) errors.push("raw input identifiers must be unique");

  for (const rawInput of rawInputs) {
    if (rawInput.id !== `sha256:${rawInput.sha256}`) {
      errors.push(`raw input ${rawInput.id} identifier must match its sha256`);
    }
  }

  for (const signal of signals) {
    const adapter = signal.source?.adapter;
    const hasPoints = (signal.series || []).some(({ points }) => points.length);
    if (signal.status === "available" && !hasPoints) {
      errors.push(`signal ${signal.id} is available but has no points`);
    }
    if (signal.status !== "available" && (hasPoints || signal.latest)) {
      errors.push(`signal ${signal.id} is ${signal.status} but contains available data`);
    }
    if (hasPoints && !adapter) {
      errors.push(`signal ${signal.id} with points requires an adapter contract`);
    }
    for (const rule of adapter?.epistemic_rules || []) {
      if (rule.from_year !== undefined && rule.through_year !== undefined &&
          rule.from_year > rule.through_year) {
        errors.push(`signal ${signal.id} has an inverted epistemic rule year range`);
      }
    }
    for (const rawInputId of signal.source?.raw_input_ids || []) {
      if (!rawInputIds.has(rawInputId)) {
        errors.push(`signal ${signal.id} raw input ${rawInputId} is not declared`);
      } else if (JSON.stringify(rawInputById.get(rawInputId).adapter) !== JSON.stringify(adapter)) {
        errors.push(`signal ${signal.id} adapter contract differs from raw input ${rawInputId}`);
      }
    }
    for (const [seriesIndex, series] of (signal.series || []).entries()) {
      if (!entityIds.has(series.entity)) {
        errors.push(`signal ${signal.id} series ${seriesIndex} entity ${series.entity} is not declared`);
      }
      for (let pointIndex = 1; pointIndex < series.points.length; pointIndex += 1) {
        if (series.points[pointIndex][0] <= series.points[pointIndex - 1][0]) {
          errors.push(`signal ${signal.id} series ${seriesIndex} point years must be strictly increasing`);
          break;
        }
      }
      for (const [year, , epistemicClass] of series.points) {
        const rules = (adapter?.epistemic_rules || []).filter((rule) =>
          (rule.from_year === undefined || year >= rule.from_year) &&
          (rule.through_year === undefined || year <= rule.through_year)
        );
        if (rules.length !== 1) {
          errors.push(`signal ${signal.id} year ${year} must match exactly one epistemic rule`);
        } else if (rules[0].epistemic_class !== epistemicClass) {
          errors.push(
            `signal ${signal.id} year ${year} class ${epistemicClass} contradicts adapter rule ${rules[0].epistemic_class}`,
          );
        }
      }
    }

    if (signal.latest) {
      if (!entityIds.has(signal.latest.entity)) {
        errors.push(`signal ${signal.id} latest entity ${signal.latest.entity} is not declared`);
      }
      const matchingSeries = (signal.series || []).filter(({ entity }) => entity === signal.latest.entity);
      if (matchingSeries.length !== 1) {
        errors.push(`signal ${signal.id} latest must identify exactly one series`);
      } else {
        const lastPoint = matchingSeries[0].points.at(-1);
        if (!lastPoint || lastPoint[0] !== signal.latest.year || lastPoint[1] !== signal.latest.value ||
            lastPoint[2] !== signal.latest.epistemic_class) {
          errors.push(`signal ${signal.id} latest must match its series last point`);
        }
      }
    }
  }

  const headline = signals.find(({ id }) => id === "engels-divergence");
  if (headline) {
    const byEntity = new Map();
    for (const series of headline.series || []) {
      if (!byEntity.has(series.entity)) byEntity.set(series.entity, []);
      byEntity.get(series.entity).push(series);
    }
    for (const [entity, series] of byEntity) {
      const output = series.filter(({ measure }) => measure === "Output per capita");
      const labour = series.filter(({ measure }) => measure === "Labour income per capita");
      if (output.length !== 1 || labour.length !== 1) {
        errors.push(`headline paired series for ${entity} must contain one output and one labour-income measure`);
        continue;
      }
      const outputYears = output[0].points.map(([year]) => year);
      const labourYears = labour[0].points.map(([year]) => year);
      if (outputYears.length !== labourYears.length ||
          outputYears.some((year, index) => year !== labourYears[index])) {
        errors.push(`headline paired series for ${entity} must have aligned years`);
      }
    }
  }

  const update = snapshot.public_update;
  if (update && !entityIds.has(update.scope.entity)) {
    errors.push(`public_update.scope.entity ${update.scope.entity} is not declared`);
  }
  for (const id of update?.observed?.source_signal_ids || []) {
    if (!signalIds.has(id)) errors.push(`public_update source signal ${id} is not declared`);
  }
  const conditions = snapshot.if_path?.conditions || [];
  const conditionIds = conditions.map(({ id }) => id);
  if (new Set(conditionIds).size !== conditionIds.length) {
    errors.push("if_path condition identifiers must be unique");
  }
  const positions = conditions.map(({ position }) => position);
  if (new Set(positions).size !== positions.length) {
    errors.push("if_path condition positions must be unique");
  }
  for (const condition of conditions) {
    for (const id of condition.source_signal_ids || []) {
      if (!signalIds.has(id)) errors.push(`if_path condition ${condition.id} source signal ${id} is not declared`);
    }
  }
  const updateConditionIds = update?.condition_change?.condition_ids || [];
  if (conditionIds.length && (
    conditionIds.length !== updateConditionIds.length ||
    conditionIds.some((id, index) => id !== updateConditionIds[index])
  )) {
    errors.push("public_update condition identifiers must match the ordered if_path conditions");
  }
  if (snapshot.if_path?.decision?.result === "no_decision" && snapshot.if_path.decision.eligible_actions.length) {
    errors.push("an if_path with no decision cannot contain eligible actions");
  }
  for (const crisis of snapshot.crises || []) {
    for (const id of crisis.leading_signals || []) {
      if (!signalIds.has(id)) errors.push(`crisis ${crisis.id} source signal ${id} is not declared`);
    }
  }
  if (update?.action?.authorization_state === "none" &&
      (update.action.owner || update.action.authority || update.action.help_route || update.action.appeal_route)) {
    errors.push("an unauthorised public update cannot claim an owner, authority, help route or appeal route");
  }
  if (["authorised", "active"].includes(update?.action?.authorization_state) &&
      ["owner", "authority", "help_route", "appeal_route"].some((field) => !update.action[field])) {
    errors.push(
      "an authorised or active public update requires complete owner, authority, help route and appeal route metadata",
    );
  }
  if (update?.next_check?.related_to_inference && (!update.next_check.on || !update.next_check.owner)) {
    errors.push("a next check linked to the inference requires a date and owner");
  }
  return errors;
}

function verifyRawInputs(snapshot) {
  for (const rawInput of snapshot.reproducibility?.raw_inputs || []) {
    const inputPath = resolve(dashboard, rawInput.path);
    const evidenceRoot = `${resolve(dashboard, "evidence", "raw")}/`;
    if (!inputPath.startsWith(evidenceRoot)) {
      throw new Error(`raw input ${rawInput.id} path escapes dashboard/evidence/raw`);
    }
    const bytes = readFileSync(inputPath);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== rawInput.byte_length) {
      throw new Error(`raw input ${rawInput.id} byte length mismatch before transform`);
    }
    if (digest !== rawInput.sha256) {
      throw new Error(`raw input ${rawInput.id} sha256 mismatch before transform`);
    }
  }
}

try {
  const template = readFileSync(templatePath, "utf8");
  const placeholderCount = template.split("__SNAPSHOT__").length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Expected one __SNAPSHOT__ placeholder, found ${placeholderCount}`);
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(snapshot)) {
    throw new Error(`snapshot schema validation failed: ${ajv.errorsText(validate.errors)}`);
  }
  const semanticErrors = validateSemantics(snapshot);
  if (semanticErrors.length) {
    throw new Error(`snapshot semantic validation failed: ${semanticErrors.join("; ")}`);
  }
  verifyRawInputs(snapshot);
  const serialised = JSON.stringify(snapshot).replaceAll("</", "<\\/");
  writeFileSync(outputPath, template.replace("__SNAPSHOT__", serialised), "utf8");
  process.stdout.write(`Built ${outputPath} from ${snapshotPath}\n`);
} catch (error) {
  process.stderr.write(`Dashboard build failed: ${error.message}\n`);
  process.exitCode = 1;
}
