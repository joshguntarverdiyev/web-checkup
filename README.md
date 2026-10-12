# Web Checkup

**One agent skill that makes AI-built websites ready to ship.** It fixes the weak spots every vibe coder hits: template-looking design, missing states, broken mobile layouts, leaked API keys, open databases, slow pages, invisible SEO and blank link previews.

[![CI](https://github.com/joshguntarverdiyev/web-checkup/actions/workflows/ci.yml/badge.svg)](https://github.com/joshguntarverdiyev/web-checkup/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-0F766E.svg)](https://agentskills.io)

Works with Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode and any agent that supports the open [Agent Skills](https://agentskills.io) format.

## See the difference

Same prompt, same model (Claude Opus 5.5), one run each, nothing cherry-picked: *"Build a one-page website for Crumb & Co., a small neighborhood sourdough bakery in Lisbon... Make it ready to launch."*

![The same bakery page built without and with Web Checkup](docs/images/bakery-desktop.jpg)

Without the skill you get the default "artisan" template: cream canvas, clay accent, tracked uppercase labels, a hand-drawn bread illustration, a stats row. With it, the page is built around the subject (an "oven board" of real bake times, Lisbon azulejo blue), shows its actions immediately on phones, has link previews, and was checked in a real browser before it was handed over.

<details>
<summary>Mobile comparison and full results</summary>

![The same bakery page on a phone, without and with Web Checkup](docs/images/bakery-mobile.jpg)

| | Without | With Web Checkup |
| --- | --- | --- |
| AI-template score | 11 (High) | 0 (Low) |
| Tap targets under 44 px on a phone | 14 | 0 |
| Link preview image | Missing | Present |
| Checked its own rendered output | No | Yes |

Plain Claude already handled structured data, focus styles and reduced motion. Method, both HTML files and full-page screenshots: [examples/bakery](examples/bakery/).

</details>

## Why

Without guidance, AI assistants produce the statistical average of everything they were trained on:

| What the AI does by default | What Web Checkup makes it do instead |
| --- | --- |
| Purple gradients, three icon cards, "Supercharge your workflow" | Reads the brief, commits to a design direction from the product's own world, and removes 50+ known template tells |
| Shows only the happy path | Builds and checks loading, empty, error, success and disabled states |
| Breaks on phones and tablets | Checks 320 px through 1440 px, tablets included, with screenshots |
| Puts `sk_live_...` or a Supabase service key in the browser, leaves database rules open | Finds leaked secrets, open RLS and Firebase rules, routes without auth, client-trusted prices, unverified webhooks |
| Ships unmeasured, heavy pages | Measures Core Web Vitals (lab and real users) and fixes LCP, INP and CLS |
| `<title>Vite + React</title>`, default favicon, blank link previews | Sets titles, descriptions, canonicals, Open Graph images, favicons, sitemap, robots.txt and structured data |
| Ignores keyboard and screen-reader users | Checks against WCAG 2.2 AA |
| "Looks done" | Verifies the rendered result and gives an honest Ready / Not ready verdict |

## What it covers

- **Design and anti-template:** design direction, typography, color and dark mode, layout, motion, an AI-tell catalog with a score
- **UX and copy:** flows, states, forms, microcopy, conversion for landing, pricing and ecommerce pages
- **Brand and assets:** logo concepts, favicon set, Open Graph images, icon systems, imagery
- **Responsive:** phone, tablet and wide-screen rules and checks
- **Accessibility:** the WCAG 2.2 AA checklist, keyboard and screen-reader passes
- **Security:** a checklist of the 20 most common issues in vibe-coded apps, fix patterns for Next.js, Supabase, Firebase, Convex, Stripe and LLM features, headers, CSP and deployment hardening
- **Performance:** a measure-first workflow, Core Web Vitals, budgets, images, fonts, JavaScript, caching
- **SEO and discoverability:** technical SEO, metadata, structured data, Search Console, and visibility in ChatGPT, Perplexity and Google AI answers
- **Code quality:** guardrails and cleanup for AI-generated code
- **Privacy:** privacy policy, cookie consent, analytics, forms
- **Launch gate:** a go / no-go checklist

## Install

**Any agent, recommended** (uses the [skills CLI](https://github.com/vercel-labs/skills)):

```bash
npx skills add joshguntarverdiyev/web-checkup
```

Add `-g` to install for every project, or `-a claude-code` (or `codex`, `cursor`, ...) to choose the agent.

**Claude Code plugin:**

```text
/plugin marketplace add joshguntarverdiyev/web-checkup
/plugin install web-checkup@web-checkup
```

**Manual:** download the repository and copy one folder into your agent's skills folder:

```bash
git clone --depth 1 https://github.com/joshguntarverdiyev/web-checkup.git
cp -R web-checkup/skills/web-checkup ~/.claude/skills/    # Claude Code
cp -R web-checkup/skills/web-checkup ~/.codex/skills/     # Codex
```

## Use it

Just ask in plain language and the skill triggers on its own:

- "Audit my site before launch."
- "Why does my landing page look generic?"
- "Is my Supabase setup safe?"
- "Make this work on tablets."
- "Improve my SEO and link previews."

Or call it directly. In Claude Code, type `/web-checkup` (as a plugin: `/web-checkup:web-checkup`). In Codex, use `$web-checkup`.

| Command | What happens |
| --- | --- |
| `/web-checkup build <brief>` | Builds a new page or site with a committed design direction, every state, and security, performance and SEO built in |
| `/web-checkup redesign` | Audits first, decides whether to preserve or overhaul, then redesigns without silently changing facts or URLs |
| `/web-checkup design` | Anti-template pass on typography, color, layout, motion, copy and assets |
| `/web-checkup audit` | Scored report across every area with evidence and a fix order |
| `/web-checkup security` | Security review and fixes |
| `/web-checkup perf` | Core Web Vitals measurement and fixes |
| `/web-checkup seo` | SEO, metadata, structured data, AI-search visibility |
| `/web-checkup a11y` | WCAG 2.2 AA review and fixes |
| `/web-checkup brand` | Logo, favicon, OG images, icons, imagery |
| `/web-checkup ship` | Launch gate: Ready, Ready with fixes, or Not ready |

## How it works day to day

**Install once, then forget about it.** You do not type a command every time.

1. **At startup** your agent reads only the skill's short description (about 100 tokens), so it costs almost nothing when you are not using it.
2. **When your request matches** (building a page, "make this responsive", "is this secure?", "check my SEO", "ready to launch?"), the agent loads Web Checkup by itself and follows it, reading only the reference files that task needs.
3. **Commands are optional shortcuts** for when you want a specific mode or the agent did not pick it up from a vague request.

A typical project:

| Stage | What you say | What happens |
| --- | --- | --- |
| Start a site | "Build a landing page for my bakery" | Design read, concept, real content, all states, SEO and security built in |
| While building | Normal requests | The quality floor is applied as you go |
| Before launch | `/web-checkup ship` | Go or no-go with the smallest fix list |
| After deploying | "Check my live site https://..." | Headers, exposed files, SEO tags, PageSpeed |

## Updating

| Installed with | Update command |
| --- | --- |
| `npx skills` | `npx skills update web-checkup` (add `-g` if installed globally) |
| Claude Code plugin | `/plugin marketplace update web-checkup`, or turn on auto-update in `/plugin` > Marketplaces > web-checkup |
| Manual copy | `git pull` in the downloaded folder, then copy `skills/web-checkup` again |

## Built-in tools

Three zero-dependency Node scripts (Node 18+). The agent runs them for evidence, and you can run them yourself.

```bash
SKILL=~/.claude/skills/web-checkup   # or wherever the skill is installed

# Static scan of a project: secrets, database rules, auth gaps, SEO, a11y, perf, AI-template score
node $SKILL/scripts/scan.mjs .

# Live site: headers, HTTPS, cookies, exposed .git/.env/source maps, SEO tags, robots.txt, sitemap, PageSpeed
node $SKILL/scripts/check-url.mjs https://your-site.com --psi

# Screenshots at 375 / 768 / 1024 / 1280 / 1440 px plus overflow, tap targets, focus, layout shift (needs Playwright)
node $SKILL/scripts/visual-check.mjs http://localhost:3000 --pages /pricing,/login
```

Example scanner output on a typical AI-generated Next.js app:

```text
SECURITY  14 high, 10 medium
  HIGH   secret.stripe-live             Stripe live secret or restricted key: sk_l…(36 chars)
  HIGH   supabase.rls-missing           Table "notes" is created in SQL without "enable row level security"
  HIGH   payments.client-price          Payment amount taken from the request. Look prices up on the server
  HIGH   webhook.unverified             Stripe webhook without stripe.webhooks.constructEvent
DESIGN
  AI-template score: 24 (High)
  MEDIUM design.tell  AI-purple / violet / indigo palette (2x)
  MEDIUM design.tell  Placeholder people, brands or lorem ipsum (1x)
```

Use it in CI to block risky merges:

```yaml
- run: node skills/web-checkup/scripts/scan.mjs . --only security --strict
```

## Privacy and network use

[Privacy policy](PRIVACY.md). Web Checkup collects nothing and has no telemetry. The skill is instructions plus three local scripts:

| Script | Reads | Network |
| --- | --- | --- |
| `scan.mjs` | Files in the project you point it at, and `git ls-files`. Secret values are redacted in its output | None. With `--audit` it runs `npm audit`, which sends your dependency list to the npm registry |
| `check-url.mjs` | Nothing local | Ordinary GET requests (about 15 to 25) to the URL you pass, to check headers, files and tags. With `--psi` it sends that URL to Google's PageSpeed Insights API, plus the API key only if you pass one with `--psi-key` |
| `visual-check.mjs` | Nothing local besides locating Playwright | Opens the URL you pass in a local headless browser, which loads that page and its resources |

`scan.mjs` and the tests contain credential variable names (for example `NEXT_PUBLIC_..._SERVICE_ROLE_KEY`) and URL patterns because those are what the scanner searches for; the tests build a deliberately insecure fake app in a temporary folder. None of this code reads your real credentials or sends them anywhere. The security reference files contain example code for your own apps, not code the plugin runs.

Only run the scripts against projects and sites you own or are allowed to test.

## How it was built

Web Checkup combines the strongest ideas from the most-used skills and guidelines for each area, rewritten into one consistent skill with progressive disclosure, so the agent loads only the references a task needs:

| Area | Main sources |
| --- | --- |
| Design | Anthropic `frontend-design`, Impeccable, Taste-Skill, Vercel Web Interface Guidelines |
| Performance, a11y, SEO | Addy Osmani's web-quality-skills, web.dev, Google Search Central, WCAG 2.2 |
| Security | Cloudflare `security-audit`, vibe-security, OWASP Top 10 and LLM Top 10 |
| SEO and AI search | marketingskills (`seo-audit`, `ai-seo`), claude-seo |

The full analysis, including what was adopted, what was rejected and why, is in [docs/RESEARCH.md](docs/RESEARCH.md). Licenses and attributions are in [CREDITS.md](CREDITS.md).

## Honest limits

- Script output is a set of leads, not verdicts. The skill tells the agent to confirm each one before reporting it.
- It is not a penetration test. For a full adversarial audit, also use Cloudflare's `security-audit` skill. Only test sites you own.
- No tool can guarantee a number-one Google ranking. Web Checkup makes pages crawlable, fast, clear and correctly marked up. Content and reputation do the rest.
- Privacy guidance is practical engineering, not legal advice.

## Contributing

Issues and pull requests are welcome, especially new AI tells with real examples, false-positive reports for the scanner, and stack-specific security patterns. See [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm test` and `npm run validate` before opening a pull request.

## License

[MIT](LICENSE) © 2026 Joshgun Tarverdiyev
