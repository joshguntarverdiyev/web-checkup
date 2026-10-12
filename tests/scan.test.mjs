// Regression tests for skills/web-checkup/scripts/scan.mjs.
// Builds a deliberately bad "vibe-coded" app in a temp dir, plus a clean one, and checks the signals.
// Fake secrets are assembled at runtime so no secret-shaped literal is committed to this repo.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SCAN = path.resolve(here, "../skills/web-checkup/scripts/scan.mjs");

function write(root, rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function scan(dir, args = []) {
  const res = spawnSync(process.execPath, [SCAN, dir, "--json", ...args], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout);
}

const rand = (n) => Array.from({ length: n }, (_, i) => "abcdefghijkLMNOPQRSTuvwxyz0123456789"[(i * 7 + 3) % 36]).join("");
const stripeLive = ["sk", "live", rand(28)].join("_");
const serviceRoleJwt = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  Buffer.from(JSON.stringify({ iss: "supabase", role: "service" + "_role", iat: 1 })).toString("base64url"),
  rand(43),
].join(".");

function makeBadApp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "webcheckup-bad-"));
  write(root, "package.json", JSON.stringify({
    name: "vibe-app",
    scripts: { dev: "next dev", build: "next build" },
    dependencies: { next: "15.0.0", react: "19.0.0", "@supabase/supabase-js": "2.0.0", stripe: "14.0.0", openai: "4.0.0", tailwindcss: "4.0.0", moment: "2.0.0" },
  }));
  write(root, ".gitignore", "node_modules\n");
  write(root, ".env", `NEXT_PUBLIC_OPENAI_API_KEY=${rand(40)}\n`);
  write(root, "lib/stripe.ts", `export const stripeKey = "${stripeLive}";\n`);
  write(root, "lib/supabase-admin.ts", `"use client";\nimport { createClient } from "@supabase/supabase-js";\nexport const admin = createClient(url, "${serviceRoleJwt}");\nconst k = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;\n`);
  write(root, "app/layout.tsx", `"use client";\nexport const metadata = { title: "Create Next App" };\nexport default function RootLayout({ children }) { return <html><body>{children}</body></html>; }\n`);
  write(root, "app/page.tsx", `export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-r from-purple-600 via-violet-500 to-indigo-600">
      <p className="text-xs uppercase tracking-widest">Introducing</p>
      <h1 className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Supercharge your workflow</h1>
      <p>The all-in-one platform with everything you need. Seamless and effortless.</p>
      <p className="text-xs uppercase tracking-widest">Features</p>
      <p className="text-xs uppercase tracking-widest">Pricing</p>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur">🚀 Fast</div>
        <div className="rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur">✨ Smart</div>
        <div className="rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur">⚡ Secure</div>
      </div>
      <blockquote>Changed everything! - John Doe, Acme</blockquote>
      <img src="https://picsum.photos/800/600" />
      <div onClick={() => go()}>Open</div>
      <button><svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg></button>
      <div dangerouslySetInnerHTML={{ __html: userBio }} />
      <input placeholder="Email" />
    </main>
  );
}
`);
  write(root, "app/globals.css", `button:focus { outline: none; }\n.hero { height: 100vh; }\n`);
  write(root, "app/api/invoices/[id]/route.ts", `export async function DELETE(req, { params }) {\n  const body = await req.json();\n  await db.invoice.update({ where: { id: params.id }, data: req.body });\n  return Response.json({ ok: true });\n}\n`);
  write(root, "app/api/checkout/route.ts", `import Stripe from "stripe";\nexport async function POST(req) {\n  const body = await req.json();\n  const s = await stripe.checkout.sessions.create({ line_items: [{ price_data: { unit_amount: body.price, currency: "usd" } }] });\n  return Response.json(s);\n}\n`);
  write(root, "app/api/webhooks/stripe/route.ts", `import Stripe from "stripe";\nexport async function POST(req) {\n  const event = await req.json();\n  return new Response("ok");\n}\n`);
  write(root, "app/actions.ts", `"use server";\nexport async function deleteProject(id) {\n  await db.project.delete({ where: { id } });\n}\n`);
  write(root, "lib/ai.ts", `import OpenAI from "openai";\nexport const ai = new OpenAI({ apiKey: k, dangerouslyAllowBrowser: true });\n`);
  write(root, "lib/db.ts", "export const q = (id) => db.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${id}`);\n");
  write(root, "supabase/migrations/001.sql", `create table public.notes (id uuid primary key, owner_id uuid, body text);\ncreate policy "all can update" on public.notes for update using (true);\n`);
  write(root, "firestore.rules", `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}\n`);
  write(root, "next.config.js", `module.exports = { productionBrowserSourceMaps: true };\n`);
  fs.writeFileSync(path.join(root, "public-hero.png"), Buffer.alloc(10));
  fs.mkdirSync(path.join(root, "public"), { recursive: true });
  fs.writeFileSync(path.join(root, "public/hero.png"), Buffer.alloc(1_200_000, 1));
  fs.writeFileSync(path.join(root, "public/vite.svg"), "<svg/>");
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "-A"], { cwd: root });
  } catch { /* git missing: env.tracked assertion is skipped below */ }
  return root;
}

