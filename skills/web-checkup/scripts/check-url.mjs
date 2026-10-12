#!/usr/bin/env node
// Web Checkup live-site checker.
// Zero dependencies, Node 18+. Makes a small number of ordinary GET requests to a site you own or operate:
// security headers, HTTPS, cookies, exposed files, SEO tags, robots.txt, sitemap and (optionally) PageSpeed Insights.

const HELP = `Web Checkup check-url: passive checks of a deployed site.

Usage:
  node check-url.mjs <url> [options]

Options:
  --psi                 Also query Google PageSpeed Insights (lab scores + CrUX field data).
                        Set PSI_API_KEY for higher rate limits.
  --strategy <s>        PageSpeed strategy: mobile (default) or desktop
  --json                Print machine-readable JSON
  --strict              Exit with code 2 when any high-severity issue is found
  --timeout <ms>        Per-request timeout (default 15000)
  -h, --help            Show this help

Only run this against sites you own or are authorized to test. It sends about 15 to 25 GET requests.`;

const opts = { url: null, psi: false, strategy: "mobile", json: false, strict: false, timeout: 15000 };
{
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(HELP); process.exit(0); }
    else if (a === "--psi") opts.psi = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--strict") opts.strict = true;
    else if (a === "--strategy") opts.strategy = argv[++i];
    else if (a === "--timeout") opts.timeout = Number(argv[++i]);
    else if (a.startsWith("-")) fail(`unknown option ${a}`);
    else if (!opts.url) opts.url = a;
    else fail("only one URL at a time");
  }
  if (!opts.url) fail("missing <url>");
  if (!/^https?:\/\//i.test(opts.url)) opts.url = `https://${opts.url}`;
  if (!["mobile", "desktop"].includes(opts.strategy)) fail("--strategy must be mobile or desktop");
  if (!Number.isFinite(opts.timeout) || opts.timeout < 1000) fail("--timeout must be at least 1000");
  if (typeof fetch !== "function") fail("Node 18 or newer is required (global fetch).");
}

function fail(msg) {
  console.error(`check-url.mjs: ${msg}\n\n${HELP}`);
  process.exit(1);
}

const UA = "web-checkup/1.0 (+https://github.com/joshguntarverdiyev/web-checkup)";
const findings = [];
const facts = {};
function add(area, severity, id, message, detail) {
  findings.push({ area, severity, id, message, ...(detail ? { detail } : {}) });
}

async function get(url, { redirect = "manual", method = "GET", headers = {} } = {}) {
  try {
    const res = await fetch(url, { method, redirect, headers: { "user-agent": UA, accept: "*/*", ...headers }, signal: AbortSignal.timeout(opts.timeout) });
    return res;
  } catch (e) {
    return { error: e.name === "TimeoutError" ? "timeout" : (e.cause && e.cause.code) || e.message };
  }
}

