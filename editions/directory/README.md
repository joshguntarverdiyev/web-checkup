# Web Checkup

**One agent skill that makes AI-built websites ready to ship.** It fixes the weak spots every vibe coder hits: template-looking design, missing states, broken mobile layouts, leaked API keys, open databases, slow pages, invisible SEO and blank link previews.

This is the edition for Anthropic's Claude plugin directory. It holds only the skill's instructions and reference files. The directory accepts scripts only from Verified organizations, so this edition leaves out the three scanner scripts of the [full version](https://github.com/joshguntarverdiyev/web-checkup). Claude does the same checks with its own tools instead: it searches your code, takes screenshots with a browser tool when one is available, and requests your live site's headers and pages.

Both editions have the same instructions and are released together under the same version number. Install one or the other, not both.

## Use it

Ask in plain language and the skill triggers on its own:

- "Audit my site before launch."
- "Why does my landing page look generic?"
- "Is my Supabase setup safe?"
- "Make this work on tablets."
- "Improve my SEO and link previews."

Or call it directly with `/web-checkup:web-checkup`:

| Command | What happens |
| --- | --- |
| `build <brief>` | Builds a new page or site with a committed design direction, every state, and security, performance and SEO built in |
| `redesign` | Audits first, decides whether to preserve or overhaul, then redesigns without silently changing facts or URLs |
| `design` | Anti-template pass on typography, color, layout, motion, copy and assets |
| `audit` | Scored report across every area with evidence and a fix order |
| `security` / `perf` / `seo` / `a11y` / `brand` | A deep pass on one area, with fixes |
| `ship` | Launch gate: Ready, Ready with fixes, or Not ready |

## Privacy

[Privacy policy](PRIVACY.md). Web Checkup collects nothing and has no telemetry.

## Source, issues and contributions

Web Checkup is developed in [joshguntarverdiyev/web-checkup](https://github.com/joshguntarverdiyev/web-checkup), which also has examples and the research behind each rule. This repository is generated from it, so please open issues and pull requests there.

## License

[MIT](LICENSE) © 2026 Joshgun Tarverdiyev. Sources and attributions: [CREDITS.md](CREDITS.md).
