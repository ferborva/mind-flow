import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { reverseEditorialAmendment } from "../../../meta/validate-editorial-deletions.mjs";

// Historical tests must examine their named checkpoint, not silently rebase
// old JSON endpoints onto later editorial amendments.
export function beforeRound10Amendment(root, path, bytes) {
  const review = readFileSync(resolve(root, "reviews/round-10-narrative-provenance.md"), "utf8");
  const records = [...review.matchAll(/```editorial-amendment\n([\s\S]*?)\n```/g)].map(([, json]) => JSON.parse(json));
  for (const record of records.filter(entry => entry.path === path).reverse()) {
    if (record.scope === "body-without-frontmatter") {
      const frontmatter = bytes.match(/^---\n[\s\S]*?\n---\n/)?.[0] ?? "";
      bytes = frontmatter + reverseEditorialAmendment(bytes.slice(frontmatter.length), record);
    } else {
      bytes = reverseEditorialAmendment(bytes, record);
    }
  }
  return bytes;
}
