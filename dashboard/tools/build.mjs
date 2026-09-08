#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
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
  const entityIds = new Set((snapshot.entities || []).map(({ code }) => code));
  const signalIds = new Set((snapshot.signals || []).map(({ id }) => id));
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
  if (update?.next_check?.related_to_inference && (!update.next_check.on || !update.next_check.owner)) {
    errors.push("a next check linked to the inference requires a date and owner");
  }
  return errors;
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
  const serialised = JSON.stringify(snapshot).replaceAll("</", "<\\/");
  writeFileSync(outputPath, template.replace("__SNAPSHOT__", serialised), "utf8");
  process.stdout.write(`Built ${outputPath} from ${snapshotPath}\n`);
} catch (error) {
  process.stderr.write(`Dashboard build failed: ${error.message}\n`);
  process.exitCode = 1;
}
