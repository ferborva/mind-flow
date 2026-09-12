import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const read = path => readFileSync(resolve(root, path), "utf8");
const drafts = readdirSync(resolve(root, "drafts")).filter(name => name.endsWith(".md") && name !== "README.md");
const section = (text, heading) => text.split(`## ${heading}\n`)[1]?.split("\n## ")[0];

// These are the rules that survive a rewrite. They constrain what a draft may
// CLAIM, never how it is worded, so an editor can merge, cut or re-voice a
// piece without touching CI. Prose-pinning assertions were removed on
// 2026-09-11: a repository for writing cannot have its writing frozen by tests.

test("every draft declares sources that resolve to real captures", () => {
  for (const name of drafts) {
    const text = read(`drafts/${name}`);
    const declared = text.match(/^sources: \[([^\]]+)\]$/m);
    assert.ok(declared, `${name} must declare sources`);
    for (const id of declared[1].split(",").map(value => value.trim()).filter(Boolean)) {
      assert.ok(existsSync(resolve(root, `capture/${id}.md`)), `${name} cites a missing capture: ${id}`);
    }
  }
});

test("every draft stays in the review lifecycle and links its evidence limits", () => {
  for (const name of drafts) {
    const text = read(`drafts/${name}`);
    assert.match(text, /^status: (drafting|review|ready)$/m, name);
    if (name === "message-to-the-moonshot-mates.md") continue; // correspondence, not an argument
    assert.match(text, /boundaries\.md|backlog\.md/, `${name} must link its limits`);
  }
});

test("a draft arguing beyond his substance declares itself a commissioned proposal", () => {
  for (const name of ["from-if-to-when.md", "every-if-is-somebodys-when.md"]) {
    assert.match(read(`drafts/${name}`), /^provenance: commissioned-proposal$/m, name);
  }
});

test("Name the If claims a proposed method, not a validated diagnosis", () => {
  const text = read("drafts/name-the-if.md");
  assert.match(text, /proposed reporting method/i);
  assert.doesNotMatch(text, /the grammar diagnoses/i);
  assert.doesNotMatch(text, /Every abundance promise has the shape/i);
  assert.doesNotMatch(text, /What you get is diagnosis/i);
});

test("Name the If keeps the withdrawn distribution inference out", () => {
  const text = read("drafts/name-the-if.md");
  assert.doesNotMatch(text, /80\.0%|44\.4%/, "the aggregate-shortfall error stays withdrawn");
  assert.doesNotMatch(text, /talking to the other fifth/i);
});

test("the healthcare example stays inside its source ceiling", () => {
  const text = read("drafts/name-the-if.md");
  assert.match(text, /92\.0%/);
  assert.match(text, /census\.gov\/library\/publications\/2025\/demo\/p60-288\.html/);
  assert.match(text, /cannot tell whether\s+a particular visit was affordable/i);
  assert.doesNotMatch(text, /diagnosis genuinely does go towards zero/i);
  assert.doesNotMatch(text, /technology in all four countries is identical/i);
  assert.match(read("research/2026-09-09-healthcare-if-validation.md"), /source-by-source claim ceiling/i);
});

test("where the money sits stays an observation and carries no remedy", () => {
  const text = read("drafts/name-the-if.md");
  const observation = section(text, "🏦 Where the ball sits");
  assert.ok(observation, "the observation needs its own section");
  assert.match(observation, /The money accrues to a few companies/);
  assert.doesNotMatch(observation, /choice is theirs|Tesla|UBI|transfer|wealth tax/i);
  assert.match(text, /much softer view on tax and the portfolio remedy/i);
});

test("the transition proposal offers scenarios and refuses to predict public response", () => {
  const text = read("drafts/from-if-to-when.md");
  assert.match(text, /Scenarios, not a calendar/i);
  assert.match(text, /can coexist, reverse or never arise/i);
  for (const rejected of [/\*\*Movements:/i, /predicts precisely the resistance/i, /This is the moment politics turns/i, /five social crossings we can prepare for/i, /activates automatically|Legislate the triggers|make it irreversible/i]) {
    assert.doesNotMatch(text, rejected);
  }
});

test("the supply-side piece keeps WHEN a hypothesis rather than a destiny", () => {
  const text = read("drafts/every-if-is-somebodys-when.md");
  assert.match(text, /linked but non-identical/i);
  assert.doesNotMatch(text, /a sequence you are executing/i);
  assert.doesNotMatch(text, /grammar (?:proves|validates|establishes) (?:authority|identity)/i);
});
