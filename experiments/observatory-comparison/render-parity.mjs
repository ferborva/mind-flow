import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  EXPOSURE_SECONDS,
  canonicalJson,
  deriveMaterialFacts,
  digest,
  renderArmHtml,
} from "./render-model.mjs";
import { assessExperimentManifest, assessFactPackSemantics } from "./validate.mjs";

const REQUIRED_KINDS = ["conventional-release", "observatory-self-serve"];

function issue(code, path, message) {
  return { code, path, message };
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return isDeepStrictEqual(actual, [...expected].sort());
}

function closedManifestShape(manifest) {
  const failures = [];
  const requireKeys = (value, keys, path) => {
    if (!exactKeys(value, keys)) failures.push(path);
  };
  requireKeys(manifest, [
    "schema_version",
    "manifest_id",
    "classification",
    "source_experiment_manifest_ref",
    "fact_pack_ref",
    "arms",
    "parity_contract",
  ], "$");
  requireKeys(manifest?.source_experiment_manifest_ref, ["path", "sha256"],
    "$.source_experiment_manifest_ref");
  requireKeys(manifest?.fact_pack_ref, ["fact_pack_id", "path", "sha256"],
    "$.fact_pack_ref");
  if (!Array.isArray(manifest?.arms)) {
    failures.push("$.arms");
  } else {
    manifest.arms.forEach((arm, index) => {
      const base = `$.arms[${index}]`;
      requireKeys(arm, [
        "arm_id",
        "instrument_kind",
        "instrument_ref",
        "fact_pack_ref",
        "rendered_output_ref",
        "material_digest",
        "material_ids",
        "exposure_contract",
      ], base);
      requireKeys(arm?.instrument_ref, ["artifact_id", "artifact_type", "path", "sha256"],
        `${base}.instrument_ref`);
      requireKeys(arm?.fact_pack_ref, ["fact_pack_id", "path", "sha256"],
        `${base}.fact_pack_ref`);
      requireKeys(arm?.rendered_output_ref, ["path", "sha256"],
        `${base}.rendered_output_ref`);
      requireKeys(arm?.exposure_contract, ["mode", "seconds", "enforcement_state"],
        `${base}.exposure_contract`);
    });
  }
  requireKeys(manifest?.parity_contract, [
    "material_fact_effect",
    "state_meaning_effect",
    "forecast_effect",
    "authority_effect",
    "comprehension_assessed",
    "recruitment_allowed",
    "template_parity_authorises_recruitment",
  ], "$.parity_contract");
  return failures;
}

