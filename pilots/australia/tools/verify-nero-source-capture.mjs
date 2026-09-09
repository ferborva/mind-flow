import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const defaultPilotRoot = resolve(toolDirectory, "..");
const schema = JSON.parse(
  readFileSync(resolve(defaultPilotRoot, "schema/nero-source-capture.schema.json"), "utf8"),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateCapture = ajv.compile(schema);

const PINNED_ARTIFACTS = Object.freeze({
  archive: Object.freeze({
    path: "sources/nero/2026-08/2026-08_nero.zip",
    source_url: "https://www.jobsandskills.gov.au/sites/default/files/2026-09/2026-08_nero.zip",
    media_type: "application/zip",
    byte_length: 48_613_300,
    sha256: "sha256:a092fbdc1fe41a781120a0df964235fef1dd0913b3b9d2579f74a7ce67239446",
  }),
  "archive-response-headers": Object.freeze({
    path: "sources/nero/2026-08/archive.response-headers.txt",
    source_url: "https://www.jobsandskills.gov.au/sites/default/files/2026-09/2026-08_nero.zip",
    media_type: "text/plain",
    byte_length: 455,
    sha256: "sha256:2e84ad5ec610856e5603006b242271a3f5183b808d56b342d6082be4b175dce9",
  }),
  "landing-page": Object.freeze({
    path: "sources/nero/2026-08/nero-landing.html",
    source_url: "https://www.jobsandskills.gov.au/data/nero",
    media_type: "text/html",
    byte_length: 48_101,
    sha256: "sha256:e83dabf3e8b268a85008a30eefd0301b517780d39187428a808f019918edc9fb",
  }),
  "landing-response-headers": Object.freeze({
    path: "sources/nero/2026-08/nero-landing.response-headers.txt",
    source_url: "https://www.jobsandskills.gov.au/data/nero",
    media_type: "text/plain",
    byte_length: 575,
    sha256: "sha256:d7d173ab9a129c6dc81e2a6065b332b3507fa511ea57cefdea71dc79a5172f24",
  }),
  "copyright-page": Object.freeze({
    path: "sources/nero/2026-08/copyright-and-disclaimer.html",
    source_url: "https://www.jobsandskills.gov.au/copyright-and-disclaimer",
    media_type: "text/html",
    byte_length: 39_970,
    sha256: "sha256:862e9f5eb508b5608251039e0a0a78944f116a529be91cf58aae2ebb2bd531d5",
  }),
  "copyright-response-headers": Object.freeze({
    path: "sources/nero/2026-08/copyright-and-disclaimer.response-headers.txt",
    source_url: "https://www.jobsandskills.gov.au/copyright-and-disclaimer",
    media_type: "text/plain",
    byte_length: 575,
    sha256: "sha256:59c6ef9b06e3abaf046cf10faefa54a11bcce349ebf1de38ea7b0ab4be4e4ea7",
  }),
});

const PINNED_MEMBERS = Object.freeze([
  Object.freeze({ path: "2026-08_nero/", uncompressed_byte_length: 0 }),
  Object.freeze({
    path: "2026-08_nero/2026-08_shiny_df.csv",
    uncompressed_byte_length: 372_698_746,
  }),
  Object.freeze({
    path: "2026-08_nero/2026-08_shiny_df.rds",
    uncompressed_byte_length: 16_419_664,
  }),
]);

const PINNED_CLAIMS = Object.freeze([
  Object.freeze({
    role: "landing-page",
    literal: "August 2026 data was released on 2nd September 2026.",
  }),
  Object.freeze({
    role: "landing-page",
    literal: "The Nowcast of Employment by Region and Occupation or NERO provides estimates of employment in 355 occupations across 88 regions in Australia.",
  }),
  Object.freeze({
    role: "landing-page",
    literal: "NERO is designed specifically for estimating employment numbers at the ANZSCO 4-digit and ASGS SA4 level.",
  }),
  Object.freeze({
    role: "landing-page",
    literal: "Estimates should not be summed or combined to generate aggregated results across geographies or occupation groups",
  }),
  Object.freeze({
    role: "landing-page",
    literal: "the content of NERO is licensed under the Creative Commons Attribution 4.0 International Licence",
  }),
  Object.freeze({
    role: "landing-page",
    literal: "Nowcast of Employment by Region and Occupation, Jobs and Skills Australia, Commonwealth of Australia. Used under Creative Commons BY 4.0 licence.",
  }),
  Object.freeze({
    role: "copyright-page",
    literal: "All content on the Jobs and Skills Australia website is provided under a&nbsp;Creative Commons Attribution 4.0&nbsp;International Licence",
  }),
  Object.freeze({ role: "archive-response-headers", literal: "content-length: 48613300" }),
]);

const SELECTED_CODES = Object.freeze(["5311", "5511", "5512", "5513", "5411"]);
const EXPECTED_BASELINE_HASH =
  "sha256:440c566123d3146cc2b00eef267139fc1a13dbd653c7ec9ec3c40012d857fa70";
const PINNED_DERIVATION = Object.freeze({
  tool_path: "dashboard/tools/build-nero-baseline.mjs",
  tool_sha256: "sha256:40f60ec2a3800442f02484464c38972086ead2fd6c13818af0a3d5c7fdea3cef",
  comparison_profile: "canonical-series-projection-v1",
  expected_projection_sha256:
    "sha256:86aead0ed8f5eaf8812b5a7e348ef0e070bb9a8ffdeea1068120962583d01dcb",
});
const PINNED_REDISTRIBUTION = Object.freeze({
  notice_path: "sources/nero/2026-08/ATTRIBUTION.md",
  notice_sha256: "sha256:5138131049735c436cba95536c92fe4e4c67a64234372bf3d009e959148d2ed0",
  publisher_attribution:
    "Nowcast of Employment by Region and Occupation, Jobs and Skills Australia, Commonwealth of Australia. Used under Creative Commons BY 4.0 licence.",
  publisher_attribution_applied: true,
  excluded_material_classes: Object.freeze([
    "Commonwealth Coat of Arms",
    "Jobs and Skills Australia logo",
    "images or photographs",
    "trademark-protected material",
    "third-party material",
    "material otherwise noted",
  ]),
  archive_contains_excluded_material_verified: false,
  legal_review_complete: false,
  status: "publisher-licence-relied-upon-pending-legal-review",
});

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function equalJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function baselineProjection(document) {
  return { series: structuredClone(document?.series) };
}

function projectionHash(document) {
  return digest(canonicalJson(baselineProjection(document)));
}

function resolveRetainedFile(pilotRoot, relativePath) {
  if (typeof relativePath !== "string" || isAbsolute(relativePath)) {
    throw new Error("artifact path must be a pilot-relative string");
  }

  const normalised = relativePath.replaceAll("\\", "/");
  if (normalised.split("/").includes("..")) {
    throw new Error(`artifact path traverses outside the pilot: ${relativePath}`);
  }

  const realRoot = realpathSync(pilotRoot);
  const candidate = resolve(realRoot, relativePath);
  const lexicalRelative = relative(realRoot, candidate);
  if (lexicalRelative === ".." || lexicalRelative.startsWith(`..${sep}`) || isAbsolute(lexicalRelative)) {
    throw new Error(`artifact path escapes the pilot: ${relativePath}`);
  }

  if (lstatSync(candidate).isSymbolicLink()) {
    throw new Error(`artifact path must not be a symbolic link: ${relativePath}`);
  }

  const realCandidate = realpathSync(candidate);
  const realRelative = relative(realRoot, realCandidate);
  if (realRelative === ".." || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative)) {
    throw new Error(`artifact resolves outside the pilot: ${relativePath}`);
  }

  if (!statSync(realCandidate).isFile()) {
    throw new Error(`artifact is not a regular file: ${relativePath}`);
  }
  return realCandidate;
}

