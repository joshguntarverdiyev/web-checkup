// Tests for skills/web-checkup/scripts/check-url.mjs against local HTTP servers (no external traffic).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.resolve(here, "../skills/web-checkup/scripts/check-url.mjs");
const servers = [];

function serve(routes) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const route = routes[req.url.split("?")[0]];
      if (!route) { res.writeHead(routes.__soft404 ? 200 : 404, { "content-type": "text/html" }); res.end("<html><body>Not here</body></html>"); return; }
      res.writeHead(route.status || 200, route.headers || { "content-type": "text/html" });
      res.end(route.body || "");
    });
    server.listen(0, "127.0.0.1", () => { servers.push(server); resolve(`http://127.0.0.1:${server.address().port}`); });
  });
}
after(() => servers.forEach((s) => s.close()));

function run(url) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CHECK, url, "--json", "--timeout", "5000"]);
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`exit ${code}: ${err}`));
      try { resolve(JSON.parse(out)); } catch (e) { reject(new Error(`bad JSON: ${out.slice(0, 300)}`)); }
    });
  });
}

test("flags a misconfigured site", async () => {
  const base = await serve({
    __soft404: true,
    "/": { headers: { "content-type": "text/html", "x-powered-by": "Express", "set-cookie": "session=abc; Path=/" },
      body: `<!doctype html><html><head><title>Vite + React</title><meta name="viewport" content="width=device-width, maximum-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="/vite.svg"></head><body><div id="root"></div><script src="/assets/index.js"></script></body></html>` },
    "/assets/index.js": { headers: { "content-type": "application/javascript" }, body: "console.log(1)" },
    "/assets/index.js.map": { headers: { "content-type": "application/json" }, body: '{"version":3,"sources":["src/App.tsx"],"mappings":"AAAA"}' },
    "/.git/HEAD": { headers: { "content-type": "text/plain" }, body: "ref: refs/heads/main\n" },
    "/.env": { headers: { "content-type": "text/plain" }, body: "DATABASE_URL=postgres://u:p@h/db\nSTRIPE_SECRET_KEY=x\n" },
    "/robots.txt": { headers: { "content-type": "text/plain" }, body: "User-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n" },
  });
  const out = await run(base);
  const ids = new Set(out.findings.map((f) => f.id));
  for (const id of ["seo.default-title", "seo.noindex", "a11y.zoom-disabled", "design.default-favicon", "exposure.file", "exposure.source-maps",
    "headers.csp-missing", "headers.framing", "headers.nosniff", "headers.x-powered-by", "cookies.flags", "seo.no-description",
    "seo.no-og-image", "seo.no-h1", "seo.soft-404", "seo.ai-search-blocked", "seo.sitemap-invalid"]) {
    assert.ok(ids.has(id), `expected ${id}; got ${[...ids].join(", ")}`);
  }
  assert.equal(out.facts.aiCrawlers["OAI-SearchBot"], "blocked");
  assert.equal(out.facts.aiCrawlers.GPTBot, "allowed");
  assert.equal(out.findings.filter((f) => f.id === "exposure.file").length, 2);
});

test("a well-configured site has no high or medium findings", async () => {
  const headers = {
    "content-type": "text/html",
    "content-security-policy": "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=()",
  };
  // the server's own origin is only known after listen(), so pages are built per request
  const server2 = await new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      const origin = `http://127.0.0.1:${s.address().port}`;
      const p = req.url.split("?")[0];
      if (p === "/") {
        res.writeHead(200, headers);
        res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Route grades for climbers | Crux</title>
<meta name="description" content="Log every route you send, see your grade pyramid, and find projects at your gym. Free for climbers, with plans for gyms.">
<link rel="canonical" href="${origin}/"><link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#111">
<meta property="og:title" content="Crux"><meta property="og:description" content="Log every route you send."><meta property="og:image" content="${origin}/og.png"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Crux"}</script></head><body><h1>Log every route you send</h1></body></html>`);
      } else if (p === "/og.png") { res.writeHead(200, { "content-type": "image/png", "content-length": "1000" }); res.end(Buffer.alloc(1000)); }
      else if (p === "/robots.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end(`User-agent: *\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`); }
      else if (p === "/sitemap.xml") { res.writeHead(200, { "content-type": "application/xml" }); res.end(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>`); }
      else if (p === "/.well-known/security.txt") { res.writeHead(200, { "content-type": "text/plain" }); res.end("Contact: mailto:security@example.com\n"); }
      else { res.writeHead(404, { "content-type": "text/html" }); res.end("<html><body>Not found</body></html>"); }
    });
    s.listen(0, "127.0.0.1", () => { servers.push(s); resolve(`http://127.0.0.1:${s.address().port}`); });
  });
  const out = await run(server2);
  const serious = out.findings.filter((f) => f.severity === "high" || f.severity === "medium");
  assert.deepEqual(serious.map((f) => f.id), []);
  assert.deepEqual(out.facts.jsonLdTypes, ["Organization"]);
  assert.equal(out.facts.sitemap.entries, 1);
});

test("parses PageSpeed Insights lab and field data", async () => {
  const psiBody = JSON.stringify({
    loadingExperience: {
      overall_category: "SLOW",
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4600, category: "SLOW" },
        INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: "FAST" },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 21, category: "AVERAGE" },
      },
    },
    lighthouseResult: {
      categories: { performance: { score: 0.42 }, accessibility: { score: 0.91, auditRefs: [{ id: "color-contrast", weight: 7 }] }, "best-practices": { score: 1 }, seo: { score: 0.92 } },
      audits: {
        "largest-contentful-paint": { numericValue: 5200 },
        "cumulative-layout-shift": { numericValue: 0.18 },
        "total-blocking-time": { numericValue: 720 },
        "first-contentful-paint": { numericValue: 1900 },
        "server-response-time": { numericValue: 300 },
        "uses-optimized-images": { title: "Efficiently encode images", score: 0.3, details: { type: "opportunity", overallSavingsMs: 1200 } },
        "color-contrast": { id: "color-contrast", title: "Background and foreground colors do not have a sufficient contrast ratio", score: 0 },
      },
    },
  });
  const psi = await serve({ "/psi": { headers: { "content-type": "application/json" }, body: psiBody } });
  const site = await serve({ "/": { body: "<!doctype html><html lang=\"en\"><head><title>Test page title here</title></head><body><h1>x</h1></body></html>" } });
  const out = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CHECK, site, "--json", "--psi", "--timeout", "5000"], { env: { ...process.env, PSI_ENDPOINT: `${psi}/psi` } });
    let o = "";
    child.stdout.on("data", (d) => (o += d));
    child.on("close", () => { try { resolve(JSON.parse(o)); } catch (e) { reject(e); } });
  });
  const p = out.facts.pagespeed;
  assert.equal(p.scores.performance, 42);
  assert.equal(p.field.scope, "page");
  assert.equal(p.field.lcp.p75, 4600);
  assert.equal(p.field.cls.p75, 0.21);
  const ids = new Set(out.findings.map((f) => f.id));
  for (const id of ["cwv.field-lcp", "cwv.field-cls", "cwv.lab-tbt", "psi.low-performance", "psi.opportunities", "psi.a11y-failures"]) assert.ok(ids.has(id), `expected ${id}`);
  assert.ok(!ids.has("cwv.field-inp"), "INP 180 ms is good and must not be flagged");
  assert.equal(out.findings.find((f) => f.id === "cwv.field-lcp").severity, "high");
});
