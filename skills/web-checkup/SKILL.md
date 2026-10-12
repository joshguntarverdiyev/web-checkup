---
name: web-checkup
description: Design, build, audit, and harden websites and web apps so they ship distinctive, secure, fast, accessible, and discoverable instead of looking AI-template generated. Use when creating or redesigning a landing page, SaaS UI, dashboard, portfolio, docs or ecommerce site; when a UI looks generic or "AI-made"; for UX/UI review, mobile and tablet responsiveness, accessibility, security audits (secrets, auth, database rules, headers), performance and Core Web Vitals, SEO, metadata, Open Graph, structured data, AI-search visibility, logo/favicon/icon/asset work, code quality, privacy compliance, or a pre-launch check. Also use when the user asks "is this ready to ship?", "is this safe?", "why does this look generic?", or "audit my site". Not for backend-only work with no web surface, and not for live penetration testing of systems the user does not own.
license: MIT
metadata:
  author: Joshgun Tarverdiyev
  version: "1.0.3"
  argument-hint: "[build | redesign | audit | design | security | perf | seo | a11y | brand | ship] [path-or-url]"
---

# Web Checkup

AI coding assistants drift to the statistical median of their training data. Left alone they produce the same hero, palette, fonts, card grids and copy; only the happy path; secrets in the client bundle and database rules left open; unmeasured performance; blank link previews and the framework's default favicon. This skill replaces those defaults with deliberate decisions and verifies the result before anything is called done.

## Commands

Pick the mode from the user's words. An explicit argument wins.

| Invocation | Mode | Outcome |
| --- | --- | --- |
| `build <brief>` | Build | New site, page or feature with a committed design direction, every state and the quality floor built in |
| `redesign [target]` | Redesign | Audit first, then decide whether to preserve or overhaul, then rebuild without silent fact or URL changes |
| `design [target]` | Design polish | Anti-template pass: typography, color, layout, motion, copy, assets |
| `audit [path or url]` | Full audit | Scored report across all areas with evidence, severity and fix order. No edits unless asked |
| `security` / `perf` / `seo` / `a11y` / `brand` | Hardening | Deep pass on one area, fixes applied |
| `ship` | Launch gate | Go or no-go against [launch-checklist.md](references/launch-checklist.md), smallest fix list to reach go |

No argument and an unclear request: state a one-line scope, then run `audit` on the current project.

## Ground rules

1. **Inspect before prescribing.** Read `package.json`, the framework, routes, styling system, design tokens, icon library, auth and database layers and deploy target. Never assume a package exists; check it before importing. Verify any API you are unsure of in the installed version's docs.
2. **The brief wins.** An explicit choice by the user or brand overrides every default and every ban in this skill.
3. **Preserve what works.** Keep the stack, tokens, components, icon family, routes and factual copy. Refinement is not a stealth redesign. Ask before changing claims, prices or URLs.
4. **Evidence over assertion.** Label every finding `confirmed`, `likely`, `hardening` or `unverified`. Never invent metrics, scores, testimonials, logos, CVEs or rankings.
5. **Verify the rendered result.** Take screenshots at 375, 768 and 1280 px (add 1440+ for marketing pages), keep the console clean and exercise the primary flow. If you cannot run the app, say so and list what to check manually.
6. **Fix in impact order:** broken primary flow and security exposure first, then data loss and accessibility blockers, mobile breakage, performance, missing states, visual polish, SEO refinements.
7. **Bounded passes.** Build, inspect once in a batch, fix everything found, re-verify once, stop. No open-ended polishing loops.
8. **Safety.** Test only code and sites the user owns or controls. Do not send attack traffic. Never print full secrets; when one is exposed, recommend rotating it.

## The quality floor

Every mode leaves the product at or above this floor. Details are in the linked references.

**Design** ([ai-tells](references/ai-tells.md), [design-direction](references/design-direction.md))
- A one-line design read and a concept (palette roles, type roles, layout idea, one memorable element) exist before any UI code.
- No cluster of AI-template tells: purple-gradient or cream-and-terracotta defaults, three equal icon cards, an eyebrow above every heading, gradient headline words, fade-up on every section, fake stats, generic copy.
- Real content and real visuals. No `div`-built fake dashboards, no lorem ipsum, no "John Doe" testimonials, no invented customer logos.

**UX and states** ([components-and-states](references/components-and-states.md), [ux-and-copy](references/ux-and-copy.md))
- Loading, empty, error, success, disabled and no-results states are designed, not left to defaults.
- Buttons name their action ("Save changes", not "Submit"). One label per intent across the page.
- Forms keep labels visible, validate on the server, keep input after errors and block double submission.

