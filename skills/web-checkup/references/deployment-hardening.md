# Deployment Hardening: Headers, TLS, Hosting, Accounts

Use this file for production readiness: security headers, CSP, cookies, hosting configuration, DNS, email authentication, account security and monitoring. To check a live site, run the skill's `check-url.mjs` script with the site's address (see the Scripts section of SKILL.md).

## Required inputs

Before giving confident advice, identify the domains and environments, the host or CDN (Vercel, Netlify, Cloudflare, Render, Fly, self-hosted), the auth method, admin interfaces, third-party scripts and embeds, and whether payments or personal data are involved. State anything you could not verify instead of guessing.

## Header baseline

| Header | Starting value | Notes |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Only after every subdomain serves HTTPS. Add `preload` and submit to hstspreload.org only when you are sure, because it is hard to undo |
| `Content-Security-Policy` | Site-specific (see below) | Start with `Content-Security-Policy-Report-Only` |
| `X-Content-Type-Options` | `nosniff` | |
| `X-Frame-Options` / CSP `frame-ancestors` | `DENY` / `'none'` | Use `SAMEORIGIN` or an explicit list if you embed yourself |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Allow only what you use |
| `Cross-Origin-Opener-Policy` | `same-origin` | Use `same-origin-allow-popups` if OAuth or payment popups break |

Also remove `X-Powered-By` (`poweredByHeader: false` in Next.js, `app.disable("x-powered-by")` in Express). Do not cargo-cult headers: test auth popups, payment iframes, embeds, analytics and fonts after every change.

## Content Security Policy

Starter for a mostly static site with self-hosted assets:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests
```

Frameworks that inject inline scripts (Next.js App Router, many SSR frameworks) need a **nonce-based** policy: `script-src 'self' 'nonce-<random>' 'strict-dynamic'`, with the nonce generated per request in middleware (`proxy.ts` in Next.js 16) and passed to the framework. Follow the framework's CSP guide. Nonces require dynamic rendering, so for static pages consider hashes or a looser `script-src` plus strong other directives.

Rollout:
1. Inventory scripts, styles, images, fonts, frames and `connect` endpoints (analytics, Stripe, Supabase, Sentry and so on).
2. Ship as `Content-Security-Policy-Report-Only` with a `report-to` or `report-uri` endpoint.
3. Fix or allowlist legitimate violations. Remove inline handlers (`onclick="..."`).
4. Enforce. Keep monitoring reports.

Avoid `'unsafe-eval'`, wildcard sources (`https:` in `script-src`), and allowlisting CDNs that host arbitrary user content. Never omit `frame-ancestors`, `object-src` or `base-uri`.

## Ready-made configs

**Next.js (`next.config.ts`)**

```ts
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
```

**Vercel (`vercel.json`), for any framework**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

**Netlify and Cloudflare Pages (`public/_headers`)**

```text
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**nginx**

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
server_tokens off;
location ~ /\.(?!well-known) { deny all; }   # blocks /.git, /.env and other dotfiles
```

## Cookies

```text
Set-Cookie: __Host-session=<opaque>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1209600
```

`__Host-` requires `Secure`, `Path=/` and no `Domain`, which prevents subdomain overrides. Use `SameSite=Strict` for high-value admin cookies. Do not put sensitive data in cookie values; use an opaque session ID.

## Build and exposure checks

- **No public source maps** for proprietary code: `productionBrowserSourceMaps: false` in Next.js (the default), `build.sourcemap: false` or `"hidden"` in Vite. Upload maps privately to your error tracker instead.
- **`/.git/HEAD`, `/.env`, `/.env.local`, `/config.json` and backup files must return 404.** `check-url.mjs` tests these.
- **Debug mode, verbose errors and stack traces are off in production.** Error pages are generic.
- **Preview deployments** use test keys and a separate database. Protect previews with the host's deployment protection when they contain unreleased or private data.
- **`robots.txt` on staging** blocks crawlers, and that file never ships to production (see [seo.md](seo.md)).

## Hosting and CDN settings

**Cloudflare:**
- SSL/TLS mode **Full (strict)**, never Flexible.
- Always Use HTTPS, minimum TLS 1.2, TLS 1.3 on.
- HSTS, once ready.
- WAF managed rules on.
- Rate-limiting rules for `/api/auth/*`, `/login` and forms.
- Turnstile on public forms.
- Note: new domains block AI crawlers by default, which may hurt AI-search visibility (see [ai-search-visibility.md](ai-search-visibility.md)).

**Vercel:** deployment protection for previews, environment variables scoped per environment (Production, Preview, Development), firewall and bot rules, spend management.

**Netlify:** headers through `_headers` or `netlify.toml`, scoped environment variables, password-protected deploy previews when needed.

**Self-hosted:** automatic certificate renewal (Let's Encrypt), the firewall closed except 80 and 443, SSH by key only, and automatic security updates.

## Domain, DNS and email

- Lock the domain at the registrar and enable 2FA there.
- Add a CAA record listing your certificate authorities.
- If the domain sends email (transactional, marketing, contact replies), configure **SPF, DKIM and DMARC**. Start DMARC with `p=none` plus reporting, then move to `quarantine` or `reject`. Gmail and Yahoo require these for bulk senders.
- If the domain never sends email, publish `v=spf1 -all` and a `p=reject` DMARC record to stop spoofing.

## Accounts and operations

- 2FA (passkeys or TOTP) on the registrar, DNS, host, GitHub, npm, the database provider, Stripe, the email provider, analytics and the error tracker. Most real breaches of small sites start here.
- Least-privilege access for collaborators. Remove former members.
- Scope API keys narrowly (restricted Stripe keys, per-environment keys).
- Back up databases with point-in-time recovery, and test a restore once.
- Turn on Dependabot or Renovate and GitHub secret scanning with push protection.
- Monitoring: error tracking (Sentry or similar) with personal data scrubbing, uptime checks, and alerts for spend spikes on the host, database and AI providers.
- Publish `/.well-known/security.txt` (RFC 9116) with `Contact:` and `Expires:` for public products.
- Keep a short incident note: how to rotate each key, who to contact, how to take the site offline.

## Prioritization

1. **High impact, quick to fix:** HTTPS and HSTS; rotating exposed secrets; closing `.git` and `.env` exposure; baseline headers; 2FA on critical accounts; turning off public source maps.
2. **Medium:** CSP rollout, rate limiting, preview-environment separation, email authentication, backups.
3. **Low:** fine-grained Permissions-Policy, COOP and CORP tuning, `security.txt`, HSTS preload.

## Report format

Scope and inventory; status per layer (transport, headers, auth and sessions, input handling, secrets, operations); observed header values from `check-url.mjs`; findings with fixes; what could not be verified; when to re-check (after every infrastructure change and at least quarterly).
