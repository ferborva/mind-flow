import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const manifest = JSON.parse(readFileSync(resolve(root, "pilots/australia/source-manifest.json"), "utf8"));
const sources = new Map(manifest.sources.map((source) => [source.id, source]));
const protocol = readFileSync(resolve(root, "pilots/australia/evidence-bridge-protocol.md"), "utf8");

test("the acquisition map covers linked outcomes, lived agency, delivery and ecology", () => {
  for (const id of [
    "abs-l-leed-2025",
    "abs-plida-2026",
    "hilda-release-24",
    "anao-services-australia-performance-2025",
    "aemo-isp-2026-data-centres",
  ]) assert.ok(sources.has(id), `missing ${id}`);

  assert.deepEqual(sources.get("abs-l-leed-2025").statistical_units, ["person", "job", "employer"]);
  assert.match(sources.get("abs-plida-2026").uncertainty, /approved projects.*secure/i);
  assert.match(sources.get("hilda-release-24").uncertainty, /annual.*early warning|early warning.*annual/i);
  assert.match(sources.get("anao-services-australia-performance-2025").uncertainty, /aggregate.*mask/i);
  assert.match(sources.get("aemo-isp-2026-data-centres").uncertainty, /forecast.*not.*observed/i);
});

test("new sources state the causal bridge they cannot close", () => {
  for (const id of [
    "abs-l-leed-2025",
    "abs-plida-2026",
    "hilda-release-24",
    "anao-services-australia-performance-2025",
    "aemo-isp-2026-data-centres",
  ]) {
    const source = sources.get(id);
    assert.ok(Array.isArray(source.cannot_establish) && source.cannot_establish.length > 0, `${id} lacks a claim ceiling`);
    assert.ok(source.minimum_valid_role, `${id} lacks a bounded role`);
  }
});

test("the prospective bridge identifies treatment, outcomes, rivals and public limits", () => {
  assert.match(protocol, /deployment event.*workflow.*task share.*permission/is);
  assert.match(protocol, /primary estimand/i);
  assert.match(protocol, /phased rollout.*difference-in-differences/is);
  assert.match(protocol, /negative control/i);
  assert.match(protocol, /aggregate.*cannot override.*person-level harm/is);
  assert.match(protocol, /cannot withdraw.*service|service.*cannot be withdrawn/i);
  assert.match(protocol, /evidence-added.*evidence-challenged.*definition-revised.*scope-changed.*expired/is);
});

test("the bridge keeps executable truth separate from scope and lifecycle", () => {
  assert.match(protocol, /five-valued truth state(?: change)?:\s*`true`,\s*`false`,\s*`unknown`,\s*`stale`\s*or\s*`conflicted`/i);
  assert.doesNotMatch(protocol, /truth state(?: change)?:[^?]*`not-applicable`/is);
  assert.match(protocol, /out-of-scope.*scope\/lifecycle|scope\/lifecycle.*out-of-scope/i);
});