**Responsive** ([responsive](references/responsive.md))
- Works from 320 px up through tablet (768 to 1024) and 1440+ with no horizontal scroll, clipping or overlap. Uses `100dvh`, not `100vh`, for full-height sections. Inputs are at least 16 px on mobile. Zoom is never disabled.

**Accessibility** ([accessibility](references/accessibility.md))
- WCAG 2.2 AA basics: semantic landmarks and headings, labels, visible `:focus-visible`, keyboard path, contrast 4.5:1 for text and 3:1 for UI, alt text, `prefers-reduced-motion`, targets of at least 24 px (44 px on touch).

**Performance** ([performance](references/performance.md))
- Targets at p75: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. The LCP image is prioritized, images are sized and modern-format, fonts are self-hosted and subset, heavy JS is deferred or split, and there are no layout shifts.

**Security** ([security](references/security.md), [security-playbooks](references/security-playbooks.md), [deployment-hardening](references/deployment-hardening.md))
- No secrets in the repo or behind `NEXT_PUBLIC_` / `VITE_` / `EXPO_PUBLIC_` / `REACT_APP_`. `.env*` is git-ignored.
- Every API route and server action validates input (schema), authenticates, and authorizes ownership. Middleware alone is not authorization.
- Database rules are owner-scoped (Supabase RLS on every table, no `USING (true)`; Firebase rules not `if true`).
- Prices, roles, credits and user IDs never come from the client. Webhooks verify signatures. Auth, AI, email and upload endpoints are rate limited.
- Security headers are set (HSTS, CSP, `X-Content-Type-Options`, `frame-ancestors`, `Referrer-Policy`). No public source maps, `.git` or stack traces.

**SEO and sharing** ([seo](references/seo.md), [ai-search-visibility](references/ai-search-visibility.md), [brand-and-assets](references/brand-and-assets.md))
- Every public route has a unique `<title>`, meta description, canonical, Open Graph and Twitter image and `lang`. There is a `robots.txt` and `sitemap.xml`, no stray `noindex`, and real favicons (never the framework default). Structured data matches visible content.

**Code** ([code-quality](references/code-quality.md))
- Typecheck, lint and build pass. No debug logs, dead code, duplicated components or hallucinated imports. Env vars are validated and documented in `.env.example`.

## Workflows

