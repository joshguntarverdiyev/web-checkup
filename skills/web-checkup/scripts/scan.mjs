#!/usr/bin/env node
// Web Checkup static scanner.
// Zero dependencies, Node 18+. Prints signals for an agent or a human to verify.
// Signals are leads, not verdicts: confirm each one in source or in the browser.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const AREAS = ["security", "design", "seo", "a11y", "responsive", "perf", "code"];
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 };

const HELP = `Web Checkup scan: static quality and security signals for web projects.

Usage:
  node scan.mjs [dir] [options]

Options:
  --only <areas>     Comma-separated subset of: ${AREAS.join(", ")}
  --json             Print machine-readable JSON
  --strict           Exit with code 2 when any high-severity signal is found
  --limit <n>        Occurrences shown per rule (default 6, 0 = all)
  --audit            Also run "npm audit" (needs network and an npm lockfile)
  -h, --help         Show this help

Exit codes: 0 = scan finished, 1 = usage error, 2 = high-severity signals with --strict.`;

// ---------- arguments ----------

function parseArgs(argv) {
  const opts = { dir: ".", only: new Set(AREAS), json: false, strict: false, limit: 6, audit: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(HELP); process.exit(0); }
    else if (a === "--json") opts.json = true;
    else if (a === "--strict") opts.strict = true;
    else if (a === "--audit") opts.audit = true;
    else if (a === "--only" || a.startsWith("--only=")) {
      const v = a.includes("=") ? a.split("=")[1] : argv[++i];
      if (!v) usage("--only needs a value");
      const picked = v.split(",").map((s) => s.trim()).filter(Boolean);
      for (const p of picked) if (!AREAS.includes(p)) usage(`unknown area "${p}"`);
      opts.only = new Set(picked);
    } else if (a === "--limit" || a.startsWith("--limit=")) {
      const v = Number(a.includes("=") ? a.split("=")[1] : argv[++i]);
      if (!Number.isInteger(v) || v < 0) usage("--limit needs a non-negative integer");
      opts.limit = v;
    } else if (a.startsWith("-")) usage(`unknown option ${a}`);
    else rest.push(a);
  }
  if (rest.length > 1) usage("only one directory can be scanned at a time");
  if (rest[0]) opts.dir = rest[0];
  return opts;
}

function usage(msg) {
  console.error(`scan.mjs: ${msg}\n\n${HELP}`);
  process.exit(1);
}

const opts = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(opts.dir);
if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) usage(`not a directory: ${opts.dir}`);

// ---------- file discovery ----------

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", ".next", ".nuxt", ".svelte-kit", ".output", "dist", "build", "out",
  "coverage", ".vercel", ".netlify", ".turbo", ".cache", ".parcel-cache", "vendor", ".venv", "venv",
  "__pycache__", "storybook-static", ".expo", ".wrangler", ".astro", ".docusaurus", ".idea", ".vscode",
  "target", "Pods", ".gradle", ".terraform",
  // agent tooling folders: skills and prompts contain example code that is not the product
  ".claude", ".agents", ".agent", ".codex", ".cursor", ".windsurf", ".gemini", ".opencode", ".github-copilot",
]);
const TEXT_EXT = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts", ".vue", ".svelte", ".astro", ".html", ".htm",
  ".css", ".scss", ".sass", ".less", ".pcss", ".md", ".mdx", ".json", ".jsonc", ".sql", ".rules", ".toml",
  ".yaml", ".yml", ".txt", ".xml", ".php", ".liquid", ".hbs", ".ejs", ".njk", ".py", ".rb", ".go", ".env",
]);
const UI_EXT = new Set([".jsx", ".tsx", ".vue", ".svelte", ".astro", ".html", ".htm", ".mdx", ".liquid", ".hbs", ".ejs", ".njk", ".php"]);
const STYLE_EXT = new Set([".css", ".scss", ".sass", ".less", ".pcss"]);
const CODE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts", ".vue", ".svelte", ".astro"]);
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".tif", ".tiff"]);
const FONT_EXT = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const MAX_TEXT_BYTES = 1_000_000;
const MAX_FILES = 25_000;

const files = [];
let truncated = false;
(function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (files.length >= MAX_FILES) { truncated = true; return; }
    const abs = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(abs);
      continue;
    }
    if (!e.isFile()) continue;
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const base = e.name;
    let ext = path.extname(base).toLowerCase();
    if (base.startsWith(".env")) ext = ".env";
    let size = 0;
    try { size = fs.statSync(abs).size; } catch { continue; }
    files.push({ rel, abs, base, ext, size });
  }
})(ROOT);

const contentCache = new Map();
function read(f) {
  if (contentCache.has(f.rel)) return contentCache.get(f.rel);
  let text = null;
  if ((TEXT_EXT.has(f.ext) || f.base.startsWith(".env") || f.base === ".gitignore" || f.base === "_headers" || f.base === "_redirects")
      && f.size <= MAX_TEXT_BYTES && !/\.min\.(js|css)$/.test(f.base) && !/\.map$/.test(f.base)) {
    try { text = fs.readFileSync(f.abs, "utf8"); } catch { text = null; }
    if (text && text.includes("\u0000")) text = null;
  }
  contentCache.set(f.rel, text);
  return text;
}

const isTest = (rel) => /(^|\/)(__tests__|__mocks__|tests?|spec|e2e|cypress|playwright|fixtures?|mocks?|stories)\//i.test(rel) || /\.(test|spec|stories|story)\.[a-z]+$/i.test(rel);
const isDoc = (f) => f.ext === ".md" || f.ext === ".mdx" || f.ext === ".txt";
const isLockfile = (base) => /^(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|composer\.lock|Gemfile\.lock|poetry\.lock)$/.test(base);
const isEnvFile = (base) => /^\.env(\..+)?$/.test(base);
const isEnvExample = (base) => /^\.env(\.[\w-]+)*\.(example|sample|template|dist|defaults)$/i.test(base);

// ---------- git ----------

let gitTracked = null;
try {
  const out = execFileSync("git", ["-C", ROOT, "ls-files", "-z"], { stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  gitTracked = new Set(out.toString("utf8").split("\0").filter(Boolean));
} catch { gitTracked = null; }

// ---------- project detection ----------

let pkg = {};
const pkgFile = files.find((f) => f.rel === "package.json");
if (pkgFile) { try { pkg = JSON.parse(read(pkgFile) || "{}"); } catch { pkg = {}; } }
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}), ...(pkg.peerDependencies || {}) };
// Monorepos: merge dependencies from nested package.json files (apps/*, packages/*).
for (const f of files) {
  if (f.base === "package.json" && f.rel !== "package.json" && f.rel.split("/").length <= 3) {
    try { const p = JSON.parse(read(f) || "{}"); Object.assign(deps, p.dependencies || {}, p.devDependencies || {}); } catch { /* ignore */ }
  }
}
const has = (name) => Object.prototype.hasOwnProperty.call(deps, name);
const hasPrefix = (prefix) => Object.keys(deps).some((d) => d.startsWith(prefix));
const anyFile = (re) => files.some((f) => re.test(f.rel));

const project = {
  name: pkg.name || path.basename(ROOT),
  frameworks: [],
  styling: [],
  services: [],
  packageManagers: [],
};
const fw = project.frameworks;
if (has("next") || anyFile(/(^|\/)next\.config\.(js|mjs|ts|cjs)$/)) fw.push("Next.js");
if (has("nuxt")) fw.push("Nuxt");
if (has("@sveltejs/kit")) fw.push("SvelteKit");
else if (has("svelte")) fw.push("Svelte");
if (has("astro")) fw.push("Astro");
if (has("@remix-run/react") || has("@react-router/dev")) fw.push("Remix/React Router");
if (has("gatsby")) fw.push("Gatsby");
if (has("@angular/core")) fw.push("Angular");
if (has("vite") && !fw.length) fw.push("Vite");
if (has("react-scripts")) fw.push("Create React App");
if (has("expo")) fw.push("Expo");
if (has("vue") && !has("nuxt")) fw.push("Vue");
if (has("react") && !fw.some((x) => /Next|Remix|Gatsby|Expo|Astro/.test(x))) fw.push("React");
if (has("express")) fw.push("Express");
if (has("hono")) fw.push("Hono");
if (!fw.length && files.some((f) => f.ext === ".html")) fw.push("Static HTML");
if (has("tailwindcss") || has("@tailwindcss/postcss") || has("@tailwindcss/vite")) project.styling.push("Tailwind");
if (has("styled-components")) project.styling.push("styled-components");
if (hasPrefix("@emotion/")) project.styling.push("Emotion");
if (has("@supabase/supabase-js") || hasPrefix("@supabase/")) project.services.push("Supabase");
if (has("firebase") || has("firebase-admin")) project.services.push("Firebase");
if (has("convex")) project.services.push("Convex");
if (has("@prisma/client") || has("prisma")) project.services.push("Prisma");
if (has("drizzle-orm")) project.services.push("Drizzle");
if (has("mongoose") || has("mongodb")) project.services.push("MongoDB");
if (has("stripe") || has("@stripe/stripe-js")) project.services.push("Stripe");
if (has("next-auth") || hasPrefix("@auth/")) project.services.push("Auth.js");
if (hasPrefix("@clerk/")) project.services.push("Clerk");
if (has("better-auth")) project.services.push("Better Auth");
if (has("openai") || has("@anthropic-ai/sdk") || has("ai") || hasPrefix("@ai-sdk/") || has("@google/genai") || has("@google/generative-ai") || has("langchain") || hasPrefix("@langchain/")) project.services.push("LLM SDK");
for (const [file, pm] of [["package-lock.json", "npm"], ["pnpm-lock.yaml", "pnpm"], ["yarn.lock", "yarn"], ["bun.lockb", "bun"], ["bun.lock", "bun"]]) {
  if (files.some((f) => f.rel === file)) project.packageManagers.push(pm);
}

