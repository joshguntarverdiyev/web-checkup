#!/usr/bin/env node
// Web Checkup visual check: screenshots at several viewports plus rendered-page checks.
// Needs Playwright (playwright, playwright-core or @playwright/test) resolvable from the current project,
// the global npm root, or PLAYWRIGHT_MODULE. Uses Playwright's Chromium, or falls back to installed Chrome or Edge.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const HELP = `Web Checkup visual-check: screenshots and rendered-page checks at several viewports.

Usage:
  node visual-check.mjs <url> [options]

Options:
  --widths <list>     Viewport widths (default 375,768,1024,1280,1440). 320 is useful for reflow checks.
  --pages <list>      Extra paths to check on the same origin, e.g. /pricing,/login
  --out <dir>         Screenshot directory (default: a new folder in the OS temp dir)
  --dark              Also capture each page in dark color scheme at the widest viewport
  --viewport-only     Capture only the first screen instead of the full page
  --wait <ms>         Extra settle time after load (default 1200)
  --json              Print machine-readable JSON
  -h, --help          Show this help

Setup if Playwright is missing:
  npm i -D playwright && npx playwright install chromium
  (or set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright-core and have Google Chrome installed)`;

const opts = { url: null, widths: [375, 768, 1024, 1280, 1440], pages: [], out: null, dark: false, full: true, wait: 1200, json: false };
{
  const argv = process.argv.slice(2);
  const val = (i) => { if (argv[i + 1] === undefined) die(`${argv[i]} needs a value`); return argv[i + 1]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { console.log(HELP); process.exit(0); }
    else if (a === "--widths") { opts.widths = val(i).split(",").map(Number); i++; }
    else if (a === "--pages") { opts.pages = val(i).split(",").map((p) => p.trim()).filter(Boolean); i++; }
    else if (a === "--out") { opts.out = val(i); i++; }
    else if (a === "--wait") { opts.wait = Number(val(i)); i++; }
    else if (a === "--dark") opts.dark = true;
    else if (a === "--viewport-only") opts.full = false;
    else if (a === "--json") opts.json = true;
    else if (a.startsWith("-")) die(`unknown option ${a}`);
    else if (!opts.url) opts.url = a;
    else die("only one URL at a time");
  }
  if (!opts.url) die("missing <url>");
  if (!/^https?:\/\//i.test(opts.url)) opts.url = `http://${opts.url}`;
  if (opts.widths.some((w) => !Number.isInteger(w) || w < 200 || w > 4000)) die("--widths must be integers between 200 and 4000");
  if (!Number.isFinite(opts.wait) || opts.wait < 0) die("--wait must be a non-negative number");
}

