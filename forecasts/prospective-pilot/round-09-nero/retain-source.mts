import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

// Explicit operator acquisition. Existing receipts are never overwritten.
const destination = process.argv[2];
if (!destination) throw new Error("supply a new source receipt directory");
const url = "https://www.jobsandskills.gov.au/data/nero";
const started_at = new Date().toISOString();
try {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error(`NERO landing request returned ${response.status}`);
  const body = Buffer.from(await response.arrayBuffer());
  const ended_at = new Date().toISOString();
  const headers = Buffer.from([...response.headers].map(([k, v]) => `${k}: ${v}\n`).join(""));
  const sha256 = (bytes: Uint8Array) => "sha256:" + createHash("sha256").update(bytes).digest("hex");
  await mkdir(resolve(destination));
  await writeFile(resolve(destination, "nero-landing.source.txt"), body, { flag: "wx" });
  await writeFile(resolve(destination, "nero-landing.response-headers.txt"), headers, { flag: "wx" });
  const receipt = { source: url, started_at, ended_at, status: response.status,
    body_sha256: sha256(body), body_byte_length: body.length, headers_sha256: sha256(headers),
    headers_representation: "fetch response headers serialised as name: value; body after HTTP content decoding",
    publisher_identity_verified: false, global_absence_verified: false };
  await writeFile(resolve(destination, "acquisition.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  throw new Error("NERO source acquisition failed; preserve any partial receipt and use a new directory", { cause: error });
}
