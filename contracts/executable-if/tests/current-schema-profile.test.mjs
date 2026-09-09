import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { validateExecutableIfKernel } from "../validate.mjs";
import { validateCurrentKernelSchemaProfile } from "../current-schema-profile.mjs";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/kernel.synthetic.json", import.meta.url)));
const schema = JSON.parse(readFileSync(new URL("../schema/executable-if-kernel.schema.json", import.meta.url)));
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const originalSchema = ajv.compile(schema);

test("original schema-only gap is explicit, current profile and old semantics reject price discretion", () => {
  const changed = structuredClone(fixture);
  const definition = changed.events.find((event) => event.introduced_definitions.length).introduced_definitions[0];
  definition.condition_category = "price";
  definition.condition_subtype = "discretion";
  assert.equal(originalSchema(changed), true);
  assert.equal(validateCurrentKernelSchemaProfile(changed).schema_profile_valid, false);
  assert.ok(validateExecutableIfKernel(changed).errors.some((error) => error.code === "CONDITION_CATEGORY_INVALID"));
});

test("current profile accepts the unchanged fixture and availability discretion without rewriting the schema", () => {
  assert.equal(validateCurrentKernelSchemaProfile(fixture).schema_profile_valid, true);
  const changed = structuredClone(fixture);
  const definition = changed.events.find((event) => event.introduced_definitions.length).introduced_definitions[0];
  definition.condition_category = "availability";
  definition.condition_subtype = "discretion";
  const result = validateCurrentKernelSchemaProfile(changed);
  assert.equal(result.schema_profile_valid, true);
  assert.equal(result.base_schema_unchanged, true);
});
