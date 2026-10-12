# Performance and Core Web Vitals

Speed is measured in what real users feel. Measure first, fix what the measurements implicate, then re-measure under the same conditions.

## Targets

Core Web Vitals are judged at the 75th percentile of real page visits, separately for mobile and desktop.

| Metric | Measures | Good | Needs improvement | Poor |
| --- | --- | --- | --- | --- |
| LCP (Largest Contentful Paint) | Loading | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| INP (Interaction to Next Paint) | Responsiveness | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| CLS (Cumulative Layout Shift) | Visual stability | ≤ 0.1 | ≤ 0.25 | > 0.25 |

Supporting lab metrics: TTFB under 800 ms, FCP under 1.8 s, TBT under 200 ms (a lab proxy for INP, not a substitute).

## Measure

**Field data (real users) decides priority:**
- `node <skill-dir>/scripts/check-url.mjs <url> --psi` returns PageSpeed Insights lab results plus CrUX field data when Google has enough traffic for the URL or origin.
- Google Search Console has a Core Web Vitals report per URL group.
- For your own real-user monitoring, use the `web-vitals` library to send LCP, INP and CLS (with attribution) to your analytics.

**Lab data diagnoses causes:**
- Chrome DevTools Performance panel with CPU throttled 4x and a "Slow 4G" network, or a DevTools MCP performance trace.
- `npx lighthouse <url> --preset=desktop` or the mobile default. Run three times and take the median, because single runs are noisy.
- Bundle analysis: `@next/bundle-analyzer`, `rollup-plugin-visualizer` (Vite) or `npx vite-bundle-visualizer`, and `source-map-explorer`.

Rules for honest reporting:
- Without a runnable page, code findings are **hypotheses**. Name the command that would confirm each one.
- Never compare one lab run with field p75 as if they were the same kind of number.
- After a fix, report lab before and after values with conditions. Field data needs about 28 days of new traffic to reflect it.

## Starting budgets

Adjust to the product. Keep an existing project budget if there is one.

| Resource (compressed) | Budget |
| --- | --- |
| JavaScript on the initial route | < 170 KB for content and marketing pages, < 300 KB for apps |
| CSS | < 60 KB |
| Fonts | < 100 KB |
| Above-the-fold images | < 500 KB in total. The LCP image should be < 200 KB on mobile |
| Third-party scripts | < 100 KB, each one justified |
| Total page weight | < 1.5 MB |

## LCP: loading

The LCP element is usually the hero image, a heading or a video poster. Find it in the DevTools Performance panel or with a `PerformanceObserver` for `largest-contentful-paint`.

1. **Fast server response:** static or ISR rendering for marketing pages, a CDN, edge caching of HTML where possible, Brotli compression and HTTP/2 or HTTP/3.
2. **Discoverable early:** the LCP image is an `<img>` in the initial HTML, not a CSS background and not injected by JavaScript.
3. **Prioritized:** add `fetchpriority="high"` and never `loading="lazy"` on the LCP image. In Next.js, use `<Image priority>` (or `preload`, depending on version). Add `<link rel="preload">` only when a trace shows late discovery.
4. **Small:** AVIF or WebP, sized with `srcset` and `sizes`, and compressed (quality 60 to 75 is usually indistinguishable).
5. **No render blocking:** minimal blocking CSS, no synchronous scripts in `<head>`, and fonts that do not hide text.
6. **Server-render content.** A hero whose text comes from a client-side `fetch` in `useEffect` is a common AI-generated LCP killer.

## INP: responsiveness

INP is the slowest interaction delay over a visit: input delay, plus handler processing time, plus the time to paint the result.

- Break up long tasks over 50 ms. Yield with `await scheduler.yield()` (falling back to `setTimeout(0)`), and do expensive work in a Web Worker.
- Keep handlers small. Show the visual response first, then do the work: `startTransition` and `useDeferredValue` in React.
- Reduce hydration cost: less client JavaScript, Server Components and islands (Astro) for static content, no `"use client"` at the root layout.
- Avoid re-rendering large trees on every keystroke. Prefer uncontrolled inputs where possible, memoize measured hot spots, and virtualize long lists.
- Defer third-party scripts (chat widgets, tag managers, A/B tools), which are common INP killers. Load them after interaction or idle time, or behind a facade.
- Debounce search and resize handlers. Use passive listeners for scroll and touch.

## CLS: visual stability

