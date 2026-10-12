# Contributing

Thanks for helping make AI-built websites better.

## Good contributions

- **New AI tells**, with a real example (screenshot or code) and a detection signature if one exists.
- **Scanner false positives or misses**, with the smallest code sample that reproduces them.
- **Stack-specific security or performance patterns** (Remix, SvelteKit, Nuxt, Laravel, WordPress, ...), with a link to the official documentation.
- **Corrections** when a vendor changes behavior (crawler names, framework APIs, thresholds).

## Rules for skill content

- Be concrete: thresholds, code, signatures and checklists beat advice.
- Cite primary sources (standards, vendor docs) for facts that can go stale.
- Keep `SKILL.md` short. Put detail in `references/` and link it from the reference map.
- A design rule is a default, never an override of the user's brief.
- Write plainly. No marketing copy in the skill itself.

## Before opening a pull request

```bash
npm test            # scanner, live-check and parser tests (Node 20+)
npm run validate    # Agent Skills frontmatter, links and manifests
```

If you change a script, add or update a test in `tests/`. Never commit a real secret, even in a fixture: build test secrets at runtime as the existing tests do.

## Releases

`plugin.json` intentionally has no `version` field, so Claude Code plugin users receive every commit on `main`. Keep `main` releasable, record user-facing changes in `CHANGELOG.md`, and tag releases (`git tag v1.1.0`).
