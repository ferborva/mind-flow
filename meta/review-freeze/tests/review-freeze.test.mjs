import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  ROUND_04_REVIEW_POLICY,
  ROUND_06_REVIEW_POLICY,
  ROUND_07_REVIEW_POLICY,
  canonicalHash,
  createReviewFreeze,
  executableRecord,
  executablePath,
  reviewPolicyFor,
  resolveReviewOutput,
  verifyReviewFreeze,
  writeReviewFreezeAtomically,
} from "../review-freeze.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
// Historical policies retain the generated files that were tracked then.
// Their coverage is checked at the retained candidate, never today's HEAD.
const historicalCandidate = JSON.parse(readFileSync(resolve(repositoryRoot,
  "meta/review-freeze/round-07.review-freeze.json"), "utf8")).review_target.commit;

test("freeze schema and audit keep integrity separate from review approval", () => {
  const schema = JSON.parse(readFileSync(resolve(
    repositoryRoot,
    "meta/review-freeze/review-freeze.schema.json",
  ), "utf8"));
  for (const field of [
    "review_target",
    "tracked_tree",
    "required_files",
    "build_commands",
    "runtime_inputs",
    "reproduction",
    "boundaries",
    "creator_reported_local_reproduction_passed",
    "freeze_hash",
  ]) {
    assert.ok(schema.required.includes(field), `${field} is not required by the freeze schema`);
  }
  assert.equal(schema.properties.boundaries.properties.review_approval.const, "not-granted");
  assert.equal(schema.properties.boundaries.properties.empirical_truth_established.const, false);
  assert.equal(schema.properties.boundaries.properties.legal_authority_created.const, false);
  assert.equal(schema.properties.boundaries.properties.operator_clock_authenticated.const, false);
  assert.equal(schema.properties.boundaries.properties.safe_to_execute_on_host.const, false);

  const audit = readFileSync(resolve(repositoryRoot, "meta/review-freeze/README.md"), "utf8");
  for (const boundary of [
    /moving branch/i,
    /complete Git tree/i,
    /argv/i,
    /command output/i,
    /runtime inputs/i,
    /does not authenticate/i,
  ]) assert.match(audit, boundary);
});

