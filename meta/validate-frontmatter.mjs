#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9][a-z0-9.-]*(?:-[a-z0-9][a-z0-9.-]*)*$/;
const PIPELINE_ROOTS = new Set(["capture", "seeds", "drafts", "posts", "books"]);
const NAVIGATION_NAMES = new Set(["README.md", "SCHEMA.md", "MIGRATION.md", "ATTRIBUTION.md"]);
const ROOT_OPERATOR_DOCS = new Set(["CLAUDE.md", "AGENTS.md"]);
const REPOSITORY_REGISTERS = new Set([
  "meta/backlog.md",
  "meta/index.md",
  "meta/themes.md",
]);
const TEMPORAL_KEYS = ["created", "received", "retrieved", "reviewed_on", "submitted", "date"];

export const ALLOWED_CONTENT_TYPES = Object.freeze(new Set([
  "amendment-proposal",
  "capture",
  "chapter",
  "communications-proposal",
  "draft",
  "experiment-proposal",
  "external-agent-review",
  "external-review-first-pass",
  "external-review-request",
  "external-review-second-pass",
  "foundation",
  "governance-design",
  "governance-proposal",
  "internal-review",
  "internal-review-proposal",
  "pilot-protocol-proposal",
  "post",
  "programme-proposal",
  "public-guide-proposal",
  "research",
  "research-and-programme-proposal",
  "research-audit",
  "research-note",
  "research-synthesis",
  "review-brief",
  "review-charter",
  "review-proposal",
  "review-register",
  "review-synthesis",
  "seed",
  "statistical-protocol",
  "technical-proposal",
]));

function issue(code, path, message) {
  return { code, path, message };
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  const values = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const field = line.match(/^([a-z][a-z0-9_]*):(?:\s*(.*))?$/);
    if (!field) continue;
    values[field[1]] = (field[2] || "").replace(/\s+#.*$/, "").trim();
  }
  return { raw: match[1], values };
}

function isExempt(path) {
  if (ROOT_OPERATOR_DOCS.has(path) || REPOSITORY_REGISTERS.has(path)) return true;
  if (path.startsWith("meta/templates/")) return true;
  return NAVIGATION_NAMES.has(basename(path));
}

function hasNonEmptySources(raw) {
  const lines = raw.split("\n");
  const index = lines.findIndex((line) => /^sources:/.test(line));
  if (index < 0) return false;
  const inline = lines[index].replace(/^sources:\s*/, "").replace(/\s+#.*$/, "").trim();
  if (inline) return inline !== "[]";
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (/^[a-z][a-z0-9_]*:/.test(lines[cursor])) break;
    if (/^\s+-\s+\S/.test(lines[cursor])) return true;
  }
  return false;
}

export function lintMarkdown(path, markdown) {
  const normalisedPath = path.replaceAll("\\", "/");
  const frontmatter = parseFrontmatter(markdown);
  const exempt = isExempt(normalisedPath);
  const metadataFree = REPOSITORY_REGISTERS.has(normalisedPath) ||
    normalisedPath.startsWith("meta/templates/");
  const errors = [];
  if (!frontmatter) {
    if (!exempt) {
      errors.push(issue(
        "FRONTMATTER_REQUIRED",
        normalisedPath,
        "authored content and programme artefacts require frontmatter",
      ));
    }
    return errors;
  }
  if (metadataFree) return errors;

  const { raw, values } = frontmatter;
  const importedFoundation = normalisedPath.startsWith("foundation/");
  const minimum = importedFoundation || exempt
    ? ["title", "type", "status"]
    : ["id", "title", "type", "status"];
  for (const field of minimum) {
    if (!values[field]) {
      errors.push(issue("FRONTMATTER_FIELD_REQUIRED", normalisedPath, `${field} is required`));
    }
  }

  if (values.id && !ID.test(values.id)) {
    errors.push(issue("ID_INVALID", normalisedPath, "id must be a lowercase stable slug"));
  }
  if (values.type && !ALLOWED_CONTENT_TYPES.has(values.type)) {
    errors.push(issue("TYPE_UNKNOWN", normalisedPath, `unknown content type: ${values.type}`));
  }

  const [root] = normalisedPath.split("/");
  // Current draft display names are canonical. Historical programme records
  // and imported foundation metadata retain their original provenance bytes.
  const author = (values.author || "").replace(/^(["'])(.*)\1$/, "$2");
  if (root === "drafts" && /^ren$/i.test(author) && author !== "Ren") {
    errors.push(issue("DRAFT_AUTHOR_CASING", normalisedPath, "current draft author must use Ren, not a casing variant"));
  }
  if (PIPELINE_ROOTS.has(root) && !normalisedPath.startsWith("meta/templates/")) {
    const expected = basename(normalisedPath, ".md");
    if (values.id !== expected) {
      errors.push(issue(
        "PIPELINE_ID_PATH_MISMATCH",
        normalisedPath,
        `pipeline id must match filename: ${expected}`,
      ));
    }
    if (["seed", "draft", "post"].includes(values.type) && !hasNonEmptySources(raw)) {
      errors.push(issue(
        "SOURCES_REQUIRED",
        normalisedPath,
        `${values.type} requires at least one source capture`,
      ));
    }
  }

  if (!importedFoundation && !exempt &&
      !TEMPORAL_KEYS.some((field) => values[field] && DATE.test(values[field]))) {
    errors.push(issue(
      "TEMPORAL_ANCHOR_REQUIRED",
      normalisedPath,
      `one ISO date is required from: ${TEMPORAL_KEYS.join(", ")}`,
    ));
  }
  for (const field of ["created", "updated"]) {
    if (values[field] && !DATE.test(values[field])) {
      errors.push(issue("DATE_INVALID", normalisedPath, `${field} must be YYYY-MM-DD`));
    }
  }
  if (DATE.test(values.created || "") && DATE.test(values.updated || "") &&
      values.updated < values.created) {
    errors.push(issue("DATE_ORDER_INVALID", normalisedPath, "updated cannot precede created"));
  }
  return errors;
}

function markdownPaths(directory, base = directory) {
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules"].includes(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...markdownPaths(absolute, base));
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      paths.push(relative(base, absolute).replaceAll("\\", "/"));
    }
  }
  return paths.sort();
}

export function auditRepositoryFrontmatter(repositoryRoot) {
  const errors = [];
  for (const path of markdownPaths(repositoryRoot)) {
    const markdown = readFileSync(resolve(repositoryRoot, path), "utf8");
    errors.push(...lintMarkdown(path, markdown));
  }
  return errors;
}

const defaultRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = auditRepositoryFrontmatter(defaultRoot);
  for (const error of errors) {
    process.stderr.write(`${error.code} ${error.path}: ${error.message}\n`);
  }
  if (errors.length) process.exitCode = 1;
  else process.stdout.write("frontmatter contract verified\n");
}