function loadBytes(rootDir, relativePath) {
  if (typeof relativePath !== "string" || isAbsolute(relativePath)
    || relativePath.split("/").some((part) => part === "" || part === "..")) {
    throw new Error("path must be repository-relative");
  }
  const root = realpathSync(rootDir);
  const candidate = realpathSync(resolve(root, relativePath));
  const fromRoot = relative(root, candidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`)
    || isAbsolute(fromRoot)) throw new Error("path escapes repository root");
  return readFileSync(candidate);
}

function decodeHtml(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function extractRendered(html) {
  const exposureMatch = html.match(/<html[^>]*data-exposure-seconds="([0-9]+)"/);
  const contractMatch = html.match(/<script type="application\/json" id="render-contract">([\s\S]*?)<\/script>/);
  const itemPattern = /<article data-material-id="([^"]+)"[^>]*>[\s\S]*?<p data-material-value>([\s\S]*?)<\/p>[\s\S]*?<\/article>/g;
  const items = [];
  for (const match of html.matchAll(itemPattern)) {
    items.push({ id: decodeHtml(match[1]), value: decodeHtml(match[2]) });
  }
  let contract = null;
  try {
    contract = contractMatch ? JSON.parse(contractMatch[1]) : null;
  } catch {
    // The caller receives a typed contract error below.
  }
  return {
    exposureSeconds: exposureMatch ? Number(exposureMatch[1]) : null,
    contract,
    items,
  };
}

function mismatchCode(id) {
  if (id.startsWith("state.")) return "STATE_MEANING_MISMATCH";
  if (id.startsWith("forecast.")) return "FORECAST_BOUNDARY_MISMATCH";
  if (id.startsWith("authority.")) return "AUTHORITY_BOUNDARY_MISMATCH";
  return "VISIBLE_MATERIAL_MISMATCH";
}

export function assessRenderedParity(manifest, {
  rootDir = process.cwd(),
  renderedDocuments = new Map(),
  ignoreOutputHashes = false,
} = {}) {
  const errors = [];
  const shapeFailures = closedManifestShape(manifest);
  if (shapeFailures.length) {
    errors.push(issue("RENDER_MANIFEST_SHAPE_INVALID", shapeFailures[0],
      `Template parity manifest has unregistered or missing fields at: ${shapeFailures.join(", ")}`));
  }
  if (manifest?.schema_version !== "1.0.0"
    || manifest?.manifest_id !== "rendered-comparison.round-05.worker-option.synthetic"
    || manifest?.classification !== "synthetic-rendered-research-prototype") {
    errors.push(issue("RENDER_MANIFEST_IDENTITY_INVALID", "$",
      "Template parity identity, schema and research classification are fixed for this prototype."));
  }
  let sourceManifest = null;
  let sourceBundle = null;
  let factPack = null;
  try {
    const bytes = loadBytes(rootDir, manifest?.source_experiment_manifest_ref?.path);
    if (digest(bytes) !== manifest?.source_experiment_manifest_ref?.sha256) {
      errors.push(issue("SOURCE_MANIFEST_HASH_MISMATCH", "$.source_experiment_manifest_ref",
        "The rendered comparison must bind exact source experiment bytes."));
    }
    sourceManifest = JSON.parse(bytes.toString("utf8"));
    const sourceAssessment = assessExperimentManifest(sourceManifest, { rootDir });
    if (!sourceAssessment.manifest_valid) {
      errors.push(issue("SOURCE_EXPERIMENT_INVALID", "$.source_experiment_manifest_ref",
        "The rendered comparison source experiment must remain coherent and fail closed."));
    }
    const sourceBytes = loadBytes(rootDir, sourceManifest.source_transition_bundle.path);
    if (digest(sourceBytes) === sourceManifest.source_transition_bundle.sha256) {
      sourceBundle = JSON.parse(sourceBytes.toString("utf8"));
    }
  } catch (cause) {
    errors.push(issue("SOURCE_MANIFEST_UNRESOLVED", "$.source_experiment_manifest_ref", cause.message));
  }
  try {
    const bytes = loadBytes(rootDir, manifest?.fact_pack_ref?.path);
    if (digest(bytes) !== manifest?.fact_pack_ref?.sha256) {
      errors.push(issue("FACT_PACK_HASH_MISMATCH", "$.fact_pack_ref",
        "Template parity requires exact Round 4 fact-pack bytes."));
    }
    factPack = JSON.parse(bytes.toString("utf8"));
  } catch (cause) {
    errors.push(issue("FACT_PACK_UNRESOLVED", "$.fact_pack_ref", cause.message));
  }

  if (sourceManifest && !isDeepStrictEqual(sourceManifest.fact_pack, manifest?.fact_pack_ref)) {
    errors.push(issue("FACT_PACK_BINDING_MISMATCH", "$.fact_pack_ref",
      "The rendered comparison must use the source experiment's exact Round 4 fact pack."));
  }
  if (factPack && !assessFactPackSemantics(factPack, {
    rootDir,
    sourceBundle,
  }).valid) {
    errors.push(issue("FACT_PACK_SEMANTICS_INVALID", "$.fact_pack_ref",
      "Rendered material requires a valid source-bound fact pack."));
  }

  const expectedFacts = factPack ? deriveMaterialFacts(factPack) : [];
  const expectedById = new Map(expectedFacts.map((fact) => [fact.id, fact]));
  const expectedIds = expectedFacts.map(({ id }) => id);
  const expectedMaterialDigest = digest(canonicalJson(expectedFacts));
  const arms = Array.isArray(manifest?.arms) ? manifest.arms : [];
  const kinds = arms.map(({ instrument_kind: kind }) => kind);
  if (arms.length !== 2 || !REQUIRED_KINDS.every((kind) => kinds.includes(kind))
    || new Set(kinds).size !== 2) {
    errors.push(issue("RENDERED_ARM_SET_INVALID", "$.arms",
      "Parity requires one conventional and one Observatory self-serve arm."));
  }

  let materialFactParity = arms.length === 2 && expectedFacts.length > 0;
  let stateMeaningParity = materialFactParity;
  let forecastBoundaryParity = materialFactParity;
  let authorityBoundaryParity = materialFactParity;
  let exposureTimeParity = materialFactParity;
  const parsedArms = [];

  for (const [index, arm] of arms.entries()) {
    const sourceArm = sourceManifest?.arms?.find(({ arm_id: id }) => id === arm.arm_id);
    if (!sourceArm || sourceArm.instrument_kind !== arm.instrument_kind
      || !isDeepStrictEqual(sourceArm.instrument_ref, arm.instrument_ref)
      || !isDeepStrictEqual(sourceArm.fact_pack_ref, arm.fact_pack_ref)
      || !isDeepStrictEqual(sourceManifest?.fact_pack, arm.fact_pack_ref)
      || !isDeepStrictEqual(manifest?.fact_pack_ref, arm.fact_pack_ref)) {
      errors.push(issue("RENDERED_ARM_BINDING_MISMATCH", `$.arms[${index}]`,
        "A rendered arm must bind the exact source instrument and Round 4 fact pack."));
      materialFactParity = false;
    }
    let html = renderedDocuments.get(arm.arm_id);
    const overridden = typeof html === "string";
    try {
      if (!overridden) html = loadBytes(rootDir, arm.rendered_output_ref.path).toString("utf8");
      if (!overridden && !ignoreOutputHashes
        && digest(Buffer.from(html)) !== arm.rendered_output_ref.sha256) {
        errors.push(issue("RENDERED_OUTPUT_HASH_MISMATCH",
          `$.arms[${index}].rendered_output_ref`, "Rendered bytes do not match their content address."));
        materialFactParity = false;
      }
    } catch (cause) {
      errors.push(issue("RENDERED_OUTPUT_UNRESOLVED",
        `$.arms[${index}].rendered_output_ref`, cause.message));
      materialFactParity = false;
      continue;
    }
    const parsed = extractRendered(html);
    parsedArms.push(parsed);
    if (arm.material_digest !== expectedMaterialDigest
      || !isDeepStrictEqual(arm.material_ids, expectedIds)
      || parsed.items.length !== expectedFacts.length
      || new Set(parsed.items.map(({ id }) => id)).size !== expectedFacts.length) {
      errors.push(issue("VISIBLE_MATERIAL_MISMATCH", `$.arms[${index}]`,
        "Every expected material item must appear visibly and exactly once."));
      materialFactParity = false;
    }
    for (const item of parsed.items) {
      const expected = expectedById.get(item.id);
      if (!expected || item.value !== expected.value) {
        const code = mismatchCode(item.id);
        errors.push(issue(code, `$.arms[${index}].rendered_output_ref`,
          `Visible material ${item.id} differs from the exact fact-pack projection.`));
        materialFactParity = false;
        if (code === "STATE_MEANING_MISMATCH") stateMeaningParity = false;
        if (code === "FORECAST_BOUNDARY_MISMATCH") forecastBoundaryParity = false;
        if (code === "AUTHORITY_BOUNDARY_MISMATCH") authorityBoundaryParity = false;
      }
    }
    const expectedContract = {
      schema_version: "1.0.0",
      instrument_kind: arm.instrument_kind,
      fact_pack_ref: manifest.fact_pack_ref,
      material_digest: expectedMaterialDigest,
      exposure_seconds: EXPOSURE_SECONDS,
      comprehension_assessed: false,
      recruitment_allowed: false,
      authority_effect: "none",
    };
    if (!isDeepStrictEqual(parsed.contract, expectedContract)) {
      errors.push(issue("RENDER_CONTRACT_MISMATCH", `$.arms[${index}]`,
        "Embedded render boundaries must remain exact and fail closed."));
      materialFactParity = false;
    }
    if (parsed.exposureSeconds !== EXPOSURE_SECONDS
      || arm.exposure_contract?.mode !== "fixed-window"
      || arm.exposure_contract?.seconds !== EXPOSURE_SECONDS
      || arm.exposure_contract?.enforcement_state
        !== "prototype-not-activated-for-participants") {
      errors.push(issue("EXPOSURE_TIME_MISMATCH", `$.arms[${index}]`,
        "Both rendered arms require the same declared exposure time and inactive participant boundary."));
      exposureTimeParity = false;
    }
    const expectedHtml = renderArmHtml({
      kind: arm.instrument_kind,
      factPackRef: manifest.fact_pack_ref,
      materialFacts: expectedFacts,
      exposureSeconds: EXPOSURE_SECONDS,
    });
    if (html !== expectedHtml) {
      errors.push(issue("RENDERED_TEMPLATE_MISMATCH", `$.arms[${index}]`,
        "Rendered output contains content outside its deterministic approved template."));
      materialFactParity = false;
    }
  }

  if (parsedArms.length === 2) {
    const [left, right] = parsedArms;
    const leftFacts = new Map(left.items.map(({ id, value }) => [id, value]));
    const rightFacts = new Map(right.items.map(({ id, value }) => [id, value]));
    if (!isDeepStrictEqual(leftFacts, rightFacts)) materialFactParity = false;
    stateMeaningParity &&= expectedFacts
      .filter(({ category }) => category === "states")
      .every(({ id, value }) => leftFacts.get(id) === value && rightFacts.get(id) === value);
    forecastBoundaryParity &&= expectedFacts
      .filter(({ category }) => category === "forecast")
      .every(({ id, value }) => leftFacts.get(id) === value && rightFacts.get(id) === value);
    authorityBoundaryParity &&= expectedFacts
      .filter(({ category }) => category === "authority")
      .every(({ id, value }) => leftFacts.get(id) === value && rightFacts.get(id) === value);
    exposureTimeParity &&= left.exposureSeconds === right.exposureSeconds;
  }

  const boundary = manifest?.parity_contract || {};
  if (boundary.material_fact_effect !== "exact-visible-projection-only"
    || boundary.state_meaning_effect !== "exact-source-branch-projection-only"
    || boundary.forecast_effect !== "context-only-not-current-if-state"
    || boundary.authority_effect !== "none"
    || boundary.comprehension_assessed !== false
    || boundary.recruitment_allowed !== false
    || boundary.template_parity_authorises_recruitment !== false) {
    errors.push(issue("PARITY_BOUNDARY_INVALID", "$.parity_contract",
      "Template parity cannot establish browser visibility, comprehension, authority or recruitment approval."));
  }

  return {
    schema_version: "1.0.0",
    manifest_id: manifest?.manifest_id || null,
    valid: errors.length === 0,
    template_parity_assessed: parsedArms.length === 2,
    material_fact_parity: materialFactParity,
    state_meaning_parity: stateMeaningParity,
    forecast_boundary_parity: forecastBoundaryParity,
    authority_boundary_parity: authorityBoundaryParity,
    exposure_time_parity: exposureTimeParity,
    comprehension_assessed: false,
    recruitment_allowed: false,
    authority_effect: "none",
    errors,
  };
}
