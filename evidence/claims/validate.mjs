import { createHash } from "node:crypto";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

function hashBytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

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

function evidenceLinks(claim) {
  return [
    ...claim.evidence_refs,
    ...claim.challenge.counterclaim.evidence_refs,
    ...claim.challenge.falsifier.evidence_refs,
  ];
}

function findReplacementCycles(edges) {
  const graph = new Map();
  for (const edge of edges) {
    const targets = graph.get(edge.replaced_claim_id) ?? [];
    targets.push(edge.replacement_claim_id);
    graph.set(edge.replaced_claim_id, targets);
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const target of graph.get(node) ?? []) {
      if (visit(target)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return [...graph.keys()].some(visit);
}

export function validateClaimLedger(ledger, {
  schema,
  policy,
  policySchema,
  policyBytes,
  assessedAt,
}) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(schema);
  const ledgerSchemaValid = validateSchema(ledger);
  const errors = (validateSchema.errors ?? []).map((item) => ({
    ...item,
    code: `schema-${item.keyword}`,
    path: item.instancePath,
    message: item.message ?? "schema validation failed",
  }));
  const validatePolicySchema = ajv.compile(policySchema);
  const policySchemaValid = validatePolicySchema(policy);
  errors.push(...(validatePolicySchema.errors ?? []).map((item) => ({
    ...item,
    code: `policy-schema-${item.keyword}`,
    path: `/policy${item.instancePath}`,
    message: item.message ?? "policy schema validation failed",
  })));
  const schemaValid = ledgerSchemaValid && policySchemaValid;

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

  if (ledger.policy_ref.id !== policy.policy_id || ledger.policy_ref.version !== policy.version) {
    errors.push(error("policy-identity-mismatch", "/policy_ref", "policy identity or version differs"));
  }
  if (ledger.policy_ref.checksum !== hashBytes(policyBytes)) {
    errors.push(error("policy-hash-mismatch", "/policy_ref/checksum", "policy checksum differs from exact policy bytes"));
  }

  errors.push(...duplicateErrors(ledger.sentences, "sentence_id", "sentences"));
  errors.push(...duplicateErrors(ledger.claims, "claim_id", "claims"));
  errors.push(...duplicateErrors(ledger.evidence, "evidence_id", "evidence"));
  errors.push(...duplicateErrors(ledger.authorities, "authority_id", "authorities"));
  errors.push(...duplicateErrors(ledger.reviews, "review_id", "reviews"));
  errors.push(...duplicateErrors(ledger.replacement_lineage, "replacement_id", "replacement_lineage"));

  const sentences = new Map(ledger.sentences.map((item) => [item.sentence_id, item]));
  const claims = new Map(ledger.claims.map((item) => [item.claim_id, item]));
  const evidence = new Set(ledger.evidence.map((item) => item.evidence_id));
  const authorities = new Map(ledger.authorities.map((item) => [item.authority_id, item]));
  const reviews = new Map(ledger.reviews.map((item) => [item.review_id, item]));

  for (const [index, sentence] of ledger.sentences.entries()) {
    if (sentence.statement_hash !== hashBytes(sentence.statement)) {
      errors.push(error("statement-hash-mismatch", `/sentences/${index}/statement_hash`, "sentence hash does not match exact UTF-8 bytes"));
    }
    for (const claimId of sentence.atomic_claim_ids) {
      const claim = claims.get(claimId);
      if (!claim) {
        errors.push(error("unresolved-atomic-claim", `/sentences/${index}/atomic_claim_ids`, `${claimId} does not resolve`));
      } else if (claim.sentence_id !== sentence.sentence_id) {
        errors.push(error("claim-sentence-mismatch", `/claims/${ledger.claims.indexOf(claim)}/sentence_id`, `${claimId} points to another sentence`));
      }
    }
  }

  for (const [index, claim] of ledger.claims.entries()) {
    const sentence = sentences.get(claim.sentence_id);
    if (!sentence) {
      errors.push(error("unresolved-sentence", `/claims/${index}/sentence_id`, `${claim.sentence_id} does not resolve`));
      continue;
    }
    if (!sentence.atomic_claim_ids.includes(claim.claim_id)) {
      errors.push(error("unlisted-atomic-claim", `/claims/${index}/claim_id`, `${claim.claim_id} is not listed by its sentence`));
    }
    if (claim.statement_hash !== hashBytes(claim.statement)) {
      errors.push(error("statement-hash-mismatch", `/claims/${index}/statement_hash`, "claim hash does not match exact UTF-8 bytes"));
    }
    for (const [kind, challenge] of Object.entries(claim.challenge)) {
      if (challenge.statement_hash !== hashBytes(challenge.statement)) {
        errors.push(error("challenge-hash-mismatch", `/claims/${index}/challenge/${kind}/statement_hash`, `${kind} hash does not match exact UTF-8 bytes`));
      }
    }
    const codepoints = Array.from(sentence.statement);
    const { start_codepoint: start, end_codepoint_exclusive: end } = claim.source_span;
    if (end <= start || codepoints.slice(start, end).join("") !== claim.statement) {
      errors.push(error("source-span-mismatch", `/claims/${index}/source_span`, "source span does not select the exact claim statement"));
    }
    if (!policy.closed_expiry_dispositions.includes(claim.publication_disposition)
      && Date.parse(claim.expires_at) <= Date.parse(assessedAt)) {
      errors.push(error("expired-claim-not-closed", `/claims/${index}/expires_at`, "expired claim must fail closed"));
    }
    for (const link of evidenceLinks(claim)) {
      if (!evidence.has(link.evidence_id)) {
        errors.push(error("unresolved-evidence-reference", `/claims/${index}`, `${link.evidence_id} does not resolve`));
      }
    }
    for (const authorityId of claim.publication_authority_refs) {
      const authority = authorities.get(authorityId);
      if (!authority) {
        errors.push(error("unresolved-authority-reference", `/claims/${index}/publication_authority_refs`, `${authorityId} does not resolve`));
      }
    }
    if (claim.publication_disposition === "approved-by-governance-record") {
      for (const authorityId of claim.publication_authority_refs) {
        const authority = authorities.get(authorityId);
        if (!authority) continue;
        if (authority.kind !== "publication") {
          errors.push(error("publication-authority-wrong-kind", `/claims/${index}/publication_authority_refs`, `${authorityId} is not a publication authority record`));
        }
        if (Date.parse(authority.valid_from) > Date.parse(assessedAt)
          || Date.parse(authority.valid_through) <= Date.parse(assessedAt)) {
          errors.push(error("publication-authority-not-current", `/claims/${index}/publication_authority_refs`, `${authorityId} is not current at assessment time`));
        }
      }
    }
    for (const reviewId of claim.review_refs) {
      const review = reviews.get(reviewId);
      if (!review) {
        errors.push(error("unresolved-review-reference", `/claims/${index}/review_refs`, `${reviewId} does not resolve`));
      } else if (review.claim_id !== claim.claim_id) {
        errors.push(error("review-claim-mismatch", `/claims/${index}/review_refs`, `${reviewId} reviews another claim`));
      }
    }
  }

  for (const [index, review] of ledger.reviews.entries()) {
    if (!claims.has(review.claim_id)) {
      errors.push(error("unresolved-reviewed-claim", `/reviews/${index}/claim_id`, `${review.claim_id} does not resolve`));
    }
  }

  for (const [index, edge] of ledger.replacement_lineage.entries()) {
    if (!claims.has(edge.replaced_claim_id) || !claims.has(edge.replacement_claim_id)) {
      errors.push(error("replacement-missing-claim", `/replacement_lineage/${index}`, "replacement endpoint does not resolve"));
    }
    if (edge.replaced_claim_id === edge.replacement_claim_id) {
      errors.push(error("replacement-self-loop", `/replacement_lineage/${index}`, "a claim cannot replace itself"));
    }
    const replacementReview = reviews.get(edge.review_ref);
    if (!replacementReview) {
      errors.push(error("replacement-unresolved-review", `/replacement_lineage/${index}/review_ref`, `${edge.review_ref} does not resolve`));
    } else if (replacementReview.claim_id !== edge.replaced_claim_id
      || replacementReview.disposition !== "superseded") {
      errors.push(error("replacement-review-mismatch", `/replacement_lineage/${index}/review_ref`, "replacement review must supersede the replaced claim"));
    }
    const replacedClaim = claims.get(edge.replaced_claim_id);
    if (replacedClaim && replacedClaim.publication_disposition !== "superseded") {
      errors.push(error("replacement-source-not-superseded", `/replacement_lineage/${index}/replaced_claim_id`, "replaced claim must have superseded publication disposition"));
    }
  }
  if (findReplacementCycles(ledger.replacement_lineage)) {
    errors.push(error("replacement-cycle", "/replacement_lineage", "replacement lineage must be acyclic"));
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
