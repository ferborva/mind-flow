import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const docUrl=new URL("../../../reviews/round-09-scheduled-resolution.md",import.meta.url);
test("future runbook matches both actual CLI interfaces and keeps defective campaign excluded",()=>{
  const doc=readFileSync(docUrl,"utf8");
  for(const campaign of ["round-08-nero","round-09-nero-corrected"]){
    const cli=readFileSync(new URL(`../${campaign}/check-resolution.mjs`,import.meta.url),"utf8");
    const names=JSON.parse(cli.match(/const names = (\[[^;]+\]);/)[1]);
    const command=doc.split("```sh").map(s=>s.split("```")[0]).find(s=>s.includes(`${campaign}/check-resolution.mjs`));
    assert.ok(command,`missing ${campaign} command`);
    for(const name of names)assert.ok(command.includes(`--${name} `),`missing --${name}`);
    assert.ok(command.includes(`${campaign}/evaluation-plan.json`));
  }
  assert.ok(!doc.includes("round-09-nero/check-resolution.mjs"));
  assert.match(doc,/NOT ACTIVE/);
  assert.match(doc,/2026-12-07T00:00:00Z/);assert.match(doc,/appointment_verified/);
});
