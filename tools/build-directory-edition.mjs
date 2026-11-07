#!/usr/bin/env node
// Builds the Claude plugin directory edition: the same skill without its scripts, tests or any
// other file type the directory accepts only from Verified organizations.
//
//   node tools/build-directory-edition.mjs [out-dir]   build (default dist/directory-edition)
//   node tools/build-directory-edition.mjs --check      build to a temporary folder, verify, delete
//   node tools/build-directory-edition.mjs --verify <dir>   only check an existing folder
//
// The output folder can be its own git repository: everything in it except .git is replaced.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import edits from "../editions/directory/edits.mjs";

export const EDITION_REPO = "https://github.com/joshguntarverdiyev/web-checkup-directory";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const editionDir = path.join(root, "editions/directory");

// Files copied unchanged from this repository (directories are copied recursively).
const COPY = [".claude-plugin/icon.png", ".claude-plugin/marketplace.json", "LICENSE", "CREDITS.md", "skills"];
// Never copied, wherever they appear.
const SKIP_DIRS = new Set(["scripts", "node_modules", ".git"]);
// Edition-specific files in editions/directory, copied to the root of the output.
const OWN_FILES = ["README.md", "PRIVACY.md", "SECURITY.md"];

const TEXT_EXT = new Set([".md", ".txt", ".json", ".yaml", ".yml"]);
const TEXT_NAMES = new Set(["LICENSE", ".gitignore"]);
const IMAGE_MAGIC = {
  ".png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ".jpg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  ".gif": (b) => b.subarray(0, 4).toString("latin1") === "GIF8",
  ".webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  ".ico": (b) => b.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])),
};
const PACKAGE_MANAGER_FILES = new Set([
  "package.json", "package-lock.json", "npm-shrinkwrap.json", ".npmrc", "yarn.lock", ".yarnrc", ".yarnrc.yml",
  "pnpm-lock.yaml", "pnpm-workspace.yaml", "bun.lock", "bun.lockb", "bunfig.toml", "deno.json", "deno.jsonc", "deno.lock",
  "requirements.txt", "pyproject.toml", "Pipfile", "Pipfile.lock", "poetry.lock", "Gemfile", "Gemfile.lock", "Cargo.toml", "go.mod",
]);
// Text left over from the full edition that would point at files this edition does not have.
const LEFTOVER = /\b(scan|check-url|visual-check|validate-skill)\.mjs\b|<skill-dir>\/scripts/;

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === ".DS_Store") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

function copyTree(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      if (e.name === ".DS_Store" || (e.isDirectory() && SKIP_DIRS.has(e.name))) continue;
      copyTree(path.join(from, e.name), path.join(to, e.name));
    }
  } else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

export function build(out) {
  const errors = [];
  fs.mkdirSync(out, { recursive: true });
  for (const e of fs.readdirSync(out)) if (e !== ".git") fs.rmSync(path.join(out, e), { recursive: true, force: true });

  for (const rel of COPY) copyTree(path.join(root, rel), path.join(out, rel));
  for (const name of OWN_FILES) fs.copyFileSync(path.join(editionDir, name), path.join(out, name));
  fs.writeFileSync(path.join(out, ".gitignore"), ".DS_Store\n");

  const plugin = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
  plugin.repository = EDITION_REPO;
  plugin.privacyPolicyUrl = `${EDITION_REPO}/blob/main/PRIVACY.md`;
  fs.writeFileSync(path.join(out, ".claude-plugin/plugin.json"), JSON.stringify(plugin, null, 2) + "\n");

  for (const [rel, pairs] of Object.entries(edits)) {
    const file = path.join(out, rel);
    if (!fs.existsSync(file)) { errors.push(`edit target ${rel} does not exist`); continue; }
    let text = fs.readFileSync(file, "utf8");
    pairs.forEach(([from, to], i) => {
      const count = text.split(from).length - 1;
      if (count !== 1) { errors.push(`${rel}: edit ${i + 1} matched ${count} times, expected once: ${JSON.stringify(from.slice(0, 80))}`); return; }
      text = text.replace(from, () => to);
    });
    fs.writeFileSync(file, text);
  }
  return errors;
}

export function verify(dir) {
  const errors = [];
  const files = walk(dir);
  for (const rel of files) {
    const name = path.basename(rel);
    const ext = path.extname(name).toLowerCase();
    const buf = fs.readFileSync(path.join(dir, rel));
    if (PACKAGE_MANAGER_FILES.has(name)) { errors.push(`${rel}: package manager file`); continue; }
    if (IMAGE_MAGIC[ext]) {
      if (!IMAGE_MAGIC[ext](buf)) errors.push(`${rel}: not a real ${ext.slice(1).toUpperCase()} image`);
      continue;
    }
    if (!TEXT_EXT.has(ext) && !TEXT_NAMES.has(name)) { errors.push(`${rel}: file type not allowed in the directory edition`); continue; }
    if (buf.includes(0)) { errors.push(`${rel}: contains NUL bytes`); continue; }
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch { errors.push(`${rel}: not valid UTF-8`); continue; }
    if (text.replace(/^﻿/, "").startsWith("#!")) errors.push(`${rel}: starts with #!`);
    const line = text.split("\n").findIndex((l) => LEFTOVER.test(l));
    if (line !== -1) errors.push(`${rel}:${line + 1}: still mentions a script or npm command from the full edition`);
  }
  try {
    execFileSync(process.execPath, [path.join(root, "tools/validate-skill.mjs"), dir], { stdio: "pipe" });
  } catch (e) {
    errors.push(`validate-skill failed:\n${String(e.stderr || e.stdout).trim()}`);
  }
  return { errors, files };
}

function main() {
  const args = process.argv.slice(2);
  let errors, files, out;
  if (args[0] === "--verify") {
    if (!args[1]) { console.error("usage: build-directory-edition.mjs --verify <dir>"); process.exit(1); }
    out = path.resolve(args[1]);
    ({ errors, files } = verify(out));
  } else {
    const check = args.includes("--check");
    out = check
      ? fs.mkdtempSync(path.join(os.tmpdir(), "web-checkup-directory-"))
      : path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(root, "dist/directory-edition"));
    errors = build(out);
    let result = { errors: [], files: [] };
    if (!errors.length) result = verify(out);
    errors = errors.concat(result.errors);
    files = result.files;
    if (check) fs.rmSync(out, { recursive: true, force: true });
  }
  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`\nDirectory edition is not ready: ${errors.length} error(s).`);
    process.exitCode = 1;
  } else {
    console.log(`OK: directory edition ${args.includes("--check") ? "builds cleanly" : `at ${path.relative(process.cwd(), out) || "."}`} (${files.length} files, all allowed types).`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
