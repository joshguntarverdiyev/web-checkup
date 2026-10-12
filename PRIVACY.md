# Privacy Policy

**Web Checkup** · Last updated: 12 October 2026

Web Checkup is an open-source Agent Skill: written instructions for an AI assistant plus three scripts that run on your own computer. It is not a hosted service.

## What we collect

Nothing. Web Checkup has no servers, accounts, analytics or telemetry. The author receives no data about you, your projects or your use of the skill.

## What the skill reads on your computer

- **Your project files**, when you ask for a review or audit. `scan.mjs` reads source and configuration files in the folder you point it at, and runs `git ls-files` to see which files are committed.
- These files can contain personal data (for example names or emails on a contact page) or secrets. The skill does not save or send them, and the scanner redacts secret values in its output.

## What can leave your computer, and only when you ask

| Action | Where data goes | What is sent |
| --- | --- | --- |
| `check-url.mjs <url>` | The website you name | Ordinary page requests, the same as visiting it in a browser |
| `check-url.mjs <url> --psi` | Google PageSpeed Insights API | The URL you name, and an API key only if you pass one with `--psi-key` |
| `scan.mjs --audit` | The npm registry | Your project's dependency list, through `npm audit` |
| `visual-check.mjs <url>` | The website you name | A local headless browser loads that page |

Google's and npm's own privacy policies apply to requests sent to them. Your AI assistant (Claude or another agent) processes your conversation under its provider's terms; Web Checkup adds nothing to that.

## Retention

Web Checkup stores nothing. Screenshots from `visual-check.mjs` are saved only on your computer, in a temporary folder or a folder you choose.

## Children

Web Checkup is a developer tool and is not intended for children.

## Changes and contact

Changes to this policy are published in this repository with the date above. Questions: open an issue at https://github.com/joshguntarverdiyev/web-checkup/issues.