function makeCleanApp() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "webcheckup-clean-"));
  write(root, "package.json", JSON.stringify({
    name: "clean-app",
    scripts: { build: "astro build", lint: "eslint .", test: "vitest run", typecheck: "astro check" },
    dependencies: { astro: "5.0.0", "@astrojs/sitemap": "3.0.0", "@upstash/ratelimit": "2.0.0" },
  }));
  write(root, "package-lock.json", "{}");
  write(root, ".gitignore", "node_modules\n.env*\n!.env.example\n");
  write(root, "README.md", "# Clean app\n");
  write(root, "public/robots.txt", "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n");
  write(root, "public/favicon.ico", "x");
  write(root, "public/apple-touch-icon.png", "x");
  write(root, "public/manifest.webmanifest", "{}");
  write(root, "public/_headers", "/*\n  Strict-Transport-Security: max-age=63072000\n  X-Content-Type-Options: nosniff\n");
  write(root, "src/layouts/Base.astro", `---
const { title, description } = Astro.props;
---
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content={description}>
  <link rel="canonical" href={Astro.url}>
  <meta property="og:image" content="https://example.com/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json" set:text={JSON.stringify({ "@type": "Organization" })}></script>
</head>
<body><slot /></body>
</html>
<style>
  :focus-visible { outline: 2px solid var(--focus); }
  @media (prefers-reduced-motion: reduce) { * { animation: none; } }
</style>
`);
  write(root, "src/pages/index.astro", `---
import Base from "../layouts/Base.astro";
---
<Base title="Route grades for climbers | Crux" description="Log every route you send and see your grade pyramid.">
  <h1>Log every route you send</h1>
  <img src="/wall.avif" alt="Climber on an overhanging wall" width="1200" height="800">
  <button aria-label="Close"><svg aria-hidden="true"></svg></button>
</Base>
`);
  return root;
}

test("flags the planted problems in a vibe-coded app", () => {
  const dir = makeBadApp();
  const out = scan(dir, ["--limit", "0"]);
  const ids = new Set(out.findings.map((f) => f.id));
  const expect = [
    "secret.stripe-live", "secret.supabase-service-role", "env.client-exposed", "env.gitignore",
    "supabase.service-role-client", "supabase.rls-missing", "supabase.policy-true", "firebase.rules-open",
    "xss.dangerously-set-inner-html", "sqli.prisma-unsafe", "authz.mass-assignment", "payments.client-price",
    "webhook.unverified", "authz.route-no-auth", "authz.server-action-no-auth", "llm.browser-key",
    "build.public-sourcemaps", "headers.none-in-repo", "abuse.no-rate-limit", "supply.no-lockfile",
    "seo.no-description", "seo.no-og-image", "seo.no-robots", "seo.no-sitemap", "seo.no-lang",
    "a11y.img-no-alt", "a11y.click-non-interactive", "a11y.icon-button-no-name", "a11y.focus-removed",
    "responsive.100vh", "perf.image-huge", "perf.client-root-layout", "perf.heavy-dep", "design.tell",
  ];
  for (const id of expect) assert.ok(ids.has(id), `expected signal ${id}`);
  if (fs.existsSync(path.join(dir, ".git"))) assert.ok(ids.has("env.tracked"), "expected env.tracked");
  assert.equal(out.designScore.verdict, "High", `design score ${out.designScore.score}`);
  // never print a full secret
  assert.ok(!JSON.stringify(out).includes(stripeLive), "secret leaked into output");
  assert.ok(!JSON.stringify(out).includes(serviceRoleJwt), "jwt leaked into output");
});

