# Launch Checklist (Ship Gate)

The product is ready when a real user's first session survives without breakage, confusion, trust loss or preventable security, performance or legal problems. Mark each item **pass**, **fail** or **not verified**, with evidence. Items marked ★ block launch.

## Functional

- ★ Key routes load, and the primary user flow works end to end with realistic input.
- ★ Forms submit, validate on the server, show success and error states, keep input on error, and cannot double-submit.
- ★ No app-breaking console errors or failed requests on key pages.
- Auth flows work: signup, login, logout, password reset, expired session, unauthorized access.
- 404 and 500 pages exist, are branded and helpful, and return the correct status codes.
- Emails send and render correctly (transactional emails, contact form notifications).

## Content and brand

- ★ No placeholder content: lorem ipsum, "John Doe", fake logos or testimonials, invented statistics, TODOs, `picsum` images.
- ★ The framework default title, favicon and boilerplate are gone (`Vite + React`, `Create Next App`, `vite.svg`).
- Copy is proofread; CTAs name actions; one label per intent.
- The design passes the [ai-tells.md](ai-tells.md) audit with a Low or Medium score and a committed direction.
- Logo, favicon set and OG images are in place ([brand-and-assets.md](brand-and-assets.md)).

## Responsive

- ★ No horizontal scroll, clipping or overlap at 320, 375, 768, 1024, 1280 and 1440 px.
- ★ The primary action is reachable on a phone; sticky elements never cover content or inputs.
- Tablet portrait and landscape checked; hover-only UI has a touch path.

## Accessibility

- ★ The core flow works by keyboard alone, with visible focus.
- ★ Inputs have labels; icon-only buttons have names; images have appropriate alt text.
- ★ Text contrast meets 4.5:1 (3:1 for large text and UI components).
- `lang` is set, headings are logical, a skip link exists, reduced motion is respected, zoom is not disabled.
- The axe or Lighthouse accessibility check has no critical issues.

## Performance

- ★ Mobile LCP is about 2.5 s or better on key landing pages in lab tests (or a documented plan exists), CLS is at most 0.1, and there are no long blocking tasks during interactions.
- The LCP image is prioritized and optimized; images are sized and lazy-loaded below the fold; fonts are self-hosted and subset.
- No heavy client JavaScript on static pages; third-party scripts are deferred and justified.
- Hashed assets are cached immutably; HTML revalidates.

## Security

- ★ No secrets in the repository or client bundle (`scan.mjs`, `gitleaks`). Any previously exposed key has been rotated.
- ★ Every API route and server action validates, authenticates and authorizes ownership. Prices, roles and user IDs come from the server.
- ★ Database rules are owner-scoped (Supabase RLS everywhere; Firebase rules not open). The service-role key is server-only.
- ★ Webhooks verify signatures. Auth, AI, email and upload endpoints are rate limited, and provider spend caps are set.
- ★ Production does not expose `/.git`, `.env`, source maps or stack traces (`check-url.mjs`).
- Security headers set (HSTS, CSP or a Report-Only plan, `nosniff`, `frame-ancestors`, `Referrer-Policy`).
- `npm audit` shows no reachable high or critical issues; the framework is on a patched version.
- Preview environments use test keys; 2FA is enabled on host, DNS, registrar, GitHub, database and payment accounts.

## SEO and sharing

- ★ Production is indexable: no stray `noindex` or `Disallow: /`.
- ★ Unique title, meta description and canonical on every public route.
- `robots.txt` and `sitemap.xml` are live; the sitemap is submitted to Search Console and Bing.
- OG image and Twitter card on key pages, checked by pasting the link into a chat app.
- Organization and WebSite JSON-LD (plus page-type schema) validated.
- Redirects in place for any changed URLs.
- AI crawler policy decided, and the CDN bot settings match it ([ai-search-visibility.md](ai-search-visibility.md)).

## Privacy and legal

- ★ The privacy policy matches the real data flows and is linked in the footer and next to forms.
- ★ Where consent is required, no non-essential trackers fire before it.
- Terms, imprint, refund and shipping pages where applicable; account deletion exists if there are accounts.

## Operations

- Build command, output directory and environment variables are documented (`.env.example`, README).
- Error tracking and uptime monitoring are live; spend alerts are set on the host, database and AI providers.
- Database backups are on and a restore has been tested.
- The domain uses HTTPS with one canonical host; SPF, DKIM and DMARC are configured if email is sent.
- Analytics are configured (privacy-friendly or consent-gated), and key events fire.
- You know how to roll back (previous deployment, database migration plan).

## Verdict

- **Ready:** every ★ item passes, and no P0 or P1 findings remain.
- **Ready with fixes:** every ★ item passes, with listed non-blocking follow-ups and owners.
- **Not ready:** at least one ★ item fails or cannot be verified. List the smallest set of fixes needed to reach Ready.