function die(msg) {
  console.error(`visual-check.mjs: ${msg}\n\n${HELP}`);
  process.exit(1);
}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  const requireFromCwd = createRequire(path.join(process.cwd(), "noop.js"));
  let globalRoot = null;
  try { globalRoot = execFileSync("npm", ["root", "-g"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { /* ignore */ }
  for (const name of ["playwright", "playwright-core", "@playwright/test"]) {
    try { candidates.push(requireFromCwd.resolve(name)); } catch { /* not installed here */ }
    if (globalRoot) { try { candidates.push(createRequire(path.join(globalRoot, "noop.js")).resolve(name)); } catch { /* ignore */ } }
  }
  for (const c of candidates) {
    try {
      const target = fs.existsSync(c) && fs.statSync(c).isDirectory() ? createRequire(path.join(c, "noop.js")).resolve(c) : c;
      const mod = await import(pathToFileURL(target).href);
      const pw = mod.chromium ? mod : mod.default;
      if (pw && pw.chromium) return pw;
    } catch { /* try next */ }
  }
  return null;
}

async function launch(pw) {
  const attempts = [{}, { channel: "chrome" }, { channel: "msedge" }];
  let lastError;
  for (const a of attempts) {
    try { return await pw.chromium.launch({ headless: true, ...a }); } catch (e) { lastError = e; }
  }
  throw lastError;
}

// Runs in the page before any script: record layout shifts and LCP.
const INIT_SCRIPT = `
  window.__wc = { cls: 0, lcp: null, lcpEl: null };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__wc.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) { window.__wc.lcp = e.startTime; const el = e.element; window.__wc.lcpEl = el ? (el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "")) : null; } }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
`;

// Runs in the page after load: rendered checks.
function inspect(touch) {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    else if (typeof el.className === "string" && el.className.trim()) s += "." + el.className.trim().split(/\s+/).slice(0, 3).join(".");
    const t = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return t ? `${s} "${t}"` : s;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  const out = { overflow: [], smallTargets: [], imgNoAlt: [], brokenImages: [], oversizedImages: [], wrappedButtons: [], fonts: [], h1: 0, title: document.title, lang: document.documentElement.lang || null };

  const scrollW = document.documentElement.scrollWidth;
  out.horizontalScroll = scrollW > vw + 1 ? scrollW - vw : 0;
  if (out.horizontalScroll) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && visible(el)) {
        const parentOver = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1;
        if (!parentOver || out.overflow.length < 3) out.overflow.push(`${describe(el)} (right edge ${Math.round(r.right)}px)`);
        if (out.overflow.length >= 8) break;
      }
    }
  }

  const interactive = document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch], [tabindex]:not([tabindex='-1'])");
  for (const el of interactive) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const parentTag = el.parentElement ? el.parentElement.tagName : "";
    if (el.tagName === "A" && cs.display === "inline" && /^(P|LI|SPAN|TD|DD|BLOCKQUOTE|LABEL|SMALL|EM|STRONG)$/.test(parentTag)) continue; // inline text links are exempt (WCAG 2.5.8)
    const r = el.getBoundingClientRect();
    const min = touch ? 44 : 24;
    if (r.width < min || r.height < min) {
      if (r.width < 24 || r.height < 24 || touch) out.smallTargets.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    if ((el.tagName === "BUTTON" || el.getAttribute("role") === "button" || /btn|button/i.test(el.className || "")) && (el.innerText || "").trim().length && (el.innerText || "").trim().length < 40) {
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      const textH = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (textH > lh * 1.8) out.wrappedButtons.push(describe(el));
    }
  }

  for (const img of document.images) {
    if (!visible(img)) continue;
    if (!img.hasAttribute("alt")) out.imgNoAlt.push(img.currentSrc || img.src);
    if (img.complete && img.naturalWidth === 0) out.brokenImages.push(img.currentSrc || img.src);
    const r = img.getBoundingClientRect();
    if (img.naturalWidth > 0 && r.width > 0 && img.naturalWidth > r.width * window.devicePixelRatio * 2.5 && img.naturalWidth > 600) out.oversizedImages.push(`${(img.currentSrc || img.src).slice(0, 100)} (${img.naturalWidth}px shown at ${Math.round(r.width)}px)`);
  }
  out.h1 = document.querySelectorAll("h1").length;
  const fams = new Set();
  for (const sel of ["body", "h1", "h2", "button", "p"]) { const el = document.querySelector(sel); if (el) fams.add(getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim()); }
  out.fonts = [...fams];
  out.wc = window.__wc || null;
  out.docHeight = document.documentElement.scrollHeight;
  return out;
}

async function focusAudit(page) {
  const results = [];
  for (let i = 0; i < 8 && results.length < 6; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (el.dataset.wcFocusSeen) return { repeat: true };
      el.dataset.wcFocusSeen = "1";
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow && cs.boxShadow !== "none";
      const r = el.getBoundingClientRect();
      const inView = r.bottom > 0 && r.top < innerHeight;
      let label = el.tagName.toLowerCase();
      const t = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30);
      if (t) label += ` "${t}"`;
      return { label, visibleIndicator: outline || shadow, inView };
    });
    if (info && info.repeat) break; // focus wrapped around
    if (info) results.push(info);
  }
  return results;
}

