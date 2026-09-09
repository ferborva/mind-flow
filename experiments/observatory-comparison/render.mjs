import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPOSURE_SECONDS,
  canonicalJson,
  deriveMaterialFacts,
  digest,
  renderArmHtml,
} from "./render-model.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../..");
const renderedRoot = resolve(here, "rendered");
const checkOnly = process.argv.includes("--check");
const sourceManifestPath = "experiments/observatory-comparison/fixtures/manifest.synthetic.json";

function load(relativePath) {
  const bytes = readFileSync(resolve(repositoryRoot, relativePath));
  return { document: JSON.parse(bytes.toString("utf8")), bytes, sha256: digest(bytes) };
}

function stableBytes(document) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
}

export function buildRenderedComparison() {
  const sourceManifest = load(sourceManifestPath);
  const factPack = load(sourceManifest.document.fact_pack.path);
  if (factPack.sha256 !== sourceManifest.document.fact_pack.sha256) {
    throw new Error("The exact Round 4 fact-pack bytes do not match the experiment manifest");
  }
  const materialFacts = deriveMaterialFacts(factPack.document);
  const selectedKinds = ["conventional-release", "observatory-self-serve"];
  const renderedArms = selectedKinds.map((kind) => {
    const sourceArm = sourceManifest.document.arms.find((arm) => arm.instrument_kind === kind);
    if (!sourceArm) throw new Error(`Missing source experiment arm: ${kind}`);
    const filename = `${kind}.html`;
    const html = renderArmHtml({
      kind,
      factPackRef: sourceManifest.document.fact_pack,
      materialFacts,
      exposureSeconds: EXPOSURE_SECONDS,
    });
    return {
      html,
      filename,
      manifestEntry: {
        arm_id: sourceArm.arm_id,
        instrument_kind: kind,
        instrument_ref: sourceArm.instrument_ref,
        fact_pack_ref: sourceArm.fact_pack_ref,
        rendered_output_ref: {
          path: `experiments/observatory-comparison/rendered/${filename}`,
          sha256: digest(Buffer.from(html)),
        },
        material_digest: digest(canonicalJson(materialFacts)),
        material_ids: materialFacts.map(({ id }) => id),
        exposure_contract: {
          mode: "fixed-window",
          seconds: EXPOSURE_SECONDS,
          enforcement_state: "prototype-not-activated-for-participants",
        },
      },
    };
  });
  const renderManifest = {
    schema_version: "1.0.0",
    manifest_id: "rendered-comparison.round-05.worker-option.synthetic",
    classification: "synthetic-rendered-research-prototype",
    source_experiment_manifest_ref: {
      path: sourceManifestPath,
      sha256: sourceManifest.sha256,
    },
    fact_pack_ref: sourceManifest.document.fact_pack,
    arms: renderedArms.map(({ manifestEntry }) => manifestEntry),
    parity_contract: {
      material_fact_effect: "exact-visible-projection-only",
      state_meaning_effect: "exact-source-branch-projection-only",
      forecast_effect: "context-only-not-current-if-state",
      authority_effect: "none",
      comprehension_assessed: false,
      recruitment_allowed: false,
      template_parity_authorises_recruitment: false,
    },
  };
  return { materialFacts, renderedArms, renderManifest };
}

function main() {
  const { renderedArms, renderManifest } = buildRenderedComparison();
  const outputs = [
    ...renderedArms.map(({ filename, html }) => [filename, Buffer.from(html)]),
    ["render-manifest.json", stableBytes(renderManifest)],
  ];
  if (!checkOnly) mkdirSync(renderedRoot, { recursive: true });
  const mismatches = [];
  for (const [filename, expected] of outputs) {
    const path = resolve(renderedRoot, filename);
    if (checkOnly) {
      let actual = null;
      try {
        actual = readFileSync(path);
      } catch {
        // Report missing output below.
      }
      if (!actual?.equals(expected)) mismatches.push(filename);
    } else {
      writeFileSync(path, expected);
    }
  }
  if (mismatches.length) {
    throw new Error(`Rendered Round 05 comparison is stale: ${mismatches.join(", ")}`);
  }
  process.stdout.write(checkOnly
    ? "Rendered Round 05 comparison is current\n"
    : "Built rendered Round 05 comparison\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