test("clean app produces no high-severity signals and a low design score", () => {
  const dir = makeCleanApp();
  const out = scan(dir);
  const highs = out.findings.filter((f) => f.severity === "high");
  assert.deepEqual(highs.map((f) => `${f.id} ${f.file}`), []);
  assert.equal(out.designScore.verdict, "Low");
  for (const id of ["seo.no-title", "seo.no-og-image", "seo.no-robots", "seo.no-sitemap", "headers.none-in-repo", "abuse.no-rate-limit"]) {
    assert.ok(!out.findings.some((f) => f.id === id), `unexpected ${id}`);
  }
});

test("--strict exits 2 when high-severity signals exist", () => {
  const dir = makeBadApp();
  const res = spawnSync(process.execPath, [SCAN, dir, "--only", "security", "--strict"], { encoding: "utf8" });
  assert.equal(res.status, 2);
});

test("--only limits areas and bad options fail with exit 1", () => {
  const dir = makeCleanApp();
  const out = scan(dir, ["--only", "seo"]);
  assert.deepEqual(Object.keys(out.summary), ["seo"]);
  const bad = spawnSync(process.execPath, [SCAN, dir, "--only", "nope"], { encoding: "utf8" });
  assert.equal(bad.status, 1);
});

test("detects the warm cream template in plain HTML/CSS by color family, eyebrow usage and inline illustration", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "webcheckup-warm-"));
  const shapes = Array.from({ length: 8 }, (_, i) => `<circle cx="${20 + i * 30}" cy="100" r="12"/>`).join("");
  write(root, "index.html", `<!doctype html><html lang="en"><head><title>Bakery</title><style>
:root { --cream: #f5eee2; --clay: #b5652b; --ink: #2a2019; }
body { background: var(--cream); color: var(--ink); }
.kicker { font-size: .8rem; letter-spacing: .15em; text-transform: uppercase; color: var(--clay); }
.tag { letter-spacing: .04em; text-transform: uppercase; }
</style></head><body>
<p class="kicker">Our story</p><h1>Slow bread</h1>
<div class="hero-art"><svg viewBox="0 0 300 220">${shapes}</svg></div>
<p class="kicker">Menu</p><p class="kicker">Visit</p><span class="tag">New</span>
</body></html>`);
  const out = scan(root, ["--only", "design", "--limit", "0"]);
  const labels = out.designScore.inputs.map((i) => i.label).join(" | ");
  assert.match(labels, /Cream canvas \+ terracotta/);
  assert.match(labels, /eyebrow/);
  assert.match(labels, /inline SVG illustration/);
  assert.ok(out.designScore.score >= 7, `score ${out.designScore.score}`);
});

test("a cool, distinctive palette with a small warm accent is not flagged as the cream template", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "webcheckup-cool-"));
  write(root, "index.html", `<!doctype html><html lang="en"><head><title>Bakery</title><style>
:root { --paper: #fafaf7; --cobalt: #2348a0; --crust: #9a4f15; --ink: #18222f; }
.label { font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; }
</style></head><body><p class="label">Hours</p><h1>Sourdough out of the oven</h1></body></html>`);
  const out = scan(root, ["--only", "design"]);
  const labels = out.designScore.inputs.map((i) => i.label).join(" | ");
  assert.doesNotMatch(labels, /Cream canvas/);
  assert.doesNotMatch(labels, /eyebrow/); // a single use is fine
  assert.equal(out.designScore.verdict, "Low");
});