async function main() {
  const pw = await loadPlaywright();
  if (!pw) {
    console.error("Playwright is not installed. Install it in the project (dev dependency) and a browser:\n  npm i -D playwright && npx playwright install chromium\nOr point PLAYWRIGHT_MODULE at an existing playwright-core and keep Google Chrome installed.\nWithout it, check these viewports manually: " + opts.widths.join(", ") + " px.");
    process.exitCode = 1;
    return;
  }
  let browser;
  try { browser = await launch(pw); } catch (e) {
    console.error(`Could not start a browser: ${e.message.split("\n")[0]}\nRun: npx playwright install chromium   (or install Google Chrome)`);
    process.exitCode = 1;
    return;
  }

  const base = new URL(opts.url);
  const targets = [base.toString(), ...opts.pages.map((p) => new URL(p, base).toString())];
  const outDir = path.resolve(opts.out || fs.mkdtempSync(path.join(os.tmpdir(), "web-checkup-shots-")));
  fs.mkdirSync(outDir, { recursive: true });
  const report = { outDir, pages: [] };

  for (const target of targets) {
    const slug = (new URL(target).pathname.replace(/\/+$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home").slice(0, 60);
    const pageReport = { url: target, viewports: [] };
    const runs = opts.widths.map((w) => ({ width: w, dark: false }));
    if (opts.dark) runs.push({ width: Math.max(...opts.widths), dark: true });

    for (const run of runs) {
      const touch = run.width < 1100;
      const height = run.width < 600 ? 812 : run.width < 1100 ? 1024 : 900;
      const context = await browser.newContext({
        viewport: { width: run.width, height },
        deviceScaleFactor: run.width < 600 ? 2 : 1,
        isMobile: run.width < 600,
        hasTouch: touch,
        colorScheme: run.dark ? "dark" : "light",
      });
      await context.addInitScript(INIT_SCRIPT);
      const page = await context.newPage();
      const consoleErrors = [];
      const failed = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
      page.on("pageerror", (e) => consoleErrors.push(`Uncaught: ${String(e.message).slice(0, 200)}`));
      page.on("requestfailed", (r) => failed.push(`${r.failure() ? r.failure().errorText : "failed"} ${r.url().slice(0, 120)}`));
      page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 120)}`); });

      const v = { width: run.width, height, dark: run.dark, issues: [] };
      let status = null;
      try {
        const resp = await page.goto(target, { waitUntil: "load", timeout: 45000 });
        status = resp ? resp.status() : null;
        await page.waitForTimeout(opts.wait);
      } catch (e) {
        v.issues.push({ severity: "high", id: "visual.load-failed", message: `Page did not load: ${e.message.split("\n")[0]}` });
      }
      v.status = status;
      if (status && status >= 400) v.issues.push({ severity: "high", id: "visual.http-status", message: `HTTP ${status}` });

      let data = null;
      try { data = await page.evaluate(inspect, touch); } catch (e) { v.issues.push({ severity: "medium", id: "visual.inspect-failed", message: e.message.split("\n")[0] }); }

      const file = path.join(outDir, `${slug}-${run.width}${run.dark ? "-dark" : ""}.png`);
      try {
        if (opts.full && data && data.docHeight > 8000) {
          await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width: run.width, height: 8000 } });
          v.note = `Page is ${data.docHeight}px tall; screenshot clipped to the first 8000px.`;
        } else {
          await page.screenshot({ path: file, fullPage: opts.full });
        }
        v.screenshot = file;
      } catch (e) { v.issues.push({ severity: "low", id: "visual.screenshot-failed", message: e.message.split("\n")[0] }); }

      if (data) {
        v.fonts = data.fonts;
        v.title = data.title;
        if (data.horizontalScroll) v.issues.push({ severity: "high", id: "visual.horizontal-scroll", message: `Page scrolls sideways by ${data.horizontalScroll}px.`, detail: data.overflow });
        if (data.smallTargets.length) v.issues.push({ severity: touch ? "medium" : "low", id: "visual.small-targets", message: `${data.smallTargets.length} tap targets smaller than ${touch ? "44" : "24"}px.`, detail: data.smallTargets.slice(0, 8) });
        if (data.wrappedButtons.length) v.issues.push({ severity: "medium", id: "visual.button-wraps", message: `${data.wrappedButtons.length} button labels wrap onto several lines.`, detail: data.wrappedButtons.slice(0, 6) });
        if (data.imgNoAlt.length) v.issues.push({ severity: "medium", id: "visual.img-no-alt", message: `${data.imgNoAlt.length} visible images without alt.`, detail: data.imgNoAlt.slice(0, 5) });
        if (data.brokenImages.length) v.issues.push({ severity: "high", id: "visual.broken-images", message: `${data.brokenImages.length} broken images.`, detail: data.brokenImages.slice(0, 5) });
        if (data.oversizedImages.length) v.issues.push({ severity: "low", id: "visual.oversized-images", message: `${data.oversizedImages.length} images much larger than displayed (wasted bytes).`, detail: data.oversizedImages.slice(0, 5) });
        if (data.h1 === 0) v.issues.push({ severity: "low", id: "visual.no-h1", message: "No <h1> on the rendered page." });
        if (data.wc) {
          v.cls = Number(data.wc.cls.toFixed(3));
          v.lcpMs = data.wc.lcp ? Math.round(data.wc.lcp) : null;
          v.lcpElement = data.wc.lcpEl;
          if (data.wc.cls > 0.1) v.issues.push({ severity: data.wc.cls > 0.25 ? "high" : "medium", id: "visual.layout-shift", message: `Layout shift during load: CLS ${data.wc.cls.toFixed(3)} (good is 0.1 or less).` });
        }
      }
      if (consoleErrors.length) v.issues.push({ severity: "medium", id: "visual.console-errors", message: `${consoleErrors.length} console errors.`, detail: [...new Set(consoleErrors)].slice(0, 5) });
      if (failed.length) v.issues.push({ severity: "medium", id: "visual.failed-requests", message: `${failed.length} failed requests.`, detail: [...new Set(failed)].slice(0, 5) });

      if (!touch && !run.dark && run.width === Math.max(...opts.widths.filter((w) => w >= 1100), 0)) {
        try {
          const stops = await focusAudit(page);
          v.focus = stops;
          const invisible = stops.filter((s) => !s.visibleIndicator);
          if (!stops.length) v.issues.push({ severity: "medium", id: "visual.no-tab-stops", message: "Tab key reached no interactive element." });
          else if (invisible.length) v.issues.push({ severity: "high", id: "visual.focus-invisible", message: `${invisible.length} of the first ${stops.length} tab stops show no visible focus indicator.`, detail: invisible.map((s) => s.label) });
        } catch { /* ignore */ }
      }
      pageReport.viewports.push(v);
      await context.close();
    }
    report.pages.push(pageReport);
  }
  await browser.close();

  if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }
  const tty = process.stdout.isTTY && !process.env.NO_COLOR;
  const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
  const label = { high: c("31;1", "HIGH  "), medium: c("33;1", "MEDIUM"), low: c("36", "LOW   ") };
  console.log(c("1", "Web Checkup visual-check") + `  screenshots: ${outDir}`);
  console.log(c("2", "Open and read every screenshot: these checks catch mechanics, not taste. LCP and CLS here are unthrottled local measurements."));
  for (const p of report.pages) {
    console.log(`\n${c("1", p.url)}`);
    for (const v of p.viewports) {
      const meta = [v.status ? `HTTP ${v.status}` : null, v.lcpMs != null ? `LCP ${v.lcpMs}ms${v.lcpElement ? ` (${v.lcpElement})` : ""}` : null, v.cls != null ? `CLS ${v.cls}` : null, v.fonts ? `fonts: ${v.fonts.join(", ")}` : null].filter(Boolean).join("  ");
      console.log(`  ${c("1", `${v.width}px${v.dark ? " dark" : ""}`)}  ${v.screenshot || "(no screenshot)"}`);
      console.log(`    ${c("2", meta)}`);
      if (v.note) console.log(`    ${c("2", v.note)}`);
      if (!v.issues.length) console.log(`    ${c("2", "no issues detected")}`);
      for (const i of v.issues) {
        console.log(`    ${label[i.severity]} ${c("2", i.id)}  ${i.message}`);
        if (i.detail) for (const d of [].concat(i.detail)) console.log(`             ${c("2", d)}`);
      }
    }
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