const isNext = fw.includes("Next.js");
const pureClientApp = !fw.some((x) => /Next|Nuxt|SvelteKit|Astro|Remix|Gatsby|Angular|Express|Hono/.test(x))
  && fw.some((x) => /Vite|React|Create React App|Expo|Vue|Svelte/.test(x));

// ---------- findings ----------

const findings = [];
function add(area, severity, id, message, file = null, line = null, extra = {}) {
  if (!opts.only.has(area)) return;
  findings.push({ area, severity, id, message, file, line, ...extra });
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function eachLine(text, fn) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.length > 4000) continue; // minified or generated content
    fn(l, i + 1);
  }
}

function redact(secret) {
  const s = String(secret);
  return `${s.slice(0, 4)}…(${s.length} chars)`;
}

const PLACEHOLDER = /(x{4,}|X{4,}|your[_-]?|YOUR[_-]?|example|EXAMPLE|placeholder|PLACEHOLDER|dummy|DUMMY|changeme|CHANGEME|replace|REPLACE|<[^>]*>|\.\.\.|\*{3,}|fake|FAKE|sample|SAMPLE|test[_-]?key|0{8,}|1234567890)/;

const sourceFiles = files.filter((f) => !isLockfile(f.base) && !f.base.endsWith(".map"));
const uiFiles = sourceFiles.filter((f) => (UI_EXT.has(f.ext) || STYLE_EXT.has(f.ext)) && !isTest(f.rel));
const codeFiles = sourceFiles.filter((f) => CODE_EXT.has(f.ext) && !isTest(f.rel));

// ======================================================================
// SECURITY
// ======================================================================

const SECRET_RULES = [
  { id: "secret.aws-access-key", re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, sev: "high", label: "AWS access key ID" },
  { id: "secret.stripe-live", re: /\b(sk|rk)_live_[0-9a-zA-Z]{20,}\b/g, sev: "high", label: "Stripe live secret or restricted key" },
  { id: "secret.stripe-test", re: /\bsk_test_[0-9a-zA-Z]{20,}\b/g, sev: "medium", label: "Stripe test secret key" },
  { id: "secret.stripe-webhook", re: /\bwhsec_[0-9a-zA-Z]{20,}\b/g, sev: "high", label: "Stripe webhook signing secret" },
  { id: "secret.anthropic", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, sev: "high", label: "Anthropic API key" },
  { id: "secret.openai", re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/g, sev: "high", label: "OpenAI-style API key", skipIf: /sk-ant-/ },
  { id: "secret.github", re: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b/g, sev: "high", label: "GitHub token" },
  { id: "secret.slack", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, sev: "high", label: "Slack token" },
  { id: "secret.sendgrid", re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{20,}\b/g, sev: "high", label: "SendGrid API key" },
  { id: "secret.supabase-secret", re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g, sev: "high", label: "Supabase secret key" },
  { id: "secret.google-api", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, sev: "medium", label: "Google API key (Firebase web keys are public by design: restrict it in Google Cloud and rely on security rules)" },
  { id: "secret.private-key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g, sev: "high", label: "Private key" },
  { id: "secret.db-url", re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?):\/\/[^\s:'"`/@]+:[^\s@'"`]{6,}@[^\s'"`]+/g, sev: "high", label: "Database connection string with password", skipIf: /localhost|127\.0\.0\.1|@db:|@postgres:|@mysql:|@redis:|\$\{|password@|pass@|:postgres@|:root@|:secret@/ },
  { id: "secret.generic", re: /\b(?:api[_-]?key|apikey|secret(?:[_-]?key)?|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|password|passwd)\b["']?\s*[:=]\s*["'`]([A-Za-z0-9_\-/+=.]{20,})["'`]/gi, sev: "medium", label: "Hard-coded credential-like value", generic: true },
];

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload && payload.role ? String(payload.role) : null;
  } catch { return null; }
}