function resolveRepositoryFile(repositoryRoot, relativePath) {
  if (typeof relativePath !== "string" || isAbsolute(relativePath) ||
      relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("repository artifact path must be closed and relative");
  }
  const root = realpathSync(repositoryRoot);
  const candidate = resolve(root, relativePath);
  const realCandidate = realpathSync(candidate);
  const fromRoot = relative(root, realCandidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) ||
      isAbsolute(fromRoot) || lstatSync(candidate).isSymbolicLink() || !statSync(realCandidate).isFile()) {
    throw new Error(`repository artifact path is not a regular in-root file: ${relativePath}`);
  }
  return realCandidate;
}

function formatSchemaError(error) {
  const location = error.instancePath || "/";
  return `schema ${location} ${error.message}`;
}

function responseDateUtc(text) {
  const line = text.split(/\r?\n/).find((candidate) => /^date:/i.test(candidate));
  if (!line) throw new Error("retained response has no Date header");
  const timestamp = Date.parse(line.slice(line.indexOf(":") + 1).trim());
  if (!Number.isFinite(timestamp)) throw new Error("retained response has an invalid Date header");
  return new Date(timestamp).toISOString().replace(".000Z", "Z");
}

function responseMetadata(text) {
  const lines = text.split(/\r?\n/);
  const status = /^HTTP\/\S+\s+(\d{3})(?:\s|$)/i.exec(lines[0] ?? "");
  if (!status) throw new Error("retained response has no parseable HTTP status");
  const headers = new Map();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (headers.has(name)) throw new Error(`retained response duplicates ${name}`);
    headers.set(name, value);
  }
  return { status: Number(status[1]), headers };
}