- Every `img`, `video` and `iframe` has `width` and `height` attributes or a CSS `aspect-ratio`.
- Reserve space for ads, embeds, banners, cookie notices and async content. Do not insert content above existing content unless the user asked for it.
- Fonts: matched fallback metrics (`size-adjust`), `next/font` or Fontaine, and preloads for critical faces.
- Skeletons match the final dimensions exactly.
- Animate with `transform`, never with properties that move layout.
- Make pages bfcache-eligible so Back and Forward are instant: no `unload` handlers, and no `Cache-Control: no-store` on pages that do not need it.

## Images

- Formats: AVIF first, WebP fallback, JPEG last for photos; SVG for logos and icons; PNG only when lossless or transparency is truly needed.
- Use the framework's image component (`next/image`, `astro:assets`, `@nuxt/image`) or an image CDN (Cloudflare Images, imgix, Cloudinary) for automatic resizing and formats.
- Below the fold: `loading="lazy"` and `decoding="async"`.
- Never ship a 4000 px original into a 400 px card. `scan.mjs` flags images over 500 KB in `public/` and `static/`.
- Replace animated GIFs with `<video autoplay muted loop playsinline>`.

## JavaScript

- Ship less. Static content should not hydrate. Check which components really need client interactivity.
- Code-split routes and heavy widgets (charts, editors, maps, 3D, syntax highlighting) with `dynamic()` or `lazy()`, loaded on interaction or visibility.
- Import specific modules (`import debounce from "lodash/debounce"`, or better, a tiny local function). Avoid barrel files that pull in whole libraries.
- Replace heavy dependencies: `moment` with `date-fns`, `Temporal` or `Intl`; `lodash` with native methods; full icon packs with per-icon imports.
- Load scripts with `defer` or `type="module"`. Use `async` only for independent scripts.
- Use facades for embeds: a YouTube thumbnail plus play button that loads the player on click (`lite-youtube-embed`); maps loaded on click.
- Partytown or worker offloading for analytics where supported.

## Data and rendering

- Avoid request waterfalls: start independent requests together (`Promise.all`), fetch on the server where possible, and pass promises into Suspense boundaries for streaming.
- Pass only the fields client components need. Large serialized props bloat HTML and hydration.
- Cache deliberately: `React.cache` for per-request deduplication, HTTP caching for public data, and SWR or TanStack Query on the client.
- Choose rendering per route: static or ISR for marketing and docs, SSR for personalized pages, client rendering only for app-like interactions behind login.

## Caching headers

```text
HTML:                      Cache-Control: no-cache            (revalidate each time; the CDN can cache with s-maxage)
Hashed static assets:      Cache-Control: public, max-age=31536000, immutable
Unhashed public assets:    Cache-Control: public, max-age=86400, stale-while-revalidate=604800
Private or user API data:  Cache-Control: private, no-store  (never let a CDN cache personalized responses)
```

## Navigation speed (progressive enhancement)

- Speculation Rules can prerender likely next pages in Chromium. Start with `"eagerness": "moderate"`, exclude logout, cart and checkout routes, and make sure analytics do not fire on prerender.
- View Transitions make navigation feel continuous (see [motion.md](motion.md)).

## Framework quick reference

| Stack | Key moves |
| --- | --- |
| Next.js (App Router) | Server Components by default, `next/image` with priority on the LCP image, `next/font`, `next/dynamic` for heavy client widgets, `"use client"` pushed to leaves, `generateStaticParams` or ISR for content, `@next/bundle-analyzer` |
| React + Vite (SPA) | Route-level `lazy()`, prerender marketing routes (or move them to a static framework), `vite build` output review, `rollup-plugin-visualizer` |
| Astro | Islands only where needed (`client:visible` or `client:idle`), `astro:assets` for images |
| Nuxt / SvelteKit | `@nuxt/image`, `<NuxtImg preload>`, lazy components; SvelteKit prerendering for static routes |
| WordPress | Image CDN, page caching, fewer plugins, defer third-party scripts, a lightweight theme |

## Prioritization

1. A broken build or runtime errors.
2. A huge or late-discovered LCP resource, or a client-rendered hero.
3. Layout shift from unsized media, fonts and injected banners.
4. Heavy client JavaScript and hydration on simple pages; third-party bloat.
5. Request waterfalls and uncached data.
6. Micro-optimizations, only after the above.

## Reporting format

For each issue: route, metric affected, evidence (trace, Lighthouse audit, bundle size, file:line), user impact, fix, and status (fixed and re-measured, or recommended). Include measurement conditions (device, throttling, run count).

Measurement-first workflow informed by Addy Osmani's web-quality-skills (MIT) and web.dev guidance.
