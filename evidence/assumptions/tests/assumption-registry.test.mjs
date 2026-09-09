import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessAssumptionRegistry,
  assertAssumptionRegistry,
} from "../lib/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const repository = resolve(root, "..", "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function decodePointerPart(value) {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function applyOperations(source, operations) {
  const target = structuredClone(source);
  for (const operation of operations) {
    const parts = operation.path.split("/").slice(1).map(decodePointerPart);
    const key = parts.pop();
    const parent = parts.reduce((value, part) => value[part], target);
    if (operation.op === "remove") delete parent[key];
    else if (operation.op === "add" || operation.op === "replace") parent[key] = operation.value;
    else throw new Error(`Unsupported hostile operation ${operation.op}`);
  }
  return target;
}

function hasCode(result, code) {
  return result.errors.some((error) => error.code === code);
}

const schema = readJson(join(root, "schema", "assumption-registry.schema.json"));
const validFixture = readJson(join(root, "fixtures", "valid", "all-classes.registry.json"));
const round03Registry = readJson(join(root, "registry", "round-03.assumptions.json"));

test("the closed schema accepts one explicit record of every assumption class", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  assert.equal(validate(validFixture), true, ajv.errorsText(validate.errors));
  assert.deepEqual(
    new Set(validFixture.assumptions.map(({ class: assumptionClass }) => assumptionClass)),
    new Set([
      "bounded_hypothesis",
      "hard_safeguard",
      "legitimate_value_decision",
      "explicit_unknown",
    ]),
  );

  const extraField = structuredClone(validFixture);
  extraField.assumptions[0].schema_passed_so_true = true;
  assert.equal(validate(extraField), false);

  const laterReview = structuredClone(validFixture);
  laterReview.assumptions[0].source_findings = ["R04-COMM-01"];
  assert.equal(validate(laterReview), true, "the registry must not be locked to Round 03 IDs");
});

test("contract conformance and registry consistency never evaluate truth", () => {
  const result = assessAssumptionRegistry(validFixture);
  assert.deepEqual(result, {
    schema_conformant: true,
    registry_consistent: true,
    claim_truth_assessed: false,
    errors: [],
  });
  assert.doesNotThrow(() => assertAssumptionRegistry(validFixture));
  assert.equal(Object.hasOwn(result, "valid"), false);
  assert.equal(Object.hasOwn(result, "true"), false);
});

test("class determines its challenge mechanism and public label", () => {
  const expected = {
    bounded_hypothesis: ["falsifier", "publish_as_hypothesis"],
    hard_safeguard: ["review_mechanism", "publish_as_safeguard"],
    legitimate_value_decision: ["review_mechanism", "publish_as_value_choice"],
    explicit_unknown: ["review_mechanism", "publish_as_unknown"],
  };

  for (const assumption of validFixture.assumptions) {
    assert.deepEqual(
      [assumption.challenge.kind, assumption.public_disposition.state],
      expected[assumption.class],
    );
  }
});

test("affected parties explicitly contain every claimed beneficiary and burden bearer", () => {
  for (const assumption of validFixture.assumptions) {
    const affected = new Set(assumption.parties.affected.map(({ party_id: id }) => id));
    for (const role of ["benefited", "burdened"]) {
      for (const party of assumption.parties[role]) {
        assert.ok(affected.has(party.party_id), `${role}:${party.party_id}`);
      }
    }
  }
});

test("hostile fixtures fail with their declared machine-readable errors", () => {
  const hostileDirectory = join(root, "fixtures", "hostile");
  const attacks = readdirSync(hostileDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => readJson(join(hostileDirectory, name)));

  assert.ok(attacks.length >= 6);
  for (const attack of attacks) {
    const attacked = applyOperations(validFixture, attack.operations);
    const result = assessAssumptionRegistry(attacked);
    assert.equal(result.registry_consistent, false, attack.id);
    for (const code of attack.expected_codes) {
      assert.ok(hasCode(result, code), `${attack.id}:${code}\n${JSON.stringify(result.errors, null, 2)}`);
    }
    assert.equal(result.claim_truth_assessed, false, attack.id);
  }
});

test("the initial registry covers every Round 03 hostile finding without claiming closure", () => {
  assert.doesNotThrow(() => assertAssumptionRegistry(round03Registry));

  const review = readFileSync(
    join(repository, "reviews", "round-03-internal-adversarial-register.md"),
    "utf8",
  );
  const findingIds = new Set(review.match(/`I03-(?:EV|IF|AC|TM)-\d{2}`/g)
    .map((value) => value.slice(1, -1)));
  const coveredIds = new Set(round03Registry.assumptions
    .flatMap(({ source_findings: sourceFindings }) => sourceFindings));

  assert.deepEqual(coveredIds, findingIds);
  assert.equal(round03Registry.truth_assessment, "not_performed_by_contract_validation");
  assert.ok(round03Registry.assumptions.every(({ stewardship }) =>
    !["confirmed", "closed"].includes(stewardship.status)));
});

test("the public README states the trust boundary and gives a runnable command", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /schema[- ]conformant.*does not mean.*true/is);
  assert.match(readme, /claim_truth_assessed.*false/is);
  assert.match(readme, /node --test evidence\/assumptions\/tests\/\*\.test\.mjs/);
  assert.match(readme, /affected.*benefited.*burdened/is);
  assert.match(readme, /falsifier|review mechanism/i);
});
