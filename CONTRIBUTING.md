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

Every release bumps the version in `.claude-plugin/plugin.json`, `package.json` and the `SKILL.md` metadata, with a matching `## x.y.z` entry at the top of `CHANGELOG.md`. Plugin users and the Claude directory only receive a release when the version changes. `npm run validate` fails if these disagree. Tag the release (`git tag v1.1.0`).

## Directory edition

Anthropic's Claude plugin directory accepts scripts and most file types only from Verified organizations, so the directory lists a separate edition without the scripts: [joshguntarverdiyev/web-checkup-directory](https://github.com/joshguntarverdiyev/web-checkup-directory). Never edit that repository by hand. It is built from this one:

- `editions/directory/` holds the edition's own `README.md`, `PRIVACY.md` and `SECURITY.md`, and `edits.mjs`, which replaces every script step in the skill with how to do the check with the agent's own tools.
- `npm run build:directory` writes the edition to `dist/directory-edition/` (git-ignored, and its own git repository) and checks that it holds only Markdown, text, JSON, YAML and images, has no `#!` files or package-manager files, and no longer mentions the scripts.
- `npm test` builds it too, so a change to a line that `edits.mjs` rewrites fails CI and names the edit to update.

To release it, after releasing this repository: run `npm run build:directory`, then commit and push in `dist/directory-edition` with the same version in the commit message.
