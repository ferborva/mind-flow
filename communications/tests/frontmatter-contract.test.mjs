import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  auditRepositoryFrontmatter,
  lintMarkdown,
} from "../../meta/validate-frontmatter.mjs";

const root = resolve(import.meta.dirname, "../..");

test("current draft Ren authors use canonical casing without rewriting historical metadata", () => {
  const base = readFileSync(resolve(root, "drafts/every-if-is-somebodys-when.md"), "utf8");
  for (const author of ["ren", "REN", "rEn", '"ren"', "'REN'"]) {
    assert.ok(lintMarkdown("drafts/every-if-is-somebodys-when.md", base.replace(/^author:.*$/m, `author: ${author}`))
      .some(({ code }) => code === "DRAFT_AUTHOR_CASING"));
  }
  assert.deepEqual(lintMarkdown("drafts/every-if-is-somebodys-when.md", base.replace(/^author:.*$/m, "author: Ren")), []);
  assert.deepEqual(lintMarkdown("research/historical.md", base.replace(/^author:.*$/m, "author: ren")), []);
});

test("current governance and publication surfaces reject Ren casing variants, including new files", () => {
  const base = readFileSync(resolve(root, "governance/public-charter.md"), "utf8");
  for (const path of ["governance/public-charter.md", "governance/if-protocol.md", "governance/new-current.md", "boundaries.md"]) {
    for (const author of ["ren", "REN", "rEn", '"ren"', "'REN'"]) {
      assert.ok(lintMarkdown(path, base.replace(/^author:.*$/m, `author: ${author}`))
        .some(({ code }) => code === "CURRENT_AUTHOR_CASING"), `${path}: ${author}`);
    }
    assert.deepEqual(lintMarkdown(path, base.replace(/^author:.*$/m, "author: Ren")), []);
  }
  for (const path of ["research/historical-source.md"]) {
    assert.deepEqual(lintMarkdown(path, base.replace(/^author:.*$/m, "author: ren")), []);
  }
});

test("forecast and review author casing rejects variants in nested and future documents", () => {
  const base = readFileSync(resolve(root, "governance/public-charter.md"), "utf8");
  for (const path of ["forecasts/prospective-pilot/round-09-nero/issuance-note.md", "forecasts/new/nested/proposal.md", "reviews/historical.md", "reviews/external/future/review.md"]) {
    for (const author of ["ren", "REN", "rEn", '"ren"', "'REN'"]) {
      assert.ok(lintMarkdown(path, base.replace(/^author:.*$/m, `author: ${author}`))
        .some(({ code }) => code === "CURRENT_AUTHOR_CASING"), `${path}: ${author}`);
    }
    for (const author of ["Ren", "Fernando", '"Ren"']) {
      assert.deepEqual(lintMarkdown(path, base.replace(/^author:.*$/m, `author: ${author}`)), []);
    }
  }
});

test("the documented metadata classes are enforced across repository markdown", () => {
  const manual = readFileSync(resolve(root, "CLAUDE.md"), "utf8");
  for (const phrase of [
    "pipeline content",
    "programme artefact",
    "repository register",
    "operator and navigation document",
  ]) assert.match(manual, new RegExp(phrase, "i"));

  assert.deepEqual(auditRepositoryFrontmatter(root), []);
});

test("frontmatter lint rejects provenance and taxonomy drift", () => {
  const base = `---
id: example
title: Example
type: draft
status: drafting
sources: [capture-example]
created: 2026-09-09
updated: 2026-09-09
---

# Example
`;
  assert.deepEqual(lintMarkdown("drafts/example.md", base), []);

  const attacks = [
    ["drafts/example.md", "# Missing metadata\n", "FRONTMATTER_REQUIRED"],
    ["drafts/wrong.md", base, "PIPELINE_ID_PATH_MISMATCH"],
    ["drafts/example.md", base.replace("sources: [capture-example]", "sources: []"), "SOURCES_REQUIRED"],
    ["research/example.md", base.replace("type: draft", "type: invented-authority"), "TYPE_UNKNOWN"],
    ["research/example.md", base.replace("updated: 2026-09-09", "updated: 2026-09-08"), "DATE_ORDER_INVALID"],
  ];
  for (const [path, markdown, expected] of attacks) {
    assert.ok(
      lintMarkdown(path, markdown).some(({ code }) => code === expected),
      `${expected} was not reported for ${path}`,
    );
  }
});

test("navigation and imported foundation documents have explicit narrow exemptions", () => {
  assert.deepEqual(lintMarkdown("dashboard/README.md", "# Dashboard\n"), []);
  assert.deepEqual(lintMarkdown("foundation/constitution.md", `---
title: Constitution
type: foundation
status: active
received: 2026-08-31
---
# Constitution
`), []);
  assert.ok(
    lintMarkdown("governance/public-charter.md", "# Charter\n")
      .some(({ code }) => code === "FRONTMATTER_REQUIRED"),
  );
});
