# Research: How Web Checkup Was Designed

This document records the sources that were analyzed, what each one does best, what Web Checkup adopted, and what it deliberately left out. Star counts are as of 12 October 2026.

## Starting point

The first draft (`web-product-quality`, produced with ChatGPT) had a sensible shape: one router file, five modes and 23 topic references. Its weaknesses:

- **Generic prose.** "Optimize images" and "check security headers" with no thresholds, code or concrete detection signatures. Agents follow concrete rules much better than advice.
- **Thin on the problems vibe coders actually hit:** no Supabase RLS or Firebase rules, no client-side env prefixes, no server-action authorization, no payment or webhook patterns, no LLM-key abuse.
- **No numbers:** no Core Web Vitals thresholds, budgets, WCAG 2.2 criteria or contrast ratios.
- **Missing areas:** logo, favicon and OG images; AI-search visibility; code quality; privacy and consent; deployment hardening.
- **Weak tooling:** a shell script of `rg` patterns with many false positives and no structure.
- **No distribution:** no plugin manifest, README, license or tests.
- **Weak research base:** several cited sources had 0 to 57 stars, while the most-used skills in each area were missing.

Kept from the draft: the mode-based routing, the audit traceability ideas (evidence labels, fact versus interpretation), the AI-product patterns, and the conversion framework.

## Sources analyzed

| Source | Stars | Strength | Adopted | Left out, and why |
| --- | ---: | --- | --- | --- |
| anthropics/skills `frontend-design` | 180k (repo) | Short, principled: ground design in the subject, plan then critique, a calibration list of what generated design clusters around | Design read, concept pass, prompt-twin genericity test, the cluster list as Tier 1 tells, copy-as-design rules | Nothing significant; it is compact enough to absorb whole in spirit |
| pbakaus/impeccable | 80k | Deep design system: visitor modes, a "craft floor" of refusals, 20+ sub-commands, a detector hook | Visitor modes, refusal list, bounded verification passes (avoid polishing loops), timing table, polish triage order, browser-surface theming | The binary launcher, PRODUCT.md/DESIGN.md state machine, live-iteration mode: powerful but heavy for a single portable skill |
| Leonxlnx/taste-skill | 95k | Very concrete anti-slop rules from production tests: hero discipline, eyebrow limits, fake-data bans, CTA de-duplication | Hero rules, eyebrow ration, one label per intent, fake-precision ban, design-system honesty, logo concept methods | Absolute bans that conflict with real briefs: "Lucide discouraged" (it is fine when tuned), "zero em dashes anywhere" (softened to UI copy), mandatory dark mode, fixed dial numbers |
| nextlevelbuilder/ui-ux-pro-max | 135k | Large searchable CSV database of styles, palettes and fonts per product type | The idea that palette, type and icons follow product category and audience | The CSV search engine: it encourages picking from a menu, which is a softer version of the template problem |
| vercel-labs/web-interface-guidelines | 1k | Hundreds of precise interaction details | Forms, loading-state timing, URL as state, touch, typography details, contrast on interaction | Vercel-specific copy preferences (Title Case, "&") |
| addyosmani/web-quality-skills | 3k | Lighthouse and Chrome-team rigor: field versus lab, traces before fixes, honest reporting | Measure-first workflow, thresholds, budgets, LCP/INP/CLS catalogs, the "hypothesis without a runnable page" rule | Chrome DevTools MCP-specific routing (kept tool-neutral) |
| cloudflare/security-audit-skill | 28.7k | Rigorous method: no finding without a crossed boundary and a concrete result; guidance versus full-audit modes | Finding standard, confirmed/likely/hardening labels, severity anchors, safety rules, coverage statements | The six-phase multi-agent audit with sandboxing and JSON ledgers; Web Checkup recommends that skill for full audits instead |
| raroque/vibe-security-skill | 1.1k | Exactly the bugs AI assistants introduce, with before and after code | The core checklist and most fix patterns, extended with SSRF, open redirects, uploads, CORS, supply chain and recent CVEs | Mobile-specific (Expo) depth beyond env prefixes |
| trailofbits/skills | 7.5k | Expert security research tooling | Supply-chain review mindset | Content is CC-BY-SA (share-alike) and aimed at security researchers, not web builders |
| coreyhaines31/marketingskills | 54k | SEO audit and AI-search guidance with current platform behavior | Google's stance on AI features, crawler purposes, extractable content patterns, citation measurement | The broader marketing catalog (ads, email and so on) is out of scope |
| AgriciDaniel/claude-seo | 18.8k | 26 SEO sub-skills | Technical SEO categories, AI crawler table | Paid-API extensions (DataForSEO, Ahrefs) |
| vercel-labs/agent-skills `react-best-practices` | 32k (repo) | Prioritized React and Next.js performance rules | The priority order (waterfalls, then bundle, then server, then re-renders) as ideas | Text, because the repository has no license file |

## Design decisions

1. **One skill, progressive disclosure.** The user asked for a single skill. `SKILL.md` stays short (commands, ground rules, quality floor, workflows, reference map). The 23 references load only when the task needs them, as the Agent Skills spec recommends.
2. **Concrete over general.** Every reference prefers thresholds, code, detection signatures and checklists over advice.
3. **Evidence before verdicts.** Scripts produce leads; the agent must confirm them. Findings carry labels and severities. "Not verified" is an allowed answer.
4. **The brief always wins.** Every design ban is a default to avoid, not a rule that overrides the user.
5. **Honesty about limits.** No ranking guarantees, no pen-test claims, no legal advice, no invented proof.
6. **Zero-dependency tooling.** Node 18+ scripts that work in any project, tested against fixtures and real open-source apps (vercel/nextjs-subscription-payments, shadcn-ui/taxonomy) to remove false positives.
7. **Distribution everywhere.** The open Agent Skills format plus a Claude Code plugin marketplace, so one repository installs into Claude Code, Codex, Cursor and the other agents the `skills` CLI supports.

## Scanner validation

| Target | Result |
| --- | --- |
| Synthetic vibe-coded app (34 planted issues) | All 34 detected; secrets redacted in output |
| Synthetic clean Astro app | No high-severity signals; AI-template score Low |
| vercel/nextjs-subscription-payments | 2 false positives found (error strings read as SQL, `.env.local.example` read as a secret) and fixed; remaining findings verified true |
| shadcn-ui/taxonomy | Font alias parsing and build-time font files fixed; remaining findings verified true |
| Local misconfigured and hardened servers (check-url) | All planted header, exposure and SEO issues detected; the hardened server produced no high or medium findings |
| Local broken and clean pages (visual-check) | Overflow, small targets, wrapping buttons, missing alt, layout shift, invisible focus and console errors detected; the clean page produced none |
