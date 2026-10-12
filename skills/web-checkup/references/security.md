# Security Review

Use this file for any security question, review or pre-launch check of a web app. It is tuned to the failures AI coding assistants introduce most often. For code-level fixes see [security-playbooks.md](security-playbooks.md). For headers, hosting and accounts see [deployment-hardening.md](deployment-hardening.md).

## Scope and safety

- This is a source-first, defensive review of code the user owns. Static analysis and local checks against dummy users and data are fine. Do not send attack traffic to deployed systems, probe third-party services or test with real users' data.
- For a full adversarial audit with multi-agent hunting and verified findings, recommend Cloudflare's `security-audit` skill (github.com/cloudflare/security-audit-skill) in addition to this pass.
- Never print a full secret. Show the first four characters and the location. A secret that was ever committed must be **rotated**; deleting it from the latest commit does not remove it from git history.

## Core principle

**Never trust the client.** Every price, role, user ID, plan, credit balance, feature flag and rate-limit counter that arrives from the browser, a mobile bundle or a request body is attacker-controlled. Every API route, server action, RPC and database rule is a public endpoint that anyone can call directly with `curl`.

## Quick threat model (five minutes)

1. What data is sensitive (personal data, payments, private content, API keys, admin capabilities)?
2. Who can create, read, update and delete each kind of data?
3. Which actions cost money (AI calls, SMS, email, compute, payments) or affect other users?
4. Which endpoints are reachable without logging in? What can anonymous users submit?
5. Which third parties receive data or credentials?

Review those paths first.

## The vibe-coded app checklist

Ranked by how often these issues appear in AI-built apps and how much damage they do. Run `node <skill-dir>/scripts/scan.mjs . --only security` for leads, then confirm each one in source.

