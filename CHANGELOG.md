# Changelog

## 1.0.1 (2026-10-12)

Ready for Anthropic's plugin directory.

- `check-url.mjs` no longer reads an API key from the environment. Pass an optional PageSpeed Insights key with `--psi-key`.
- Plugin icon (`.claude-plugin/icon.png`), `displayName` and `version` in `plugin.json`.
- README section on privacy and network use; the skill falls back to manual checks where scripts cannot run.

## 1.0.0 (2026-10-12)

First public release.

- One `web-checkup` skill with ten commands: build, redesign, design, audit, security, perf, seo, a11y, brand, ship.
- 23 focused references covering design direction, an AI-tell catalog, typography, color, layout, motion, components and states, UX and copy, conversion, brand and assets, responsive, WCAG 2.2, performance, security (checklist, stack playbooks, deployment hardening), SEO, AI-search visibility, code quality, privacy, AI product patterns, audit method and a launch gate.
- `scan.mjs`: zero-dependency static scanner with an AI-template score.
- `check-url.mjs`: live-site checks with optional PageSpeed Insights field data.
- `visual-check.mjs`: multi-viewport screenshots and rendered-page checks through Playwright.
- Claude Code plugin marketplace, `npx skills` support, install script, CI.
- Before/after example (`examples/bakery`): the same prompt with and without the skill.
- Scanner detects template palettes by color family (not only exact hex values), counts tracked-uppercase label classes by usage, and flags hand-drawn inline SVG illustrations. `visual-check.mjs` measures real text wrapping for button labels.
