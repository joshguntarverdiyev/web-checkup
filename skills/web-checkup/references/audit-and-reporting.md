# Audit Method and Reporting

Use this file for any audit, review, scorecard, teardown or launch review. An audit is only useful when its findings are traceable to evidence and ordered by impact.

## 1. Define before reviewing

State these up front:

- **Scope:** routes, components, flows or files reviewed, and the areas covered (design, UX, responsive, accessibility, performance, security, SEO, code, privacy).
- **Environment:** code only, local dev, preview or production URL. Include the date when reviewing a live site.
- **Primary path:** the user flow that matters most.
- **Exclusions and constraints:** areas not reviewed; missing credentials, test data, browser access or network.

Do not assume production behavior from local code unless the deployment configuration confirms it.

## 2. Gather evidence

Run what is available, in this order:

1. `node <skill-dir>/scripts/scan.mjs .` for static signals across all areas.
2. The project's own `typecheck`, `lint`, `test` and `build` scripts.
3. With a running app: `node <skill-dir>/scripts/visual-check.mjs <url>`. Read every screenshot, then walk the primary flow by keyboard and at 375 px.
4. With a deployed URL: `node <skill-dir>/scripts/check-url.mjs <url> --psi`.
5. Optional deeper tools: Lighthouse, `npx @axe-core/cli <url>`, `npm audit`, `gitleaks`, `semgrep`.

Script output is a lead, not a finding. Confirm each signal in source or in the browser, and discard false positives.

## 3. Label evidence

| Label | Meaning |
| --- | --- |
| Observed | Seen in a screenshot, browser behavior, console, command output or measurement |
| Source | Directly supported by file, line or config |
| Inferred | Likely impact reasoned from code or design patterns |
| Unverified | Plausible, but needs a named check to confirm |

High-severity findings should be observed or source-backed. Keep fact, interpretation and recommendation separate:

- **Fact:** "At 390 px the pricing CTA wraps to three lines and overlaps the price (screenshot 390-pricing.png)."
- **Interpretation:** "Mobile visitors will struggle to compare plans."
- **Recommendation:** "Stack plans in one column below 768 px and shorten the CTA to 'Start trial'."

## 4. Severity

| Level | Definition | Examples |
| --- | --- | --- |
| P0 Blocker | Prevents the primary task, exposes data or money, or breaks the law outright | Confirmed critical or high security issue, broken checkout or signup, live secret exposed, keyboard users cannot complete the core flow, site `noindex` in production |
| P1 Major | Fix before launch | Mobile layout broken on key pages, missing error states on core forms, LCP over 4 s, contrast failures on primary text, missing security headers on an authenticated app, no OG or meta on key pages |
| P2 Minor | Fix in the next pass | Inconsistent spacing, secondary pages missing schema, small targets on secondary controls, medium dependency issues |
| P3 Polish | Nice to have | Optical alignment, copy refinements, micro-interactions |

Too many P3 items buries the signal. List the top ones and summarize the rest.

## 5. Scorecard

Score each area 0 to 10 only when evidence supports it, and tie every low score to specific findings.

| Score | Meaning |
| --- | --- |
| 9 to 10 | Production-strong. Only refinements remain |
| 7 to 8 | Solid. A few visible gaps |
| 5 to 6 | Usable but inconsistent. Important gaps |
| 3 to 4 | Risky. Major flow, mobile, accessibility, security or trust problems |
| 0 to 2 | Not launchable. Core experience broken or absent |

Areas: Design distinctiveness, UX and states, Responsive, Accessibility, Performance, Security, SEO and sharing, Code quality, Privacy and legal. Do not average them into one number unless asked. A single P0 makes the verdict "Not ready" regardless of the scores. If evidence is incomplete, lower your confidence instead of inventing precision.

## 6. Verification protocol (rendered UI)

- **Viewports:** 375, 768, 1024, 1280 and 1440 at minimum. Add 320 for reflow.
- **Visual:** clipping, overlap, broken crops, misalignment, sticky elements covering content, blank sections, excessive empty space, layout shift during load, template tells visible only when rendered.
- **Functional:** navigation, forms (valid, invalid, slow, failed), search and filters, menus, dialogs, loading, empty, error and success states, double-submit, console errors, failed network requests.
- **Accessibility:** keyboard path, focus visibility, labels, alt text, contrast, reduced motion.
- **Performance smoke check:** build warnings, large assets, font behavior, layout shift, JavaScript weight on simple pages.
- **AI features:** stop, retry, edit, partial output, failure recovery.

After fixing significant issues, re-check the affected routes. Never report something fixed just because the code changed.

## 7. Independent review (high stakes)

For launch, security or payment audits, re-check the top findings from scratch: re-run the commands, re-open the files, confirm severity, and look for blockers on the primary path that the first pass missed. Use a fresh context or a separate reviewer agent when available and worth the cost.

## 8. Report

Choose the shape that fits the request:

- **Quick teardown:** 5 to 10 bullets, ordered by severity.
- **Scorecard:** area scores and the top fixes.
- **Developer audit:** file paths, commands, diffs. Use [assets/report-template.md](../assets/report-template.md).
- **Executive summary:** plain language, business impact, launch call.

Each finding: severity, area, evidence (file:line, screenshot or command output), impact, fix, and status (fixed and verified, or recommended).

Always end with: the verdict (Ready, Ready with fixes, or Not ready), the top three fixes, what was verified, and what remains unverified with the next check to run.

If there is little evidence (no app to run, no URL), call it a heuristic review rather than an audit.

Tone: direct and constructive. Credit what works, so it survives the fixes.
