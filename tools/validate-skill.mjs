#!/usr/bin/env node
// Validates every skill in skills/ against the Agent Skills spec (agentskills.io/specification)
// plus repo conventions: relative links resolve, plugin and marketplace names agree, scripts parse.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function frontmatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { err(`${file}: missing YAML frontmatter`); return {}; }
  const data = {};
  let parent = null;
  for (const line of m[1].split("\n")) {
    if (!line.trim()) continue;
    const nested = line.match(/^ {2}([\w-]+):\s*(.*)$/);
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (nested && parent) data[parent][nested[1]] = unquote(nested[2]);
    else if (top) {
      if (top[2] === "") { data[top[1]] = {}; parent = top[1]; }
      else { data[top[1]] = unquote(top[2]); parent = null; }
    } else err(`${file}: cannot parse frontmatter line: ${line}`);
  }
  return data;
}
const unquote = (v) => v.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

const skillsDir = path.join(root, "skills");
const skills = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
if (!skills.length) err("no skills found in skills/");

for (const dir of skills) {
  const base = path.join(skillsDir, dir);
  const skillFile = path.join(base, "SKILL.md");
  if (!fs.existsSync(skillFile)) { err(`skills/${dir}: missing SKILL.md`); continue; }
  const text = fs.readFileSync(skillFile, "utf8");
  const fm = frontmatter(text, `skills/${dir}/SKILL.md`);
  const allowed = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
  for (const k of Object.keys(fm)) if (!allowed.has(k)) err(`SKILL.md: frontmatter field "${k}" is not in the Agent Skills spec`);
  if (!fm.name) err("SKILL.md: name is required");
  else {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name) || fm.name.length > 64) err(`SKILL.md: invalid name "${fm.name}"`);
    if (fm.name !== dir) err(`SKILL.md: name "${fm.name}" must match directory "${dir}"`);
  }
  if (!fm.description || typeof fm.description !== "string") err("SKILL.md: description is required");
  else if (fm.description.length > 1024) err(`SKILL.md: description is ${fm.description.length} chars (max 1024)`);
  if (fm.compatibility && fm.compatibility.length > 500) err("SKILL.md: compatibility over 500 chars");
  if (fm.metadata && typeof fm.metadata === "object") for (const [k, v] of Object.entries(fm.metadata)) if (typeof v !== "string") err(`metadata.${k} must be a string`);
  const lines = text.split("\n").length;
  if (lines > 500) warn(`SKILL.md is ${lines} lines (spec recommends under 500)`);

  // every relative markdown link in the skill resolves
  const mdFiles = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".md")) mdFiles.push(p); } })(base);
  for (const f of mdFiles) {
    const body = fs.readFileSync(f, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const [p, anchor] = target.split("#");
      const resolved = path.resolve(path.dirname(f), p);
      if (!fs.existsSync(resolved)) { err(`${path.relative(root, f)}: broken link ${target}`); continue; }
      if (anchor && resolved.endsWith(".md")) {
        const slugs = new Set([...fs.readFileSync(resolved, "utf8").matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")));
        if (!slugs.has(anchor)) err(`${path.relative(root, f)}: anchor #${anchor} not found in ${path.relative(root, resolved)}`);
      }
    }
  }
  // files mentioned in SKILL.md (scripts, assets) exist
  for (const m of text.matchAll(/`(?:<skill-dir>\/)?((?:scripts|assets|references)\/[\w./-]+)`/g)) {
    if (!fs.existsSync(path.join(base, m[1]))) err(`SKILL.md mentions ${m[1]} which does not exist`);
  }
  // scripts parse
  const scriptsDir = path.join(base, "scripts");
  if (fs.existsSync(scriptsDir)) {
    for (const s of fs.readdirSync(scriptsDir).filter((x) => x.endsWith(".mjs") || x.endsWith(".js"))) {
      try { execFileSync(process.execPath, ["--check", path.join(scriptsDir, s)], { stdio: "pipe" }); }
      catch (e) { err(`scripts/${s} does not parse: ${e.stderr}`); }
    }
  }
}

// plugin and marketplace manifests agree
try {
  const plugin = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
  const market = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/marketplace.json"), "utf8"));
  const entry = (market.plugins || []).find((p) => p.source === "./");
  if (!entry) err("marketplace.json: no plugin entry with source ./");
  else if (entry.name !== plugin.name) err(`marketplace entry name "${entry.name}" differs from plugin.json name "${plugin.name}"`);
  if (!market.owner || !market.owner.name) err("marketplace.json: owner.name is required");
} catch (e) { err(`manifest error: ${e.message}`); }

for (const w of warnings) console.log(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(`OK: ${skills.length} skill(s) valid (${skills.join(", ")}).`);
}