async function text(res, max = 3_000_000) {
  if (!res || res.error || !res.body) return "";
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    chunks.push(value);
    if (size > max) { try { await reader.cancel(); } catch { /* ignore */ } break; }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

async function follow(url, maxHops = 10) {
  const chain = [];
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await get(current);
    if (res.error) return { error: res.error, chain };
    chain.push({ url: current, status: res.status });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      try { await res.body?.cancel(); } catch { /* ignore */ }
      current = new URL(loc, current).toString();
      continue;
    }
    return { res, chain, finalUrl: current };
  }
  return { error: "too many redirects", chain };
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
};
const metaTags = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
const linkTags = (html) => [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
function meta(html, key) {
  for (const t of metaTags(html)) {
    const n = (attr(t, "name") || attr(t, "property") || "").toLowerCase();
    if (n === key) return attr(t, "content");
  }
  return null;
}
function link(html, rel) {
  for (const t of linkTags(html)) {
    const r = (attr(t, "rel") || "").toLowerCase().split(/\s+/);
    if (r.includes(rel)) return attr(t, "href");
  }
  return null;
}
const decode = (s) => (s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").trim();

async function main() {
  const start = new URL(opts.url);
  facts.requested = start.toString();

  // ---------- main document ----------
  const main = await follow(start.toString());
  if (main.error) {
    console.error(`Could not load ${start}: ${main.error}`);
    process.exitCode = 1;
    return;
  }
  const { res, chain, finalUrl } = main;
  const final = new URL(finalUrl);
  facts.finalUrl = finalUrl;
  facts.status = res.status;
  facts.redirects = chain;
  const h = res.headers;
  const html = await text(res);
  facts.server = h.get("server");

  if (res.status >= 400) add("functional", "high", "http.status", `Main URL returned HTTP ${res.status}.`);
  if (chain.length > 2) add("perf", "low", "http.redirect-chain", `Redirect chain of ${chain.length - 1} hops before the page loads.`, chain.map((c) => `${c.status} ${c.url}`).join(" -> "));

  // ---------- transport ----------
  const isLocal = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)$|\.(local|localhost|test)$/i.test(final.hostname);
  if (isLocal) add("security", "info", "tls.local", "Local URL: HTTPS, HSTS and http-redirect checks skipped. Re-run against the deployed site.");
  else if (final.protocol !== "https:") add("security", "high", "tls.no-https", "Final URL is not HTTPS.");
  if (start.protocol === "https:") {
    const httpUrl = new URL(start.toString());
    httpUrl.protocol = "http:";
    const r = await get(httpUrl.toString());
    if (r.error) add("security", "info", "tls.http-unreachable", `http:// variant not reachable (${r.error}). Fine if port 80 is closed on purpose.`);
    else {
      const loc = r.headers.get("location") || "";
      if (r.status >= 300 && r.status < 400 && loc.startsWith("https://")) facts.httpRedirect = `${r.status} -> ${loc}`;
      else add("security", "high", "tls.http-not-redirected", `http:// returns ${r.status} instead of redirecting to HTTPS.`);
      try { await r.body?.cancel(); } catch { /* ignore */ }
    }
  }

  // ---------- security headers ----------
  const hsts = h.get("strict-transport-security");
  if (final.protocol === "https:") {
    if (!hsts) add("security", "medium", "headers.hsts-missing", "Strict-Transport-Security header missing.");
    else {
      const maxAge = Number((hsts.match(/max-age=(\d+)/i) || [])[1] || 0);
      if (maxAge < 15552000) add("security", "low", "headers.hsts-short", `HSTS max-age is ${maxAge}s; use at least 15552000 (180 days), ideally 63072000.`, hsts);
    }
  }
  const csp = h.get("content-security-policy");
  const cspRO = h.get("content-security-policy-report-only");
  if (!csp && !cspRO) add("security", "medium", "headers.csp-missing", "No Content-Security-Policy (start with Report-Only).");
  else if (!csp && cspRO) add("security", "low", "headers.csp-report-only", "CSP is Report-Only: enforce it once violations are resolved.");
  if (csp) {
    const scriptSrc = (csp.match(/script-src([^;]*)/i) || csp.match(/default-src([^;]*)/i) || [])[1] || "";
    if (/'unsafe-inline'/.test(scriptSrc) && !/'nonce-|'sha(256|384|512)-|'strict-dynamic'/.test(scriptSrc)) add("security", "low", "headers.csp-unsafe-inline", "CSP script-src allows 'unsafe-inline' (weak XSS protection). Use nonces or hashes.");
    if (/'unsafe-eval'/.test(scriptSrc)) add("security", "low", "headers.csp-unsafe-eval", "CSP script-src allows 'unsafe-eval'.");
    if (/(^|\s)(\*|https:|http:)(\s|$)/.test(scriptSrc)) add("security", "medium", "headers.csp-wildcard", "CSP script-src allows any host (wildcard or bare scheme).");
    if (!/object-src\s+'none'/.test(csp) && !/default-src\s+'none'/.test(csp)) add("security", "low", "headers.csp-object-src", "CSP has no object-src 'none'.");
    if (!/base-uri/.test(csp)) add("security", "low", "headers.csp-base-uri", "CSP has no base-uri directive.");
  }
  const xfo = h.get("x-frame-options");
  if (!xfo && !(csp && /frame-ancestors/i.test(csp))) add("security", "medium", "headers.framing", "No clickjacking protection (X-Frame-Options or CSP frame-ancestors).");
  if ((h.get("x-content-type-options") || "").toLowerCase() !== "nosniff") add("security", "low", "headers.nosniff", "X-Content-Type-Options: nosniff missing.");
  if (!h.get("referrer-policy")) add("security", "low", "headers.referrer-policy", "Referrer-Policy missing (strict-origin-when-cross-origin is a good default).");
  if (!h.get("permissions-policy")) add("security", "info", "headers.permissions-policy", "Permissions-Policy missing (disable camera, microphone, geolocation if unused).");
  const powered = h.get("x-powered-by");
  if (powered) add("security", "low", "headers.x-powered-by", `X-Powered-By discloses "${powered}". Remove it.`);
  if (facts.server && /\d+\.\d+/.test(facts.server)) add("security", "low", "headers.server-version", `Server header discloses a version: "${facts.server}".`);
  facts.headers = Object.fromEntries(["strict-transport-security", "content-security-policy", "content-security-policy-report-only", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "cache-control", "content-encoding", "x-robots-tag"].map((k) => [k, h.get(k)]).filter(([, v]) => v));

  // ---------- cookies ----------
  const cookies = typeof h.getSetCookie === "function" ? h.getSetCookie() : (h.get("set-cookie") ? [h.get("set-cookie")] : []);
  for (const c of cookies) {
    const name = c.split("=")[0].trim();
    const lower = c.toLowerCase();
    const missing = [];
    if (final.protocol === "https:" && !/;\s*secure/.test(lower)) missing.push("Secure");
    if (/sess|auth|token|sid|jwt/i.test(name) && !/;\s*httponly/.test(lower)) missing.push("HttpOnly");
    if (!/;\s*samesite=/.test(lower)) missing.push("SameSite");
    if (missing.length) add("security", /sess|auth|token|sid|jwt/i.test(name) ? "medium" : "low", "cookies.flags", `Cookie "${name}" lacks ${missing.join(", ")}.`);
  }

  // ---------- performance basics ----------
  const enc = h.get("content-encoding");
  if (!enc && html.length > 20000) add("perf", "medium", "perf.no-compression", "HTML is not compressed (no gzip/br content-encoding).");
  const cc = h.get("cache-control") || "";
  if (/no-store/.test(cc) && !/private/.test(cc)) add("perf", "low", "perf.no-store", "HTML uses Cache-Control: no-store, which also disables the back/forward cache. Use no-cache unless the page is personal.");
  facts.htmlBytes = html.length;

  // ---------- SEO / metadata ----------
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const description = decode(meta(html, "description"));
  const canonical = link(html, "canonical");
  const lang = (html.match(/<html\b[^>]*\blang\s*=\s*["']?([\w-]+)/i) || [])[1];
  const viewport = meta(html, "viewport");
  const robotsMeta = (meta(html, "robots") || "") + " " + (meta(html, "googlebot") || "");
  const xRobots = h.get("x-robots-tag") || "";
  const og = { title: meta(html, "og:title"), description: meta(html, "og:description"), image: meta(html, "og:image"), url: meta(html, "og:url"), type: meta(html, "og:type") };
  const twitterCard = meta(html, "twitter:card");
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const jsonLdTypes = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((m) => { try { const j = JSON.parse(m[1]); const items = Array.isArray(j) ? j : j["@graph"] || [j]; return items.map((x) => x["@type"]).flat(); } catch { return ["(invalid JSON)"]; } });
  Object.assign(facts, { title, description, canonical, lang, viewport, og, twitterCard, h1Count, jsonLdTypes });

  if (!title) add("seo", "high", "seo.no-title", "No <title>.");
  else {
    if (/^(Vite \+ React|Vite App|React App|Create Next App|Next\.js App|Home|Untitled)$/i.test(title)) add("seo", "high", "seo.default-title", `Default or generic title: "${title}".`);
    if (title.length > 65) add("seo", "low", "seo.title-long", `Title is ${title.length} characters; it may be truncated in results.`);
  }
  if (!description) add("seo", "medium", "seo.no-description", "No meta description.");
  else if (description.length < 50 || description.length > 170) add("seo", "low", "seo.description-length", `Meta description is ${description.length} characters (aim for about 140 to 160).`);
  if (!canonical) add("seo", "low", "seo.no-canonical", "No canonical link.");
  else if (!/^https?:\/\//.test(canonical)) add("seo", "medium", "seo.canonical-relative", `Canonical is not absolute: ${canonical}`);
  if (!lang) add("seo", "medium", "seo.no-lang", "<html> has no lang attribute.");
  if (!viewport) add("responsive", "high", "responsive.no-viewport", "No viewport meta tag: the site renders as a zoomed-out desktop page on phones.");
  else if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport)) add("a11y", "high", "a11y.zoom-disabled", `Viewport disables zoom: "${viewport}".`);
  if (/noindex/i.test(robotsMeta) || /noindex/i.test(xRobots)) add("seo", "high", "seo.noindex", "This page is noindex (meta robots or X-Robots-Tag). Remove it if the page should appear in search.");
  if (h1Count === 0) add("seo", "medium", "seo.no-h1", "No <h1> in the server HTML (it may be rendered client-side, which crawlers may miss).");
  else if (h1Count > 1) add("seo", "info", "seo.multiple-h1", `${h1Count} <h1> elements.`);
  if (!og.title || !og.description) add("seo", "low", "seo.og-text", "og:title or og:description missing.");
  if (!og.image) add("seo", "medium", "seo.no-og-image", "No og:image: shared links show a blank preview card.");
  else {
    const imgUrl = new URL(og.image, finalUrl).toString();
    if (!/^https?:\/\//.test(og.image)) add("seo", "medium", "seo.og-image-relative", `og:image is relative (${og.image}); many platforms require an absolute URL.`);
    const r = await get(imgUrl, { redirect: "follow" });
    if (r.error || r.status >= 400) add("seo", "high", "seo.og-image-broken", `og:image does not load (${r.error || r.status}): ${imgUrl}`);
    else {
      const type = r.headers.get("content-type") || "";
      const len = Number(r.headers.get("content-length") || 0);
      if (!/^image\//.test(type)) add("seo", "medium", "seo.og-image-type", `og:image is served as "${type}", not an image.`);
      if (len > 1024 * 1024) add("seo", "low", "seo.og-image-heavy", `og:image is ${Math.round(len / 1024)} KB; keep it under about 300 KB.`);
      if (/\.webp(\?|$)/i.test(imgUrl) || /webp/.test(type)) add("seo", "low", "seo.og-image-webp", "og:image is WebP, which some platforms do not render. Use PNG or JPG.");
      try { await r.body?.cancel(); } catch { /* ignore */ }
    }
  }
  if (!twitterCard) add("seo", "low", "seo.no-twitter-card", "No twitter:card meta (summary_large_image).");
  if (!jsonLdTypes.length) add("seo", "low", "seo.no-structured-data", "No JSON-LD structured data.");
  else if (jsonLdTypes.includes("(invalid JSON)")) add("seo", "medium", "seo.jsonld-invalid", "A JSON-LD block is not valid JSON.");

  const icon = link(html, "icon") || link(html, "shortcut");
  const appleIcon = link(html, "apple-touch-icon");
  const manifest = link(html, "manifest");
  if (!icon) {
    const r = await get(new URL("/favicon.ico", finalUrl).toString(), { redirect: "follow" });
    if (r.error || r.status >= 400) add("seo", "medium", "seo.no-favicon", "No favicon link and /favicon.ico is missing.");
    try { await r.body?.cancel(); } catch { /* ignore */ }
  } else if (/(vite|next|vercel)\.svg/i.test(icon)) add("design", "medium", "design.default-favicon", `Framework default favicon: ${icon}`);
  if (!appleIcon) add("seo", "low", "seo.no-apple-icon", "No apple-touch-icon.");
  if (!manifest) add("seo", "info", "seo.no-manifest", "No web app manifest.");
  if (!meta(html, "theme-color")) add("design", "info", "design.no-theme-color", "No theme-color meta (browser chrome will not match the site).");

  // mixed content
  if (final.protocol === "https:") {
    const insecure = [...html.matchAll(/<(script|img|link|iframe|source|video|audio)\b[^>]*\b(src|href)\s*=\s*["']http:\/\/[^"']+/gi)].map((m) => m[0].slice(0, 120));
    if (insecure.length) add("security", "medium", "transport.mixed-content", `${insecure.length} resources referenced over http:// on an https page.`, insecure.slice(0, 3).join(" | "));
  }

  // ---------- robots.txt and sitemap ----------
  const origin = final.origin;
  const robotsRes = await get(`${origin}/robots.txt`, { redirect: "follow" });
  let robotsTxt = "";
  if (robotsRes.error || robotsRes.status >= 400) add("seo", "medium", "seo.no-robots", `robots.txt not found (${robotsRes.error || robotsRes.status}).`);
  else {
    robotsTxt = await text(robotsRes, 500_000);
    if (/<html/i.test(robotsTxt)) { add("seo", "medium", "seo.robots-html", "robots.txt returns an HTML page (probably an SPA fallback)."); robotsTxt = ""; }
  }
  const groups = parseRobots(robotsTxt);
  if (blocksAll(groups, "*")) add("seo", "high", "seo.robots-disallow-all", "robots.txt blocks all crawlers (User-agent: * / Disallow: /).");
  const aiAgents = ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot", "Bingbot"];
  facts.aiCrawlers = Object.fromEntries(aiAgents.map((a) => [a, blocksAll(groups, a) ? "blocked" : "allowed"]));
  const searchBlocked = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "Bingbot"].filter((a) => facts.aiCrawlers[a] === "blocked");
  if (searchBlocked.length) add("seo", "medium", "seo.ai-search-blocked", `robots.txt blocks AI search crawlers: ${searchBlocked.join(", ")}. The site cannot be cited in those assistants' search results.`);

  const sitemapUrls = [...robotsTxt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (!sitemapUrls.length) sitemapUrls.push(`${origin}/sitemap.xml`);
  const smRes = await get(sitemapUrls[0], { redirect: "follow" });
  if (smRes.error || smRes.status >= 400) add("seo", "medium", "seo.no-sitemap", `Sitemap not found at ${sitemapUrls[0]} (${smRes.error || smRes.status}).`);
  else {
    const sm = await text(smRes, 5_000_000);
    const locs = (sm.match(/<loc>/g) || []).length;
    facts.sitemap = { url: sitemapUrls[0], entries: locs, index: /<sitemapindex/i.test(sm) };
    if (!/<(urlset|sitemapindex)/i.test(sm)) add("seo", "medium", "seo.sitemap-invalid", `${sitemapUrls[0]} is not a valid XML sitemap.`);
    else if (!robotsTxt.match(/^\s*sitemap:/im)) add("seo", "low", "seo.sitemap-not-in-robots", "robots.txt does not reference the sitemap.");
  }

  // ---------- soft 404 ----------
  const probe = `${origin}/this-page-should-not-exist-${Math.random().toString(36).slice(2, 10)}`;
  const nf = await get(probe, { redirect: "follow" });
  if (!nf.error) {
    if (nf.status === 200) add("seo", "medium", "seo.soft-404", "Unknown URLs return HTTP 200 (soft 404). Missing pages must return 404.");
    try { await nf.body?.cancel(); } catch { /* ignore */ }
  }

  // ---------- exposed files ----------
  const exposures = [
    { path: "/.git/HEAD", test: (t) => /^ref:\s*refs\//.test(t), label: ".git directory (full source and history downloadable)" },
    { path: "/.git/config", test: (t) => /\[core\]/.test(t), label: ".git/config" },
    { path: "/.env", test: envLike, label: ".env file" },
    { path: "/.env.local", test: envLike, label: ".env.local file" },
    { path: "/.env.production", test: envLike, label: ".env.production file" },
    { path: "/.DS_Store", test: (t) => t.includes("Bud1"), label: ".DS_Store (directory listing)" },
  ];
  for (const e of exposures) {
    const r = await get(`${origin}${e.path}`);
    if (!r.error && r.status === 200) {
      const t = await text(r, 20_000);
      if (e.test(t)) add("security", "high", "exposure.file", `${e.label} is publicly accessible at ${e.path}. Block it and rotate any secrets it contains.`);
    } else { try { await r.body?.cancel(); } catch { /* ignore */ } }
  }

  // public source maps for the first few same-origin scripts
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+\.js[^"']*)["']/gi)].map((m) => new URL(m[1], finalUrl)).filter((u) => u.origin === origin).slice(0, 4);
  let mapsFound = 0;
  for (const u of scripts) {
    const mapUrl = `${u.origin}${u.pathname}.map`;
    const r = await get(mapUrl);
    if (!r.error && r.status === 200) {
      const t = await text(r, 200_000);
      if (/"sources"\s*:/.test(t) && /"mappings"\s*:/.test(t)) mapsFound++;
    } else { try { await r.body?.cancel(); } catch { /* ignore */ } }
  }
  if (mapsFound) add("security", "medium", "exposure.source-maps", `${mapsFound} public JavaScript source map(s) found: your original source code is downloadable. Disable public maps or upload them privately to error tracking.`);

  const sec = await get(`${origin}/.well-known/security.txt`);
  if (sec.error || sec.status !== 200) add("security", "info", "ops.no-security-txt", "No /.well-known/security.txt (RFC 9116).");
  try { await sec.body?.cancel(); } catch { /* ignore */ }

  // ---------- PageSpeed Insights ----------
  if (opts.psi) await pagespeed(finalUrl);
}

function envLike(t) {
  if (/<html|<!doctype/i.test(t)) return false;
  const lines = t.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  return lines.length > 0 && lines.filter((l) => /^[A-Z_][A-Z0-9_]*\s*=/.test(l.trim())).length >= Math.max(1, Math.floor(lines.length / 2));
}

function parseRobots(txt) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (key === "disallow" || key === "allow")) current.rules.push({ type: key, path: val });
    }
  }
  return groups;
}

function blocksAll(groups, agent) {
  const a = agent.toLowerCase();
  let group = groups.find((g) => g.agents.includes(a));
  if (!group && a !== "*") group = groups.find((g) => g.agents.includes("*"));
  if (!group) return false;
  const disallowRoot = group.rules.some((r) => r.type === "disallow" && r.path === "/");
  const allowRoot = group.rules.some((r) => r.type === "allow" && (r.path === "/" || r.path === "/$"));
  return disallowRoot && !allowRoot;
}

async function pagespeed(url) {
  const params = new URLSearchParams({ url, strategy: opts.strategy });
  for (const c of ["performance", "accessibility", "best-practices", "seo"]) params.append("category", c);
  if (process.env.PSI_API_KEY) params.set("key", process.env.PSI_API_KEY);
  let data;
  try {
    const endpoint = process.env.PSI_ENDPOINT || "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
    const r = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.timeout(120000) });
    data = await r.json();
    if (!r.ok) throw new Error(data.error ? data.error.message : `HTTP ${r.status}`);
  } catch (e) {
    const quota = /quota|rate/i.test(e.message);
    add("perf", "info", "psi.failed", `PageSpeed Insights request failed: ${e.message.replace(/\.+$/, "")}.`,
      quota ? "Keyless requests share a small daily quota. Create a free key (Google Cloud console: enable the PageSpeed Insights API, then Credentials > API key) and run with PSI_API_KEY=<key>. Alternatives: https://pagespeed.web.dev or `npx lighthouse <url>`." : "Retry, or use https://pagespeed.web.dev or `npx lighthouse <url>`.");
    return;
  }
  const lh = data.lighthouseResult || {};
  const cats = lh.categories || {};
  const audits = lh.audits || {};
  const score = (k) => (cats[k] && typeof cats[k].score === "number" ? Math.round(cats[k].score * 100) : null);
  const num = (k) => (audits[k] ? audits[k].numericValue : null);
  const psi = {
    strategy: opts.strategy,
    scores: { performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), seo: score("seo") },
    lab: { lcpMs: num("largest-contentful-paint"), cls: num("cumulative-layout-shift"), tbtMs: num("total-blocking-time"), fcpMs: num("first-contentful-paint"), ttfbMs: num("server-response-time") },
    field: null,
  };
  const fieldSrc = data.loadingExperience && data.loadingExperience.metrics ? { scope: "page", ...data.loadingExperience } : data.originLoadingExperience && data.originLoadingExperience.metrics ? { scope: "origin", ...data.originLoadingExperience } : null;
  if (fieldSrc) {
    const m = fieldSrc.metrics;
    const p = (k) => (m[k] ? { p75: m[k].percentile, category: m[k].category } : null);
    psi.field = { scope: fieldSrc.scope, overall: fieldSrc.overall_category, lcp: p("LARGEST_CONTENTFUL_PAINT_MS"), inp: p("INTERACTION_TO_NEXT_PAINT"), cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE ? { p75: m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100, category: m.CUMULATIVE_LAYOUT_SHIFT_SCORE.category } : null };
  }
  facts.pagespeed = psi;

  if (psi.field) {
    const f = psi.field;
    if (f.lcp && f.lcp.p75 > 2500) add("perf", f.lcp.p75 > 4000 ? "high" : "medium", "cwv.field-lcp", `Real-user LCP p75 is ${(f.lcp.p75 / 1000).toFixed(1)} s (${f.scope} data; good is 2.5 s or less).`);
    if (f.inp && f.inp.p75 > 200) add("perf", f.inp.p75 > 500 ? "high" : "medium", "cwv.field-inp", `Real-user INP p75 is ${f.inp.p75} ms (${f.scope} data; good is 200 ms or less).`);
    if (f.cls && f.cls.p75 > 0.1) add("perf", f.cls.p75 > 0.25 ? "high" : "medium", "cwv.field-cls", `Real-user CLS p75 is ${f.cls.p75} (${f.scope} data; good is 0.1 or less).`);
  } else {
    add("perf", "info", "cwv.no-field-data", "No CrUX field data for this URL or origin (not enough Chrome traffic). Lab values only.");
  }
  if (psi.lab.lcpMs && psi.lab.lcpMs > 4000) add("perf", "medium", "cwv.lab-lcp", `Lab LCP ${(psi.lab.lcpMs / 1000).toFixed(1)} s on ${opts.strategy} (simulated throttling).`);
  if (psi.lab.cls && psi.lab.cls > 0.1) add("perf", "medium", "cwv.lab-cls", `Lab CLS ${psi.lab.cls.toFixed(3)}.`);
  if (psi.lab.tbtMs && psi.lab.tbtMs > 600) add("perf", "medium", "cwv.lab-tbt", `Lab Total Blocking Time ${Math.round(psi.lab.tbtMs)} ms (heavy main-thread JavaScript).`);
  for (const [k, v] of Object.entries(psi.scores)) if (v !== null && v < 50) add(k === "performance" ? "perf" : k === "seo" ? "seo" : k === "accessibility" ? "a11y" : "security", "medium", `psi.low-${k}`, `Lighthouse ${k} score ${v}/100 (${opts.strategy}).`);

  const opportunities = Object.values(audits)
    .filter((a) => a.details && a.details.type === "opportunity" && typeof a.score === "number" && a.score < 0.9 && (a.details.overallSavingsMs || 0) > 100)
    .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
    .slice(0, 6)
    .map((a) => `${a.title} (about ${Math.round(a.details.overallSavingsMs)} ms)`);
  if (opportunities.length) { facts.pagespeed.opportunities = opportunities; add("perf", "info", "psi.opportunities", "Top Lighthouse opportunities:", opportunities.join("; ")); }
  const failedA11y = Object.values(audits).filter((a) => a.score === 0 && cats.accessibility && cats.accessibility.auditRefs && cats.accessibility.auditRefs.some((r) => r.id === a.id && r.weight > 0)).map((a) => a.title).slice(0, 8);
  if (failedA11y.length) add("a11y", "medium", "psi.a11y-failures", "Lighthouse accessibility failures:", failedA11y.join("; "));
}

function print() {
  const order = { high: 0, medium: 1, low: 2, info: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.area.localeCompare(b.area));
  const high = findings.filter((f) => f.severity === "high").length;
  if (opts.json) {
    console.log(JSON.stringify({ facts, findings }, null, 2));
  } else {
    const tty = process.stdout.isTTY && !process.env.NO_COLOR;
    const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
    const label = { high: c("31;1", "HIGH  "), medium: c("33;1", "MEDIUM"), low: c("36", "LOW   "), info: c("2", "INFO  ") };
    console.log(c("1", `Web Checkup check-url: ${facts.finalUrl}`) + `  (HTTP ${facts.status}${facts.server ? `, ${facts.server}` : ""})`);
    if (facts.redirects && facts.redirects.length > 1) console.log(c("2", `Redirects: ${facts.redirects.map((r) => `${r.status} ${r.url}`).join(" -> ")}`));
    console.log(`Title: ${facts.title || "(none)"}`);
    console.log(`Description: ${facts.description || "(none)"}`);
    console.log(`OG image: ${facts.og && facts.og.image ? facts.og.image : "(none)"}   Canonical: ${facts.canonical || "(none)"}   lang: ${facts.lang || "(none)"}`);
    if (facts.jsonLdTypes && facts.jsonLdTypes.length) console.log(`Structured data: ${facts.jsonLdTypes.join(", ")}`);
    if (facts.sitemap) console.log(`Sitemap: ${facts.sitemap.url} (${facts.sitemap.entries} entries${facts.sitemap.index ? ", index" : ""})`);
    if (facts.aiCrawlers) console.log(`AI crawlers blocked by robots.txt: ${Object.entries(facts.aiCrawlers).filter(([, v]) => v === "blocked").map(([k]) => k).join(", ") || "none"}`);
    if (facts.pagespeed) {
      const p = facts.pagespeed;
      const s = p.scores;
      console.log(`\nPageSpeed (${p.strategy}): performance ${s.performance}, accessibility ${s.accessibility}, best practices ${s.bestPractices}, SEO ${s.seo}`);
      console.log(`  Lab: LCP ${p.lab.lcpMs ? (p.lab.lcpMs / 1000).toFixed(2) + " s" : "n/a"}, CLS ${p.lab.cls != null ? p.lab.cls.toFixed(3) : "n/a"}, TBT ${p.lab.tbtMs != null ? Math.round(p.lab.tbtMs) + " ms" : "n/a"}`);
      if (p.field) console.log(`  Field (${p.field.scope}, p75): LCP ${p.field.lcp ? (p.field.lcp.p75 / 1000).toFixed(2) + " s " + p.field.lcp.category : "n/a"}, INP ${p.field.inp ? p.field.inp.p75 + " ms " + p.field.inp.category : "n/a"}, CLS ${p.field.cls ? p.field.cls.p75 + " " + p.field.cls.category : "n/a"}`);
      else console.log("  Field: no CrUX data");
    }
    console.log("");
    if (!findings.length) console.log("No issues found by these checks.");
    for (const f of findings) {
      console.log(`${label[f.severity]} ${c("2", `[${f.area}] ${f.id}`)}  ${f.message}`);
      if (f.detail) console.log(`         ${c("2", f.detail)}`);
    }
    console.log(`\n${high} high, ${findings.filter((f) => f.severity === "medium").length} medium, ${findings.filter((f) => f.severity === "low").length} low. Header values are what this request received; CDNs can vary by path.`);
  }
  process.exitCode = opts.strict && high > 0 ? 2 : 0;
}

main().then(() => { if (process.exitCode !== 1) print(); }).catch((e) => { console.error(e); process.exitCode = 1; });
