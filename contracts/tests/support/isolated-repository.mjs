import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after } from "node:test";

// Mutable evidence fixtures must be below the test's governed root, but that
// root must never be the working checkout. Each process gets its own copy.
export function isolatedRepository(sourceRoot) {
  const root = mkdtempSync(join(tmpdir(), "mind-flow-test-repository-"));
  after(() => rmSync(root, { recursive: true, force: true }));
  try {
    for (const path of ["dashboard", "contracts", "integration", "signals", "paths",
      "preparation", "forecasts", "governance", "evidence", "package.json",
      "pilots/australia/README.md", "pilots/australia/tools", "pilots/australia/data",
      "pilots/australia/basket", "pilots/australia/sources/primary-care"]) {
      const destination = resolve(root, path);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(resolve(sourceRoot, path), destination, { recursive: true });
    }
    const modules = resolve(sourceRoot, "node_modules");
    if (existsSync(modules)) symlinkSync(modules, resolve(root, "node_modules"), "dir");
    process.env.PYTHONDONTWRITEBYTECODE = "1";
    return root;
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw new Error(`Could not prepare isolated test repository: ${error.message}`, { cause: error });
  }
}
