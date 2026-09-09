import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// This check detects unreviewed first-person changes. It does not decide that
// a paraphrase faithfully expresses a capture; that requires human review.
export function proseSentences(markdown) {
  const prose = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6} .*$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[>\s]+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ").trim();
  return prose.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

export function firstPersonSentences(markdown) {
  const headings = [...markdown.matchAll(/^#{1,6} (.+)$/gm)].map((match) => match[1]);
  return [...proseSentences(markdown), ...headings].filter((sentence) =>
    /\b(?:I|I'm|I've|I'd|My|my|me|We|we|Our|our|us)\b/.test(sentence));
}

export function sentenceDigest(sentence) {
  return createHash("sha256").update(sentence).digest("hex");
}

export function validateDraftProvenance(root) {
  const audit = readFileSync(resolve(root, "reviews/round-08-narrative-provenance.md"), "utf8");
  const rows = [...audit.matchAll(/^\| (drafts\/[^ |]+\.md) \| ([a-f0-9]{64}) \| (capture\/[^ |]+\.md) \| (.+) \|$/gm)];
  const errors = [];
  const covered = new Map();
  for (const [, file, digest, capturePath, support] of rows) {
    const key = `${file}:${digest}`;
    if (covered.has(key)) errors.push(`duplicate review row ${key}`);
    const capture = readFileSync(resolve(root, capturePath), "utf8").replace(/\s+/g, " ");
    if (!capture.includes(support)) errors.push(`capture support absent: ${key}`);
    covered.set(key, true);
  }
  for (const file of readdirSync(resolve(root, "drafts")).filter((name) => name.endsWith(".md") && name !== "README.md")) {
    const relative = `drafts/${file}`;
    for (const sentence of firstPersonSentences(readFileSync(resolve(root, relative), "utf8"))) {
      const key = `${relative}:${sentenceDigest(sentence)}`;
      if (!covered.has(key)) errors.push(`unreviewed first-person sentence: ${relative}: ${sentence}`);
      else covered.delete(key);
    }
  }
  for (const key of covered.keys()) errors.push(`review row no longer matches a draft sentence: ${key}`);
  return { valid: errors.length === 0, errors, reviewed_sentences: rows.length };
}
