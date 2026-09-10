#!/usr/bin/env node
import { loadCurrentNeroErrorDisclosure } from "./issue-error-intake.mjs";

// Read-only lifecycle disclosure, never a resolution, appointment or score.
try {
  if (process.argv.length !== 2) throw new Error("check-error-disclosure accepts no overrides or arguments");
  process.stdout.write(`${JSON.stringify(loadCurrentNeroErrorDisclosure(), null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.code || "NERO_ERROR_DISCLOSURE_CHECK_FAILED"}: ${error.message}\n`);
  process.exitCode = 1;
}
