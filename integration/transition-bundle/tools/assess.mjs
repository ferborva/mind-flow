#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assessTransitionBundle } from "../assess.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const bundlePath = resolve(process.argv[2] || resolve(here, "../fixtures/round-03.current.json"));
const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
const assessment = assessTransitionBundle(bundle, { rootDir: root });

process.stdout.write(`${JSON.stringify(assessment, null, 2)}\n`);
process.exitCode = assessment.bundle_coherent ? 0 : 2;
