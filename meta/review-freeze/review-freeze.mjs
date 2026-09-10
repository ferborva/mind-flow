#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  accessSync,
  closeSync,
  constants,
  fsyncSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { arch, platform, release, tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(here, "../..");
const freezeSchemaPath = resolve(here, "review-freeze.schema.json");
const freezeSchemaBytes = readFileSync(freezeSchemaPath);
const freezeSchema = JSON.parse(freezeSchemaBytes.toString("utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateFreezeSchema = ajv.compile(freezeSchema);
const round10SchemaPath = 'meta/review-freeze/review-freeze.v1.1.schema.json';
const round10SchemaBytes = readFileSync(resolve(here, 'review-freeze.v1.1.schema.json'));
const validateRound10Schema = ajv.compile(JSON.parse(round10SchemaBytes.toString('utf8')));
const round10ExecutionId = /^round-10\.review-inputs\.[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
function freezeEdition(policy) {
  return policy.policy_id === 'review-freeze.round-10'
    ? { version: '1.1.0', path: round10SchemaPath, bytes: round10SchemaBytes, validate: validateRound10Schema, gitLfs: true }
    : { version: '1.0.0', path: 'meta/review-freeze/review-freeze.schema.json', bytes: freezeSchemaBytes, validate: validateFreezeSchema, gitLfs: false };
}
const MAX_COMMAND_OUTPUT_BYTES = 64 * 1024 * 1024;
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const HASH = /^sha256:[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const CLOSED_PATH = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

const ROUND_04_REQUIRED_FILES = [
  ["meta/round-04-external-review-brief.md", "review charter and stop lines"],
  ["drafts/abundance-has-an-if.md", "first principal write-up"],
  ["drafts/from-if-to-when.md", "second principal write-up"],
  ["research/2026-09-09-transition-crisis-point-register.md", "crisis-point register"],
  ["research/2026-09-09-round-04-claim-evidence-audit.md", "claim-evidence audit"],
  ["communications/if-public-language-contract.md", "public IF language contract"],
  ["reviews/public-comprehension-affected-party-protocol-round-04.md", "human review protocol"],
  ["package.json", "test command contract"],
  ["package-lock.json", "dependency lock"],
  ["integration/transition-bundle/assess.mjs", "transition-bundle assessor"],
  ["integration/transition-bundle/schema/transition-bundle.schema.json", "transition-bundle schema"],
  ["integration/transition-bundle/schema/scope-manifest.schema.json", "scope-manifest schema"],
  ["integration/transition-bundle/tools/build-round-04-core.mjs", "pre-projection core builder"],
  ["integration/transition-bundle/tools/build-round-04-complete-core.mjs", "complete-core builder"],
  ["integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json", "frozen pre-projection core"],
  ["integration/transition-bundle/fixtures/round-04.worker-option.complete.json", "frozen complete core"],
  ["integration/transition-bundle/fixtures/round-04.worker-option.scope-manifest.json", "scope mapping manifest"],
  ["contracts/executable-if/schema/executable-if-kernel.schema.json", "executable IF schema"],
  ["contracts/executable-if/validate.mjs", "executable IF validator"],
  ["contracts/executable-if/fixtures/kernel.synthetic.json", "synthetic executable IF kernel"],
  ["contracts/evolution/schema/executable-if-evolution.schema.json", "executable evolution schema"],
  ["contracts/evolution/validate.mjs", "evolution validator"],
  ["contracts/evolution/fixtures/round-04.worker-option.synthetic.json", "synthetic evolution projection"],
  ["signals/schema/signal-registry.schema.json", "signal registry schema"],
  ["signals/validate.mjs", "signal registry validator"],
  ["signals/fixtures/round-04.worker-option.synthetic.json", "synthetic signal registry"],
  ["contracts/agency-map/schema/condition-agency-map.schema.json", "agency map schema"],
  ["contracts/agency-map/validate.mjs", "agency map validator"],
  ["contracts/agency-map/fixtures/round-04.worker-option.synthetic.json", "synthetic agency map"],
  ["paths/schema/possible-path.schema.json", "possible-path schema"],
  ["paths/validate.mjs", "possible-path validator"],
  ["paths/fixtures/round-04.worker-option.synthetic.json", "synthetic possible path"],
  ["preparation/schema/preparation-register-1.2.schema.json", "preparation register schema"],
  ["preparation/schema/preparation-action-1.2.schema.json", "preparation action schema"],
  ["preparation/lib/validate-v12.mjs", "preparation source-binding validator"],
  ["preparation/fixtures/valid/round-04.worker-option.synthetic.json", "synthetic preparation register"],
  ["forecasts/schema/binary-forecast.schema.json", "forecast schema"],
  ["forecasts/lib/registry.mjs", "forecast validator"],
  ["forecasts/fixtures/round-04.worker-option.synthetic.json", "synthetic forecast"],
  ["dashboard/schema/executable-if-view.schema.json", "dashboard IF projection schema"],
  ["dashboard/tools/build-round-04-executable-if-view.mjs", "dashboard IF projection builder"],
  ["dashboard/fixtures/round-04.worker-option.executable-if-view.synthetic.json", "synthetic dashboard projection"],
  ["dashboard/observatory/build.mjs", "Observatory build check"],
  ["dashboard/observatory/index.html", "Observatory document"],
  ["dashboard/observatory/app.js", "Observatory behaviour"],
  ["dashboard/observatory/data.js", "Observatory data projection"],
  ["dashboard/observatory/styles.css", "Observatory presentation"],
  ["experiments/observatory-comparison/validate.mjs", "comparison validator"],
  ["experiments/observatory-comparison/schema/experiment-manifest.schema.json", "comparison manifest schema"],
  ["experiments/observatory-comparison/fixtures/build-round-04-fixtures.mjs", "comparison fixture builder"],
  ["experiments/observatory-comparison/fixtures/manifest.synthetic.json", "synthetic comparison manifest"],
  ["experiments/observatory-comparison/fixtures/shared-fact-pack.synthetic.json", "shared comparison facts"],
].map(([path, role]) => ({ path, role }));

const ROUND_04_BUILD_COMMANDS = [
  ["install-dependencies", ["npm", "install"]],
  ["full-test-suite", ["npm", "test"]],
  ["pre-projection-core-check", ["node", "integration/transition-bundle/tools/build-round-04-core.mjs", "--check"]],
  ["dashboard-if-view-check", ["node", "dashboard/tools/build-round-04-executable-if-view.mjs", "--check"]],
  ["complete-core-check", ["node", "integration/transition-bundle/tools/build-round-04-complete-core.mjs", "--check"]],
  ["observatory-check", ["node", "dashboard/observatory/build.mjs", "--check"]],
  ["comparison-fixtures-check", ["node", "experiments/observatory-comparison/fixtures/build-round-04-fixtures.mjs", "--check"]],
].map(([command_id, argv]) => ({ command_id, argv, cwd: ".", timeout_ms: 900_000 }));

const ROUND_06_REQUIRED_FILES = [
  ...ROUND_04_REQUIRED_FILES.map(({ path, role }) => ({ path, role })),
  ...[
    ["meta/round-06-external-review-brief.md", "Round 06 independent-review charter"],
    ["meta/abundance-transition-programme.md", "programme mission, gates and workstreams"],
    ["meta/review-freeze/review-freeze.mjs", "review-freeze policy and verifier"],
    ["meta/review-freeze/review-freeze.schema.json", "review-freeze closed schema"],
    ["meta/review-freeze/tests/review-freeze.test.mjs", "review-freeze regression suite"],
    ["drafts/name-the-if.md", "public introduction to condition naming"],
    ["drafts/every-if-is-somebodys-when.md", "public account of condition ownership and timing"],
    ["communications/transition-field-guide.md", "public transition field guide"],
    ["communications/early-action-and-negotiation-framework.md", "early-action and negotiation framework"],
    ["communications/labels-and-headlines.md", "public label and headline constraints"],
    ["communications/public-experience-contract.md", "public experience contract"],
    ["pilots/australia/evidence-bridge-protocol.md", "Australia evidence-bridge protocol"],
    ["pilots/australia/source-manifest.json", "Australia source registry and evidence ceilings"],
    ["pilots/australia/sources/nero/2026-08/capture.json", "retained NERO source-capture manifest"],
    ["pilots/australia/sources/nero/2026-08/2026-08_nero.zip", "retained NERO source archive"],
    ["pilots/australia/sources/nero/2026-08/ATTRIBUTION.md", "NERO source attribution and reuse limits"],
    ["pilots/australia/sources/nero/2026-08/archive.response-headers.txt", "retained NERO archive response headers"],
    ["pilots/australia/sources/nero/2026-08/nero-landing.html", "retained NERO landing page"],
    ["pilots/australia/sources/nero/2026-08/nero-landing.response-headers.txt", "retained NERO landing response headers"],
    ["pilots/australia/sources/nero/2026-08/copyright-and-disclaimer.html", "retained NERO copyright and disclaimer page"],
    ["pilots/australia/sources/nero/2026-08/copyright-and-disclaimer.response-headers.txt", "retained NERO copyright response headers"],
    ["pilots/australia/schema/nero-source-capture.schema.json", "NERO source-capture schema"],
    ["pilots/australia/tools/verify-nero-source-capture.mjs", "NERO source-capture verifier"],
    ["pilots/australia/tests/nero-source-capture.test.mjs", "NERO source-capture regression suite"],
    ["pilots/australia/schema/nero-baseline.schema.json", "NERO baseline schema"],
    ["pilots/australia/schema/nero-baseline-policy.json", "NERO baseline derivation policy"],
    ["pilots/australia/data/nero-clerical-2026-08.json", "retained NERO dashboard baseline"],
    ["dashboard/tools/build-nero-baseline.mjs", "deterministic NERO baseline builder"],
    ["dashboard/tests/nero-baseline.test.mjs", "NERO baseline regression suite"],
    ["integration/transition-bundle/condition-change-impact.mjs", "condition-change impact assessor"],
    ["integration/transition-bundle/tools/trace-condition-change-impact.mjs", "condition-change impact trace tool"],
    ["integration/transition-bundle/tests/condition-change-impact.test.mjs", "condition-change impact regression suite"],
    ["governance/README.md", "governance package boundary"],
    ["governance/schema/governance-record-common.schema.json", "shared governance record schema"],
    ["governance/lib/record-contract.mjs", "shared governance record contract"],
    ["governance/tools/build-synthetic-fixtures.mjs", "synthetic governance fixture builder"],
    ["governance/negotiation-record/README.md", "negotiation-record boundary"],
    ["governance/negotiation-record/schema/negotiation-record.schema.json", "negotiation-record schema"],
    ["governance/negotiation-record/validate.mjs", "negotiation-record validator"],
    ["governance/negotiation-record/fixtures/worker-transition.negotiation.synthetic.json", "synthetic negotiation record"],
    ["governance/negotiation-record/tests/negotiation-record.test.mjs", "negotiation-record regression suite"],
    ["governance/decision-record/README.md", "decision-record boundary"],
    ["governance/decision-record/schema/decision-record.schema.json", "decision-record schema"],
    ["governance/decision-record/validate.mjs", "decision-record validator"],
    ["governance/decision-record/fixtures/worker-transition.decision.synthetic.json", "synthetic decision record"],
    ["governance/decision-record/tests/decision-record.test.mjs", "decision-record regression suite"],
    ["governance/lineage/README.md", "governance lineage boundary"],
    ["governance/lineage/schema/external-governance-context.schema.json", "external governance-context schema"],
    ["governance/lineage/schema/governance-lineage.schema.json", "governance lineage schema"],
    ["governance/lineage/validate.mjs", "governance lineage validator"],
    ["governance/lineage/tools/build-round-06-lineage.mjs", "Round 06 governance lineage builder"],
    ["governance/lineage/fixtures/round-06.worker-transition.governance-context.synthetic.json", "synthetic external governance context"],
    ["governance/lineage/fixtures/round-06.worker-transition.lineage.synthetic.json", "synthetic governance lineage record"],
    ["governance/lineage/tests/round-06-lineage.test.mjs", "governance lineage regression suite"],
    ["forecasts/prospective-pilot/README.md", "prospective forecast pilot contract"],
    ["forecasts/prospective-pilot/schema/prospective-pilot-preregistration.schema.json", "prospective pilot preregistration schema"],
    ["forecasts/prospective-pilot/examples/preregistration.template.json", "prospective pilot preregistration template"],
    ["forecasts/prospective-pilot/validate.mjs", "prospective pilot validator"],
    ["forecasts/prospective-pilot/tests/protocol.test.mjs", "prospective pilot protocol regression suite"],
    ["forecasts/prospective-pilot/issuance-binding/README.md", "future issuance-binding boundary"],
    ["forecasts/prospective-pilot/issuance-binding/schema/baseline-calculation.schema.json", "closed baseline calculation schema"],
    ["forecasts/prospective-pilot/issuance-binding/schema/baseline-input-manifest.schema.json", "closed baseline input-manifest schema"],
    ["forecasts/prospective-pilot/issuance-binding/validate.mjs", "future issuance-binding validator"],
    ["forecasts/prospective-pilot/issuance-binding/tests/issuance-binding.test.mjs", "future issuance-binding regression suite"],
    ["forecasts/tests/round-04-exact-binding.test.mjs", "top-level exact forecast binding regression suite"],
    ["experiments/observatory-comparison/render-model.mjs", "comparison rendering model"],
    ["experiments/observatory-comparison/render.mjs", "deterministic comparison renderer"],
    ["experiments/observatory-comparison/render-parity.mjs", "rendered comparison parity validator"],
    ["experiments/observatory-comparison/rendered/conventional-release.html", "rendered conventional comparison arm"],
    ["experiments/observatory-comparison/rendered/observatory-self-serve.html", "rendered Observatory comparison arm"],
    ["experiments/observatory-comparison/rendered/render-manifest.json", "rendered comparison manifest"],
    ["experiments/observatory-comparison/schema/fact-pack.schema.json", "closed shared fact-pack schema"],
    ["experiments/observatory-comparison/tests/rendered-parity.test.mjs", "rendered comparison parity regression suite"],
    ["dashboard/observatory/tests/observatory.test.mjs", "Observatory regression suite"],
  ].map(([path, role]) => ({ path, role })),
];

const ROUND_06_BUILD_COMMANDS = [
  ["install-dependencies-clean", ["npm", "ci"]],
  ["full-test-suite", ["npm", "test"]],
  ...ROUND_04_BUILD_COMMANDS.slice(2).map(({ command_id, argv }) => [command_id, argv]),
  ["nero-source-capture-check", ["node", "pilots/australia/tools/verify-nero-source-capture.mjs"]],
  ["governance-fixtures-check", ["node", "governance/tools/build-synthetic-fixtures.mjs", "--check"]],
  ["governance-lineage-tests", ["node", "--test", "governance/lineage/tests/round-06-lineage.test.mjs"]],
  ["governance-lineage-check", ["node", "governance/lineage/tools/build-round-06-lineage.mjs", "--check"]],
  ["forecast-issuance-binding-tests", ["node", "--test", "forecasts/prospective-pilot/issuance-binding/tests/issuance-binding.test.mjs"]],
  ["comparison-render-check", ["node", "experiments/observatory-comparison/render.mjs", "--check"]],
  ["comparison-render-parity-tests", ["node", "--test", "experiments/observatory-comparison/tests/rendered-parity.test.mjs"]],
].map(([command_id, argv]) => ({ command_id, argv, cwd: ".", timeout_ms: 900_000 }));

const ROUND_07_REQUIRED_FILES = [
  ...ROUND_06_REQUIRED_FILES.map(({ path, role }) => ({ path, role })),
  ...[
    ["meta/round-07-external-review-brief.md", "Round 07 independent-retest charter"],
    ["reviews/round-06-disposition-ledger.json", "Round 06 coordinator disposition ledger"],
    ["reviews/round-07-component-review-manifest.json", "bounded component review plan"],
    ["contracts/tests/round-06-review-disposition.test.mjs", "disposition completeness regression suite"],
    ["contracts/tests/round-07-review-plan.test.mjs", "component review coverage regression suite"],
  ].map(([path, role]) => ({ path, role })),
];

export const ROUND_04_REVIEW_POLICY = Object.freeze({
  schema_version: "1.0.0",
  policy_id: "review-freeze.round-04",
  policy_version: "1.0.0",
  review_round: "round-04",
  reviewed_ref: "ren/abundance-transition-program",
  required_files: ROUND_04_REQUIRED_FILES,
  build_commands: ROUND_04_BUILD_COMMANDS,
});

export const ROUND_06_REVIEW_POLICY = Object.freeze({
  schema_version: "1.0.0",
  policy_id: "review-freeze.round-06",
  policy_version: "1.0.0",
  review_round: "round-06",
  reviewed_ref: "ren/abundance-transition-program",
  required_files: ROUND_06_REQUIRED_FILES,
  build_commands: ROUND_06_BUILD_COMMANDS,
});

export const ROUND_07_REVIEW_POLICY = Object.freeze({
  schema_version: "1.0.0",
  policy_id: "review-freeze.round-07",
  policy_version: "1.0.0",
  review_round: "round-07",
  reviewed_ref: "ren/abundance-transition-program",
  required_files: ROUND_07_REQUIRED_FILES,
  build_commands: ROUND_06_BUILD_COMMANDS,
});

const ROUND_08_GENERATED_OUTPUTS = [
  "dashboard/web/index.html", "pilots/australia/web/index.html", "dashboard/observatory/data.js",
  "experiments/observatory-comparison/rendered/conventional-release.html",
  "experiments/observatory-comparison/rendered/observatory-self-serve.html",
];

export const ROUND_08_REVIEW_POLICY = Object.freeze({
  schema_version: "1.0.0", policy_id: "review-freeze.round-08", policy_version: "1.0.0",
  review_round: "round-08", reviewed_ref: "ren/round-08",
  generated_outputs: ROUND_08_GENERATED_OUTPUTS,
  required_files: [
    ...ROUND_07_REQUIRED_FILES.filter(({ path }) => !ROUND_08_GENERATED_OUTPUTS.includes(path)),
    ...[
      ["meta/round-08-external-review-brief.md", "Round 08 eight-track independent review charter"],
      ["meta/round-08-plan.md", "measurement-first plan and moratorium"],
      ["reviews/round-08-progress.md", "dated gate and residual checkpoints"],
      ["reviews/round-08-measurement-independent-review.md", "different-owner measurement challenges"],
      ["reviews/round-08-narrative-provenance.md", "capture-backed public voice review"],
      ["reviews/round-08-disclaimer-inventory.md", "public-document scope and unresolved disclaimer gate"],
      ["boundaries.md", "linked evidence and authority boundaries"],
      ["meta/build-artifacts.mjs", "exact generated-output build and parity contract"],
      [".gitattributes", "retained-source LFS routing"],
      [".github/workflows/integrity.yml", "independent CI reproduction and artifacts"],
      ["pilots/australia/basket/README.md", "basket measurement and correction entry point"],
      ["pilots/australia/sources/primary-care/2026-09-09/capture.json", "retained primary-care source inventory"],
      ["pilots/australia/sources/primary-care/2026-09-09/pc-primary-care-dataset.csv", "retained RoGS cells and uncertainty"],
      ["pilots/australia/tools/primary-care.mts", "source verification and measurement derivation"],
      ["pilots/australia/tools/primary-care-basket.mts", "measured IF construction and evolution"],
      ["pilots/australia/tools/positive-signals.mts", "favourable condition-change derivation"],
      ["dashboard/tools/primary-care-panel.mts", "measured panel and deletion provenance"],
      ["dashboard/snapshots/2026-09-09.r1.json", "dated twelve-signal measured panel"],
      ["forecasts/prospective-pilot/round-08-nero/README.md", "prospective target and prewritten resolution procedure"],
      ["forecasts/prospective-pilot/round-08-nero/candidate.mts", "prospective preparation and evidence bindings"],
      ["forecasts/prospective-pilot/round-08-nero/resolver.mts", "source-native October resolution adapter"],
      ["forecasts/prospective-pilot/round-08-nero/issued.json", "immutable prospective issuance"],
      ["forecasts/prospective-pilot/round-08-nero/preregistration.json", "sealed prospective protocol"],
      ["forecasts/prospective-pilot/round-08-nero/evaluation-plan.json", "pre-observation evaluation cohort"],
      ["forecasts/prospective-pilot/round-08-nero/registration-provider-response.base64.txt", "exact retained external registration response"],
    ].map(([path, role]) => ({ path, role })),
  ],
  build_commands: [
    ...ROUND_06_BUILD_COMMANDS,
    ...[
      ["primary-care-measurements-check", ["node", "pilots/australia/tools/primary-care.mts", "--check"]],
      ["primary-care-basket-check", ["node", "pilots/australia/tools/primary-care-basket.mts", "--check"]],
      ["positive-condition-signals-check", ["node", "pilots/australia/tools/positive-signals.mts", "--check"]],
      ["primary-care-panel-check", ["node", "dashboard/tools/primary-care-panel.mts", "--check"]],
      ["generated-artifact-byte-parity", ["node", "meta/build-artifacts.mjs", "--check"]],
      ["retained-prospective-issuance-check", ["node", "--test", "forecasts/prospective-pilot/tests/round-08-nero-issued.test.mjs"]],
    ].map(([command_id, argv]) => ({ command_id, argv, cwd: ".", timeout_ms: 900_000 })),
  ],
});

export const ROUND_09_INITIAL_REVIEW_POLICY = Object.freeze({
  schema_version: '1.0.0', policy_id: 'review-freeze.round-09', policy_version: '1.0.0',
  review_round: 'round-09', reviewed_ref: 'ren/round-09',
  generated_outputs: ROUND_08_GENERATED_OUTPUTS,
  required_files: [
    ...ROUND_08_REVIEW_POLICY.required_files,
    ...[
      ['meta/round-09-external-review-brief.md', 'Round 09 eight-track frozen-candidate review charter'],
      ['reviews/round-09-progress.md', 'Round 09 gates and honest blockers'],
      ['reviews/round-09-residuals.md', 'Eight residual repair dispositions and fail-first evidence'],
      ['reviews/round-09-adversarial-review.md', 'Different-owner measurement and protocol objections'],
      ['reviews/round-09-narrative-provenance.md', 'Exact disclaimer deletions and protected voice'],
      ['reviews/round-09-forecast-intake.md', 'First forecast blocker and prospective continuity'],
      ['reviews/round-09-forecast-correction.md', 'Target contradiction, preserved error and peer-reviewed replacement'],
      ['meta/build-artifacts.lock.json', 'Explicit retained generated-output digests'],
      ['meta/review-freeze/round-08.1.review-freeze.json', 'Unchanged prior repair receipt'],
      ['contracts/executable-if/when-an-if-changes.md', 'Readable event-12 invalidation and rebind'],
      ['contracts/executable-if/tests/audit-layer-boundary.test.mjs', 'Disclosed sealed-evaluator and current-audit difference'],
      ['pilots/australia/tools/measurement-depth.mts', 'Retained basket depth and confidence interval derivation'],
      ['pilots/australia/data/primary-care-depth-2026-09-10.r2.json', 'Corrected Round 09 measurement depth'],
      ['pilots/australia/sources/primary-care/2026-09-10-depth/capture.json', 'Exact measurement source and header manifest'],
      ['pilots/australia/tools/current-primary-care.mts', 'Definition binding and byte parity as separate gates'],
      ['pilots/australia/tools/evolution-discoveries.mts', 'Source-backed meaning corrections and representational blocker'],
      ['pilots/australia/data/round-09-evolution-discoveries.json', 'Retained discoveries, not manufactured events'],
      ['forecasts/prospective-pilot/round-09-nero/issued.json', 'Immutable first Round 09 issuance with disclosed target contradiction'],
      ['forecasts/prospective-pilot/round-09-nero/preregistration.json', 'Immutable inconsistent protocol retained for audit'],
      ['forecasts/prospective-pilot/round-09-nero/error-notice.md', 'Visible error in the first Round 09 issuance'],
      ['forecasts/prospective-pilot/issuance-binding/round-09-validate.mjs', 'Retained first Round 09 admission edition'],
      ['forecasts/prospective-pilot/round-09-nero-corrected/issued.json', 'Prospective corrected target issuance'],
      ['forecasts/prospective-pilot/round-09-nero-corrected/preregistration.json', 'Corrected campaign protocol and registration binding'],
      ['forecasts/prospective-pilot/round-09-nero-corrected/registration-provider-response.base64.txt', 'Corrected campaign provider response bytes'],
      ['forecasts/prospective-pilot/round-09-nero-corrected/target-policy.mjs', 'One native target across prose and structured resolution'],
      ['forecasts/prospective-pilot/issuance-binding/round-09-corrected-validate.mjs', 'Corrected sealed admission edition'],
      ['forecasts/prospective-pilot/round-09-nero-corrected/resolution-intake.mjs', 'Current corrected outcome intake'],
      ['forecasts/prospective-pilot/operational-clock.mjs', 'Actual-clock boundary for the live CLI'],
    ].map(([path, role]) => ({ path, role })),
  ],
  build_commands: [
    ...ROUND_08_REVIEW_POLICY.build_commands,
    ...[
      ['measurement-depth-check', ['node', 'pilots/australia/tools/measurement-depth.mts', '--check']],
      ['evolution-discovery-check', ['node', 'pilots/australia/tools/evolution-discoveries.mts', '--check']],
      ['round-09-prospective-issuance-check', ['npm', 'run', 'test:forecasts']],
      ['round-09-narrative-check', ['node', '--test', 'communications/tests/round-09-deletions.test.mjs']],
    ].map(([command_id, argv]) => ({ command_id, argv, cwd: '.', timeout_ms: 900_000 })),
  ],
});

// Preserve the exact policy projection of the successful pre-steer checkpoint.
// The revised commission adds breadth, not a reinterpretation of that receipt.
export const ROUND_09_REVIEW_POLICY = Object.freeze({
  ...ROUND_09_INITIAL_REVIEW_POLICY,
  policy_version: '1.1.0',
  required_files: [
    ...ROUND_09_INITIAL_REVIEW_POLICY.required_files,
    ...[
      ['capture/2026-09-10-where-the-money-sits-and-the-weather-station.md', 'Scope and observation capture integrated without changing main'],
      ['seeds/the-weather-station-watches-the-world.md', 'Capture-backed world scope and unsettled choices'],
      ['signals/countries/country-set.v1.json', 'Retained commissioned IMF top-50 sampling proposal'],
      ['signals/countries/measurements.v1.json', 'Three common-vintage series and country-specific missing measurements'],
      ['signals/countries/measurement-view.md', 'Fifty measured economies with source-linked values and named gaps'],
      ['signals/countries/storm-signals.v1.md', 'Five-category candidate catalogue and evidence ceilings'],
      ['signals/countries/weather-criteria.v1.md', 'Uncalibrated commissioned investigation rule, not detection'],
      ['signals/countries/weather-criteria.v1.json', 'Existing-family threshold and domain bindings'],
      ['signals/countries/capability-candidate.v1.json', 'Retained internet-use proxy, not practical capability'],
      ['signals/countries/permission-candidate.v1.json', 'Retained WBL legal-rights context with edition-specific licence'],
      ['signals/countries/proximity-candidate.v1.json', 'Sparse retained RAI data excluded from the breadth panel'],
      ['signals/countries/proximity-candidate.md', 'Explicit separate legacy XLS replay dependency and coverage gap'],
      ['reviews/round-09-scheduled-resolution.md', 'Exact future intake sequence and explicit unavailable scheduler'],
      ['meta/review-freeze/round-09.pre-steer.review-freeze.json', 'Historical initial-scope checkpoint, not current handoff'],
    ].map(([path, role]) => ({path, role})),
  ],
  build_commands: [
    ...ROUND_09_INITIAL_REVIEW_POLICY.build_commands,
    ...[
      ['country-set-check', ['node', 'signals/countries/tools/country-set.mts', '--check']],
      ['country-measurements-check', ['node', 'signals/countries/tools/build-measurements.mjs', '--check']],
      ['country-weather-criteria-check', ['node', 'signals/countries/weather-criteria-build.mjs', '--check']],
      ['country-capability-check', ['node', 'signals/countries/capability-candidate.mts', '--check']],
      ['country-permission-check', ['node', 'signals/countries/tools/permission-candidate.mjs', '--check']],
      ['country-reader-check', ['node', 'signals/countries/tools/render-country-view.mjs', '--check']],
      ['round-09-pre-steer-receipt-check', ['node', 'meta/review-freeze/review-freeze.mjs', 'verify', '--policy=round-09-initial', '--manifest=meta/review-freeze/round-09.pre-steer.review-freeze.json']],
    ].map(([command_id, argv]) => ({command_id, argv, cwd: '.', timeout_ms: 900_000})),
  ],
});

// A repair is a new attestation, never a renamed historical receipt.
export const ROUND_09_1_REVIEW_POLICY = Object.freeze({
  ...ROUND_09_REVIEW_POLICY,
  policy_id: 'review-freeze.round-09.1', policy_version: '1.0.0', review_round: 'round-09.1',
  required_files: [
    ...ROUND_09_REVIEW_POLICY.required_files,
    ...[
      ['reviews/round-09.1-dispositions.md', 'Every independent finding, repair evidence and remaining gates'],
      ['reviews/round-09.1-editorial-repairs.md', 'Forward amendments and honest disclaimer inventory'],
      ['reviews/round-09.1-forecast-repairs.md', 'Typed error disclosure and preserved prospective evidence'],
      ['contracts/executable-if/construct-correction-policy.md', 'New-identity decision with unfinished migration explicit'],
      ['forecasts/prospective-pilot/round-09-nero/current-admission-plan.json', 'Current admission overlay, not a changed scoring plan'],
      ['forecasts/prospective-pilot/round-09-nero/error-disclosure.json', 'Typed error marker without void or exclusion authority'],
      ['forecasts/prospective-pilot/round-09-nero/check-error-disclosure.mjs', 'Read-only operator view of unresolved disclosure'],
      ['dashboard/tools/check-primary-care-layout.mjs', 'Optional local-browser regression/control runner'],
      ['meta/review-freeze/round-09.review-freeze.json', 'Unchanged previous measurement candidate receipt'],
    ].map(([path, role]) => ({ path, role })),
  ],
  build_commands: [
    ...ROUND_09_REVIEW_POLICY.build_commands,
    ...[
      ['round-09-receipt-check', ['node', 'meta/review-freeze/review-freeze.mjs', 'verify', '--policy=round-09', '--manifest=meta/review-freeze/round-09.review-freeze.json']],
      ['round-09.1-error-disclosure-check', ['node', 'forecasts/prospective-pilot/round-09-nero/check-error-disclosure.mjs']],
      ['round-09.1-repair-regressions', ['node', '--test', 'contracts/tests/ci-governance.test.mjs', 'contracts/tests/retained-source-lfs.test.mjs', 'dashboard/tests/primary-care-public.test.mjs', 'communications/tests/round-09-1-editorial.test.mjs', 'forecasts/prospective-pilot/tests/round-09-error-disclosure.test.mjs', 'pilots/australia/tests/round-09-evolution-discoveries.test.mjs']],
    ].map(([command_id, argv]) => ({ command_id, argv, cwd: '.', timeout_ms: 900_000 })),
  ],
});

// Additive review scope only. Historical policy objects and receipt identities
// remain literal; the coordinator selects and freezes the candidate separately.
export const ROUND_10_REVIEW_POLICY = Object.freeze({
  ...ROUND_09_1_REVIEW_POLICY,
  policy_id: 'review-freeze.round-10', policy_version: '1.0.0', review_round: 'round-10',
  reviewed_ref: 'ren/round-10',
  required_files: [
    ...ROUND_09_1_REVIEW_POLICY.required_files,
    ...[
      ['meta/round-10-external-review-brief.md', 'Round 10 frozen review scope and truthful unmet gates'],
      ['reviews/round-10-progress.md', 'Round 10 checkpoints and handoff'],
      ['reviews/round-10-receipt-trust-decision.md', 'Time-bounded commissioned integrity-only risk decision'],
      ['reviews/round-10-narrative-provenance.md', 'Reversible line-level publication preparation'],
      ['reviews/name-the-if-sign-off.md', 'Section-level human publication decision sheet'],
      ['reviews/round-10-hygiene.md', 'Scoped hygiene dispositions and named deferrals'],
      ['reviews/round-10-australia-depth.md', 'Native NERO retrospective and exact GP join failures'],
      ['capture/2026-09-10-storms-as-social-contract-shifts.md', 'Preserved captured definition and processing record'],
      ['capture/2026-09-10-keep-main-unchanged.md', 'Processed operational instruction'],
      ['signals/countries/income-measurements.v1.json', 'Retained national income-access context and source ceilings'],
      ['signals/countries/tools/income-measurements.mts', 'Exact income history producer'],
      ['signals/countries/storm-criterion.v1.md', 'Reversible commissioned criterion, not forecast skill'],
      ['signals/countries/tools/storm-criterion.mts', 'Country criterion and retrospective replay'],
      ['signals/countries/storm-review.v1.json', 'Exact source-derived criterion states and rejected proxy crossings'],
      ['signals/countries/tools/shock-context.mts', 'Pinned primary historical context, not national outcome labels'],
      ['reviews/round-10-storm-retrospective.md', 'Unassessable social criterion and quantified native counterexamples'],
      ['.github/workflows/nero-intake.yml', 'Evidence-only scheduled acquisition and restricted publication jobs'],
      ['forecasts/prospective-pilot/round-10-intake/validate-evidence.mjs', 'Complete pre-publication evidence validation'],
      ['forecasts/prospective-pilot/round-10-intake/lfs.mjs', 'Verified upload and fresh-cache download before pointer publication'],
      ['governance/round-10-adjudicator-appointment.md', 'Commissioned appointment proposal, not appointed authority'],
      ['forecasts/prospective-pilot/round-10-canada/draft.mts', 'Exact retained Canadian reported-source baseline replay'],
      ['forecasts/prospective-pilot/round-10-canada/issuance.mts', 'Actual-clock, write-once Canadian issue and offline replay'],
      ['forecasts/prospective-pilot/round-10-canada/issuance-workflow.mjs', 'Bounded provider receipt, capture and clock checks'],
      ['forecasts/prospective-pilot/round-10-canada/issuance-runbook.md', 'Committed issuance and human resolution boundaries'],
      ['forecasts/prospective-pilot/issuance-binding/round-10-country-validate.mjs', 'Fixed native Canadian issuance adapter'],
      ['forecasts/prospective-pilot/round-10-canada/issuance/issued/issued.json', 'Exact prospective Canadian issued record'],
      ['forecasts/prospective-pilot/round-10-canada/issuance/issued/preregistration.json', 'Exact Canadian preregistration with provider receipt'],
      ['forecasts/prospective-pilot/round-10-canada/issuance/seal/source-closure.json', 'Immutable source-commit closure for actual issuance'],
      ['forecasts/prospective-pilot/round-10-canada/issuance/seal/seal-anchors.json', 'Pre-registration protocol and request byte anchors'],
      ['forecasts/prospective-pilot/round-10-canada/issuance/registration/provider-post.http', 'Actual provider-timed registration bytes'],
      ['forecasts/prospective-pilot/round-10-canada/issuance/issued/provider-preissue-readback.http', 'Unchanged-comment readback before actual issue'],
      ['contracts/tests/round10-issued-ci.test.mjs', 'Mandatory offline actual-issued replay without weaker substitutes'],
      ['pilots/australia/data/round-10-nero-retrospective.json', 'Native stock changes and unjoinable GP evidence'],
      ['pilots/australia/tools/round-10-nero-retrospective.mts', 'Full retained NERO replay'],
      ['pilots/australia/tests/round-10-nero-retrospective.test.mjs', 'Hostile stock-to-disruption and national-to-local boundaries'],
      ['meta/review-freeze/tests/round-10-policy.test.mjs', 'Exact additive command and policy regressions'],
      ['meta/review-freeze/review-freeze.v1.1.schema.json', 'Same-family Round 10 closed runtime edition including Git LFS'],
      ['meta/review-freeze/tests/round-10-lfs-runtime.test.mjs', 'Real Git LFS clean/smudge under the recorded narrow toolchain'],
      ['meta/review-freeze/round-09.1.review-freeze.json', 'Unchanged canonical prior receipt'],
    ].map(([path, role]) => ({ path, role })),
  ],
  build_commands: [
    ...ROUND_09_1_REVIEW_POLICY.build_commands,
    ...[
      ['round-10-income-check', ['node', 'signals/countries/tools/income-measurements.mts', '--check']],
      ['round-10-storm-check', ['node', 'signals/countries/tools/storm-criterion.mts', '--check']],
      ['round-10-shock-context-check', ['node', 'signals/countries/tools/shock-context.mts', '--check']],
      ['round-10-depth-check', ['node', 'pilots/australia/tools/round-10-nero-retrospective.mts', '--check']],
      ['round-10-canada-draft-check', ['node', 'forecasts/prospective-pilot/round-10-canada/draft.mts', '--check']],
      ['round-10-canada-basis-check', ['node', 'forecasts/prospective-pilot/round-10-canada/build-basis.mts', '--check']],
      ['round-10-canada-issued-check', ['node', 'forecasts/prospective-pilot/round-10-canada/issuance.mts', '--check']],
      ['round-10-receipt-boundary-check', ['node', '--test', 'meta/review-freeze/tests/round-10-policy.test.mjs']],
      ['round-09.1-receipt-check', ['node', 'meta/review-freeze/review-freeze.mjs', 'verify', '--policy=round-09.1', '--manifest=meta/review-freeze/round-09.1.review-freeze.json']],
    ].map(([command_id, argv]) => ({ command_id, argv, cwd: '.', timeout_ms: 900_000 })),
  ],
});

export function reviewPolicyFor(reviewRound = "round-04") {
  if (reviewRound === "round-04") return ROUND_04_REVIEW_POLICY;
  if (reviewRound === "round-06") return ROUND_06_REVIEW_POLICY;
  if (reviewRound === "round-07") return ROUND_07_REVIEW_POLICY;
  if (reviewRound === "round-08") return ROUND_08_REVIEW_POLICY;
  if (reviewRound === "round-09") return ROUND_09_REVIEW_POLICY;
  if (reviewRound === "round-09-initial") return ROUND_09_INITIAL_REVIEW_POLICY;
  if (reviewRound === "round-09.1") return ROUND_09_1_REVIEW_POLICY;
  if (reviewRound === "round-10") return ROUND_10_REVIEW_POLICY;
  throw new Error(`unknown review policy: ${reviewRound}`);
}

const BOUNDARIES = Object.freeze({
  review_effect: "input-integrity-only",
  review_approval: "not-granted",
  empirical_truth_established: false,
  scope_mapping_truth_established: false,
  legal_authority_created: false,
  action_authorised: false,
  publication_approved: false,
  recruitment_approved: false,
  operator_clock_authenticated: false,
  safe_to_execute_on_host: false,
});

const EXECUTION_BOUNDARY = Object.freeze({
  process_sandboxed: false,
  network_isolated: false,
  host_filesystem_isolated: false,
  dependency_tree_content_addressed: false,
  registry_responses_retained: false,
  mutation_observation: "pre-and-post-command-snapshot-only",
  untrusted_code_containment: "none",
});

const FIXED_COMMAND_ENVIRONMENT = Object.freeze({
  PATH: "$REVIEW_SANDBOX/.review-toolchain",
  CI: "1",
  LANG: "C",
  LC_ALL: "C",
  TZ: "UTC",
  npm_config_audit: "false",
  npm_config_fund: "false",
  npm_config_update_notifier: "false",
  npm_config_cache: "$REVIEW_SANDBOX/.npm-cache",
  npm_config_userconfig: "$REVIEW_SANDBOX/.npm-cache/empty-user.npmrc",
  npm_config_globalconfig: "$REVIEW_SANDBOX/.npm-cache/empty-global.npmrc",
  npm_config_registry: "https://registry.npmjs.org",
  npm_config_replace_registry_host: "always",
  npm_config_script_shell: "/bin/sh",
});

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${Array.from(value, (item) => canonicalJson(item) ?? "null").join(",")}]`;
  }
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return `{${Object.keys(value).sort().flatMap((key) => {
      const encoded = canonicalJson(value[key]);
      return encoded === undefined ? [] : [`${JSON.stringify(key)}:${encoded}`];
    }).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalHash(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(canonicalJson(value));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function writeReviewFreezeAtomically(outputPath, manifest) {
  const bytes = `${JSON.stringify(manifest, null, 2)}\n`;
  const parent = dirname(outputPath);
  let temporaryPath;
  let descriptor;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    temporaryPath = resolve(
      parent,
      `.review-freeze-${process.pid}-${Date.now()}-${attempt}.tmp`,
    );
    try {
      descriptor = openSync(temporaryPath, "wx", 0o600);
      break;
    } catch (error) {
      if (error.code !== "EEXIST" || attempt === 9) throw error;
    }
  }

  try {
    writeFileSync(descriptor, bytes, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, outputPath);
    temporaryPath = undefined;
    const directoryDescriptor = openSync(parent, "r");
    try {
      fsyncSync(directoryDescriptor);
    } finally {
      closeSync(directoryDescriptor);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (temporaryPath !== undefined) rmSync(temporaryPath, { force: true });
  }
}

function gitEnvironment(gitPath) {
  return {
    PATH: `${dirname(gitPath)}:/usr/bin:/bin`,
    LANG: "C",
    LC_ALL: "C",
    TZ: "UTC",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function git(repositoryRoot, args, options = {}) {
  const gitPath = executablePath("git");
  const result = spawnSync(gitPath, args, {
    cwd: repositoryRoot,
    env: gitEnvironment(gitPath),
    encoding: options.binary ? null : "utf8",
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${String(result.stderr || result.stdout).trim()}`);
  }
  return options.binary ? result.stdout : result.stdout.trim();
}

function exactCommit(repositoryRoot, commit) {
  const resolved = git(repositoryRoot, ["rev-parse", "--verify", `${commit}^{commit}`]);
  if (!COMMIT.test(resolved)) throw new Error("reviewed commit did not resolve to a full Git object ID");
  return resolved;
}

function closedPath(path, label) {
  if (typeof path !== "string" || isAbsolute(path) || !CLOSED_PATH.test(path) ||
      path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`${label} must be a closed repository-relative path`);
  }
  return path;
}

export function resolveReviewOutput(repositoryRoot, path, { force = false } = {}) {
  closedPath(path, "output path");
  if (!path.endsWith(".json")) throw new Error("output path must end in .json");
  const root = realpathSync(repositoryRoot);
  const candidate = resolve(root, path);
  const parent = realpathSync(dirname(candidate));
  const fromRoot = relative(root, candidate);
  const parentFromRoot = relative(root, parent);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot) ||
      parentFromRoot === ".." || parentFromRoot.startsWith(`..${sep}`) ||
      isAbsolute(parentFromRoot)) {
    throw new Error("output path escapes the repository");
  }
  try {
    const existing = lstatSync(candidate);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error("output path must not be a symlink or non-file");
    }
    if (!force) throw new Error("output path already exists; pass --force to replace it");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return candidate;
}

function fileAtCommit(repositoryRoot, commit, path) {
  closedPath(path, "required file");
  return git(repositoryRoot, ["show", `${commit}:${path}`], { binary: true });
}

function lfsPointer(bytes) {
  const text = bytes.toString("utf8");
  if (!text.startsWith("version https://git-lfs.github.com/spec/v1\n")) return null;
  const match = /^version https:\/\/git-lfs.github.com\/spec\/v1\noid sha256:([a-f0-9]{64})\nsize ([1-9][0-9]*|0)\n$/.exec(text);
  if (!match || !Number.isSafeInteger(Number(match[2]))) throw new Error("invalid retained LFS pointer");
  return { oid: match[1], size: Number(match[2]) };
}

function retainedFileMatches(committedBytes, materializedBytes) {
  const pointer = lfsPointer(committedBytes);
  return pointer
    ? materializedBytes.length === pointer.size && canonicalHash(materializedBytes) === `sha256:${pointer.oid}`
    : canonicalHash(committedBytes) === canonicalHash(materializedBytes);
}

function fileRecord(repositoryRoot, commit, required) {
  const bytes = fileAtCommit(repositoryRoot, commit, required.path);
  return {
    path: required.path,
    role: required.role,
    git_blob_oid: git(repositoryRoot, ["rev-parse", `${commit}:${required.path}`]),
    sha256: canonicalHash(bytes),
    byte_length: bytes.length,
  };
}

export function executablePath(name) {
  if (name === "node") return realpathSync(process.execPath);
  for (const directory of (process.env.PATH || "").split(delimiter)) {
    if (!directory) continue;
    const candidate = resolve(directory, name);
    try {
      accessSync(candidate, constants.X_OK);
      return realpathSync(candidate);
    } catch {
      // Try the next fixed PATH entry.
    }
  }
  throw new Error(`${name} executable is unavailable`);
}

export function executableRecord(name, versionArgs, explicitPath, {
  allowUnsupportedVersion = false,
} = {}) {
  const path = explicitPath ? realpathSync(explicitPath) : executablePath(name);
  const version = spawnSync(path, versionArgs, { encoding: "utf8" });
  if (version.error || !Number.isInteger(version.status) ||
      (version.status !== 0 && !allowUnsupportedVersion)) {
    throw new Error(`${name} version could not be recorded`);
  }
  const probeOutput = [version.stdout, version.stderr]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
  if (version.status === 0 && !probeOutput) {
    throw new Error(`${name} version could not be recorded`);
  }
  return {
    version: version.status === 0
      ? probeOutput
      : `version unavailable (probe exit ${version.status}): ${probeOutput || "no probe output"}`,
    executable_path: path,
    executable_sha256: canonicalHash(readFileSync(path)),
  };
}

function runtimeInputs(repositoryRoot, commit, edition) {
  const lockBytes = fileAtCommit(repositoryRoot, commit, "package-lock.json");
  return {
    node: executableRecord("node", ["--version"]),
    npm: executableRecord("npm", ["--version"]),
    git: executableRecord("git", ["--version"]),
    ...(edition?.gitLfs ? { git_lfs: executableRecord('git-lfs', ['version']) } : {}),
    python3: executableRecord("python3", ["--version"]),
    unzip: executableRecord("unzip", ["-v"]),
    sh: executableRecord("sh", ["--version"], "/bin/sh", {
      allowUnsupportedVersion: true,
    }),
    operating_system: { platform: platform(), release: release(), architecture: arch() },
    checkout_directory_name: "mind-flow",
    command_environment: structuredClone(FIXED_COMMAND_ENVIRONMENT),
    package_lock: {
      path: "package-lock.json",
      sha256: canonicalHash(lockBytes),
      byte_length: lockBytes.length,
    },
  };
}

function commandRecord(command) {
  if (!command || typeof command.command_id !== "string" || !Array.isArray(command.argv) ||
      command.argv.length === 0 || command.argv.some((part) => typeof part !== "string" || part.length === 0)) {
    throw new Error("review commands require an ID and non-empty argv array");
  }
  const cwd = command.cwd === "." || command.cwd === undefined
    ? "."
    : closedPath(command.cwd, "command cwd");
  const timeout = command.timeout_ms ?? DEFAULT_COMMAND_TIMEOUT_MS;
  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 3_600_000) {
    throw new Error("review command timeout_ms must be an integer from 1000 to 3600000");
  }
  const record = {
    command_id: command.command_id,
    argv: [...command.argv],
    cwd,
    timeout_ms: timeout,
  };
  return { ...record, command_contract_sha256: canonicalHash(record) };
}

function streamRecord(bytes) {
  return {
    sha256: canonicalHash(bytes),
    byte_length: bytes.length,
    bytes_base64: bytes.toString("base64"),
  };
}

function listTree(repositoryRoot, commit) {
  const output = git(repositoryRoot, ["ls-tree", "-r", "-z", commit], { binary: true });
  const records = [];
  let start = 0;
  for (let index = 0; index <= output.length; index += 1) {
    if (index !== output.length && output[index] !== 0) continue;
    if (index === start) {
      start = index + 1;
      continue;
    }
    const entry = output.subarray(start, index);
    const tab = entry.indexOf(0x09);
    if (tab < 0) throw new Error("Git tree entry has no path separator");
    const metadata = entry.subarray(0, tab).toString("ascii");
    const pathBytes = entry.subarray(tab + 1);
    const path = pathBytes.toString("utf8");
    if (Buffer.from(path, "utf8").compare(pathBytes) !== 0) {
      throw new Error("Git tree contains a non-UTF-8 path");
    }
    const [mode, type, oid] = metadata.split(" ");
    closedPath(path, "tracked tree path");
    records.push({ mode, type, oid, path });
    start = index + 1;
  }
  return records;
}

function trackedTreeInventory(repositoryRoot, commit) {
  return listTree(repositoryRoot, commit).map(({ mode, type, oid, path }) => {
    if (type !== "blob" || !["100644", "100755", "120000"].includes(mode)) {
      throw new Error(`unsupported tracked object ${type} ${mode} at ${path}`);
    }
    const bytes = fileAtCommit(repositoryRoot, commit, path);
    return {
      path,
      mode,
      git_type: type,
      git_oid: oid,
      sha256: canonicalHash(bytes),
      byte_length: bytes.length,
    };
  });
}

function materializeCommit(repositoryRoot, commit, destination, runtime) {
  if (canonicalHash(readFileSync(runtime.git.executable_path)) !== runtime.git.executable_sha256) {
    throw new Error("Git differs from its recorded executable bytes");
  }
  const cloned = spawnSync(runtime.git.executable_path, [
    "clone",
    "--quiet",
    "--local",
    "--no-hardlinks",
    "--no-checkout",
    repositoryRoot,
    destination,
  ], {
    env: gitEnvironment(runtime.git.executable_path),
    encoding: "utf8",
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
  });
  if (cloned.status !== 0) {
    throw new Error(`exact review repository could not be cloned: ${cloned.stderr || cloned.stdout}`);
  }
  const checkedOut = spawnSync(runtime.git.executable_path, ["checkout", "--quiet", "--detach", commit], {
    cwd: destination,
    env: gitEnvironment(runtime.git.executable_path),
    encoding: "utf8",
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
  });
  if (checkedOut.status !== 0) {
    throw new Error(`exact reviewed commit could not be checked out: ${checkedOut.stderr || checkedOut.stdout}`);
  }
  // Clone does not inherit the source repository's LFS cache or filter config.
  // Materialize only the object named by the committed pointer, offline.
  const commonGitDirectory = resolve(repositoryRoot, git(repositoryRoot, ["rev-parse", "--git-common-dir"]));
  for (const entry of listTree(repositoryRoot, commit)) {
    if (entry.type !== "blob" || !["100644", "100755"].includes(entry.mode)) continue;
    const committedBytes = fileAtCommit(repositoryRoot, commit, entry.path);
    const pointer = lfsPointer(committedBytes);
    if (!pointer) continue;
    const objectPath = resolve(commonGitDirectory, "lfs/objects", pointer.oid.slice(0, 2), pointer.oid.slice(2, 4), pointer.oid);
    let bytes;
    try {
      const stat = lstatSync(objectPath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular object");
      bytes = readFileSync(objectPath);
    } catch (error) {
      throw new Error(`retained LFS object unavailable for ${entry.path}: ${error.message}`);
    }
    if (!retainedFileMatches(committedBytes, bytes)) throw new Error(`retained LFS object hash or size differs for ${entry.path}`);
    writeFileSync(resolve(destination, entry.path), bytes);
  }
}

function runCommand(command, sandbox, environment, runtime) {
  const executableRecord = runtime[command.argv[0]];
  if (!executableRecord?.executable_path ||
      canonicalHash(readFileSync(executableRecord.executable_path)) !==
        executableRecord.executable_sha256) {
    throw new Error(`${command.argv[0]} differs from its recorded executable bytes`);
  }
  const executable = executableRecord.executable_path;
  const cwd = resolve(sandbox, command.cwd);
  const fromSandbox = relative(sandbox, cwd);
  if (fromSandbox === ".." || fromSandbox.startsWith(`..${sep}`) || isAbsolute(fromSandbox)) {
    throw new Error("command cwd escapes the review sandbox");
  }
  const env = {
    PATH: process.env.PATH || "/usr/bin:/bin",
    ...Object.fromEntries(Object.entries(environment).map(([key, value]) => [
      key,
      value.replaceAll("$REVIEW_SANDBOX", sandbox),
    ])),
  };
  const startedAt = new Date().toISOString();
  const result = spawnSync(executable, command.argv.slice(1), {
    cwd,
    env,
    encoding: null,
    timeout: command.timeout_ms,
    maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
  });
  const finishedAt = new Date().toISOString();
  return {
    command_id: command.command_id,
    command_contract_sha256: command.command_contract_sha256,
    started_at: startedAt,
    finished_at: finishedAt,
    exit_code: result.status,
    signal: result.signal,
    stdout: streamRecord(result.stdout || Buffer.alloc(0)),
    stderr: streamRecord(result.stderr || Buffer.alloc(0)),
    spawn_error: result.error ? String(result.error.message || result.error) : null,
  };
}

function runtimeExecutables(runtime) {
  return [['node', 'node'], ['npm', 'npm'], ['git', 'git'], ['python3', 'python3'], ['unzip', 'unzip'], ['sh', 'sh'],
    ...(runtime.git_lfs ? [['git_lfs', 'git-lfs']] : [])];
}
function prepareRuntimeControls(sandbox, runtime) {
  const cache = resolve(sandbox, ".npm-cache");
  const toolchain = resolve(sandbox, ".review-toolchain");
  mkdirSync(cache, { recursive: true });
  rmSync(toolchain, { recursive: true, force: true });
  mkdirSync(toolchain, { recursive: true });
  writeFileSync(resolve(cache, "empty-user.npmrc"), "", "utf8");
  writeFileSync(resolve(cache, "empty-global.npmrc"), "", "utf8");
  for (const [name, executable] of runtimeExecutables(runtime)) {
    symlinkSync(runtime[name].executable_path, resolve(toolchain, executable));
  }
}

function runtimeControlsUnchanged(sandbox, runtime) {
  const toolchain = resolve(sandbox, ".review-toolchain");
  return runtimeExecutables(runtime).every(([name, executable]) => {
    try {
      const link = resolve(toolchain, executable);
      return lstatSync(link).isSymbolicLink() &&
        realpathSync(link) === runtime[name].executable_path &&
        canonicalHash(readFileSync(realpathSync(link))) === runtime[name].executable_sha256;
    } catch {
      return false;
    }
  });
}

function retainedBytes(path, mode) {
  if (mode === "120000") return Buffer.from(readlinkSync(path));
  return readFileSync(path);
}

function trackedModeMatches(path, mode) {
  const stat = lstatSync(path);
  if (mode === "120000") return stat.isSymbolicLink();
  if (!stat.isFile() || stat.isSymbolicLink()) return false;
  const executable = (stat.mode & 0o111) !== 0;
  return mode === "100755" ? executable : !executable;
}

function trackedTreeUnchanged(repositoryRoot, commit, sandbox) {
  const changed = [];
  for (const entry of listTree(repositoryRoot, commit)) {
    if (entry.type !== "blob") continue;
    const target = resolve(sandbox, entry.path);
    try {
      if (!trackedModeMatches(target, entry.mode) ||
          !retainedFileMatches(fileAtCommit(repositoryRoot, commit, entry.path),
            retainedBytes(target, entry.mode))) changed.push(entry.path);
    } catch {
      changed.push(entry.path);
    }
  }
  return changed;
}

function unexpectedPaths(root, trackedPaths) {
  const unexpected = [];
  const visit = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (path === ".git" || path.startsWith(".git/") ||
          path === "node_modules" || path.startsWith("node_modules/") ||
          path === ".npm-cache" || path.startsWith(".npm-cache/") ||
          path === ".review-toolchain" || path.startsWith(".review-toolchain/")) continue;
      if (entry.isDirectory()) visit(resolve(directory, entry.name), path);
      else if (!trackedPaths.has(path)) unexpected.push(path);
    }
  };
  visit(root);
  return unexpected.sort();
}

function reproduce(repositoryRoot, commit, commands, runtime, generatedOutputs = []) {
  const parent = mkdtempSync(resolve(tmpdir(), "mind-flow-review-freeze-"));
  const sandbox = resolve(parent, runtime.checkout_directory_name);
  try {
    materializeCommit(repositoryRoot, commit, sandbox, runtime);
    const initialChanged = trackedTreeUnchanged(repositoryRoot, commit, sandbox);
    if (initialChanged.length) {
      throw new Error(`detached checkout differs before execution: ${initialChanged.join(", ")}`);
    }
    const commandRuns = commands.map((command) => {
      prepareRuntimeControls(sandbox, runtime);
      const before = trackedTreeUnchanged(repositoryRoot, commit, sandbox);
      if (before.length) throw new Error(`tracked tree drift before ${command.command_id}`);
      const run = runCommand(command, sandbox, runtime.command_environment, runtime);
      const after = trackedTreeUnchanged(repositoryRoot, commit, sandbox);
      return {
        ...run,
        tracked_tree_unchanged_before: true,
        tracked_tree_unchanged_after: after.length === 0,
        runtime_controls_unchanged: runtimeControlsUnchanged(sandbox, runtime),
      };
    });
    const changed = trackedTreeUnchanged(repositoryRoot, commit, sandbox);
    const trackedPaths = new Set(listTree(repositoryRoot, commit).map(({ path }) => path));
    for (const path of generatedOutputs) trackedPaths.add(closedPath(path, "generated output"));
    const unexpected = unexpectedPaths(sandbox, trackedPaths);
    const passed = commandRuns.every(({
      exit_code,
      spawn_error: error,
      tracked_tree_unchanged_before: before,
      tracked_tree_unchanged_after: after,
      runtime_controls_unchanged: controls,
    }) => exit_code === 0 && error === null && before && after && controls) &&
      changed.length === 0 && unexpected.length === 0;
    return {
      status: passed ? "passed" : "failed",
      detached_checkout: true,
      execution_boundary: structuredClone(EXECUTION_BOUNDARY),
      command_runs: commandRuns,
      post_run_tracked_tree_unchanged: changed.length === 0,
      changed_tracked_paths: changed,
      unexpected_paths: unexpected,
    };
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

function policyProjection(policy) {
  return {
    schema_version: policy.schema_version,
    policy_id: policy.policy_id,
    policy_version: policy.policy_version,
    review_round: policy.review_round,
    reviewed_ref: policy.reviewed_ref,
    required_files: policy.required_files,
    build_commands: policy.build_commands.map(commandRecord),
    ...(policy.generated_outputs ? { generated_outputs: policy.generated_outputs.map((path) => closedPath(path, "generated output")) } : {}),
  };
}

export function createReviewFreeze({
  repositoryRoot = defaultRepositoryRoot,
  commit = "HEAD",
  policy = ROUND_04_REVIEW_POLICY,
  createdAt,
  executeCommands = false,
} = {}) {
  const reviewedCommit = exactCommit(repositoryRoot, commit);
  const tree = git(repositoryRoot, ["rev-parse", `${reviewedCommit}^{tree}`]);
  const commitTime = git(repositoryRoot, ["show", "-s", "--format=%cI", reviewedCommit]);
  const gitObjectFormat = git(repositoryRoot, ["rev-parse", "--show-object-format"]);
  const requiredFiles = policy.required_files.map((required) =>
    fileRecord(repositoryRoot, reviewedCommit, required));
  const trackedTree = trackedTreeInventory(repositoryRoot, reviewedCommit);
  const buildCommands = policy.build_commands.map(commandRecord);
  const edition = freezeEdition(policy);
  const runtime = runtimeInputs(repositoryRoot, reviewedCommit, edition);
  const reproduction = executeCommands
    ? reproduce(repositoryRoot, reviewedCommit, buildCommands, runtime, policy.generated_outputs)
    : {
        status: "not-run",
        detached_checkout: true,
        execution_boundary: structuredClone(EXECUTION_BOUNDARY),
        command_runs: [],
        post_run_tracked_tree_unchanged: null,
        changed_tracked_paths: [],
        unexpected_paths: [],
      };
  const freezeCreatedAt = createdAt ?? new Date().toISOString();
  const generatorBytes = readFileSync(fileURLToPath(import.meta.url));
  const reviewedGenerator = requiredFiles.find(({ path }) =>
    path === "meta/review-freeze/review-freeze.mjs");
  const reviewedGeneratorSchema = requiredFiles.find(({ path }) =>
    path === edition.path);
  const manifest = {
    schema_version: edition.version,
    freeze_id: policy.policy_id === 'review-freeze.round-10' ? `round-10.review-inputs.${randomUUID()}` : `${policy.review_round}.review-inputs`,
    status: "review-inputs-frozen",
    created_at: freezeCreatedAt,
    generator: {
      id: "mind-flow.review-freeze",
      version: edition.version,
      path: "meta/review-freeze/review-freeze.mjs",
      sha256: reviewedGenerator?.sha256 ?? canonicalHash(generatorBytes),
      schema_path: edition.path,
      schema_sha256: reviewedGeneratorSchema?.sha256 ?? canonicalHash(edition.bytes),
    },
    review_target: {
      ref: policy.reviewed_ref,
      commit: reviewedCommit,
      tree,
      commit_time: commitTime,
      git_object_format: gitObjectFormat,
    },
    policy: {
      id: policy.policy_id,
      version: policy.policy_version,
      checksum: canonicalHash(policyProjection(policy)),
    },
    tracked_tree: trackedTree,
    required_files: requiredFiles,
    build_commands: buildCommands,
    runtime_inputs: runtime,
    reproduction,
    creator_reported_local_reproduction_passed: reproduction.status === "passed" &&
      reproduction.post_run_tracked_tree_unchanged === true &&
      reproduction.unexpected_paths.length === 0 &&
      reproduction.command_runs.every((run) =>
        run.tracked_tree_unchanged_before === true &&
        run.tracked_tree_unchanged_after === true &&
        run.runtime_controls_unchanged === true),
    boundaries: structuredClone(BOUNDARIES),
  };
  return { ...manifest, freeze_hash: canonicalHash(manifest) };
}

function issue(code, path, message) {
  return { code, path, message };
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function verifyStream(stream, path, errors) {
  try {
    const encoded = stream?.bytes_base64 || "";
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.toString("base64") !== encoded ||
        !HASH.test(stream?.sha256 || "") || stream.byte_length !== bytes.length ||
        stream.sha256 !== canonicalHash(bytes)) {
      errors.push(issue("COMMAND_OUTPUT_DRIFT", path, "retained command output bytes do not match their digest and length"));
    }
  } catch (error) {
    errors.push(issue("COMMAND_OUTPUT_DRIFT", path, error.message));
  }
}

export function verifyReviewFreeze(manifest, {
  repositoryRoot = defaultRepositoryRoot,
  policy = ROUND_04_REVIEW_POLICY,
  requireWorkingTree = false,
  requireRuntimeParity = false,
  requireGeneratorParity = false,
} = {}) {
  const errors = [];
  const edition = freezeEdition(policy);
  if (!edition.validate(manifest)) {
    for (const error of edition.validate.errors ?? []) {
      errors.push(issue(
        "FREEZE_SCHEMA_INVALID",
        error.instancePath || "/",
        error.message || "review freeze does not match its closed schema",
      ));
    }
  }
  const withoutHash = Object.fromEntries(
    Object.entries(manifest || {}).filter(([key]) => key !== "freeze_hash"),
  );
  if (!HASH.test(manifest?.freeze_hash || "") || manifest.freeze_hash !== canonicalHash(withoutHash)) {
    errors.push(issue("FREEZE_HASH_MISMATCH", "/freeze_hash", "freeze content differs from its content address"));
  }
  if (manifest?.schema_version !== edition.version || manifest?.status !== "review-inputs-frozen") {
    errors.push(issue("FREEZE_SCHEMA_INVALID", "/", "review freeze identity or status is invalid"));
  }
  if (!same(manifest?.boundaries, BOUNDARIES)) {
    errors.push(issue("BOUNDARY_MISMATCH", "/boundaries", "a review freeze cannot create approval, truth, authority, action, publication or recruitment permission"));
  }
  const generator = {
    id: "mind-flow.review-freeze",
    version: edition.version,
    path: "meta/review-freeze/review-freeze.mjs",
    sha256: canonicalHash(readFileSync(fileURLToPath(import.meta.url))),
    schema_path: edition.path,
    schema_sha256: canonicalHash(edition.bytes),
  };
  if (requireGeneratorParity && !same(manifest?.generator, generator)) {
    errors.push(issue("GENERATOR_DRIFT", "/generator", "generator identity or bytes differ from the verifier"));
  }
  const requiredEntries = Array.isArray(manifest?.required_files)
    ? manifest.required_files
    : [];
  const requiredByPath = new Map(requiredEntries.map((entry) => [entry?.path, entry]));
  const policyRequiresGenerator = policy.required_files.some(({ path }) =>
    path === generator.path);
  const policyRequiresSchema = policy.required_files.some(({ path }) =>
    path === generator.schema_path);
  if ((policyRequiresGenerator &&
      manifest?.generator?.sha256 !== requiredByPath.get(generator.path)?.sha256) ||
      (policyRequiresSchema &&
      manifest?.generator?.schema_sha256 !== requiredByPath.get(generator.schema_path)?.sha256)) {
    errors.push(issue(
      "GENERATOR_TARGET_DRIFT",
      "/generator",
      "generator or schema identity does not match its required bytes in the reviewed commit",
    ));
  }
  if (!same(manifest?.policy, {
    id: policy.policy_id,
    version: policy.policy_version,
    checksum: canonicalHash(policyProjection(policy)),
  })) {
    errors.push(issue("REVIEW_POLICY_MISMATCH", "/policy", "freeze policy identity or content has drifted"));
  }
  if (policy.policy_id === 'review-freeze.round-10'
    ? !round10ExecutionId.test(manifest?.freeze_id ?? '')
    : manifest?.freeze_id !== `${policy.review_round}.review-inputs`) {
    errors.push(issue("REVIEW_POLICY_MISMATCH", "/freeze_id", "freeze identity does not match the selected review round"));
  }
  const expectedCommands = policy.build_commands.map(commandRecord);
  if (!same(manifest?.build_commands, expectedCommands)) {
    errors.push(issue("REVIEW_POLICY_MISMATCH", "/build_commands", "required build commands were removed, reordered or changed"));
  }
  if (!same(
    (manifest?.required_files || []).map(({ path, role }) => ({ path, role })),
    policy.required_files,
  )) {
    errors.push(issue("REVIEW_POLICY_MISMATCH", "/required_files", "required review files were removed, reordered or relabelled"));
  }

  const commit = manifest?.review_target?.commit;
  try {
    const exact = exactCommit(repositoryRoot, commit);
    const tree = git(repositoryRoot, ["rev-parse", `${exact}^{tree}`]);
    const commitTime = git(repositoryRoot, ["show", "-s", "--format=%cI", exact]);
    const objectFormat = git(repositoryRoot, ["rev-parse", "--show-object-format"]);
    if (exact !== commit || tree !== manifest.review_target.tree ||
        commitTime !== manifest.review_target.commit_time ||
        objectFormat !== manifest.review_target.git_object_format ||
        manifest.review_target.ref !== policy.reviewed_ref) {
      errors.push(issue("REVIEW_COMMIT_MISMATCH", "/review_target", "reviewed commit or complete tree differs from the freeze"));
    }
    const createdAt = Date.parse(manifest?.created_at);
    const committedAt = Date.parse(commitTime);
    if (!Number.isFinite(createdAt) || createdAt < committedAt || createdAt > Date.now() + 300_000) {
      errors.push(issue(
        "FREEZE_CHRONOLOGY_INVALID",
        "/created_at",
        "freeze creation time precedes the reviewed commit or is more than five minutes in the verifier future",
      ));
    }
    for (const [index, required] of policy.required_files.entries()) {
      const expected = fileRecord(repositoryRoot, exact, required);
      if (!same(manifest.required_files?.[index], expected)) {
        errors.push(issue("REVIEWED_FILE_DRIFT", `/required_files/${index}`, `${required.path} differs from the reviewed commit`));
      }
    }
    const expectedTrackedTree = trackedTreeInventory(repositoryRoot, exact);
    if (!same(manifest?.tracked_tree, expectedTrackedTree)) {
      errors.push(issue(
        "TRACKED_TREE_DRIFT",
        "/tracked_tree",
        "canonical SHA-256 path, mode, type and content inventory differs from the reviewed commit",
      ));
    }
    const lock = fileAtCommit(repositoryRoot, exact, "package-lock.json");
    if (requireRuntimeParity) {
      const currentRuntime = runtimeInputs(repositoryRoot, exact, edition);
      const executableNames = runtimeExecutables(currentRuntime).map(([name]) => name);
      const runtimeMatches = executableNames.every((name) =>
        same(manifest?.runtime_inputs?.[name], currentRuntime[name])) &&
        same(manifest?.runtime_inputs?.operating_system, currentRuntime.operating_system);
      if (!runtimeMatches) {
        errors.push(issue(
          "RUNTIME_INPUT_DRIFT",
          "/runtime_inputs",
          "recorded executable bytes, versions or operating system differ from this verifier environment",
        ));
      }
    }
    if (manifest?.runtime_inputs?.checkout_directory_name !== "mind-flow" ||
        !same(manifest?.runtime_inputs?.command_environment, FIXED_COMMAND_ENVIRONMENT)) {
      errors.push(issue("RUNTIME_INPUT_DRIFT", "/runtime_inputs/command_environment", "fixed command environment differs from the review policy"));
    }
    if (!same(manifest?.runtime_inputs?.package_lock, {
      path: "package-lock.json",
      sha256: canonicalHash(lock),
      byte_length: lock.length,
    })) {
      errors.push(issue("RUNTIME_INPUT_DRIFT", "/runtime_inputs/package_lock", "dependency lock differs from the reviewed commit"));
    }
    if (requireWorkingTree) {
      const head = exactCommit(repositoryRoot, "HEAD");
      const status = git(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
      if (head !== exact || status !== "") {
        errors.push(issue("REVIEW_COMMIT_MISMATCH", "/review_target/commit", "working checkout is not the exact clean reviewed commit"));
      }
      for (const [index, expected] of (manifest.required_files || []).entries()) {
        try {
          const path = resolve(repositoryRoot, expected.path);
          const fromRoot = relative(repositoryRoot, path);
          if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot) ||
              !retainedFileMatches(fileAtCommit(repositoryRoot, exact, expected.path), readFileSync(path))) {
            errors.push(issue("REVIEWED_FILE_DRIFT", `/required_files/${index}`, `${expected.path} differs in the working checkout`));
          }
        } catch (error) {
          errors.push(issue("REVIEWED_FILE_DRIFT", `/required_files/${index}`, error.message));
        }
      }
    }
  } catch (error) {
    errors.push(issue("REVIEW_COMMIT_MISMATCH", "/review_target", error.message));
  }

  const reproduction = manifest?.reproduction;
  const runs = Array.isArray(reproduction?.command_runs)
    ? reproduction.command_runs
    : [];
  if (!Array.isArray(reproduction?.command_runs)) {
    errors.push(issue(
      "REPRODUCTION_MISMATCH",
      "/reproduction/command_runs",
      "command receipts must be an ordered array",
    ));
  }
  for (const [index, run] of runs.entries()) {
    const command = manifest.build_commands?.[index];
    if (!command || run.command_contract_sha256 !== command.command_contract_sha256) {
      errors.push(issue("COMMAND_RECEIPT_MISMATCH", `/reproduction/command_runs/${index}`, "command run does not resolve to the frozen command contract"));
    }
    if (run.command_id !== command?.command_id) {
      errors.push(issue("COMMAND_RECEIPT_MISMATCH", `/reproduction/command_runs/${index}/command_id`, "command receipt order or identity differs from the frozen commands"));
    }
    verifyStream(run.stdout, `/reproduction/command_runs/${index}/stdout`, errors);
    verifyStream(run.stderr, `/reproduction/command_runs/${index}/stderr`, errors);
    const started = Date.parse(run.started_at);
    const finished = Date.parse(run.finished_at);
    const captured = Date.parse(manifest.created_at);
    if (!Number.isFinite(started) || !Number.isFinite(finished) ||
        started > finished || finished > captured ||
        (run.exit_code !== null && run.signal !== null) ||
        (run.exit_code === 0 && (run.signal !== null || run.spawn_error !== null))) {
      errors.push(issue(
        "COMMAND_RECEIPT_MISMATCH",
        `/reproduction/command_runs/${index}`,
        "command receipt chronology or exit, signal and spawn state is impossible",
      ));
    }
  }
  const isNotRun = reproduction?.status === "not-run";
  const receiptCountIsValid = isNotRun
    ? runs.length === 0
    : runs.length === expectedCommands.length;
  const commandsPassed = receiptCountIsValid && runs.every(({ exit_code: code, spawn_error: error }) =>
    code === 0 && error === null);
  const trackedTreeStateIsValid = isNotRun
    ? reproduction?.post_run_tracked_tree_unchanged === null &&
      reproduction?.changed_tracked_paths?.length === 0 &&
      reproduction?.unexpected_paths?.length === 0
    : reproduction?.post_run_tracked_tree_unchanged ===
      (reproduction?.changed_tracked_paths?.length === 0);
  const expectedReproductionStatus = isNotRun
    ? "not-run"
    : commandsPassed && reproduction?.post_run_tracked_tree_unchanged === true &&
      reproduction?.unexpected_paths?.length === 0 && runs.every((run) =>
        run.tracked_tree_unchanged_before === true &&
        run.tracked_tree_unchanged_after === true &&
        run.runtime_controls_unchanged === true)
      ? "passed"
      : "failed";
  if (!receiptCountIsValid || !trackedTreeStateIsValid ||
      reproduction?.status !== expectedReproductionStatus ||
      reproduction?.detached_checkout !== true ||
      !same(reproduction?.execution_boundary, EXECUTION_BOUNDARY)) {
    errors.push(issue("REPRODUCTION_MISMATCH", "/reproduction", "reproduction state is inconsistent with its frozen commands, receipts or tree evidence"));
  }
  const expectedLocalReport = reproduction?.status === "passed" &&
    reproduction?.post_run_tracked_tree_unchanged === true &&
    reproduction?.unexpected_paths?.length === 0 && runs.every((run) =>
      run.tracked_tree_unchanged_before === true &&
      run.tracked_tree_unchanged_after === true &&
      run.runtime_controls_unchanged === true);
  if (manifest?.creator_reported_local_reproduction_passed !== expectedLocalReport) {
    errors.push(issue("REPRODUCTION_MISMATCH", "/creator_reported_local_reproduction_passed", "creator-reported local result must be derived from retained receipts"));
  }
  return { valid: errors.length === 0, errors };
}

function parseOption(arguments_, name, fallback) {
  const prefix = `--${name}=`;
  return arguments_.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function usage() {
  return "Usage: node meta/review-freeze/review-freeze.mjs create --output=<path> [--policy=round-04|round-06|round-07|round-08|round-09-initial|round-09|round-09.1|round-10] [--commit=<ref>] [--run] [--force]\n" +
    "       node meta/review-freeze/review-freeze.mjs verify --manifest=<path> [--policy=round-04|round-06|round-07|round-08|round-09-initial|round-09|round-09.1|round-10] [--checkout] [--runtime-parity] [--generator-parity] [--allow-failed-reproduction]\n";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [operation, ...arguments_] = process.argv.slice(2);
  try {
    if (operation === "create") {
      const output = parseOption(arguments_, "output");
      if (!output) throw new Error("create requires --output=<path>");
      const manifest = createReviewFreeze({
        repositoryRoot: defaultRepositoryRoot,
        commit: parseOption(arguments_, "commit", "HEAD"),
        policy: reviewPolicyFor(parseOption(arguments_, "policy", "round-04")),
        executeCommands: arguments_.includes("--run"),
      });
      const outputPath = resolveReviewOutput(defaultRepositoryRoot, output, {
        force: arguments_.includes("--force"),
      });
      writeReviewFreezeAtomically(outputPath, manifest);
      process.stdout.write(`${manifest.freeze_hash} ${manifest.review_target.commit} ${manifest.reproduction.status}\n`);
      if (manifest.reproduction.status === "failed") process.exitCode = 2;
    } else if (operation === "verify") {
      const manifestPath = parseOption(arguments_, "manifest");
      if (!manifestPath) throw new Error("verify requires --manifest=<path>");
      const manifest = JSON.parse(readFileSync(resolve(defaultRepositoryRoot, manifestPath), "utf8"));
      const result = verifyReviewFreeze(manifest, {
        repositoryRoot: defaultRepositoryRoot,
        policy: reviewPolicyFor(parseOption(arguments_, "policy", "round-04")),
        requireWorkingTree: arguments_.includes("--checkout"),
        requireRuntimeParity: arguments_.includes("--runtime-parity"),
        requireGeneratorParity: arguments_.includes("--generator-parity"),
      });
      if (!result.valid) {
        for (const error of result.errors) {
          process.stderr.write(`${error.code} ${error.path}: ${error.message}\n`);
        }
        process.exitCode = 1;
      } else if (
        manifest.reproduction.status !== "passed" &&
        !arguments_.includes("--allow-failed-reproduction")
      ) {
        process.stderr.write(
          `integrity verified, but reproduction did not pass: ${manifest.reproduction.status}\n`,
        );
        process.exitCode = 2;
      } else {
        process.stdout.write(
          `verified ${manifest.freeze_hash} reproduction=${manifest.reproduction.status}\n`,
        );
      }
    } else {
      process.stderr.write(usage());
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`review freeze failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