| # | Check | How to find it | Typical severity |
| --- | --- | --- | --- |
| 1 | **Secrets in code or the client bundle.** Hard-coded keys, or secrets behind `NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, `REACT_APP_`, `PUBLIC_` or `NUXT_PUBLIC_` | `scan.mjs`; `git log -p` for history; `gitleaks detect` | Critical |
| 2 | **Open database rules.** Supabase tables without RLS, or policies with `USING (true)`; Firebase `allow read, write: if true` or `if request.auth != null` on shared data; a service-role key used in browser code | migrations, `firestore.rules`, `storage.rules`, the Supabase Security Advisor | Critical |
| 3 | **Missing server-side authorization.** API routes and server actions that skip authentication, or check login but not ownership (IDOR: `/api/invoices/123` returns anyone's invoice) | read every handler: validate, then authenticate, then authorize ownership | Critical or High |
| 4 | **Middleware-only auth.** Protection only in `middleware.ts` or `proxy.ts`, or only by hiding UI | look for data reads with no session check | High |
| 5 | **Client-trusted fields and mass assignment.** `price`, `amount`, `role`, `isAdmin`, `credits` or `userId` taken from the body; `db.update({ data: req.body })` | grep for `req.body`, `await request.json()` and spreads into ORM calls | High or Critical |
| 6 | **No input validation and injection.** No runtime schema; string-built SQL; `$queryRawUnsafe`; NoSQL or ORM operator injection (`{ "$ne": null }`); unsanitized shell or file paths | grep for `queryRawUnsafe`, template-literal SQL, `exec(`, `child_process` | High or Critical |
| 7 | **XSS.** `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, markdown rendered with raw HTML, LLM output rendered as HTML, user-controlled `href` (`javascript:`), unescaped JSON in `<script>` | `scan.mjs` sinks | High |
| 8 | **No rate limits or spend caps.** Login, signup, password reset, OTP, contact forms, AI endpoints, email and SMS sends, uploads | look for a limiter in each handler or at the edge | High (billing drain) |
| 9 | **Unverified webhooks.** Stripe, Clerk, GitHub and similar webhooks processed without signature checks, or with the raw body already parsed (which breaks verification) | find webhook routes; look for `constructEvent` or HMAC compare | High |
| 10 | **Unsafe uploads.** No size or type limits, user-chosen paths, public buckets, SVG or HTML served inline from the app origin | upload handlers, storage policies | High |
| 11 | **SSRF.** Features that fetch a user-supplied URL (link previews, image import, webhook testers, PDF renderers) without blocking private IP ranges and cloud metadata addresses | grep for `fetch(` and `axios` with request-derived URLs | High |
| 12 | **Open redirects.** `?next=`, `?redirect=` or `?returnTo=` passed straight to `redirect()` | grep for redirect parameters | Medium |
| 13 | **CORS misconfiguration.** `Access-Control-Allow-Origin: *` on authenticated APIs, or a reflected `Origin` combined with credentials | CORS config and middleware | High if credentialed |
| 14 | **Token storage.** Session or refresh tokens in `localStorage`; cookies without `HttpOnly`, `Secure` and `SameSite` | auth code, `Set-Cookie` | Medium (raises XSS impact) |
| 15 | **Leaky errors and artifacts.** Stack traces to clients, public source maps, exposed `/.git/` or `/.env`, debug mode in production | `check-url.mjs`, build config | Medium to High |
| 16 | **Supply chain.** Hallucinated or typo-squatted packages (slopsquatting), no lockfile, known-vulnerable dependencies, unpatched frameworks | `npm audit`, `osv-scanner`, verify that every new package exists and is the intended one | Up to Critical |
| 17 | **Missing security headers.** No HSTS, CSP, `nosniff` or frame protection | `check-url.mjs`, host config | Medium (hardening) |
| 18 | **Weak auth flows.** Self-built password storage, JWTs decoded without verification, `alg: none`, reset tokens that do not expire or are reusable, sessions not rotated on login or invalidated on logout or password change | auth code | High |
| 19 | **LLM features.** Provider keys in the client; no per-user quota or provider spend cap; model output trusted as HTML, SQL or commands; tools that run with more authority than the requesting user; prompt injection from retrieved content triggering side effects | AI routes and tool handlers | High |
| 20 | **Environment mix-ups.** Preview deployments using production keys or databases; test keys in production; `.env` committed | host env settings, `git ls-files` | High |

Keep frameworks patched. Recent critical framework flaws include CVE-2025-29927 (a Next.js middleware bypass via the `x-middleware-subrequest` header) and CVE-2025-55182 ("React2Shell", December 2025: unauthenticated remote code execution in React Server Components, affecting React 19.x and Next.js App Router until patched). Check the installed versions against current advisories with `npm audit` or GitHub Dependabot.

## Finding standard

Report a **confirmed** vulnerability only when you can name all of these:

- the lower-trust actor or input source;
- the accepted input or action;
- the control that should have stopped it;
- the trust boundary crossed;
- the affected user, tenant, resource or secret;
- the concrete result, observed or directly supported by source;
- the evidence (file:line, config, local reproduction against dummy data);
- the smallest effective fix at the last trusted decision point.

Otherwise label it:

- **Likely:** the source strongly suggests the issue, but one fact (deployed config, provider setting, framework version) is unverified. Name that fact and how to check it.
- **Hardening:** a missing best practice with no demonstrated boundary violation (for example, a missing header on a static page).

Do not turn guessed deployment behavior, self-impact or generic crashes into vulnerabilities. Do not dramatize.

## Severity anchors

| Severity | Anchor |
| --- | --- |
| Critical | Unauthenticated actor gains code execution, full database access, arbitrary account takeover, or a live secret with broad authority (service-role key, Stripe secret key, cloud credentials) |
| High | Full defeat of a real control: auth bypass, cross-user or cross-tenant read or write, stored XSS affecting other users, payment manipulation, unbounded billing abuse |
| Medium | Real boundary violation with limited blast radius or uncommon preconditions: open redirect, CSRF on low-value actions, missing rate limit on a cheap endpoint |
| Low | Disclosure of non-sensitive internals, defense-in-depth gaps |

If you cannot state the concrete damage, the severity is lower than it feels.

## Finding template

```markdown
### [Severity] Title
Status: confirmed | likely | hardening
Location: path/to/file.ts:42 (route POST /api/checkout)

Boundary: <actor> sends <input> to <endpoint>. <Control> is missing, so <actor> can <result> on <resource>.

Evidence:
- <code excerpt or config, secrets redacted>
- <local reproduction with dummy data, if performed>

Fix: <smallest change, with a before and after snippet>
Verify: <test or command that proves the fix>
```

Put critical findings at the top of the response, not buried in a list. If a live secret is exposed, the first instruction is to rotate it at the provider.

## Coverage statement

End every security pass with what was covered and what was not: secrets, database rules, authentication, authorization (per route), input validation, output encoding and XSS, uploads, webhooks, SSRF and redirects, rate limiting, payments, LLM features, dependencies, headers and deployment, logging. A scoped review must say it is scoped. Never imply that one pass makes an app "secure".

## Tools

| Purpose | Tool |
| --- | --- |
| Secrets in the tree and history | `gitleaks detect`, `trufflehog git file://.` |
| Dependency vulnerabilities | `npm audit --omit=dev`, `pnpm audit`, `osv-scanner -r .`, GitHub Dependabot |
| Static analysis | `semgrep --config p/owasp-top-ten --config p/secrets --config p/nextjs --config p/react` |
| Package trust | Socket.dev; check package age, downloads, maintainers and install scripts before adding a dependency |
| Deployed headers and TLS | `check-url.mjs`, MDN HTTP Observatory, SSL Labs |
| Supabase | Dashboard Security Advisor and Performance Advisor |
| Dynamic scan (own staging only, with permission) | OWASP ZAP baseline scan |

Checklist synthesized from Cloudflare's security-audit skill (MIT), Chris Raroque's vibe-security skill (MIT), the OWASP Top 10 (2025) and the OWASP Top 10 for LLM Applications.
