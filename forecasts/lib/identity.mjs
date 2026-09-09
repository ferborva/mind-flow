import { readFileSync } from "node:fs";

// Unicode UTS #39 section 4 skeleton mappings, pinned to Unicode 16.0.0.
// See unicode/README.md for the primary source and the additional ID policy.
const mappings = new Map();
const table = readFileSync(new URL("./unicode/confusables-16.0.0.txt", import.meta.url), "utf8");
for (const line of table.split("\n")) {
  const fields = line.split("#")[0].trim().split(";").map((field) => field.trim());
  if (fields.length < 3) continue;
  const decode = (field) => String.fromCodePoint(...field.split(/\s+/).map((hex) => parseInt(hex, 16)));
  mappings.set(decode(fields[0]), decode(fields[1]));
}

const invisible = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;

export function normalizedIdentity(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(invisible, "").normalize("NFKC")
    .toLowerCase().replace(invisible, "").trim().normalize("NFD");
  return [...cleaned].map((character) => mappings.get(character) ?? character)
    .join("").normalize("NFD").replace(invisible, "").trim();
}
