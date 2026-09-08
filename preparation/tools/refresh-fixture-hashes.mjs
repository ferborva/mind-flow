import { readFileSync, writeFileSync } from "node:fs";

import { checksumJson } from "../lib/validate.mjs";

const target = new URL("../fixtures/valid/round-03.register.json", import.meta.url);
const register = JSON.parse(readFileSync(target, "utf8"));

const expressions = new Map();
for (const expression of register.if_expressions) {
  expression.checksum = checksumJson(expression.content);
  expressions.set(expression.id, expression);
}

const bundles = new Map();
for (const bundle of register.evidence_bundles) {
  bundle.checksum = checksumJson(bundle.content);
  bundles.set(bundle.id, bundle);
}

const evaluations = new Map();
for (const evaluation of register.if_evaluations) {
  const expression = expressions.get(evaluation.content.expression_ref.id);
  const bundle = bundles.get(evaluation.content.evidence_bundle_ref.id);
  if (!expression || !bundle) throw new Error(`Cannot resolve ${evaluation.id} inputs.`);
  evaluation.content.expression_ref.checksum = expression.checksum;
  evaluation.content.evidence_bundle_ref.checksum = bundle.checksum;
  evaluation.checksum = checksumJson(evaluation.content);
  evaluations.set(evaluation.id, evaluation);
}

for (const action of register.actions) {
  const expression = expressions.get(action.if_binding.expression_ref.id);
  const evaluation = evaluations.get(action.if_binding.evaluation_ref.id);
  const bundle = bundles.get(action.evidence_bundle_ref.id);
  if (!expression || !evaluation || !bundle) throw new Error(`Cannot resolve ${action.action_id} inputs.`);
  action.if_binding.expression_ref.checksum = expression.checksum;
  action.if_binding.evaluation_ref.checksum = evaluation.checksum;
  action.evidence_bundle_ref.checksum = bundle.checksum;
}

writeFileSync(target, `${JSON.stringify(register, null, 2)}\n`, "utf8");
