import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const bytes = readFileSync(new URL("./schema/executable-if-kernel.schema.json", import.meta.url));
const profile = JSON.parse(bytes);
// An in-memory admission profile of the existing family, not new canonical
// schema bytes or a replacement FIXED_EVALUATOR identity.
delete profile.$id;
profile.$defs.conditionDefinition.allOf = [
  ...(profile.$defs.conditionDefinition.allOf || []),
  { if: { type: "object", required: ["condition_subtype"], properties: { condition_subtype: { const: "discretion" } } },
    then: { type: "object", properties: { condition_category: { const: "availability" } }, required: ["condition_category"] } },
];
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(profile);

export function validateCurrentKernelSchemaProfile(kernel) {
  const valid = validate(kernel);
  return { profile: "current-availability-discretion-admission", schema_profile_valid: valid,
    base_schema_sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    base_schema_unchanged: true, replaces_fixed_evaluator: false,
    errors: valid ? [] : structuredClone(validate.errors), authority_effect: "none" };
}
