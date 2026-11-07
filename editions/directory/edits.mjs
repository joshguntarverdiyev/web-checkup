// Text changes that turn the full skill into the Claude plugin directory edition, which ships
// without scripts. Each [from, to] pair must match exactly once, so the build fails loudly when
// the source text changes and an edit here needs updating.

const OWN_TOOLS = "[Checking with your own tools](#checking-with-your-own-tools)";

const SKILL_SCRIPTS_SECTION = `## Scripts

Scripts live in this skill's directory (the folder containing this \`SKILL.md\`). Run them with the user's project as the working directory. They need Node 18+ and have no dependencies, except \`visual-check.mjs\`, which needs Playwright.

| Script | Use |
| --- | --- |
| \`node <skill-dir>/scripts/scan.mjs [dir] [--only security,design,seo,a11y,responsive,perf,code] [--json]\` | Static signals: leaked secrets, client-exposed env vars, open Supabase or Firebase rules, routes without auth, unsafe sinks, missing metadata and icons, AI-template tells with a score, accessibility, responsive and performance smells, code hygiene |
| \`node <skill-dir>/scripts/check-url.mjs <url> [--psi]\` | A deployed site: security headers, HTTPS redirect, cookie flags, exposed \`.git\`, \`.env\` and source maps, title, description, canonical, OG image, \`robots.txt\`, AI crawler access, sitemap, soft 404s, and with \`--psi\` PageSpeed scores plus real-user Core Web Vitals (if the shared quota is exhausted, ask the user for a key and pass it with \`--psi-key\`) |
| \`node <skill-dir>/scripts/visual-check.mjs <url> [--pages /pricing,/login] [--dark]\` | Full-page screenshots at 375, 768, 1024, 1280 and 1440 px, sideways scroll with the offending elements, small tap targets, wrapping button labels, missing alt text, broken or oversized images, layout shift, invisible keyboard focus, console errors and failed requests |

\`visual-check.mjs\` finds Playwright in the project, the global npm root or \`PLAYWRIGHT_MODULE\`. If it is missing, ask before installing it (\`npm i -D playwright && npx playwright install chromium\`) or fall back to the browser tools available to you. Always open the screenshots and look at them; the checks cover mechanics, not taste.

Where scripts cannot run (no Node, no shell, or no network, as in some chat surfaces), do the same checks by reading the code and the references, and say which checks were manual. \`check-url.mjs --psi\` sends the URL to Google PageSpeed Insights; mention that when you use it.

Exit codes: \`0\` means the run finished, \`1\` means bad usage or the target could not be loaded. Pass \`--strict\` to \`scan.mjs\` or \`check-url.mjs\` to exit \`2\` when high-severity signals exist, for CI use.
`;

const SKILL_OWN_TOOLS_SECTION = `## Checking with your own tools

This skill has no scripts. Gather evidence with the tools you already have, and say in the report which checks you ran and which were manual.

| Check | How |
| --- | --- |
| Static review of the project | Search the source for the signatures in each area's reference: secrets, client-exposed env prefixes, open database rules, routes without auth and unsafe sinks ([security.md](references/security.md)); titles, descriptions, canonicals, Open Graph images, icons, \`robots.txt\` and sitemap ([seo.md](references/seo.md)); AI-template tells and their score ([ai-tells.md](references/ai-tells.md#audit-procedure)); accessibility, responsive, performance and code smells (their references). Then run the project's own \`typecheck\`, \`lint\`, \`test\` and \`build\`. |
| Rendered pages | Use a browser tool if one is available, or Playwright if the project already has it; ask before installing anything. Take full-page screenshots at 375, 768, 1024, 1280 and 1440 px. Check for sideways scroll (\`document.documentElement.scrollWidth > innerWidth\`), tap targets under 44 px, wrapping button labels, missing alt text, broken or oversized images, layout shift, invisible keyboard focus, console errors and failed requests. |
| A deployed site | \`curl -sI <url>\` for security headers and cookie flags, and the same on the \`http://\` address for the HTTPS redirect. \`/.git/HEAD\`, \`/.env\` and source maps must return 404. Read the page HTML for title, description, canonical and Open Graph tags, fetch \`/robots.txt\` and \`/sitemap.xml\`, and request a made-up path to catch soft 404s. For Core Web Vitals, use PageSpeed Insights ([performance.md](references/performance.md#measure)); it receives the URL, so mention that when you use it. |

Always open the screenshots and look at them; mechanical checks cover mechanics, not taste. Where a tool is missing (no shell, no browser or no network, as in some chat surfaces), do the check by reading the code and the references.
`;