test("CLI output stays inside the repository and does not overwrite by default", () => {
  const root = mkdtempSync(resolve(tmpdir(), "mind-flow-freeze-output-"));
  try {
    mkdirSync(resolve(root, "review"), { recursive: true });
    const output = resolveReviewOutput(root, "review/freeze.json");
    assert.equal(output, resolve(realpathSync(resolve(root, "review")), "freeze.json"));
    write(output, "existing\n");
    assert.throws(() => resolveReviewOutput(root, "review/freeze.json"), /already exists/i);
    assert.equal(resolveReviewOutput(root, "review/freeze.json", { force: true }), output);
    assert.throws(() => resolveReviewOutput(root, "../outside.json"), /closed repository-relative/i);
    assert.throws(() => resolveReviewOutput(root, resolve(root, "outside.json")), /closed repository-relative/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("canonical hashes follow JSON omission and array-null semantics", () => {
  assert.equal(canonicalHash({ a: 1, omitted: undefined }), canonicalHash({ a: 1 }));
  assert.equal(
    canonicalHash([1, undefined, , 3]),
    canonicalHash([1, null, null, 3]),
  );
});

test("review-freeze manifests are published through an atomic same-directory write", () => {
  const root = mkdtempSync(resolve(tmpdir(), "mind-flow-freeze-atomic-"));
  try {
    const output = resolve(root, "freeze.json");
    const manifest = { freeze_id: "atomic-test", nested: { value: true } };
    writeReviewFreezeAtomically(output, manifest);
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), manifest);
    assert.deepEqual(readdirSync(root), ["freeze.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("executable discovery works inside the restricted toolchain without which", () => {
  const root = mkdtempSync(resolve(tmpdir(), "mind-flow-toolchain-test-"));
  const previousPath = process.env.PATH;
  try {
    const gitPath = executablePath("git");
    symlinkSync(gitPath, resolve(root, "git"));
    process.env.PATH = root;
    assert.equal(executablePath("git"), gitPath);
  } finally {
    process.env.PATH = previousPath;
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unsupported version flag is recorded honestly when executable bytes are available", () => {
  const record = executableRecord(
    "sh",
    ["-c", "printf 'unsupported version probe\\n' >&2; exit 2"],
    "/bin/sh",
    { allowUnsupportedVersion: true },
  );
  assert.match(record.version, /version unavailable \(probe exit 2\)/i);
  assert.match(record.version, /unsupported version probe/i);
  assert.match(record.executable_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.throws(() => executableRecord(
    "sh",
    ["-c", "exit 2"],
    "/bin/sh",
  ), /version could not be recorded/i);
});

function command(cwd, argv) {
  const result = spawnSync(argv[0], argv.slice(1), { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(path, content) {
  writeFileSync(path, content, "utf8");
}

function reseal(manifest) {
  manifest.freeze_hash = canonicalHash(
    Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== "freeze_hash")),
  );
  return manifest;
}

function fixtureRepository() {
  const root = mkdtempSync(resolve(tmpdir(), "mind-flow-review-freeze-test-"));
  command(root, ["git", "init", "--quiet"]);
  mkdirSync(resolve(root, ".github/workflows"), { recursive: true });
  mkdirSync(resolve(root, "meta/review-freeze"), { recursive: true });
  write(resolve(root, ".gitignore"), "node_modules/\n");
  write(resolve(root, ".github/workflows/integrity.yml"), "name: fixture\n");
  write(resolve(root, "package.json"), '{"name":"freeze-fixture","private":true}\n');
  write(resolve(root, "package-lock.json"), '{"name":"freeze-fixture","lockfileVersion":3,"packages":{}}\n');
  write(resolve(root, "meta/review-freeze/review-freeze.mjs"), "fixture generator\n");
  write(resolve(root, "meta/review-freeze/review-freeze.schema.json"), "{}\n");
  write(
    resolve(root, "build.mjs"),
    'process.stdout.write(process.argv.includes("--check") ? "checked\\n" : "unexpected\\n");\n',
  );
  command(root, [
    "git", "add", ".gitignore", ".github/workflows/integrity.yml",
    "package.json", "package-lock.json", "build.mjs", "meta/review-freeze/review-freeze.mjs",
    "meta/review-freeze/review-freeze.schema.json",
  ]);
  command(root, [
    "git",
    "-c", "user.name=Freeze Test",
    "-c", "user.email=freeze@example.invalid",
    "commit", "--quiet", "-m", "fixture",
  ]);
  return root;
}

function fixturePolicy(commands = [{
  command_id: "build-check",
  argv: ["node", "build.mjs", "--check"],
  cwd: ".",
}]) {
  return {
    schema_version: "1.0.0",
    policy_id: "review-freeze.fixture",
    policy_version: "1.0.0",
    review_round: "round-fixture",
    reviewed_ref: "fixture/ref",
    required_files: [
      { path: "package.json", role: "package command contract" },
      { path: "package-lock.json", role: "dependency lock" },
      { path: "build.mjs", role: "review build" },
    ],
    build_commands: commands,
  };
}

test("detached reproduction hydrates retained LFS bytes and rejects missing or altered objects", () => {
  const root = fixtureRepository();
  try {
    const bytes = Buffer.from("retained source fixture\n");
    const oid = canonicalHash(bytes).slice(7);
    const pointer = `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${bytes.length}\n`;
    write(resolve(root, "source.dat"), pointer);
    command(root, ["git", "add", "source.dat"]);
    command(root, ["git", "-c", "user.name=Freeze Test", "-c", "user.email=freeze@example.invalid", "commit", "--quiet", "-m", "retained pointer"]);
    const policy = fixturePolicy([{
      command_id: "retained-byte-check",
      argv: ["node", "-e", "const fs = require('node:fs'); if (fs.readFileSync('source.dat', 'utf8') !== 'retained source fixture\\n') process.exit(2)"],
    }]);
    policy.required_files.push({ path: "source.dat", role: "retained input" });
    const objectPath = resolve(root, ".git/lfs/objects", oid.slice(0, 2), oid.slice(2, 4), oid);
    mkdirSync(resolve(objectPath, ".."), { recursive: true });
    write(objectPath, bytes);
    const manifest = createReviewFreeze({ repositoryRoot: root, policy, executeCommands: true });
    assert.equal(manifest.reproduction.status, "passed");
    assert.equal(manifest.required_files.at(-1).sha256, canonicalHash(Buffer.from(pointer)));
    write(objectPath, "changed source\n");
    assert.throws(() => createReviewFreeze({ repositoryRoot: root, policy, executeCommands: true }), /LFS.*(hash|size|bytes)/i);
    rmSync(objectPath);
    assert.throws(() => createReviewFreeze({ repositoryRoot: root, policy, executeCommands: true }), /LFS.*(missing|unavailable)/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("only policy-bound generated outputs are expected in detached reproduction", () => {
  const root = fixtureRepository();
  try {
    const policy = fixturePolicy([{
      command_id: "render",
      argv: ["node", "-e", "require('node:fs').writeFileSync('rendered.html', '<p>fixture</p>')"],
    }]);
    const rejected = createReviewFreeze({ repositoryRoot: root, policy, executeCommands: true });
    assert.equal(rejected.reproduction.status, "failed");
    assert.deepEqual(rejected.reproduction.unexpected_paths, ["rendered.html"]);
    policy.generated_outputs = ["rendered.html"];
    const accepted = createReviewFreeze({ repositoryRoot: root, policy, executeCommands: true });
    assert.equal(accepted.reproduction.status, "passed");
    assert.notEqual(accepted.policy.checksum, rejected.policy.checksum);
    assert.equal(verifyReviewFreeze(accepted, { repositoryRoot: root, policy: fixturePolicy(policy.build_commands) }).valid, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Round 04 policy freezes the brief, build surface and complete review target", () => {
  const manifest = createReviewFreeze({
    repositoryRoot,
    commit: historicalCandidate,
    policy: ROUND_04_REVIEW_POLICY,
    executeCommands: false,
  });
  const paths = new Set(manifest.required_files.map(({ path }) => path));
  for (const path of [
    "meta/round-04-external-review-brief.md",
    "package.json",
    "package-lock.json",
    "integration/transition-bundle/fixtures/round-04.worker-option.complete.json",
    "integration/transition-bundle/tools/build-round-04-core.mjs",
    "dashboard/observatory/build.mjs",
    "experiments/observatory-comparison/fixtures/build-round-04-fixtures.mjs",
  ]) {
    assert.equal(paths.has(path), true, `${path} is absent from the freeze policy`);
  }
  assert.deepEqual(
    manifest.build_commands.map(({ argv }) => argv),
    ROUND_04_REVIEW_POLICY.build_commands.map(({ argv }) => argv),
  );
  assert.equal(manifest.build_commands.every(({ timeout_ms }) => timeout_ms > 0), true);
  assert.match(manifest.review_target.commit, /^[a-f0-9]{40,64}$/);
  assert.match(manifest.review_target.tree, /^[a-f0-9]{40,64}$/);
  assert.match(manifest.review_target.commit_time, /Z$|[+-]\d\d:\d\d$/);
  assert.equal(manifest.generator.schema_path, "meta/review-freeze/review-freeze.schema.json");
  assert.match(manifest.generator.schema_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(manifest.tracked_tree.length > manifest.required_files.length, true);
  assert.equal(manifest.tracked_tree.every(({ sha256 }) => /^sha256:[a-f0-9]{64}$/.test(sha256)), true);
  assert.equal(manifest.reproduction.status, "not-run");
  assert.equal(
    manifest.runtime_inputs.command_environment.npm_config_userconfig,
    "$REVIEW_SANDBOX/.npm-cache/empty-user.npmrc",
  );
  assert.equal(
    manifest.runtime_inputs.command_environment.npm_config_globalconfig,
    "$REVIEW_SANDBOX/.npm-cache/empty-global.npmrc",
  );
  assert.equal(
    manifest.runtime_inputs.command_environment.npm_config_registry,
    "https://registry.npmjs.org",
  );
  assert.equal(
    manifest.runtime_inputs.command_environment.npm_config_replace_registry_host,
    "always",
  );
  assert.equal(
    manifest.runtime_inputs.command_environment.PATH,
    "$REVIEW_SANDBOX/.review-toolchain",
  );
  assert.equal(manifest.runtime_inputs.command_environment.npm_config_script_shell, "/bin/sh");
  assert.equal(manifest.runtime_inputs.checkout_directory_name, "mind-flow");
  for (const executable of ["node", "npm", "git", "python3", "unzip", "sh"]) {
    assert.match(manifest.runtime_inputs[executable].executable_sha256, /^sha256:[a-f0-9]{64}$/);
  }
  assert.equal(manifest.boundaries.review_approval, "not-granted");
  assert.equal(manifest.boundaries.empirical_truth_established, false);
  assert.equal(manifest.boundaries.legal_authority_created, false);
  assert.equal(manifest.boundaries.action_authorised, false);
  assert.equal(manifest.boundaries.publication_approved, false);
  assert.equal(manifest.freeze_hash, canonicalHash(
    Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== "freeze_hash")),
  ));
  const schema = JSON.parse(readFileSync(resolve(
    repositoryRoot,
    "meta/review-freeze/review-freeze.schema.json",
  ), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(manifest), true, ajv.errorsText(validate.errors));
  assert.deepEqual(
    verifyReviewFreeze(manifest, { repositoryRoot, policy: ROUND_04_REVIEW_POLICY }),
    { valid: true, errors: [] },
  );
});

test("the retained Round 04 historical freeze still verifies against its immutable target", () => {
  const manifest = JSON.parse(readFileSync(resolve(
    repositoryRoot,
    "meta/review-freeze/round-04.review-freeze.json",
  ), "utf8"));
  assert.equal(
    manifest.review_target.commit,
    "3259dc1bbb755695a89f60a774b4ac9104c702ed",
  );
  assert.equal(manifest.reproduction.status, "passed");
  assert.deepEqual(
    verifyReviewFreeze(manifest, { repositoryRoot, policy: ROUND_04_REVIEW_POLICY }),
    { valid: true, errors: [] },
  );
});

test("the retained Round 06 historical freeze is pinned and verifies against its immutable target", () => {
  const manifest = JSON.parse(readFileSync(resolve(
    repositoryRoot,
    "meta/review-freeze/round-06.review-freeze.json",
  ), "utf8"));
  assert.equal(
    manifest.review_target.commit,
    "318d095c219d1bbec947876cebd982bbc55841d1",
  );
  assert.equal(
    manifest.freeze_hash,
    "sha256:a867ead6bfd743241581af438ecf4dfbea5ccedac0be36d3781ebf32212c69b3",
  );
  assert.equal(manifest.reproduction.status, "passed");
  assert.deepEqual(
    verifyReviewFreeze(manifest, { repositoryRoot, policy: ROUND_06_REVIEW_POLICY }),
    { valid: true, errors: [] },
  );
});

test("the retained Round 07 freeze is pinned and verifies against its immutable target", () => {
  const manifest = JSON.parse(readFileSync(resolve(
    repositoryRoot,
    "meta/review-freeze/round-07.review-freeze.json",
  ), "utf8"));
  assert.equal(
    manifest.review_target.commit,
    "5da6a1a0df6c43d6e76200f71f9298615c9c9f88",
  );
  assert.equal(
    manifest.freeze_hash,
    "sha256:e975ab1d7694d9ffea91465d447fc556c977c56d08b70408f0b2127f05e1ee6a",
  );
  assert.equal(manifest.reproduction.status, "passed");
  assert.deepEqual(
    verifyReviewFreeze(manifest, { repositoryRoot, policy: ROUND_07_REVIEW_POLICY }),
    { valid: true, errors: [] },
  );
});

test("CLI verification fails closed for coherent failed and not-run receipts", () => {
  const source = JSON.parse(readFileSync(resolve(
    repositoryRoot,
    "meta/review-freeze/round-06.review-freeze.json",
  ), "utf8"));
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "mind-flow-freeze-cli-"));
  try {
    const failed = structuredClone(source);
    failed.reproduction.status = "failed";
    failed.reproduction.command_runs[0].exit_code = 7;
    failed.creator_reported_local_reproduction_passed = false;
    reseal(failed);
    const failedPath = resolve(temporaryRoot, "failed.json");
    write(failedPath, `${JSON.stringify(failed)}\n`);

    const notRun = createReviewFreeze({
      repositoryRoot,
      commit: historicalCandidate,
      policy: ROUND_06_REVIEW_POLICY,
      executeCommands: false,
    });
    const notRunPath = resolve(temporaryRoot, "not-run.json");
    write(notRunPath, `${JSON.stringify(notRun)}\n`);

    for (const manifestPath of [failedPath, notRunPath]) {
      const rejected = spawnSync(process.execPath, [
        resolve(repositoryRoot, "meta/review-freeze/review-freeze.mjs"),
        "verify",
        "--policy=round-06",
        `--manifest=${manifestPath}`,
      ], { cwd: repositoryRoot, encoding: "utf8" });
      assert.equal(rejected.status, 2, rejected.stderr || rejected.stdout);
      assert.match(rejected.stderr, /reproduction did not pass/i);

      const inspected = spawnSync(process.execPath, [
        resolve(repositoryRoot, "meta/review-freeze/review-freeze.mjs"),
        "verify",
        "--policy=round-06",
        `--manifest=${manifestPath}`,
        "--allow-failed-reproduction",
      ], { cwd: repositoryRoot, encoding: "utf8" });
      assert.equal(inspected.status, 0, inspected.stderr || inspected.stdout);
      assert.match(inspected.stdout, /reproduction=(failed|not-run)/i);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("Round 06 policy exposes the complete new review surface and uses clean install semantics", () => {
  assert.equal(reviewPolicyFor("round-04"), ROUND_04_REVIEW_POLICY);
  assert.equal(reviewPolicyFor("round-06"), ROUND_06_REVIEW_POLICY);
  assert.equal(reviewPolicyFor("round-07"), ROUND_07_REVIEW_POLICY);
  assert.throws(() => reviewPolicyFor("round-99"), /unknown review policy/i);

  const paths = new Set(ROUND_06_REVIEW_POLICY.required_files.map(({ path }) => path));
  const trackedPaths = new Set(command(repositoryRoot, [
    "git", "ls-tree", "-r", "--name-only", historicalCandidate,
  ]).split("\n"));
  for (const path of paths) {
    assert.equal(trackedPaths.has(path), true, `${path} is not tracked at the review target`);
  }
  for (const path of [
    "meta/round-06-external-review-brief.md",
    "meta/abundance-transition-programme.md",
    "drafts/name-the-if.md",
    "drafts/every-if-is-somebodys-when.md",
    "communications/transition-field-guide.md",
    "pilots/australia/evidence-bridge-protocol.md",
    "pilots/australia/source-manifest.json",
    "pilots/australia/sources/nero/2026-08/capture.json",
    "integration/transition-bundle/condition-change-impact.mjs",
    "governance/negotiation-record/validate.mjs",
    "governance/decision-record/validate.mjs",
    "governance/lineage/validate.mjs",
    "forecasts/prospective-pilot/validate.mjs",
    "forecasts/prospective-pilot/issuance-binding/validate.mjs",
    "forecasts/prospective-pilot/issuance-binding/schema/baseline-calculation.schema.json",
    "forecasts/prospective-pilot/issuance-binding/schema/baseline-input-manifest.schema.json",
    "experiments/observatory-comparison/render-parity.mjs",
    "experiments/observatory-comparison/schema/fact-pack.schema.json",
    "dashboard/observatory/data.js",
  ]) assert.equal(paths.has(path), true, `${path} is absent from the Round 06 policy`);

  const commands = ROUND_06_REVIEW_POLICY.build_commands.map(({ argv }) => argv);
  assert.deepEqual(commands[0], ["npm", "ci"]);
  assert.equal(commands.some((argv) => argv[0] === "npm" && argv[1] === "install"), false);
  assert.equal(commands.some((argv) => argv[0] === "npm" && argv[1] === "test"), true);
  assert.equal(commands.some((argv) =>
    argv.includes("pilots/australia/tools/verify-nero-source-capture.mjs")), true);
  assert.equal(commands.some((argv) =>
    argv.includes("experiments/observatory-comparison/render.mjs")), true);
  assert.equal(commands.some((argv) =>
    argv.includes("experiments/observatory-comparison/tests/rendered-parity.test.mjs")), true);
});

test("Round 07 policy binds the repair ledger, component plan and retest brief", () => {
  assert.equal(ROUND_07_REVIEW_POLICY.review_round, "round-07");
  const paths = new Set(ROUND_07_REVIEW_POLICY.required_files.map(({ path }) => path));
  for (const path of [
    "meta/round-07-external-review-brief.md",
    "reviews/round-06-disposition-ledger.json",
    "reviews/round-07-component-review-manifest.json",
    "contracts/tests/round-06-review-disposition.test.mjs",
    "contracts/tests/round-07-review-plan.test.mjs",
  ]) assert.equal(paths.has(path), true, `${path} is absent from the Round 07 policy`);
  assert.deepEqual(ROUND_07_REVIEW_POLICY.build_commands, ROUND_06_REVIEW_POLICY.build_commands);
});

test("Round 08 policy binds measurements and exact generated outputs without changing historical policy", () => {
  const policy = reviewPolicyFor("round-08");
  assert.equal(policy.reviewed_ref, "ren/round-08");
  for (const path of policy.generated_outputs) {
    assert.equal(policy.required_files.some((entry) => entry.path === path), false);
    assert.doesNotMatch(path, /[*?]/);
  }
  const required = new Set(policy.required_files.map(({ path }) => path));
  for (const path of ["meta/round-08-external-review-brief.md", "reviews/round-08-progress.md",
    "pilots/australia/sources/primary-care/2026-09-09/capture.json",
    "pilots/australia/basket/README.md", "forecasts/prospective-pilot/round-08-nero/README.md",
    "forecasts/prospective-pilot/round-08-nero/issued.json",
    "forecasts/prospective-pilot/round-08-nero/preregistration.json",
    "forecasts/prospective-pilot/round-08-nero/evaluation-plan.json",
    "forecasts/prospective-pilot/round-08-nero/registration-provider-response.base64.txt"]) {
    assert.equal(required.has(path), true, path);
  }
  assert.ok(ROUND_07_REVIEW_POLICY.required_files.some(({ path }) => path === "dashboard/observatory/data.js"));
  assert.ok(policy.build_commands.some(({ argv }) => argv.includes("meta/build-artifacts.mjs") && argv.includes("--check")));
  assert.ok(policy.build_commands.some(({ argv }) => argv.includes("forecasts/prospective-pilot/tests/round-08-nero-issued.test.mjs")));
});

test("Round 09 has its own policy identity and requires measurement, intake and narrative checks", () => {
  const previous = JSON.stringify(reviewPolicyFor('round-08'));
  const policy = reviewPolicyFor('round-09');
  assert.equal(policy.policy_id, 'review-freeze.round-09');
  assert.equal(policy.review_round, 'round-09');
  assert.equal(policy.reviewed_ref, 'ren/round-09');
  const paths = new Set(policy.required_files.map(x => x.path));
  for (const path of [
    'meta/round-09-external-review-brief.md', 'reviews/round-09-progress.md',
    'reviews/round-09-narrative-provenance.md', 'reviews/round-09-forecast-intake.md',
    'pilots/australia/data/primary-care-depth-2026-09-10.r2.json',
    'pilots/australia/data/round-09-evolution-discoveries.json',
    'forecasts/prospective-pilot/round-09-nero/issued.json',
    'forecasts/prospective-pilot/round-09-nero/preregistration.json',
    'forecasts/prospective-pilot/issuance-binding/round-09-validate.mjs',
    'meta/build-artifacts.lock.json',
  ]) assert.ok(paths.has(path), path);
  for (const id of ['measurement-depth-check', 'evolution-discovery-check', 'round-09-prospective-issuance-check', 'round-09-narrative-check']) {
    assert.ok(policy.build_commands.some(c => c.command_id === id), id);
  }
  assert.equal(JSON.stringify(reviewPolicyFor('round-08')), previous);
  assert.equal(new Set(policy.build_commands.map(c => c.command_id)).size, policy.build_commands.length);
  assert.equal(paths.size, policy.required_files.length);
});

test("a reviewed generator and schema are bound to their bytes in the target commit", () => {
  const root = fixtureRepository();
  try {
    const policy = fixturePolicy();
    policy.required_files.push(
      { path: "meta/review-freeze/review-freeze.mjs", role: "review generator" },
      { path: "meta/review-freeze/review-freeze.schema.json", role: "review schema" },
    );
    const manifest = createReviewFreeze({ repositoryRoot: root, policy });
    const requiredByPath = new Map(manifest.required_files.map((entry) => [entry.path, entry]));
    assert.equal(
      manifest.generator.sha256,
      requiredByPath.get("meta/review-freeze/review-freeze.mjs").sha256,
    );
    assert.equal(
      manifest.generator.schema_sha256,
      requiredByPath.get("meta/review-freeze/review-freeze.schema.json").sha256,
    );

    manifest.generator.sha256 = `sha256:${"0".repeat(64)}`;
    reseal(manifest);
    assert.ok(verifyReviewFreeze(manifest, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "GENERATOR_TARGET_DRIFT"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("malformed command receipts fail closed without crashing the verifier", () => {
  const root = fixtureRepository();
  try {
    const policy = fixturePolicy();
    const manifest = createReviewFreeze({ repositoryRoot: root, policy });
    manifest.reproduction.command_runs = "not-an-array";
    reseal(manifest);
    assert.doesNotThrow(() => verifyReviewFreeze(manifest, { repositoryRoot: root, policy }));
    const result = verifyReviewFreeze(manifest, { repositoryRoot: root, policy });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(({ code }) => code === "REPRODUCTION_MISMATCH"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a command run is isolated, retained byte-for-byte and content addressed", () => {
  const root = fixtureRepository();
  try {
    const reviewedCommit = command(root, ["git", "rev-parse", "HEAD"]);
    const policy = fixturePolicy([
      {
        command_id: "checkout-name-check",
        argv: [
          "node",
          "-e",
          "process.exit(process.cwd().endsWith('/mind-flow') ? 0 : 9)",
        ],
        cwd: ".",
      },
      {
        command_id: "git-check",
        argv: ["git", "rev-parse", "HEAD"],
        cwd: ".",
      },
      {
        command_id: "build-check",
        argv: ["node", "build.mjs", "--check"],
        cwd: ".",
      },
    ]);
    const manifest = createReviewFreeze({
      repositoryRoot: root,
      commit: "HEAD",
      policy,
      executeCommands: true,
    });
    assert.equal(manifest.reproduction.status, "passed");
    assert.equal(manifest.reproduction.detached_checkout, true);
    assert.equal(manifest.reproduction.execution_boundary.process_sandboxed, false);
    assert.equal(manifest.reproduction.execution_boundary.network_isolated, false);
    assert.equal(manifest.reproduction.execution_boundary.host_filesystem_isolated, false);
    assert.equal(manifest.reproduction.execution_boundary.dependency_tree_content_addressed, false);
    assert.equal(manifest.reproduction.post_run_tracked_tree_unchanged, true);
    assert.deepEqual(manifest.reproduction.unexpected_paths, []);
    assert.equal(manifest.reproduction.command_runs.length, 3);
    const [, gitRun, run] = manifest.reproduction.command_runs;
    assert.equal(
      Buffer.from(gitRun.stdout.bytes_base64, "base64").toString("utf8"),
      `${reviewedCommit}\n`,
    );
    assert.equal(run.exit_code, 0);
    assert.equal(Buffer.from(run.stdout.bytes_base64, "base64").toString("utf8"), "checked\n");
    assert.equal(run.stdout.sha256, canonicalHash(Buffer.from("checked\n")));
    assert.deepEqual(
      verifyReviewFreeze(manifest, { repositoryRoot: root, policy }),
      { valid: true, errors: [] },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("working-tree, manifest and required-command drift fail closed", () => {
  const root = fixtureRepository();
  try {
    const policy = fixturePolicy();
    const manifest = createReviewFreeze({
      repositoryRoot: root,
      commit: "HEAD",
      policy,
      executeCommands: false,
    });

    write(resolve(root, "build.mjs"), 'process.stdout.write("substituted\\n");\n');
    const checkoutResult = verifyReviewFreeze(manifest, {
      repositoryRoot: root,
      policy,
      requireWorkingTree: true,
    });
    assert.equal(checkoutResult.valid, false);
    assert.ok(checkoutResult.errors.some(({ code }) => code === "REVIEWED_FILE_DRIFT"));

    const alteredManifest = structuredClone(manifest);
    alteredManifest.boundaries.review_approval = "granted";
    assert.ok(verifyReviewFreeze(alteredManifest, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "FREEZE_HASH_MISMATCH"));

    const weakenedPolicy = structuredClone(policy);
    weakenedPolicy.build_commands = [];
    const commandDrift = structuredClone(manifest);
    commandDrift.build_commands = [];
    commandDrift.policy.checksum = canonicalHash(weakenedPolicy);
    reseal(commandDrift);
    assert.ok(verifyReviewFreeze(commandDrift, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "REVIEW_POLICY_MISMATCH"));

    const runtimeDrift = structuredClone(manifest);
    runtimeDrift.runtime_inputs.command_environment.npm_config_registry =
      "https://substitute.invalid";
    reseal(runtimeDrift);
    assert.ok(verifyReviewFreeze(runtimeDrift, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "RUNTIME_INPUT_DRIFT"));

    const executableDrift = structuredClone(manifest);
    executableDrift.runtime_inputs.node.executable_sha256 = `sha256:${"0".repeat(64)}`;
    reseal(executableDrift);
    assert.ok(verifyReviewFreeze(executableDrift, {
      repositoryRoot: root,
      policy,
      requireRuntimeParity: true,
    })
      .errors.some(({ code }) => code === "RUNTIME_INPUT_DRIFT"));

    const generatorDrift = structuredClone(manifest);
    generatorDrift.generator.sha256 = `sha256:${"0".repeat(64)}`;
    reseal(generatorDrift);
    assert.ok(verifyReviewFreeze(generatorDrift, {
      repositoryRoot: root,
      policy,
      requireGeneratorParity: true,
    })
      .errors.some(({ code }) => code === "GENERATOR_DRIFT"));

    const schemaDrift = structuredClone(manifest);
    schemaDrift.coordinator_claim = "independently approved";
    reseal(schemaDrift);
    assert.ok(verifyReviewFreeze(schemaDrift, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "FREEZE_SCHEMA_INVALID"));

    const omittedTreeFile = structuredClone(manifest);
    omittedTreeFile.tracked_tree.pop();
    reseal(omittedTreeFile);
    assert.ok(verifyReviewFreeze(omittedTreeFile, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "TRACKED_TREE_DRIFT"));

    const relabelled = structuredClone(manifest);
    relabelled.freeze_id = "round-05.review-inputs";
    reseal(relabelled);
    assert.ok(verifyReviewFreeze(relabelled, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "REVIEW_POLICY_MISMATCH"));

    const futureDated = structuredClone(manifest);
    futureDated.created_at = "2099-01-01T00:00:00.000Z";
    reseal(futureDated);
    assert.ok(verifyReviewFreeze(futureDated, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "FREEZE_CHRONOLOGY_INVALID"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("failed reproduction is preserved as a finding and cannot imply approval", () => {
  const root = fixtureRepository();
  try {
    const policy = fixturePolicy([{
      command_id: "deliberate-failure",
      argv: ["node", "-e", "process.stderr.write('failure\\n');process.exit(7)"],
      cwd: ".",
    }]);
    const manifest = createReviewFreeze({
      repositoryRoot: root,
      commit: "HEAD",
      policy,
      executeCommands: true,
    });

    assert.equal(manifest.reproduction.status, "failed");
    assert.equal(manifest.reproduction.command_runs[0].exit_code, 7);
    assert.equal(manifest.creator_reported_local_reproduction_passed, false);
    assert.equal(manifest.boundaries.review_approval, "not-granted");
    assert.deepEqual(
      verifyReviewFreeze(manifest, { repositoryRoot: root, policy }),
      { valid: true, errors: [] },
    );

    const omittedReceipt = structuredClone(manifest);
    omittedReceipt.reproduction = {
      status: "passed",
      detached_checkout: true,
      execution_boundary: {
        process_sandboxed: false,
        network_isolated: false,
        host_filesystem_isolated: false,
        dependency_tree_content_addressed: false,
        registry_responses_retained: false,
        mutation_observation: "pre-and-post-command-snapshot-only",
        untrusted_code_containment: "none",
      },
      command_runs: [],
      post_run_tracked_tree_unchanged: true,
      changed_tracked_paths: [],
      unexpected_paths: [],
    };
    omittedReceipt.creator_reported_local_reproduction_passed = true;
    reseal(omittedReceipt);
    assert.ok(verifyReviewFreeze(omittedReceipt, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "REPRODUCTION_MISMATCH"));

    const malformedBase64 = structuredClone(manifest);
    malformedBase64.reproduction.command_runs[0].stderr.bytes_base64 += "!!!";
    reseal(malformedBase64);
    assert.ok(verifyReviewFreeze(malformedBase64, { repositoryRoot: root, policy })
      .errors.some(({ code }) => code === "COMMAND_OUTPUT_DRIFT"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
