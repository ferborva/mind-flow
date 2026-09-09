import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";

const schema = JSON.parse(readFileSync(
  new URL("./schema/claim-ceiling-registry-v1.schema.json", import.meta.url),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

function error(code, path, message, keyword = "integrity") {
  return { code, path, message, keyword };
}

function duplicateErrors(items, idKey, collection) {
  const seen = new Set();
  const errors = [];
  for (const [index, item] of items.entries()) {
    const id = item[idKey];
    if (seen.has(id)) {
      errors.push(error("duplicate-id", `/${collection}/${index}/${idKey}`, `${id} is duplicated`));
    }
    seen.add(id);
  }
  return errors;
}

function referencedEvidence(claim) {
  return [
    ...claim.evidence_refs.map(({ evidence_id: evidenceId }) => evidenceId),
    ...claim.counterevidence.flatMap(({ evidence_refs: evidenceRefs }) => evidenceRefs),
    ...claim.registered_falsifier.evidence_refs,
  ];
}

export function validateClaimCeilingRegistry(registry) {
  const schemaValid = validateSchema(registry);
  const errors = (validateSchema.errors ?? []).map((item) => ({
    ...item,
    code: `schema-${item.keyword}`,
    path: item.instancePath,
    message: item.message ?? "schema validation failed",
  }));

  if (!schemaValid) {
    return {
      machine_valid: false,
      schema_valid: false,
      integrity_valid: false,
      truth_determined: false,
      publishability_determined: false,
      errors,
    };
  }

  errors.push(...duplicateErrors(registry.claims, "claim_id", "claims"));
  errors.push(...duplicateErrors(registry.evidence, "evidence_id", "evidence"));

  const evidenceIds = new Set(registry.evidence.map(({ evidence_id: evidenceId }) => evidenceId));
  for (const [index, claim] of registry.claims.entries()) {
    if (["source-observation", "published-statistic", "modelled-estimate", "derived-result"].includes(claim.epistemic_class)) {
      const boundaries = [
        ["estimand", claim.estimand.status],
        ["denominator", claim.denominator.status],
        ["scope/population", claim.scope.population.status],
        ["scope/geography", claim.scope.geography.status],
        ["scope/time", claim.scope.time.status],
      ];
      for (const [path, status] of boundaries) {
        if (status !== "defined") {
          errors.push(error(
            "measured-claim-boundary-unknown",
            `/claims/${index}/${path}`,
            "published statistics, observations, modelled estimates and derived results require a defined measurement boundary",
          ));
        }
      }
    }

    if (claim.claim_verdict === "withdraw" && claim.inference_ceiling.level !== "unsupported") {
      errors.push(error(
        "withdrawn-claim-positive-ceiling",
        `/claims/${index}/inference_ceiling/level`,
        "a withdrawn claim cannot retain a positive inference ceiling",
      ));
    }

    if (["supported", "partially-supported"].includes(claim.support_state)
      && !claim.evidence_refs.some(({ relation }) => relation === "supports")) {
      errors.push(error(
        "supported-without-direct-evidence",
        `/claims/${index}/evidence_refs`,
        "a supported or partially-supported claim requires an evidence link whose relation is supports",
      ));
    }

    for (const evidenceId of referencedEvidence(claim)) {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(error(
          "unresolved-evidence-reference",
          `/claims/${index}`,
          `${evidenceId} does not resolve`,
        ));
      }
    }
  }

  const integrityValid = errors.length === 0;
  return {
    machine_valid: schemaValid && integrityValid,
    schema_valid: schemaValid,
    integrity_valid: integrityValid,
    truth_determined: false,
    publishability_determined: false,
    errors,
  };
}
