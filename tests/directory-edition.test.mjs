// Tests for tools/build-directory-edition.mjs: the edition builds cleanly from the current
// source, and the verifier refuses the file types the Claude plugin directory refuses.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.resolve(here, "../tools/build-directory-edition.mjs");
const run = (...args) => spawnSync(process.execPath, [BUILD, ...args], { encoding: "utf8" });

test("the directory edition builds from the current source and passes every check", () => {
  const r = run("--check");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /builds cleanly/);
});

test("the verifier refuses scripts, shebangs, package files, fake images and leftover script mentions", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "edition-verify-"));
  try {
    const out = path.join(dir, "out");
    assert.equal(run(out).status, 0);
    fs.writeFileSync(path.join(out, "run.mjs"), "console.log(1)\n");
    fs.writeFileSync(path.join(out, "notes.md"), "#!/bin/sh\necho hi\n");
    fs.writeFileSync(path.join(out, "package.json"), "{}\n");
    fs.writeFileSync(path.join(out, "fake.png"), "not an image");
    fs.appendFileSync(path.join(out, "skills/web-checkup/SKILL.md"), "\nRun `scan.mjs`.\n");
    const r = run("--verify", out);
    assert.equal(r.status, 1);
    for (const expected of [
      /run\.mjs: file type not allowed/,
      /notes\.md: starts with #!/,
      /package\.json: package manager file/,
      /fake\.png: not a real PNG image/,
      /SKILL\.md:\d+: still mentions a script/,
    ]) assert.match(r.stderr, expected);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