export function verifyNeroSourceCapture(capture, {
  pilotRoot = defaultPilotRoot,
  repositoryRoot = resolve(pilotRoot, "../.."),
} = {}) {
  const result = {
    machine_valid: false,
    schema_valid: false,
    artifact_integrity: false,
    archive_integrity: false,
    publisher_claims_bound: false,
    http_metadata_bound: false,
    landing_archive_link_bound: false,
    redistribution_notice_bound: false,
    clock_binding_valid: false,
    historical_baseline_file_bound: false,
    series_projection_reproduced: false,
    selected_code_shape: {
      occupation_codes: [],
      region_count: 0,
      series_count: 0,
    },
    errors: [],
  };

  try {
    result.schema_valid = validateCapture(capture);
    if (!result.schema_valid) {
      result.errors.push(...(validateCapture.errors ?? []).map(formatSchemaError));
    }

    const artifacts = Array.isArray(capture?.artifacts) ? capture.artifacts : [];
    const byRole = new Map();
    const artifactBytes = new Map();
    let artifactIntegrity = artifacts.length === Object.keys(PINNED_ARTIFACTS).length;

    for (const artifact of artifacts) {
      if (!artifact || typeof artifact.role !== "string") {
        artifactIntegrity = false;
        result.errors.push("artifact role is missing");
        continue;
      }
      if (byRole.has(artifact.role)) {
        artifactIntegrity = false;
        result.errors.push(`duplicate artifact role: ${artifact.role}`);
        continue;
      }
      byRole.set(artifact.role, artifact);

      const pinned = PINNED_ARTIFACTS[artifact.role];
      if (!pinned) {
        artifactIntegrity = false;
        result.errors.push(`unexpected artifact role: ${artifact.role}`);
        continue;
      }
      for (const field of ["path", "source_url", "media_type", "byte_length", "sha256"]) {
        if (artifact[field] !== pinned[field]) {
          artifactIntegrity = false;
          const label = field === "sha256" ? "hash" : field;
          result.errors.push(`${artifact.role} ${label} mismatch`);
        }
      }

      try {
        const artifactPath = resolveRetainedFile(pilotRoot, artifact.path);
        const bytes = readFileSync(artifactPath);
        if (bytes.byteLength !== artifact.byte_length) {
          artifactIntegrity = false;
          result.errors.push(`${artifact.role} byte length mismatch`);
        }
        if (digest(bytes) !== artifact.sha256) {
          artifactIntegrity = false;
          result.errors.push(`${artifact.role} hash mismatch`);
        }
        artifactBytes.set(artifact.role, bytes);
      } catch (error) {
        artifactIntegrity = false;
        result.errors.push(`${artifact.role} could not be verified: ${error.message}`);
      }
    }

    for (const role of Object.keys(PINNED_ARTIFACTS)) {
      if (!byRole.has(role)) {
        artifactIntegrity = false;
        result.errors.push(`missing artifact role: ${role}`);
      }
    }
    result.artifact_integrity = artifactIntegrity;

    const archive = byRole.get("archive");
    let pinnedBuilderBytes = null;
    let archiveIntegrity = artifactIntegrity && Boolean(archive);
    if (!equalJson(capture?.archive_structure?.members, PINNED_MEMBERS)) {
      archiveIntegrity = false;
      result.errors.push("archive member declaration mismatch");
    }
    if (archiveIntegrity) {
      const temporary = realpathSync(mkdtempSync(resolve(tmpdir(), "mind-flow-nero-archive-check-")));
      try {
        const builderPath = resolveRepositoryFile(repositoryRoot, PINNED_DERIVATION.tool_path);
        pinnedBuilderBytes = readFileSync(builderPath);
        if (digest(pinnedBuilderBytes) !== PINNED_DERIVATION.tool_sha256) {
          throw new Error("pinned in-process ZIP verifier hash mismatch");
        }
        const builderSnapshot = resolve(temporary, "build-nero-baseline.mjs");
        const archiveSnapshot = resolve(temporary, "source.zip");
        writeFileSync(builderSnapshot, pinnedBuilderBytes, { mode: 0o400 });
        writeFileSync(archiveSnapshot, artifactBytes.get("archive"), { mode: 0o400 });
        const inspectRun = spawnSync(process.execPath, [
          builderSnapshot,
          "--inspect-zip",
          archiveSnapshot,
        ], {
          encoding: "utf8",
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
        });
        if (inspectRun.error || inspectRun.status !== 0) {
          throw new Error(`in-process ZIP inspection failed: ${inspectRun.error?.message ?? inspectRun.stderr.trim()}`);
        }
        const inspectedMembers = JSON.parse(inspectRun.stdout);
        if (!equalJson(inspectedMembers, PINNED_MEMBERS)) {
          throw new Error("recomputed archive member paths or sizes mismatch");
        }
      } catch (error) {
        archiveIntegrity = false;
        result.errors.push(`archive could not be tested: ${error.message}`);
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    }
    result.archive_integrity = archiveIntegrity;

    let publisherClaimsBound = artifactIntegrity;
    if (!equalJson(capture?.evidence_claims, PINNED_CLAIMS)) {
      publisherClaimsBound = false;
      result.errors.push("publisher evidence claim set mismatch");
    }
    if (publisherClaimsBound) {
      for (const claim of PINNED_CLAIMS) {
        try {
          const sourceText = artifactBytes.get(claim.role).toString("utf8");
          if (!sourceText.includes(claim.literal)) {
            publisherClaimsBound = false;
            result.errors.push(`publisher claim missing from ${claim.role}: ${claim.literal}`);
          }
        } catch (error) {
          publisherClaimsBound = false;
          result.errors.push(`publisher claim could not be checked: ${error.message}`);
        }
      }
    }
    result.publisher_claims_bound = publisherClaimsBound;

    let httpMetadataBound = artifactIntegrity;
    try {
      const expected = {
        "archive-response-headers": { type: "application/zip", length: PINNED_ARTIFACTS.archive.byte_length },
        "landing-response-headers": { type: "text/html", length: PINNED_ARTIFACTS["landing-page"].byte_length },
        "copyright-response-headers": { type: "text/html", length: PINNED_ARTIFACTS["copyright-page"].byte_length },
      };
      for (const [role, expectation] of Object.entries(expected)) {
        const metadata = responseMetadata(artifactBytes.get(role).toString("utf8"));
        const contentType = metadata.headers.get("content-type") ?? "";
        const contentLength = Number(metadata.headers.get("content-length"));
        if (metadata.status !== 200 || !contentType.toLowerCase().startsWith(expectation.type) ||
            contentLength !== expectation.length) {
          httpMetadataBound = false;
          result.errors.push(`${role} status, content type or content length mismatch`);
        }
      }
    } catch (error) {
      httpMetadataBound = false;
      result.errors.push(`retained HTTP metadata could not be checked: ${error.message}`);
    }
    result.http_metadata_bound = httpMetadataBound;

    let landingArchiveLinkBound = artifactIntegrity;
    try {
      const landing = artifactBytes.get("landing-page").toString("utf8");
      const match = /href="([^"#?]*2026-08_nero\.zip)"/i.exec(landing);
      if (!match || new URL(match[1], capture.source.landing_url).href !== capture.source.archive_url) {
        landingArchiveLinkBound = false;
        result.errors.push("retained landing page does not bind the declared archive URL");
      }
    } catch (error) {
      landingArchiveLinkBound = false;
      result.errors.push(`landing-to-archive link could not be checked: ${error.message}`);
    }
    result.landing_archive_link_bound = landingArchiveLinkBound;

    let redistributionNoticeBound = equalJson(capture?.redistribution, PINNED_REDISTRIBUTION);
    if (!redistributionNoticeBound) {
      result.errors.push("redistribution notice declaration mismatch");
    } else {
      try {
        const notice = readFileSync(resolveRetainedFile(pilotRoot, capture.redistribution.notice_path));
        if (digest(notice) !== capture.redistribution.notice_sha256 ||
            !notice.toString("utf8").replace(/^>\s*/gm, "").replace(/\s+/g, " ")
              .includes(capture.redistribution.publisher_attribution)) {
          redistributionNoticeBound = false;
          result.errors.push("redistribution notice content or hash mismatch");
        }
      } catch (error) {
        redistributionNoticeBound = false;
        result.errors.push(`redistribution notice could not be checked: ${error.message}`);
      }
    }
    result.redistribution_notice_bound = redistributionNoticeBound;

    let clockBindingValid = artifactIntegrity;
    try {
      const expectedResponseClocks = {
        archive_http_response_date_utc: responseDateUtc(
          artifactBytes.get("archive-response-headers").toString("utf8"),
        ),
        landing_http_response_date_utc: responseDateUtc(
          artifactBytes.get("landing-response-headers").toString("utf8"),
        ),
        copyright_http_response_date_utc: responseDateUtc(
          artifactBytes.get("copyright-response-headers").toString("utf8"),
        ),
      };
      for (const [field, expected] of Object.entries(expectedResponseClocks)) {
        if (capture?.clocks?.[field] !== expected) {
          clockBindingValid = false;
          result.errors.push(`${field} does not match the retained response Date header`);
        }
      }
      if (
        capture?.clocks?.publisher_release_calendar_date !== capture?.source?.publisher_release_date ||
        capture?.clocks?.recorder_capture_completed_at_utc !== capture?.captured_at_utc ||
        Date.parse(capture?.captured_at_utc) < Math.max(
          ...Object.values(expectedResponseClocks).map((value) => Date.parse(value)),
        )
      ) {
        clockBindingValid = false;
        result.errors.push("capture clock binding mismatch");
      }
    } catch (error) {
      clockBindingValid = false;
      result.errors.push(`capture clocks could not be verified: ${error.message}`);
    }
    result.clock_binding_valid = clockBindingValid;

    let historicalBaselineFileBound = true;
    let retainedBaselineBytes = null;
    try {
      if (capture?.baseline_binding?.sha256 !== EXPECTED_BASELINE_HASH) {
        historicalBaselineFileBound = false;
        result.errors.push("baseline declared hash mismatch");
      }
      const baselinePath = resolveRetainedFile(pilotRoot, capture?.baseline_binding?.path);
      const baselineBytes = readFileSync(baselinePath);
      retainedBaselineBytes = baselineBytes;
      if (digest(baselineBytes) !== EXPECTED_BASELINE_HASH) {
        historicalBaselineFileBound = false;
        result.errors.push("baseline file hash mismatch");
      }

      const baseline = JSON.parse(baselineBytes.toString("utf8"));
      const binding = capture.baseline_binding;
      if (
        baseline.source_bytes_status !== "not_retained_unverified" ||
        baseline.source?.publisher !== capture.source?.publisher_identity_claim ||
        baseline.source?.archive_url !== capture.source?.archive_url ||
        baseline.source?.release_period !== capture.source?.release_period ||
        baseline.source?.released_at !== capture.source?.publisher_release_date ||
        baseline.source?.checksum !== binding.archive_checksum ||
        binding.archive_checksum !== PINNED_ARTIFACTS.archive.sha256
      ) {
        historicalBaselineFileBound = false;
        result.errors.push("baseline source binding mismatch");
      }

      const series = Array.isArray(baseline.series) ? baseline.series : [];
      const pairKeys = new Set();
      const regionsByOccupation = new Map(SELECTED_CODES.map((code) => [code, new Set()]));
      for (const entry of series) {
        const occupationCode = entry?.occupation_code;
        const sa4Code = entry?.sa4_code;
        if (!regionsByOccupation.has(occupationCode) || typeof sa4Code !== "string") {
          historicalBaselineFileBound = false;
          result.errors.push("baseline contains a series outside the selected code set");
          continue;
        }
        const pairKey = `${occupationCode}:${sa4Code}`;
        if (pairKeys.has(pairKey)) {
          historicalBaselineFileBound = false;
          result.errors.push(`baseline duplicates series ${pairKey}`);
        }
        pairKeys.add(pairKey);
        regionsByOccupation.get(occupationCode).add(sa4Code);
      }

      const regionCounts = [...regionsByOccupation.values()].map((regions) => regions.size);
      const scopeMatches =
        equalJson(binding.selected_occupation_codes, SELECTED_CODES) &&
        equalJson(baseline.scope?.occupation_codes, SELECTED_CODES) &&
        binding.region_count === 88 &&
        binding.series_count === 440 &&
        baseline.scope?.series_count === 440 &&
        series.length === 440 &&
        pairKeys.size === 440 &&
        regionCounts.every((count) => count === 88);
      if (!scopeMatches) {
        historicalBaselineFileBound = false;
        result.errors.push("baseline selected code shape mismatch");
      }

      result.selected_code_shape = {
        occupation_codes: [...SELECTED_CODES],
        region_count: regionCounts.length === SELECTED_CODES.length && regionCounts.every((count) => count === 88) ? 88 : 0,
        series_count: pairKeys.size,
      };
    } catch (error) {
      historicalBaselineFileBound = false;
      result.errors.push(`baseline could not be verified: ${error.message}`);
    }
    result.historical_baseline_file_bound = historicalBaselineFileBound;

    let seriesProjectionReproduced = false;
    if (result.schema_valid && artifactIntegrity && archiveIntegrity &&
        publisherClaimsBound && httpMetadataBound && landingArchiveLinkBound &&
        redistributionNoticeBound && clockBindingValid && historicalBaselineFileBound) {
      const temporary = realpathSync(mkdtempSync(resolve(tmpdir(), "mind-flow-nero-derivation-")));
      try {
        const derivation = capture.derivation;
        for (const field of [
          "tool_path",
          "tool_sha256",
          "comparison_profile",
          "expected_projection_sha256",
        ]) {
          if (derivation?.[field] !== PINNED_DERIVATION[field]) {
            throw new Error(`baseline builder ${field} mismatch`);
          }
        }
        const builderPath = resolveRepositoryFile(repositoryRoot, derivation.tool_path);
        const builderBytes = pinnedBuilderBytes ?? readFileSync(builderPath);
        if (digest(builderBytes) !== derivation.tool_sha256) {
          throw new Error("baseline builder hash mismatch");
        }
        if (derivation.arguments.source_path !== `pilots/australia/${archive.path}`) {
          throw new Error("baseline source path is not the retained archive artifact");
        }
        const builderSnapshot = resolve(temporary, "build-nero-baseline.mjs");
        const sourceSnapshot = resolve(temporary, "source.zip");
        const outputPath = resolve(temporary, "baseline.json");
        writeFileSync(builderSnapshot, builderBytes, { mode: 0o400 });
        writeFileSync(sourceSnapshot, artifactBytes.get("archive"), { mode: 0o400 });
        const args = derivation.arguments;
        const run = spawnSync(process.execPath, [
          builderSnapshot,
          "--source", sourceSnapshot,
          "--output", outputPath,
          "--release-period", args.release_period,
          "--released-at", args.released_at,
          "--retrieved-at", args.retrieved_at,
          "--archive-url", args.archive_url,
          "--recent-months", String(args.recent_months),
          "--occupations", args.occupations.join(","),
        ], {
          cwd: repositoryRoot,
          encoding: "utf8",
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
        });
        if (run.error || run.status !== 0) {
          throw new Error(`baseline builder failed: ${run.error?.message ?? run.stderr.trim()}`);
        }
        const retained = JSON.parse(retainedBaselineBytes.toString("utf8"));
        const reproduced = JSON.parse(readFileSync(outputPath, "utf8"));
        const retainedHash = projectionHash(retained);
        const reproducedHash = projectionHash(reproduced);
        if (retainedHash !== derivation.expected_projection_sha256 ||
            reproducedHash !== derivation.expected_projection_sha256 ||
            canonicalJson(baselineProjection(retained)) !==
              canonicalJson(baselineProjection(reproduced))) {
          throw new Error("series projection does not reproduce from retained archive bytes");
        }
        seriesProjectionReproduced = true;
      } catch (error) {
        result.errors.push(`baseline derivation could not be verified: ${error.message}`);
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    }
    result.series_projection_reproduced = seriesProjectionReproduced;

    result.machine_valid =
      result.schema_valid &&
      result.artifact_integrity &&
      result.archive_integrity &&
      result.publisher_claims_bound &&
      result.http_metadata_bound &&
      result.landing_archive_link_bound &&
      result.redistribution_notice_bound &&
      result.clock_binding_valid &&
      result.historical_baseline_file_bound &&
      result.series_projection_reproduced &&
      result.errors.length === 0;
  } catch (error) {
    result.errors.push(`capture verification failed closed: ${error.message}`);
  }

  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const capturePath = resolve(process.argv[2] ?? resolve(defaultPilotRoot, "sources/nero/2026-08/capture.json"));
  try {
    const capture = JSON.parse(readFileSync(capturePath, "utf8"));
    const result = verifyNeroSourceCapture(capture, { pilotRoot: defaultPilotRoot });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.machine_valid ? 0 : 2;
  } catch (error) {
    process.stderr.write(`NERO source capture verification failed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