function securityChecks() {
  // 1. Tracked env files and .gitignore coverage
  const envFiles = files.filter((f) => isEnvFile(f.base) && !isEnvExample(f.base));
  if (gitTracked) {
    for (const f of envFiles) {
      if (gitTracked.has(f.rel)) add("security", "high", "env.tracked", `${f.rel} is committed to git. Remove it from the repo, add it to .gitignore and rotate every secret it ever contained.`, f.rel);
    }
  } else if (envFiles.length) {
    add("security", "info", "env.no-git", "Not a git repository (or git unavailable): make sure .env files are ignored before the first commit.");
  }
  const gi = files.find((f) => f.rel === ".gitignore");
  const giText = gi ? read(gi) || "" : "";
  if (!gi || !/^\s*\/?\.env/m.test(giText)) {
    add("security", envFiles.length ? "medium" : "low", "env.gitignore", ".gitignore does not list .env files. Add `.env*` and `!.env.example`.", gi ? ".gitignore" : null);
  }

  // 2. Secrets in content
  for (const f of sourceFiles) {
    const text = read(f);
    if (!text) continue;
    if (isEnvFile(f.base) && !isEnvExample(f.base) && gitTracked && !gitTracked.has(f.rel)) continue; // local, untracked env files are expected to hold secrets
    for (const rule of SECRET_RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(text))) {
        const value = rule.generic ? m[1] : m[0];
        const context = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 10);
        if (rule.skipIf && rule.skipIf.test(context)) continue;
        if (PLACEHOLDER.test(value)) continue;
        if (rule.generic) {
          if (new Set(value).size < 10) continue; // low entropy
          if (/process\.env|import\.meta\.env|getenv|os\.environ/.test(context)) continue;
          if (isDoc(f)) continue;
        }
        const sev = rule.id === "secret.google-api" && project.services.includes("Firebase") ? "low" : rule.sev;
        add("security", sev, rule.id, `${rule.label}: ${redact(value)}. If real, rotate it at the provider and move it to server-side env vars.`, f.rel, lineOf(text, m.index));
      }
    }
    // Supabase / generic JWTs: flag service_role tokens
    const jwtRe = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
    let jm;
    while ((jm = jwtRe.exec(text))) {
      const role = jwtRole(jm[0]);
      if (role === "service_role") add("security", "high", "secret.supabase-service-role", `Supabase service_role JWT (bypasses all RLS): ${redact(jm[0])}. Rotate it and keep it server-only.`, f.rel, lineOf(text, jm.index));
    }
  }

  // 3. Client-exposed env var names that look secret
  const exposedRe = /\b(NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|NUXT_PUBLIC_|GATSBY_|PUBLIC_)([A-Z0-9_]+)\b/g;
  const highWords = /(SECRET|PRIVATE|SERVICE_ROLE|SERVICE_KEY|PASSWORD|OPENAI|ANTHROPIC|CLAUDE|GEMINI|GROQ|MISTRAL|REPLICATE|DATABASE_URL|DB_URL|POSTGRES|MONGO|WEBHOOK|SB_SECRET|STRIPE_SK|RESEND|SENDGRID|TWILIO|AWS_SECRET|AWS_ACCESS)/;
  const medWords = /(TOKEN|ADMIN|API_KEY)/;
  const okWords = /(PUBLISHABLE|ANON|SITE_KEY|MEASUREMENT|GA_|POSTHOG|SENTRY_DSN|MAPBOX|URL$|_URL_|APP_ID|PROJECT_ID|AUTH_DOMAIN|STORAGE_BUCKET|SENDER_ID|FIREBASE_API_KEY|TURNSTILE|RECAPTCHA_SITE)/;
  const seenExposed = new Set();
  for (const f of sourceFiles) {
    if (!(CODE_EXT.has(f.ext) || isEnvFile(f.base) || f.ext === ".json" || f.ext === ".toml" || f.ext === ".yml" || f.ext === ".yaml")) continue;
    const text = read(f);
    if (!text) continue;
    exposedRe.lastIndex = 0;
    let m;
    while ((m = exposedRe.exec(text))) {
      const name = m[0];
      if (m[1] === "PUBLIC_" && /(NEXT|NUXT|EXPO)_$/.test(text.slice(Math.max(0, m.index - 5), m.index))) continue;
      const rest = m[2];
      let sev = null;
      if (highWords.test(rest)) sev = "high";
      else if (medWords.test(rest) && !okWords.test(rest)) sev = "medium";
      if (!sev) continue;
      const key = `${name}@${f.rel}`;
      if (seenExposed.has(key)) continue;
      seenExposed.add(key);
      add("security", sev, "env.client-exposed", `${name} is inlined into the client bundle by its prefix. Secrets must use a non-public name and be read only on the server.`, f.rel, lineOf(text, m.index));
    }
  }

  // 4. Code patterns
  const routeFiles = [];
  const serverActionFiles = [];
  for (const f of codeFiles) {
    const text = read(f);
    if (!text) continue;
    const isClientFile = /^\s*(["'])use client\1/m.test(text.slice(0, 500)) || (pureClientApp && !/(^|\/)(server|api|functions|supabase\/functions|netlify\/functions)\//.test(f.rel));

    if (/(^|\/)app\/(.*\/)?route\.(t|j)sx?$/.test(f.rel) || /(^|\/)pages\/api\//.test(f.rel) || /^(api|server\/api|server\/routes)\/.*\.(t|j)s$/.test(f.rel) || /(^|\/)\+server\.(t|j)s$/.test(f.rel)) routeFiles.push(f);
    if (/^\s*(["'])use server\1/m.test(text.slice(0, 300))) serverActionFiles.push(f);

    eachLine(text, (l, n) => {
      if (/dangerouslySetInnerHTML/.test(l)) {
        if (/JSON\.stringify/.test(l) && /replace\(\/</.test(l)) { /* escaped JSON-LD, fine */ }
        else if (/JSON\.stringify/.test(l)) add("security", "low", "xss.jsonld-unescaped", "JSON injected via dangerouslySetInnerHTML: escape `<` (`.replace(/</g, \"\\\\u003c\")`) so data cannot close the script tag.", f.rel, n);
        else add("security", "medium", "xss.dangerously-set-inner-html", "dangerouslySetInnerHTML: verify the HTML is trusted or sanitized (DOMPurify).", f.rel, n);
      }
      if (/\.(innerHTML|outerHTML)\s*\+?=(?!=)/.test(l) || /insertAdjacentHTML\(/.test(l) || /document\.write\(/.test(l)) add("security", "medium", "xss.dom-sink", "Raw HTML sink (innerHTML / insertAdjacentHTML / document.write): verify the input is trusted or sanitized.", f.rel, n);
      if (/\bv-html\s*=/.test(l) || /\{@html\s/.test(l) || /\bset:html\s*=/.test(l)) add("security", "medium", "xss.framework-html", "Framework raw-HTML directive (v-html / {@html} / set:html): verify the content is sanitized.", f.rel, n);
      if (/(^|[^.\w])eval\s*\(/.test(l) || /new Function\s*\(/.test(l)) add("security", "medium", "code.eval", "eval / new Function: avoid executing strings.", f.rel, n);
      if (/\bjwt\.decode\s*\(/.test(l) || (/\bjwtDecode\s*\(/.test(l) && !isClientFile)) add("security", "medium", "auth.jwt-decode", "JWT decoded without verification here. Authorization must use a verify call (jwt.verify / jose jwtVerify) with pinned algorithms.", f.rel, n);
      if (/\$(queryRawUnsafe|executeRawUnsafe)\s*\(/.test(l)) add("security", "high", "sqli.prisma-unsafe", "$queryRawUnsafe / $executeRawUnsafe: use tagged $queryRaw with parameters; never interpolate user input.", f.rel, n);
      if (/`[^`]*\b(SELECT\s[^`]*?\sFROM|INSERT\s+INTO|UPDATE\s+["\w.]+\s+SET|DELETE\s+FROM)\b[^`]*\$\{/i.test(l) && !/\bsql`|\bPrisma\.sql`|\$queryRaw`|\bsql\.raw/.test(l)) add("security", "medium", "sqli.template", "SQL built with string interpolation: use parameterized queries.", f.rel, n);
      if (/\b(data|where)\s*:\s*(req\.body|body|await\s+(req|request)\.json\(\))\s*[,}]/.test(l)) add("security", "high", "authz.mass-assignment", "Request body passed straight into an ORM data/where clause (mass assignment or operator injection). Parse with a schema and pick allowed fields.", f.rel, n);
      if (/unit_amount\s*:\s*(req|request|body|input|data|params|args)\b/.test(l) || /\b(price|amount)\s*:\s*(req\.body|body)\.(price|amount)/.test(l)) add("security", "high", "payments.client-price", "Payment amount taken from the request. Look prices up on the server (Stripe Price IDs).", f.rel, n);
      if (/dangerouslyAllowBrowser\s*:\s*true/.test(l)) add("security", "high", "llm.browser-key", "LLM SDK configured to run in the browser: the API key ships to every visitor. Proxy through your server.", f.rel, n);
      if (/localStorage\.setItem\(\s*["'`][^"'`]*(token|jwt|session|auth|access|refresh)/i.test(l)) add("security", "medium", "auth.token-localstorage", "Auth token stored in localStorage (readable by any XSS). Prefer HttpOnly, Secure, SameSite cookies.", f.rel, n);
      if (/NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/.test(l)) add("security", "high", "tls.disabled", "TLS certificate verification disabled globally.", f.rel, n);
      else if (/rejectUnauthorized\s*:\s*false/.test(l)) add("security", "medium", "tls.reject-unauthorized", "rejectUnauthorized: false disables certificate checks.", f.rel, n);
      if (/\b(exec|execSync)\s*\(\s*`[^`]*\$\{/.test(l)) add("security", "high", "code.command-injection", "Shell command built with interpolation: use execFile/spawn with an argument array and validate input.", f.rel, n);
      if (/\bredirect\s*\(\s*(searchParams\.get\(|req\.query\.|query\.|params\.)\s*["']?(next|redirect|redirectTo|redirect_to|returnTo|return_to|callbackUrl|url|to)\b/.test(l)) add("security", "medium", "redirect.open", "Redirect target taken from the request: allow only relative paths or an allowlist.", f.rel, n);
      if (/Access-Control-Allow-Origin["']?\s*[,:]\s*["']\*["']/.test(l)) add("security", "low", "cors.wildcard", "CORS allows any origin. Fine for public read-only data only; never with credentials.", f.rel, n);
      if (/rehype-raw/.test(l) && !/rehype-sanitize/.test(text)) add("security", "medium", "xss.markdown-raw", "rehype-raw renders raw HTML from markdown without rehype-sanitize.", f.rel, n);
      if (/<script[^>]+src=["']http:\/\//.test(l)) add("security", "medium", "transport.mixed-script", "Script loaded over http:// (mixed content, tamperable).", f.rel, n);
    });

    if (/origin\s*:\s*(true|["']\*["'])/.test(text) && /credentials\s*:\s*true/.test(text)) add("security", "high", "cors.credentials-any-origin", "CORS reflects any origin while allowing credentials: any website can make authenticated requests as your users.", f.rel);

    // Supabase service role referenced from client code
    if (isClientFile && /SERVICE_ROLE|service_role|SB_SECRET|sb_secret_/.test(text)) add("security", "high", "supabase.service-role-client", "Supabase service-role/secret key referenced in client-side code. It bypasses RLS: use it only on the server.", f.rel);
  }

  // 5. Route handlers and server actions without visible auth
  const AUTH_HINT = /\b(auth\s*\(|getServerSession|getSession|getUser|currentUser|getAuth|requireUser|requireAuth|withAuth|verifyToken|jwtVerify|jwt\.verify|clerkClient|auth\(\)\.protect|supabase\.auth|validateRequest|getToken|session\b|isAuthenticated|authorize|checkAuth|ensureAuth|getKindeServerSession|withApiAuthRequired|getIronSession|lucia|betterAuth|api\.getSession)/;
  const PUBLIC_ROUTE = /(webhook|\/auth\/|\/(login|logout|signin|signup|register|callback|og|health|healthz|status|sitemap|robots|manifest|rss|feed|public|contact|newsletter|subscribe)\b)/i;
  for (const f of routeFiles) {
    const text = read(f);
    if (!text) continue;
    const mutating = /export\s+(async\s+)?(function|const)\s+(POST|PUT|PATCH|DELETE)\b/.test(text) || /req\.method\s*===?\s*["'](POST|PUT|PATCH|DELETE)/.test(text);
    if (/\/cron\//i.test(f.rel)) {
      if (!/CRON_SECRET|authorization/i.test(text)) add("security", "medium", "authz.cron-unprotected", "Cron route with no secret check: anyone can trigger it. Verify a CRON_SECRET bearer header.", f.rel);
      continue;
    }
    if (/webhook/i.test(f.rel)) {
      if (/stripe/i.test(text) && !/constructEvent(Async)?\s*\(/.test(text)) add("security", "high", "webhook.unverified", "Stripe webhook without stripe.webhooks.constructEvent: anyone can forge events.", f.rel);
      else if (!/stripe/i.test(text) && !/(signature|hmac|svix|verify|timingSafeEqual|createHmac)/i.test(text)) add("security", "medium", "webhook.no-signature", "Webhook handler with no visible signature verification.", f.rel);
      if (/stripe/i.test(text) && /(req|request)\.json\(\)/.test(text) && /constructEvent/.test(text)) add("security", "medium", "webhook.parsed-body", "Stripe webhook reads a parsed JSON body; signature verification needs the raw body (request.text()).", f.rel);
      continue;
    }
    if (PUBLIC_ROUTE.test(f.rel)) continue;
    if (!AUTH_HINT.test(text)) add("security", mutating ? "medium" : "low", "authz.route-no-auth", `${mutating ? "Mutating" : "Read"} API route with no visible authentication. Confirm it is intentionally public, otherwise validate, authenticate and authorize ownership.`, f.rel);
  }
  for (const f of serverActionFiles) {
    const text = read(f);
    if (text && !AUTH_HINT.test(text)) add("security", "medium", "authz.server-action-no-auth", "Server actions file with no visible auth check. Every exported action is a public endpoint: validate input, authenticate, authorize.", f.rel);
  }

  // 6. Supabase SQL: RLS and permissive policies
  const sqlFiles = sourceFiles.filter((f) => f.ext === ".sql");
  if (sqlFiles.length) {
    const created = new Map();
    const rls = new Set();
    for (const f of sqlFiles) {
      const text = read(f);
      if (!text) continue;
      const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/gi;
      let m;
      while ((m = createRe.exec(text))) {
        const schema = (m[1] || "public").toLowerCase();
        if (schema !== "public") continue;
        const t = m[2].toLowerCase();
        if (!created.has(t)) created.set(t, { file: f.rel, line: lineOf(text, m.index) });
      }
      const rlsRe = /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+enable\s+row\s+level\s+security/gi;
      while ((m = rlsRe.exec(text))) rls.add(m[2].toLowerCase());
      const policyRe = /create\s+policy\s+("[^"]+"|\w+)\s+on\s+([\w."]+)([\s\S]*?);/gi;
      while ((m = policyRe.exec(text))) {
        const body = m[3].toLowerCase();
        const cmd = (body.match(/\bfor\s+(select|insert|update|delete|all)\b/) || [, "all"])[1];
        const permissive = /using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/.test(body);
        const anyUser = /using\s*\(\s*\(?\s*(select\s+)?auth\.uid\(\)\s*\)?\s+is\s+not\s+null\s*\)/.test(body) || /auth\.role\(\)\s*=\s*'authenticated'/.test(body);
        if (permissive) add("security", cmd === "select" ? "low" : "high", "supabase.policy-true", cmd === "select" ? `Policy ${m[1]} on ${m[2]} lets everyone read every row. Fine only for intentionally public data.` : `Policy ${m[1]} on ${m[2]} allows ${cmd.toUpperCase()} on every row (true). Scope it to the owner.`, f.rel, lineOf(text, m.index));
        else if (anyUser && cmd !== "insert") add("security", "medium", "supabase.policy-any-user", `Policy ${m[1]} on ${m[2]} allows any signed-in user (${cmd.toUpperCase()}). Scope it to the row owner.`, f.rel, lineOf(text, m.index));
      }
    }
    for (const [t, loc] of created) {
      if (!rls.has(t)) add("security", "high", "supabase.rls-missing", `Table "${t}" is created in SQL without "enable row level security" in any migration. Verify RLS in the dashboard (Security Advisor).`, loc.file, loc.line);
    }
  }

  // 7. Firebase rules
  for (const f of sourceFiles.filter((x) => /(^|\/)(firestore|storage|database)\.rules$/.test(x.rel) || /(^|\/)database\.rules\.json$/.test(x.rel))) {
    const text = read(f);
    if (!text) continue;
    eachLine(text, (l, n) => {
      if (/allow\s+[\w\s,]+:\s*if\s+true\s*;/.test(l)) add("security", "high", "firebase.rules-open", "Firebase rule allows access to everyone (if true).", f.rel, n);
      else if (/allow\s+[\w\s,]+:\s*if\s+request\.auth\s*!=\s*null\s*;/.test(l)) add("security", "medium", "firebase.rules-any-user", "Firebase rule allows any signed-in user. Check ownership (request.auth.uid == userId).", f.rel, n);
      if (/"\.(read|write)"\s*:\s*true/.test(l)) add("security", "high", "firebase.rtdb-open", "Realtime Database rule open to everyone.", f.rel, n);
      if (/request\.time\s*<\s*timestamp\.date\(/.test(l)) add("security", "high", "firebase.rules-test-mode", "Firebase test-mode rule (open until a date).", f.rel, n);
    });
  }

  // 8. Config: source maps, headers, rate limiting, lockfile
  for (const f of sourceFiles.filter((x) => /(^|\/)(next|vite|nuxt|astro|svelte)\.config\.(js|mjs|cjs|ts|mts)$/.test(x.rel))) {
    const text = read(f) || "";
    if (/productionBrowserSourceMaps\s*:\s*true/.test(text)) add("security", "medium", "build.public-sourcemaps", "productionBrowserSourceMaps: true publishes your source code. Upload maps privately to error tracking instead.", f.rel);
    if (/sourcemap\s*:\s*true/.test(text)) add("security", "low", "build.vite-sourcemaps", "Production source maps enabled. Use \"hidden\" and upload them privately if the code is proprietary.", f.rel);
  }
  const headerHints = sourceFiles.some((f) => {
    if (!/(next\.config|vercel\.json|netlify\.toml|_headers$|middleware\.|proxy\.|nginx|server\.|app\.|index\.|hooks\.server|nuxt\.config|astro\.config|wrangler\.toml|firebase\.json|staticwebapp\.config\.json)/.test(f.rel)) return false;
    const t = read(f) || "";
    return /Strict-Transport-Security|Content-Security-Policy|X-Content-Type-Options|helmet\(/.test(t);
  });
  if (!headerHints && (pkgFile || files.some((f) => f.ext === ".html"))) add("security", "medium", "headers.none-in-repo", "No security headers configured in the repo (HSTS, CSP, nosniff, frame-ancestors). They may be set at the CDN: verify with check-url.mjs.");

  if ((project.services.includes("LLM SDK") || project.services.some((s) => /Auth|Clerk|Supabase|Firebase/.test(s)) || routeFiles.length > 0)
      && !(has("@upstash/ratelimit") || has("express-rate-limit") || has("rate-limiter-flexible") || hasPrefix("@arcjet/") || has("hono-rate-limiter") || has("limiter") || has("@nestjs/throttler"))
      && !codeFiles.some((f) => /rate.?limit|ratelimit/i.test(read(f) || ""))) {
    add("security", "medium", "abuse.no-rate-limit", "No rate limiting found. Login, signup, password reset, AI, email and upload endpoints need per-IP and per-user limits (or CDN rules).");
  }
  if (pkgFile && !project.packageManagers.length) add("security", "medium", "supply.no-lockfile", "No lockfile: installs are not reproducible and dependency attacks are easier. Commit package-lock.json / pnpm-lock.yaml.", "package.json");
  if (project.packageManagers.length > 1) add("code", "medium", "code.multiple-lockfiles", `Multiple lockfiles (${project.packageManagers.join(", ")}). Keep one package manager.`);

  if (opts.audit && files.some((f) => f.rel === "package-lock.json")) {
    try {
      const out = execFileSync("npm", ["audit", "--json", "--omit=dev"], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString();
      reportAudit(out);
    } catch (e) {
      if (e.stdout) reportAudit(e.stdout.toString());
      else add("security", "info", "supply.audit-failed", "npm audit could not run (offline or npm missing).");
    }
  }
}

function reportAudit(out) {
  try {
    const j = JSON.parse(out);
    const v = (j.metadata && j.metadata.vulnerabilities) || {};
    const crit = v.critical || 0, high = v.high || 0, mod = v.moderate || 0;
    if (crit || high) add("security", "high", "supply.npm-audit", `npm audit (production deps): ${crit} critical, ${high} high, ${mod} moderate. Check which are reachable and upgrade.`, "package-lock.json");
    else if (mod) add("security", "low", "supply.npm-audit", `npm audit (production deps): ${mod} moderate.`, "package-lock.json");
  } catch { add("security", "info", "supply.audit-failed", "npm audit output could not be parsed."); }
}

// ======================================================================
// DESIGN (AI-template tells)
// ======================================================================

const designTally = {};
function tally(key, f, line, sample) {
  const t = designTally[key] || (designTally[key] = { count: 0, where: [] });
  t.count++;
  if (t.where.length < 50) t.where.push({ file: f.rel, line, sample });
}

const DESIGN_RULES = [
  { key: "purpleGradient", re: /\b(from|via|to|bg|text|shadow)-(purple|violet|indigo|fuchsia)-[1-9]00\b/i },
  { key: "creamTerracotta", re: /#(f4f1ea|faf7f1|f5f1ea|f7f5f1|fbf8f1|efeae0|ece6db|faf8f5|fdfcfb|f8f6f3|e8dfcb|d97757|c45c48|e07860|d4715f|bf4a37|b6553a|cc785c|b08947|9a2436)\b/i },
  { key: "gradientText", re: /bg-clip-text[^"'`]*text-transparent|text-transparent[^"'`]*bg-clip-text|background-clip\s*:\s*text/ },
  { key: "eyebrow", re: /\buppercase\b[^"'`\n]*\btracking-(wide|wider|widest|\[0?\.\d+em\])|\btracking-(wider|widest|\[0?\.[1-9]\d*em\])[^"'`\n]*\buppercase\b|text-transform\s*:\s*uppercase[^}]*letter-spacing\s*:\s*0?\.(1|2)/ },
  { key: "transitionAll", re: /\btransition-all\b|transition\s*:\s*all\b/ },
  { key: "hoverLift", re: /hover:-translate-y-|:hover[^{]*\{[^}]*translateY\(-/ },
  { key: "bigShadow", re: /\bshadow-(lg|xl|2xl)\b/ },
  { key: "glass", re: /\bbackdrop-blur(-\w+)?\b|backdrop-filter\s*:\s*blur/ },
  { key: "borderStripe", re: /\bborder-l-(4|8)\b|border-left\s*:\s*[3-9]px\s+solid/ },
  { key: "blob", re: /\bblur-(3xl|\[\d{2,3}px\])\b/ },
  { key: "fadeUp", re: /whileInView|data-aos=|fade-up|animate-fade-in-up|initial=\{\{\s*opacity:\s*0,\s*y:/ },
  { key: "decorAnim", re: /\banimate-(bounce|ping)\b/ },
  { key: "threeCols", re: /\b(md:|lg:)?grid-cols-3\b/ },
  { key: "bigRadius", re: /\brounded-(2xl|3xl)\b/ },
  { key: "slate", re: /\b(bg|text|border)-slate-\d{2,3}\b/ },
  { key: "warmGray", re: /\b(bg|text|border)-(stone|neutral)-\d{2,3}\b/ },
  { key: "zinc", re: /\b(bg|text|border)-(zinc|gray)-\d{2,3}\b/ },
  { key: "monoLabel", re: /\bfont-mono\b[^"'`\n]*\b(uppercase|text-xs|text-\[1[01]px\])/ },
];
const COPY_RE = /\b(supercharge[sd]?|seamless(ly)?|unlock (your|the)|unleash|elevate (your|the)|empower(s|ing)? (you|your|teams)|revolutioni[sz]e|next[- ]gen(eration)?|cutting[- ]edge|game[- ]chang(er|ing)|effortless(ly)?|all[- ]in[- ]one|everything you need|built for the future|world[- ]class|best[- ]in[- ]class|transform (your|the way))\b/i;
const PLACEHOLDER_PEOPLE = /\b(John Doe|Jane Doe|Jane Smith|John Smith|Sarah Chen|Alex Johnson|Acme( Corp| Inc)?|TechCorp|Lorem ipsum)\b/i;
const PLACEHOLDER_IMG = /(picsum\.photos|placehold\.co|placeholder\.com|via\.placeholder|source\.unsplash\.com|dummyimage\.com|placekitten|loremflickr)/i;
const FAKE_STATS = /(99\.9+%|\b10x\b|10,000\+|\b50K\+|\b100K\+|4\.9\/5|\b1M\+ (users|customers))/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2728}]/u;
const DEFAULT_TITLE = /<title>\s*(Vite \+ React|Vite \+ Vue|Vite App|React App|Create Next App|Next\.js App|SvelteKit App|Astro)\s*<\/title>|title\s*:\s*["'](Create Next App|Next\.js App|Vite App)["']/;

// Color families by hue, chroma and lightness, so near-miss hex values still count.
function hexInfo(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min, l = (max + min) / 2;
  let hue = 0;
  if (c) hue = max === r ? 60 * (((g - b) / c) % 6) : max === g ? 60 * ((b - r) / c + 2) : 60 * ((r - g) / c + 4);
  if (hue < 0) hue += 360;
  return { hue, c, l };
}
const isCreamCanvas = ({ hue, c, l }) => l >= 0.88 && c >= 0.035 && c <= 0.2 && hue >= 25 && hue <= 60;
const isClayAccent = ({ hue, c, l }) => hue >= 10 && hue <= 45 && c >= 0.3 && l >= 0.3 && l <= 0.68;
const isAiPurple = ({ hue, c, l }) => hue >= 235 && hue <= 290 && c >= 0.3 && l >= 0.3 && l <= 0.78;
const eyebrowClasses = new Set();

const fontsSeen = new Set();
const DEFAULT_FONTS = new Set(["inter", "roboto", "poppins", "space grotesk", "dm sans", "plus jakarta sans", "manrope", "open sans", "montserrat", "lato", "geist"]);
const DEFAULT_DISPLAY_SERIFS = new Set(["fraunces", "instrument serif", "playfair display"]);

function designChecks() {
  for (const f of uiFiles.concat(codeFiles.filter((x) => !UI_EXT.has(x.ext)))) {
    if (isDoc(f)) continue;
    const text = read(f);
    if (!text) continue;
    const markupLike = UI_EXT.has(f.ext) || /\.(t|j)sx$/.test(f.ext);
    eachLine(text, (l, n) => {
      for (const r of DESIGN_RULES) if (r.re.test(l)) tally(r.key, f, n, l.trim().slice(0, 100));
      if (!markupLike) return;
      const trimmed = l.trim();
      if (/^(\/\/|\*|\/\*|import |export \{)/.test(trimmed)) return;
      if (COPY_RE.test(l)) tally("copy", f, n, trimmed.slice(0, 100));
      if (PLACEHOLDER_PEOPLE.test(l)) tally("placeholderPeople", f, n, trimmed.slice(0, 100));
      if (PLACEHOLDER_IMG.test(l)) tally("placeholderImg", f, n, trimmed.slice(0, 100));
      if (FAKE_STATS.test(l)) tally("fakeStats", f, n, trimmed.slice(0, 100));
      if (EMOJI.test(l) && !/aria-hidden|role="img"/.test(l)) tally("emoji", f, n, trimmed.slice(0, 100));
      if (/\u2192/.test(l)) tally("arrow", f, n, trimmed.slice(0, 100));
      if (/\u2014/.test(l)) tally("emDash", f, n, trimmed.slice(0, 100));
      if (/ \u00B7 /.test(l)) tally("middot", f, n, trimmed.slice(0, 100));
      if (DEFAULT_TITLE.test(l)) tally("defaultTitle", f, n, trimmed.slice(0, 100));
    });
    // color families
    const seenHex = new Set();
    for (const hm of text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
      const hex = hm[0].toLowerCase();
      if (seenHex.has(hex)) continue;
      seenHex.add(hex);
      const info = hexInfo(hex);
      const ln = lineOf(text, hm.index);
      if (isCreamCanvas(info)) tally("creamCanvas", f, ln, hex);
      if (isClayAccent(info)) tally("clayAccent", f, ln, hex);
      if (isAiPurple(info)) tally("purpleHex", f, ln, hex);
    }
    // CSS classes styled as tracked uppercase labels (usage is counted after the loop)
    for (const rm of text.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)) {
      const body = rm[2];
      if (!/text-transform\s*:\s*uppercase/i.test(body)) continue;
      const ls = body.match(/letter-spacing\s*:\s*(-?\d*\.?\d+)(em|rem|px)/i);
      if (!ls) continue;
      const v = parseFloat(ls[1]);
      if ((ls[2] === "px" && v >= 1.2) || (ls[2] !== "px" && v >= 0.08)) {
        for (const sel of rm[1].split(",")) { const cm = sel.trim().match(/\.([A-Za-z][\w-]*)$/); if (cm) eyebrowClasses.add(cm[1]); }
      }
    }
    // one-off inline SVG illustrations (large canvas, many shapes)
    if (markupLike) {
      for (const sm of text.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)) {
        const vb = (sm[0].match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/) || []);
        const shapes = (sm[0].match(/<(path|circle|ellipse|rect|polygon|polyline|line)\b/g) || []).length;
        if (vb[1] && Math.min(+vb[1], +vb[2]) >= 120 && shapes >= 6) tally("svgIllustration", f, lineOf(text, sm.index), `viewBox ${vb[1]}x${vb[2]}, ${shapes} shapes`);
      }
    }
    // fonts
    let m;
    const nextFont = /import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g;
    while ((m = nextFont.exec(text))) for (const name of m[1].split(",")) { const n = name.trim().split(/\s+as\s+/)[0].replace(/_/g, " ").toLowerCase(); if (n) fontsSeen.add(n); }
    const localFont = /localFont\(\s*\{[\s\S]{0,300}?src\s*:\s*\[?\s*\{?\s*(?:path\s*:\s*)?["'][^"']*\/([^/"']+?)(?:[-_](?:regular|bold|semibold|medium|light|black|thin|variable|var|vf|\d{3}))*\.(?:woff2?|ttf|otf)["']/gi;
    while ((m = localFont.exec(text))) fontsSeen.add(m[1].replace(/[-_]/g, " ").toLowerCase());
    const gf = /fonts\.googleapis\.com\/css2?\?family=([^"'&)\s]+)/g;
    while ((m = gf.exec(text))) for (const fam of m[1].split("&family=")) fontsSeen.add(decodeURIComponent(fam.split(":")[0]).replace(/\+/g, " ").toLowerCase());
    const ff = /font-family\s*:\s*["']?([A-Za-z][A-Za-z0-9 ]+)/g;
    while ((m = ff.exec(text))) { const n = m[1].trim().toLowerCase(); if (!/^(var|inherit|system|ui|sans|serif|mono|-apple|blinkmac|segoe|arial|helvetica)/.test(n)) fontsSeen.add(n); }
  }
  if (eyebrowClasses.size) {
    const names = [...eyebrowClasses];
    for (const f of uiFiles) {
      if (!(UI_EXT.has(f.ext) || /\.(t|j)sx$/.test(f.ext))) continue;
      const text = read(f);
      if (!text) continue;
      for (const cm of text.matchAll(/\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)) {
        const classes = (cm[1] || cm[2] || cm[3] || "").split(/\s+/);
        const hit = names.find((n) => classes.includes(n));
        if (hit) tally("eyebrow", f, lineOf(text, cm.index), `class "${hit}" (tracked uppercase label)`);
      }
    }
  }
  for (const d of Object.keys(deps)) { const fm = d.match(/^@fontsource(?:-variable)?\/(.+)$/); if (fm) fontsSeen.add(fm[1].replace(/-/g, " ")); }
  if (has("geist")) fontsSeen.add("geist");

  // default favicon / boilerplate assets
  for (const f of files) {
    if (/(^|\/)public\/(vite|next|vercel|file|globe|window)\.svg$/.test(f.rel) || /(^|\/)src\/assets\/(react|vue|svelte)\.svg$/.test(f.rel)) tally("defaultAssets", f, null, f.rel);
  }
}

function designReport(seoMissingOgImage) {
  const c = (k) => (designTally[k] ? designTally[k].count : 0);
  const inputs = [];
  const point = (cond, pts, label, key) => { if (cond) inputs.push({ points: pts, label, count: key ? c(key) : undefined, where: key && designTally[key] ? designTally[key].where.slice(0, opts.limit || 50) : [] }); };
  // Tier 1
  point(c("purpleGradient") + c("purpleHex") >= 2, 3, "AI-purple / violet / indigo palette", c("purpleGradient") ? "purpleGradient" : "purpleHex");
  const creamFamily = c("creamCanvas") >= 1 && c("clayAccent") >= 1;
  point(c("creamTerracotta") >= 2 || creamFamily, 3, "Cream canvas + terracotta / clay / brass accent (the default \"warm\" palette)", creamFamily ? "creamCanvas" : "creamTerracotta");
  point(c("placeholderPeople") >= 1, 3, "Placeholder people, brands or lorem ipsum", "placeholderPeople");
  point(c("defaultTitle") >= 1 || c("defaultAssets") >= 1, 3, "Framework default title or boilerplate assets", c("defaultTitle") ? "defaultTitle" : "defaultAssets");
  point(c("placeholderImg") >= 1, 3, "Placeholder image services", "placeholderImg");
  // Tier 2
  point(c("gradientText") >= 1, 2, "Gradient text", "gradientText");
  point(c("eyebrow") >= 3, 2, "Tracked uppercase eyebrow labels repeated", "eyebrow");
  point(c("hoverLift") >= 3, 2, "Hover lift on many elements", "hoverLift");
  point(c("transitionAll") >= 3, 2, "transition-all / transition: all", "transitionAll");
  point(c("fadeUp") >= 4, 2, "Fade-up entrance on many blocks", "fadeUp");
  point(c("glass") >= 4, 2, "Glass / backdrop-blur used widely", "glass");
  point(c("emoji") >= 3, 2, "Emoji in UI markup", "emoji");
  point(c("copy") >= 3, 2, "Generic transformation copy", "copy");
  point(seoMissingOgImage, 2, "No og:image (blank link previews)");
  point(c("blob") >= 2, 2, "Blurred decorative blobs", "blob");
  point(c("svgIllustration") >= 1, 2, "Hand-drawn inline SVG illustration (use real imagery, or none)", "svgIllustration");
  // Tier 3
  const fonts = [...fontsSeen];
  const onlyDefaults = fonts.length > 0 && fonts.every((x) => DEFAULT_FONTS.has(x) || DEFAULT_DISPLAY_SERIFS.has(x));
  point(onlyDefaults, 1, `Only common default fonts (${fonts.join(", ")})`);
  point(c("threeCols") >= 3, 1, "Many three-column grids", "threeCols");
  point(c("arrow") >= 5, 1, "Arrow glyphs (→) appended widely", "arrow");
  point(c("emDash") >= 5, 1, "Em dashes in UI strings", "emDash");
  point(c("borderStripe") >= 2, 1, "Colored left-border stripes", "borderStripe");
  point(c("middot") >= 5, 1, "Middle-dot metadata strings", "middot");
  point(c("bigShadow") >= 8, 1, "Large shadows everywhere", "bigShadow");
  point(c("bigRadius") >= 10, 1, "Large radius on everything", "bigRadius");
  point(c("fakeStats") >= 2, 1, "Suspiciously round or perfect stats", "fakeStats");
  point(c("monoLabel") >= 3, 1, "Monospace micro-labels", "monoLabel");
  const grayFamilies = [c("slate") > 2, c("warmGray") > 2, c("zinc") > 2].filter(Boolean).length;
  point(grayFamilies >= 2, 1, "Mixed gray families (slate / stone / zinc)");
  const score = inputs.reduce((s, i) => s + i.points, 0);
  const verdict = score <= 3 ? "Low" : score <= 8 ? "Medium" : "High";
  for (const i of inputs) {
    const sev = i.points === 3 ? "medium" : "low";
    const w = i.where[0];
    add("design", sev, "design.tell", `${i.label}${i.count !== undefined ? ` (${i.count}x)` : ""}`, w ? w.file : null, w ? w.line : null, { occurrences: i.where });
  }
  return { score, verdict, fonts, inputs: inputs.map(({ points, label, count }) => ({ points, label, count })) };
}

// ======================================================================
// SEO
// ======================================================================

function seoChecks() {
  const corpusFiles = sourceFiles.filter((f) => (UI_EXT.has(f.ext) || CODE_EXT.has(f.ext)) && !isTest(f.rel) && !isDoc(f));
  const corpus = corpusFiles.map((f) => read(f) || "").join("\n");
  const exists = (re) => files.some((f) => re.test(f.rel));
  const result = { missingOgImage: false };
  if (!corpusFiles.length) return result;

  const isApp = isNext || fw.some((x) => /Nuxt|SvelteKit|Astro|Remix|Gatsby|Vite|React|Vue|Svelte|Angular|Static HTML/.test(x));
  if (!isApp) return result;

  const metaBlock = /export\s+(const\s+metadata\b|(async\s+)?function\s+generateMetadata)[\s\S]{0,800}/.exec(corpus);
  const hasTitle = /<title[\s>]|\btitle\s*:\s*[{"'`]|useHead|useSeoMeta|<svelte:head>|<Title\b|document\.title\s*=/.test(corpus) || (metaBlock && /\btitle\s*:/.test(metaBlock[0]));
  if (!hasTitle) add("seo", "high", "seo.no-title", "No page <title> or metadata title found.");
  if (!/name=["']description["']|\bdescription\s*:\s*["'`]|useSeoMeta|<meta\s+name=\{?["']description/.test(corpus) && !(metaBlock && /\bdescription\s*:/.test(metaBlock[0]))) add("seo", "medium", "seo.no-description", "No meta description found.");
  const hasOgImage = /og:image|openGraph\s*:\s*\{[\s\S]{0,400}images|ogImage|og-image|twitter:image/.test(corpus) || exists(/(^|\/)(opengraph-image|twitter-image)\.(png|jpe?g|tsx?|jsx?)$/);
  if (!hasOgImage) { add("seo", "medium", "seo.no-og-image", "No Open Graph image: shared links show a blank card in Slack, iMessage, LinkedIn and X."); result.missingOgImage = true; }
  if (!/twitter:card|twitter\s*:\s*\{/.test(corpus)) add("seo", "low", "seo.no-twitter-card", "No twitter:card (summary_large_image).");
  if (!/rel=["']canonical["']|canonical\s*:|alternates\s*:/.test(corpus)) add("seo", "low", "seo.no-canonical", "No canonical URLs found.");
  if (isNext && /openGraph|alternates/.test(corpus) && !/metadataBase/.test(corpus)) add("seo", "medium", "seo.no-metadatabase", "Next.js metadata without metadataBase: relative OG and canonical URLs will not resolve to absolute URLs.");
  if (!/<html[^>]*\blang=/.test(corpus) && !/htmlAttrs\s*:\s*\{[^}]*lang/.test(corpus)) add("seo", "medium", "seo.no-lang", "No <html lang> attribute found (SEO, accessibility, translation).");
  if (!exists(/(^|\/)(public|static)\/robots\.txt$/) && !exists(/(^|\/)app\/robots\.(t|j)sx?$/) && !exists(/^robots\.txt$/) && !/robots/.test(Object.keys(deps).join(" "))) add("seo", "medium", "seo.no-robots", "No robots.txt (public/robots.txt or app/robots.ts).");
  if (!exists(/(^|\/)(public|static)\/sitemap[^/]*\.xml$/) && !exists(/(^|\/)app\/sitemap\.(t|j)sx?$/) && !exists(/^sitemap[^/]*\.xml$/) && !(has("next-sitemap") || has("@astrojs/sitemap") || has("@nuxtjs/sitemap") || has("vite-plugin-sitemap") || has("sitemap"))) add("seo", "medium", "seo.no-sitemap", "No sitemap.xml or sitemap generator found.");
  if (!exists(/(^|\/)(public|static|app|src\/app)\/(favicon\.ico|icon\.(svg|png|ico))$/) && !exists(/^favicon\.ico$/) && !/rel=["'](shortcut )?icon["']/.test(corpus)) add("seo", "medium", "seo.no-favicon", "No favicon found.");
  if (!exists(/apple-touch-icon[^/]*\.png$|(^|\/)app\/apple-icon\.(png|jpe?g)$/)) add("seo", "low", "seo.no-apple-icon", "No apple-touch-icon (180x180).");
  if (!exists(/(manifest\.webmanifest|site\.webmanifest|manifest\.json)$|(^|\/)app\/manifest\.(t|j)s$/)) add("seo", "low", "seo.no-manifest", "No web app manifest.");
  if (!/application\/ld\+json/.test(corpus)) add("seo", "low", "seo.no-structured-data", "No JSON-LD structured data (Organization and WebSite on the home page at minimum).");
  if (/createHashRouter|<HashRouter|mode\s*:\s*["']hash["']|createWebHashHistory/.test(corpus)) add("seo", "medium", "seo.hash-routing", "Hash-based routing: URLs after # are not indexed as separate pages.");
  if (pureClientApp && fw.some((x) => /Vite|React|Vue|Create React App/.test(x)) && !has("vite-plugin-ssr") && !has("vike") && !has("react-snap") && !has("vite-ssg") && !has("vite-plugin-prerender")) {
    add("seo", "low", "seo.client-only", "Client-rendered SPA: content is invisible to crawlers that do not run JavaScript (most AI crawlers). Prerender public routes or use a static or SSR framework for marketing pages.");
  }
  // noindex and blocking robots
  for (const f of corpusFiles.concat(files.filter((x) => /robots\.txt$/.test(x.rel) || /(vercel\.json|netlify\.toml|_headers)$/.test(x.rel)))) {
    const text = read(f);
    if (!text) continue;
    const robotsOff = /robots\s*:\s*\{[\s\S]{0,120}?\bindex\s*:\s*false/.exec(text);
    if (robotsOff) add("seo", "high", "seo.noindex", "Metadata robots { index: false }: make sure it never ships on public production pages.", f.rel, lineOf(text, robotsOff.index));
    eachLine(text, (l, n) => {
      if (/noindex/i.test(l) && !/^\s*(\/\/|\*)/.test(l)) add("seo", "high", "seo.noindex", "noindex found: make sure it never ships on public production pages.", f.rel, n);
      if (/robots\.txt$/.test(f.rel) && /^\s*Disallow:\s*\/\s*$/i.test(l)) add("seo", "high", "seo.robots-disallow-all", "robots.txt disallows the whole site.", f.rel, n);
    });
  }
  // Static HTML pages: per-file head checks
  for (const f of files.filter((x) => (x.ext === ".html" || x.ext === ".htm") && !/(^|\/)(google[0-9a-f]+|yandex_[0-9a-f]+)\.html$/.test(x.rel))) {
    const text = read(f);
    if (!text || !/<html/i.test(text)) continue;
    if (!/<title>[^<]+<\/title>/i.test(text)) add("seo", "medium", "seo.html-no-title", "HTML page without a <title>.", f.rel);
    if (!/<meta[^>]+name=["']viewport["']/i.test(text)) add("responsive", "high", "responsive.no-viewport", "Missing <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.", f.rel);
  }
  return result;
}

// ======================================================================
// ACCESSIBILITY + RESPONSIVE
// ======================================================================

function a11yChecks() {
  let focusStyles = 0;
  let outlineRemoved = [];
  let usesMotion = has("framer-motion") || has("motion") || has("gsap") || has("aos") || has("animejs") || has("lottie-react");
  let reducedMotion = false;
  const seen = new Set();
  for (const f of uiFiles.concat(codeFiles)) {
    if (isDoc(f) || seen.has(f.rel)) continue;
    seen.add(f.rel);
    const text = read(f);
    if (!text) continue;
    // Count real focus indicators only. `:focus { outline: none }` is the removal, not a replacement.
    if (/focus-visible|focus:ring|focus:outline-(?!none)|focus:border|focus:shadow|focus-within:|data-\[focus/.test(text)
        || /:focus[^{]*\{[^}]*(outline\s*:(?!\s*(none|0)\b)[^;}]+|box-shadow\s*:|border-color\s*:|text-decoration\s*:)/.test(text)) focusStyles++;
    if (/prefers-reduced-motion|useReducedMotion|motion-reduce:|motion-safe:|reducedMotion/.test(text)) reducedMotion = true;
    const keyframeNames = [...text.matchAll(/@keyframes\s+([\w-]+)/g)].map((k) => k[1]);
    if (keyframeNames.some((k) => !/spin|load|blink|dot|pulse|shimmer|skeleton|caret|rotate|progress/i.test(k))
        || /whileInView|data-aos=|animate-(fade|slide|bounce|ping)/.test(text)) usesMotion = true;

    const markup = UI_EXT.has(f.ext) || /\.(t|j)sx$/.test(f.ext);
    eachLine(text, (l, n) => {
      if (/outline\s*:\s*(none|0)\b|\boutline-none\b|\boutline-0\b/.test(l) && !/focus-visible/.test(l)) outlineRemoved.push({ file: f.rel, line: n });
      if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(l)) add("a11y", "high", "a11y.zoom-disabled", "Viewport disables zoom (WCAG 1.4.4). Remove maximum-scale / user-scalable; use 16px inputs to stop iOS zoom.", f.rel, n);
      if (!markup) return;
      if (/tabIndex=\{?["']?[1-9]|tabindex=["'][1-9]/.test(l)) add("a11y", "medium", "a11y.positive-tabindex", "Positive tabindex breaks natural focus order.", f.rel, n);
      if (/<(div|span|li|img)\b[^>]*\bonClick=/.test(l) && !/\brole=/.test(l)) add("a11y", "medium", "a11y.click-non-interactive", "onClick on a non-interactive element: use <button> or <a href> (keyboard and screen-reader support).", f.rel, n);
      if (/<a\b(?![^>]*\bhref)[^>]*\bonClick=/.test(l)) add("a11y", "medium", "a11y.anchor-no-href", "<a> with onClick but no href: use a button for actions or a real href for navigation.", f.rel, n);
      if (/\b(h-screen|min-h-screen)\b|\b100vh\b/.test(l) && !/dvh|svh|lvh/.test(l)) add("responsive", "low", "responsive.100vh", "100vh / h-screen jumps behind mobile browser bars. Use 100dvh (min-h-dvh) or svh.", f.rel, n);
      if (/(^|[\s"'`:])(w|min-w)-\[(1[2-9]\d{2}|[2-9]\d{3})px\]|(^|[^-\w])(width|min-width)\s*:\s*(1[2-9]\d{2}|[2-9]\d{3})px/.test(l)) add("responsive", "medium", "responsive.fixed-width", "Large fixed width: likely horizontal scroll on phones and tablets. Use max-width with fluid width.", f.rel, n);
    });

    if (markup) {
      // img without alt (multi-line tags)
      const imgRe = /<(img|Image)\b(?![^>]*\balt\s*=)[^>]*?\/?>/g;
      let m;
      while ((m = imgRe.exec(text))) {
        if (m[1] === "Image" && !/next\/image|astro:assets|@unpic|expo-image/.test(text)) continue;
        if (/\{\.\.\./.test(m[0])) continue; // spread props may carry alt
        add("a11y", "medium", "a11y.img-no-alt", "Image without alt attribute (use alt=\"\" for decorative images).", f.rel, lineOf(text, m.index));
      }
      // icon-only buttons without accessible name
      const btnRe = /<button\b([^>]*)>\s*(<svg[\s\S]{0,1500}?<\/svg>|<[A-Z][\w.]*\b[^>]*\/>)\s*<\/button>/g;
      while ((m = btnRe.exec(text))) {
        if (!/aria-label|aria-labelledby|title=/.test(m[1])) add("a11y", "medium", "a11y.icon-button-no-name", "Icon-only button without aria-label.", f.rel, lineOf(text, m.index));
      }
      // inputs relying on placeholder only (rough)
      const inputRe = /<input\b(?![^>]*\b(aria-label|aria-labelledby|id)\s*=)(?![^>]*type=["'](hidden|submit|button|checkbox|radio)["'])[^>]*\bplaceholder=[^>]*>/g;
      while ((m = inputRe.exec(text))) add("a11y", "low", "a11y.input-placeholder-label", "Input with a placeholder but no id or aria-label: it probably has no programmatic label.", f.rel, lineOf(text, m.index));
    }
  }
  if (outlineRemoved.length && focusStyles === 0) add("a11y", "high", "a11y.focus-removed", `Focus outlines removed (${outlineRemoved.length}x) and no focus-visible styles found anywhere: keyboard users cannot see focus.`, outlineRemoved[0].file, outlineRemoved[0].line);
  else if (outlineRemoved.length > 5) add("a11y", "low", "a11y.outline-none", `outline: none / outline-none used ${outlineRemoved.length}x: confirm each has a visible :focus-visible replacement.`, outlineRemoved[0].file, outlineRemoved[0].line);
  if (usesMotion && !reducedMotion) add("a11y", "medium", "a11y.no-reduced-motion", "Animations found but no prefers-reduced-motion handling (CSS media query, motion-reduce:, or useReducedMotion).");
}

// ======================================================================
// PERFORMANCE
// ======================================================================

function perfChecks() {
  const kb = (b) => `${Math.round(b / 1024)} KB`;
  for (const f of files) {
    if (IMAGE_EXT.has(f.ext) && /(^|\/)(public|static|assets|src|app|images|img)\//.test(f.rel)) {
      if (f.ext === ".gif" && f.size > 300 * 1024) add("perf", "medium", "perf.gif", `Animated GIF ${kb(f.size)}: use <video autoplay muted loop playsinline> (much smaller).`, f.rel);
      else if (f.size > 1024 * 1024) add("perf", "high", "perf.image-huge", `Image is ${kb(f.size)}. Resize and convert to AVIF/WebP (aim under 200 KB for heroes).`, f.rel);
      else if (f.size > 500 * 1024) add("perf", "medium", "perf.image-large", `Image is ${kb(f.size)}. Compress, resize or convert to AVIF/WebP.`, f.rel);
      else if ((f.ext === ".png" || f.ext === ".jpg" || f.ext === ".jpeg") && f.size > 200 * 1024) add("perf", "low", "perf.image-format", `${kb(f.size)} ${f.ext.slice(1).toUpperCase()}: AVIF or WebP would be much smaller (or use the framework image component).`, f.rel);
    }
    if (FONT_EXT.has(f.ext) && (f.ext === ".ttf" || f.ext === ".otf" || f.ext === ".eot") && /(^|\/)(public|static)\//.test(f.rel)) add("perf", "low", "perf.font-format", `${f.base}: serve WOFF2 for the web.`, f.rel);
    if (/\.(mp4|mov|webm)$/i.test(f.base) && f.size > 8 * 1024 * 1024) add("perf", "medium", "perf.video-large", `Video is ${kb(f.size)}: compress it or stream it from a video host.`, f.rel);
  }
  const heavy = { moment: "date-fns, Day.js or Intl", lodash: "lodash-es per-function imports or native methods", jquery: "native DOM APIs", "animate.css": "a few targeted CSS animations", "@fortawesome/fontawesome-free": "per-icon SVG imports" };
  for (const [d, alt] of Object.entries(heavy)) if (has(d)) add("perf", "low", "perf.heavy-dep", `Dependency "${d}" is heavy for what it usually does: consider ${alt}.`, "package.json");
  if (has("bootstrap") && project.styling.includes("Tailwind")) add("perf", "low", "perf.two-css-frameworks", "Both Bootstrap and Tailwind installed: ship one CSS system.", "package.json");

  for (const f of codeFiles.concat(uiFiles.filter((x) => x.ext === ".html"))) {
    const text = read(f);
    if (!text) continue;
    if (/(^|\/)app\/layout\.(t|j)sx?$/.test(f.rel) && /^\s*(["'])use client\1/m.test(text.slice(0, 200))) add("perf", "high", "perf.client-root-layout", "\"use client\" on the root layout turns the whole app into client components. Push it down to interactive leaves.", f.rel, 1);
    eachLine(text, (l, n) => {
      if (/import\s+\w+\s+from\s+["']lodash["']|import\s+\*\s+as\s+\w+\s+from\s+["'](lodash|lucide-react|react-icons\/\w+|@mui\/icons-material)["']/.test(l)) add("perf", "medium", "perf.whole-library-import", "Whole-library import: import individual functions/icons so the bundler can tree-shake.", f.rel, n);
      if (/fonts\.googleapis\.com/.test(l)) add("perf", "low", "perf.google-fonts-cdn", "Fonts loaded from Google's CDN: self-host (next/font, @fontsource) for speed and GDPR.", f.rel, n);
      if (f.ext === ".html" && /<script\b(?![^>]*\b(defer|async|type=["']module["']))[^>]*\bsrc=/.test(l)) add("perf", "medium", "perf.blocking-script", "Render-blocking <script src> without defer/async.", f.rel, n);
      if (/<img\b(?![^>]*\b(width|height)=)(?![^>]*\{\.\.\.)[^>]*\bsrc=/.test(l) && !/className=["'][^"']*(w-|h-|size-)/.test(l)) add("perf", "low", "perf.img-no-dimensions", "<img> without width/height: reserve space to prevent layout shift (CLS).", f.rel, n);
      if (/youtube\.com\/embed|player\.vimeo\.com|google\.com\/maps\/embed/.test(l) && !/loading=["']lazy["']/.test(l)) add("perf", "low", "perf.heavy-embed", "Heavy third-party embed: use a click-to-load facade or loading=\"lazy\".", f.rel, n);
    });
  }
}

// ======================================================================
// CODE HYGIENE
// ======================================================================

function codeChecks() {
  let consoleLogs = [], debuggers = [], todos = 0, anys = 0, ignores = 0;
  const big = [];
  const names = new Map();
  for (const f of codeFiles) {
    if (/(^|\/)(scripts?|tools|bin|seed|migrations?)\//.test(f.rel) || /\.config\.(t|j|mj|cj)s$/.test(f.rel)) continue;
    const text = read(f);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    if (lines.length > 400) big.push({ file: f.rel, lines: lines.length });
    lines.forEach((l, i) => {
      if (/\bconsole\.(log|debug)\(/.test(l) && !/^\s*\/\//.test(l)) consoleLogs.push({ file: f.rel, line: i + 1 });
      if (/^\s*debugger\s*;?\s*$/.test(l)) debuggers.push({ file: f.rel, line: i + 1 });
      if (/\b(TODO|FIXME|HACK|XXX)\b/.test(l)) todos++;
      if (/:\s*any\b|\bas any\b|<any>/.test(l)) anys++;
      if (/@ts-ignore|@ts-nocheck/.test(l)) ignores++;
    });
    if (/(^|\/)components?\//.test(f.rel)) {
      const base = f.base.replace(/\.(t|j)sx?$|\.vue$|\.svelte$/, "");
      if (/(\d|New|Old|Copy|Backup|Final|V2)$/.test(base) && base.length > 3) add("code", "low", "code.duplicate-variant", `Component name "${base}" suggests a duplicated variant: consolidate into one component with props.`, f.rel);
      const key = base.toLowerCase();
      if (!names.has(key)) names.set(key, []);
      names.get(key).push(f.rel);
    }
  }
  for (const [n, list] of names) if (list.length > 1 && !/^index$/.test(n)) add("code", "low", "code.duplicate-name", `Component "${n}" defined in ${list.length} places: ${list.slice(0, 3).join(", ")}`, list[0]);
  if (debuggers.length) add("code", "medium", "code.debugger", `debugger statements (${debuggers.length}).`, debuggers[0].file, debuggers[0].line);
  if (consoleLogs.length > 20) add("code", "medium", "code.console-log", `${consoleLogs.length} console.log calls in app code: remove them or use a leveled logger.`, consoleLogs[0].file, consoleLogs[0].line);
  else if (consoleLogs.length) add("code", "low", "code.console-log", `${consoleLogs.length} console.log calls in app code.`, consoleLogs[0].file, consoleLogs[0].line);
  if (anys > 15) add("code", "low", "code.any", `${anys} uses of any: type them or parse unknown input with a schema.`);
  if (ignores) add("code", "low", "code.ts-ignore", `${ignores} @ts-ignore / @ts-nocheck comments.`);
  if (todos > 10) add("code", "info", "code.todos", `${todos} TODO/FIXME/HACK markers.`);
  big.sort((a, b) => b.lines - a.lines).slice(0, 5).forEach((b) => add("code", "low", "code.large-file", `${b.lines} lines: consider splitting into smaller components or hooks.`, b.file));

  if (pkgFile) {
    const scripts = pkg.scripts || {};
    const missing = ["build", "lint", "test"].filter((s) => !scripts[s]);
    if (!scripts.typecheck && !scripts["type-check"] && !scripts.check && files.some((f) => f.rel === "tsconfig.json")) missing.push("typecheck");
    if (missing.length) add("code", "low", "code.missing-scripts", `package.json has no ${missing.join(", ")} script(s). Add them and run them in CI.`, "package.json");
  }
  const ts = files.find((f) => f.rel === "tsconfig.json");
  if (ts) {
    const t = read(ts) || "";
    if (!/"strict"\s*:\s*true/.test(t)) add("code", "low", "code.ts-not-strict", "TypeScript strict mode is off.", "tsconfig.json");
  }
  const usesEnv = codeFiles.some((f) => /process\.env\.|import\.meta\.env\./.test(read(f) || ""));
  if (usesEnv && !files.some((f) => isEnvExample(f.base))) add("code", "low", "code.no-env-example", "Code reads env vars but there is no .env.example documenting them.");
  if (!files.some((f) => /^readme(\.md)?$/i.test(f.rel))) add("code", "low", "code.no-readme", "No README with setup steps and required env vars.");
}

// ---------- run ----------

if (opts.only.has("security") || opts.only.has("code")) securityChecks();
// seoChecks also feeds the design score (missing og:image) and responsive (viewport); add() keeps only requested areas.
const seo = opts.only.has("seo") || opts.only.has("design") || opts.only.has("responsive") ? seoChecks() : { missingOgImage: false };
if (opts.only.has("design")) designChecks();
const design = opts.only.has("design") ? designReport(seo.missingOgImage) : null;
if (opts.only.has("a11y") || opts.only.has("responsive")) a11yChecks();
if (opts.only.has("perf")) perfChecks();
if (opts.only.has("code")) codeChecks();

// ---------- output ----------

findings.sort((a, b) => AREAS.indexOf(a.area) - AREAS.indexOf(b.area) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id) || String(a.file).localeCompare(String(b.file)));
const summary = {};
for (const a of AREAS) if (opts.only.has(a)) summary[a] = { high: 0, medium: 0, low: 0, info: 0 };
for (const f of findings) summary[f.area][f.severity]++;
const highCount = findings.filter((f) => f.severity === "high").length;

if (opts.json) {
  console.log(JSON.stringify({ root: ROOT, project, filesScanned: files.length, truncated, summary, designScore: design, findings }, null, 2));
} else {
  const tty = process.stdout.isTTY && !process.env.NO_COLOR;
  const color = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
  const sevLabel = { high: color("31;1", "HIGH  "), medium: color("33;1", "MEDIUM"), low: color("36", "LOW   "), info: color("2", "INFO  ") };
  const stack = [...project.frameworks, ...project.styling, ...project.services].join(", ") || "unknown stack";
  console.log(color("1", `Web Checkup scan: ${project.name}`) + `  (${stack})`);
  console.log(`Root: ${ROOT}`);
  console.log(`Files: ${files.length}${truncated ? ` (stopped at ${MAX_FILES})` : ""}   Areas: ${[...opts.only].join(", ")}   Git: ${gitTracked ? "yes" : "no"}`);
  console.log(color("2", "Signals are leads, not verdicts. Confirm each in source or in the browser before reporting it."));

  for (const area of AREAS) {
    if (!opts.only.has(area)) continue;
    const list = findings.filter((f) => f.area === area);
    const s = summary[area];
    console.log(`\n${color("1", area.toUpperCase())}  ${s.high} high, ${s.medium} medium, ${s.low} low${s.info ? `, ${s.info} info` : ""}`);
    if (area === "design" && design) {
      console.log(`  AI-template score: ${design.score} (${design.verdict})${design.fonts.length ? `   Fonts seen: ${design.fonts.join(", ")}` : ""}`);
    }
    if (!list.length) { console.log(color("2", "  No signals.")); continue; }
    const byId = new Map();
    for (const f of list) { const k = `${f.severity}|${f.id}|${f.id === "design.tell" ? f.message : ""}`; if (!byId.has(k)) byId.set(k, []); byId.get(k).push(f); }
    for (const [, group] of byId) {
      const first = group[0];
      const shown = opts.limit === 0 ? group : group.slice(0, opts.limit);
      const msgSame = group.every((g) => g.message === first.message);
      console.log(`  ${sevLabel[first.severity]} ${color("2", first.id)}  ${msgSame ? first.message : first.message.split(":")[0]}`);
      const locs = first.occurrences && first.occurrences.length ? first.occurrences.slice(0, opts.limit || undefined) : shown;
      for (const g of locs) {
        if (!g.file) continue;
        const loc = `${g.file}${g.line ? `:${g.line}` : ""}`;
        console.log(`           ${loc}${!msgSame && g.message ? `  ${color("2", g.message)}` : ""}${g.sample ? `  ${color("2", g.sample)}` : ""}`);
      }
      const total = first.occurrences ? first.occurrences.length : group.length;
      if (total > locs.length) console.log(color("2", `           +${total - locs.length} more (use --limit 0 to show all)`));
    }
  }
  console.log(`\nTotal: ${highCount} high, ${findings.filter((f) => f.severity === "medium").length} medium, ${findings.filter((f) => f.severity === "low").length} low.`);
  console.log(color("2", "Next: verify the high items, run the project's typecheck/lint/build, then check the rendered app (visual-check.mjs) and the deployed URL (check-url.mjs)."));
}

process.exitCode = opts.strict && highCount > 0 ? 2 : 0;