export default {
  "skills/web-checkup/SKILL.md": [
    [
      "5. **Verify.** Run `scan.mjs` on the project and `visual-check.mjs` on the running app, then read the screenshots yourself.",
      `5. **Verify.** Run the static review on the project and the rendered checks on the running app (${OWN_TOOLS}), then read the screenshots yourself.`,
    ],
    [
      "2. Gather evidence: `node <skill-dir>/scripts/scan.mjs .`, then `check-url.mjs <url> --psi` if deployed, then `visual-check.mjs <url>`, then the project's own `typecheck`, `lint`, `test` and `build`.",
      `2. Gather evidence (${OWN_TOOLS}): the static review, then the deployed-site checks if deployed, then the rendered checks, then the project's own \`typecheck\`, \`lint\`, \`test\` and \`build\`.`,
    ],
    [
      "3. Verify each script signal in source or in the browser before reporting it. Signals are leads, not verdicts.",
      "3. Confirm each search match or tool signal in source or in the browser before reporting it. Signals are leads, not verdicts.",
    ],
    [SKILL_SCRIPTS_SECTION, SKILL_OWN_TOOLS_SECTION],
  ],

  "skills/web-checkup/references/accessibility.md": [
    [
      "`scan.mjs --only a11y` covers static source smells.",
      "A source search for missing `alt`, unlabeled inputs, `outline: none` and click handlers on non-buttons covers static smells.",
    ],
  ],

  "skills/web-checkup/references/ai-tells.md": [
    [
      "Each tell lists a detection signature where one exists. `scan.mjs --only design` finds many of them.",
      "Each tell lists a detection signature where one exists. Search the source for them.",
    ],
    [
      "1. **Scan:** run `node <skill-dir>/scripts/scan.mjs . --only design`.",
      "1. **Scan:** search the source for the signatures in the catalog above.",
    ],
    [
      "screenshot the key pages at 375 and 1440 px (`visual-check.mjs`).",
      "screenshot the key pages at 375 and 1440 px with a browser tool.",
    ],
  ],

  "skills/web-checkup/references/audit-and-reporting.md": [
    [
      "1. `node <skill-dir>/scripts/scan.mjs .` for static signals across all areas.",
      "1. A static review of the source: search for the signatures in each area's reference (see \"Checking with your own tools\" in SKILL.md).",
    ],
    [
      "3. With a running app: `node <skill-dir>/scripts/visual-check.mjs <url>`.",
      "3. With a running app: full-page screenshots at 375, 768, 1024, 1280 and 1440 px with a browser tool.",
    ],
    [
      "4. With a deployed URL: `node <skill-dir>/scripts/check-url.mjs <url> --psi`.",
      "4. With a deployed URL: headers, redirects, exposed files and tags with `curl`, plus PageSpeed Insights.",
    ],
    [
      "Script output is a lead, not a finding.",
      "Search and tool output is a lead, not a finding.",
    ],
  ],

  "skills/web-checkup/references/deployment-hardening.md": [
    [
      "To check a live site, run the skill's `check-url.mjs` script with the site's address (see the Scripts section of SKILL.md).",
      "To check a live site, see \"Checking with your own tools\" in SKILL.md.",
    ],
    [
      "`check-url.mjs` tests these.",
      "Request each one with `curl -sI` to confirm.",
    ],
    [
      "observed header values from `check-url.mjs`;",
      "observed header values from `curl -sI`;",
    ],
  ],

  "skills/web-checkup/references/launch-checklist.md": [
    ["(`scan.mjs`, `gitleaks`)", "(a source search, `gitleaks`)"],
    ["source maps or stack traces (`check-url.mjs`)", "source maps or stack traces (request each with `curl -sI`)"],
  ],

  "skills/web-checkup/references/performance.md": [
    [
      "- `node <skill-dir>/scripts/check-url.mjs <url> --psi` returns PageSpeed Insights lab results plus CrUX field data when Google has enough traffic for the URL or origin.",
      "- PageSpeed Insights (pagespeed.web.dev, or its API at `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile`) returns lab results plus CrUX field data when Google has enough traffic for the URL or origin. It sends the URL to Google, so say so when you use it. If the shared API quota is exhausted, ask the user to run it on pagespeed.web.dev.",
    ],
    [
      "`scan.mjs` flags images over 500 KB in `public/` and `static/`.",
      "List images over 500 KB in `public/` and `static/` (for example `find public static -size +500k`).",
    ],
  ],

  "skills/web-checkup/references/responsive.md": [
    [
      "`visual-check.mjs` captures 375, 768, 1024, 1280 and 1440 by default.",
      "At minimum, capture 375, 768, 1024, 1280 and 1440.",
    ],
  ],

  "skills/web-checkup/references/security.md": [
    [
      "Run `node <skill-dir>/scripts/scan.mjs . --only security` for leads, then confirm each one in source.",
      "Search the source for each row's signals to get leads, then confirm each one in source.",
    ],
    [
      "| `scan.mjs`; `git log -p` for history; `gitleaks detect` |",
      "| Search for key prefixes and those env prefixes; `git log -p` for history; `gitleaks detect` |",
    ],
    ["| `scan.mjs` sinks |", "| Search for those sinks |"],
    ["| `check-url.mjs`, build config |", "| `curl -sI` on those paths, build config |"],
    ["| `check-url.mjs`, host config |", "| `curl -sI <url>`, host config |"],
    [
      "| Deployed headers and TLS | `check-url.mjs`, MDN HTTP Observatory, SSL Labs |",
      "| Deployed headers and TLS | `curl -sI <url>`, MDN HTTP Observatory, SSL Labs |",
    ],
  ],

  "skills/web-checkup/references/seo.md": [
    [
      "1. Run `node <skill-dir>/scripts/scan.mjs . --only seo` on the source and `check-url.mjs <url>` on the deployed site.",
      "1. Search the source for the items in the checklist below, and fetch the deployed site's HTML, headers, `robots.txt` and `sitemap.xml`.",
    ],
    [
      "No `noindex` or `Disallow: /` in production (`check-url.mjs`)",
      "No `noindex` or `Disallow: /` in production (check the live HTML, the `X-Robots-Tag` header and `robots.txt`)",
    ],
  ],

  "skills/web-checkup/references/typography.md": [
    [
      "(check with `visual-check.mjs` or the DevTools Performance panel)",
      "(check with the DevTools Performance panel)",
    ],
  ],
};