### Build and redesign
1. **Discover.** Inspect the stack and assets (rule 1). For a redesign, run the `audit` workflow first and decide preserve or overhaul ([design-direction.md](references/design-direction.md#redesign-protocol)).
2. **Design read.** Write one line: "Reading this as: <page kind> for <audience>, <tone>, leaning toward <foundation or aesthetic>." Ask a single question only if two plausible reads would produce materially different designs.
3. **Concept pass.** Fill [assets/design-brief-template.md](assets/design-brief-template.md). Run the genericity test: if swapping the nouns would make the plan fit another product, revise it and say what changed.
4. **Build.** Use real content, every state from the quality floor, and security, performance and SEO patterns from the start, not as a final pass. Load topic references only as needed (see the reference map).
5. **Verify.** Run `scan.mjs` on the project and `visual-check.mjs` on the running app, then read the screenshots yourself. Fix everything in one batch and re-verify once.
6. **Self-critique.** Name the memorable element, what was kept quiet, and which defaults were avoided. Remove one decorative element that does not earn its place.
7. **Report** with the output contract below.

### Audit
1. State scope, environment (code only, local, preview or production) and exclusions ([audit-and-reporting.md](references/audit-and-reporting.md)).
2. Gather evidence: `node <skill-dir>/scripts/scan.mjs .`, then `check-url.mjs <url> --psi` if deployed, then `visual-check.mjs <url>`, then the project's own `typecheck`, `lint`, `test` and `build`.
3. Verify each script signal in source or in the browser before reporting it. Signals are leads, not verdicts.
4. Score each area 0 to 10 with evidence. Order fixes by impact. Use [assets/report-template.md](assets/report-template.md).
5. Stop at the report unless the user asked for fixes.

### Hardening (`security`, `perf`, `seo`, `a11y`, `brand`, `design`)
Load the area's references, measure or scan first, fix in severity order, re-measure under the same conditions, then report before and after values and what remains unverified.

### Ship
Walk [launch-checklist.md](references/launch-checklist.md). Every blocking item gets pass, fail or not verified, with evidence. Verdict: **Ready**, **Ready with fixes** (non-blocking items only) or **Not ready**, plus the smallest set of changes to reach Ready.

## Reference map

Load only what the task needs.

| Task | Read |
| --- | --- |
| New page, site or redesign direction | [design-direction.md](references/design-direction.md), [ai-tells.md](references/ai-tells.md) |
| "Looks generic / AI-made" | [ai-tells.md](references/ai-tells.md) |
| Fonts, type scale, readability | [typography.md](references/typography.md) |
| Palette, tokens, dark mode, contrast | [color-and-theming.md](references/color-and-theming.md) |
| Spacing, grids, hero, section rhythm | [layout-and-composition.md](references/layout-and-composition.md) |
| Animation and transitions | [motion.md](references/motion.md) |
| Buttons, forms, nav, tables, modals, states | [components-and-states.md](references/components-and-states.md) |
| Flows, heuristics, microcopy | [ux-and-copy.md](references/ux-and-copy.md) |
| Landing, pricing, ecommerce conversion | [conversion.md](references/conversion.md) |
| Logo, favicon, OG image, icons, imagery | [brand-and-assets.md](references/brand-and-assets.md) |
| Mobile, tablet, wide screens | [responsive.md](references/responsive.md) |
| WCAG 2.2, keyboard, screen readers | [accessibility.md](references/accessibility.md) |
| Core Web Vitals, bundles, images, fonts | [performance.md](references/performance.md) |
| Security review method and checklist | [security.md](references/security.md) |
| Fix patterns: Next.js, Supabase, Firebase, Stripe, LLM, uploads | [security-playbooks.md](references/security-playbooks.md) |
| Headers, CSP, hosting, DNS, accounts | [deployment-hardening.md](references/deployment-hardening.md) |
| Search ranking, metadata, structured data | [seo.md](references/seo.md) |
| ChatGPT, Perplexity, Google AI visibility, AI crawlers | [ai-search-visibility.md](references/ai-search-visibility.md) |
| Clean, maintainable code | [code-quality.md](references/code-quality.md) |
| Privacy policy, cookies, consent, analytics | [privacy-and-compliance.md](references/privacy-and-compliance.md) |
| Chat, agent and generation UIs | [ai-product-patterns.md](references/ai-product-patterns.md) |
| Audit method, scoring, verification | [audit-and-reporting.md](references/audit-and-reporting.md) |
| Pre-launch gate | [launch-checklist.md](references/launch-checklist.md) |

## Scripts

Scripts live in this skill's directory (the folder containing this `SKILL.md`). Run them with the user's project as the working directory. They need Node 18+ and have no dependencies, except `visual-check.mjs`, which needs Playwright.

| Script | Use |
| --- | --- |
| `node <skill-dir>/scripts/scan.mjs [dir] [--only security,design,seo,a11y,responsive,perf,code] [--json]` | Static signals: leaked secrets, client-exposed env vars, open Supabase or Firebase rules, routes without auth, unsafe sinks, missing metadata and icons, AI-template tells with a score, accessibility, responsive and performance smells, code hygiene |
| `node <skill-dir>/scripts/check-url.mjs <url> [--psi]` | A deployed site: security headers, HTTPS redirect, cookie flags, exposed `.git`, `.env` and source maps, title, description, canonical, OG image, `robots.txt`, AI crawler access, sitemap, soft 404s, and with `--psi` PageSpeed scores plus real-user Core Web Vitals (if the shared quota is exhausted, ask the user for a key and pass it with `--psi-key`) |
| `node <skill-dir>/scripts/visual-check.mjs <url> [--pages /pricing,/login] [--dark]` | Full-page screenshots at 375, 768, 1024, 1280 and 1440 px, sideways scroll with the offending elements, small tap targets, wrapping button labels, missing alt text, broken or oversized images, layout shift, invisible keyboard focus, console errors and failed requests |

`visual-check.mjs` finds Playwright in the project, the global npm root or `PLAYWRIGHT_MODULE`. If it is missing, ask before installing it (`npm i -D playwright && npx playwright install chromium`) or fall back to the browser tools available to you. Always open the screenshots and look at them; the checks cover mechanics, not taste.

Where scripts cannot run (no Node, no shell, or no network, as in some chat surfaces), do the same checks by reading the code and the references, and say which checks were manual. `check-url.mjs --psi` sends the URL to Google PageSpeed Insights; mention that when you use it.

Exit codes: `0` means the run finished, `1` means bad usage or the target could not be loaded. Pass `--strict` to `scan.mjs` or `check-url.mjs` to exit `2` when high-severity signals exist, for CI use.

## Output contract

End every mode with:
- **Verdict** in one line (for audits and ship: Ready, Ready with fixes, or Not ready).
- **What changed**: files and the reason for each.
- **Verified**: the commands run, viewports checked and flows exercised.
- **Not verified**: what could not be checked and how to check it.
- **Next fixes**: at most five, in priority order.

Keep it short. Findings carry file paths and line numbers; recommendations carry the concrete change.
