# SEO and Metadata

Use this file for public pages: marketing sites, docs, blogs, ecommerce, local businesses and portfolios. For authenticated apps, focus on titles, icons, share previews and keeping private pages out of the index.

## Honest expectations

No code change guarantees a first-page or number-one ranking. Rankings depend mostly on relevance, content quality and reputation (links, mentions, reviews), which take time. What this skill controls, and must get right, is **eligibility and clarity**: pages can be crawled, rendered and indexed; every page clearly says what it is about; metadata is correct; the site is fast and mobile-friendly; structured data is valid; and nothing technical holds the site back. Say this plainly when the user asks for "rank #1".

## Workflow

1. Run `node <skill-dir>/scripts/scan.mjs . --only seo` on the source and `check-url.mjs <url>` on the deployed site. Use Lighthouse's SEO category as a quick extra check.
2. Fix crawl and index blockers first, then on-page metadata, then structured data, then content and linking.
3. After launch, set up Google Search Console and Bing Webmaster Tools, submit the sitemap and watch the indexing reports. Indexing and ranking results take days to weeks; report them as pending, not done.

## Crawl and index (technical)

- **HTTPS everywhere.** One canonical host (apex or `www`) with a 301 from the other. One trailing-slash policy.
- **`robots.txt`** at the root. It allows crawling of public pages and CSS/JS, disallows private areas, and lists the sitemap:

```text
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/

Sitemap: https://example.com/sitemap.xml
```

- **`robots.txt` is not access control.** Private pages need authentication. To keep a page out of the index use `<meta name="robots" content="noindex">` or the `X-Robots-Tag` header, and do not also block it in `robots.txt` (blocking it prevents Google from seeing the noindex).
- **No accidental `noindex`.** The most common launch disaster is a staging `noindex` or `Disallow: /` that ships to production. Check every template.
- **Sitemap** (`/sitemap.xml`): only canonical, indexable, 200-status URLs with accurate `lastmod`. Google ignores `priority` and `changefreq`. Limits are 50,000 URLs or 50 MB per file; use a sitemap index beyond that.
- **Canonicals:** every indexable page has a self-referencing absolute canonical. Parameter variants (`?utm_`, `?sort=`) point to the clean URL.
- **Status codes:** missing pages return a real 404 (single-page apps often return 200, a "soft 404"). Moved pages return 301 to the closest equivalent. Avoid redirect chains.
- **JavaScript rendering:** content pages should be server-rendered or statically generated. Google renders JavaScript, but with delay and limits, and many other crawlers (including most AI crawlers) do not run it at all. Avoid hash routing (`/#/about`). Navigation must use real `<a href>` links.
- **Clean URLs:** lowercase, hyphenated, short, readable, stable. Never change URLs without 301s.
- **Speed and mobile:** Core Web Vitals and mobile usability are part of page experience (see [performance.md](performance.md) and [responsive.md](responsive.md)).

## On-page

- **Title (`<title>`):** unique per page; specific topic first and brand last; roughly 50 to 60 characters before truncation. Pattern: `Primary topic: specific detail | Brand`, or `Pricing | Brand`. Never leave the framework default title.
- **Meta description:** unique; about 140 to 160 characters; summarizes the page for a searcher and includes the concrete offer or answer. Google may rewrite it, but a good one improves click-through.
- **One clear H1** that matches search intent, then a logical H2 and H3 outline. Headings describe content; they are not used for styling.
- **Content:** answers the searcher's question better than the alternatives. Specific product names, use cases, locations, prices, comparisons, examples and original information. Put important text in HTML, not inside images.
- **Internal links:** descriptive anchor text (not "click here"), links from strong pages to important ones, breadcrumbs on deep sites, important pages within three clicks of the home page.
- **Images:** descriptive file names, `alt` text, modern formats and explicit dimensions.
- **`<html lang>`** is set correctly.

## Complete head template

```html
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice tracking for freelancers | Ledgerly</title>
  <meta name="description" content="Track every invoice, get paid faster with automatic reminders, and see what clients owe at a glance. Free for up to 5 clients.">
  <link rel="canonical" href="https://ledgerly.app/">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ledgerly">
  <meta property="og:title" content="Invoice tracking for freelancers">
  <meta property="og:description" content="Automatic reminders and a clear view of what clients owe.">
  <meta property="og:url" content="https://ledgerly.app/">
  <meta property="og:image" content="https://ledgerly.app/og/home.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Ledgerly dashboard showing overdue invoices">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0f172a">
</head>
```

(Ledgerly is an illustrative name.)

**Next.js App Router:**

```ts
// app/layout.tsx
import type { Metadata } from "next";
export const metadata: Metadata = {
  metadataBase: new URL("https://ledgerly.app"),
  title: { default: "Ledgerly: invoice tracking for freelancers", template: "%s | Ledgerly" },
  description: "Track every invoice and get paid faster with automatic reminders.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Ledgerly", images: [{ url: "/og/home.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
};
// Each page exports its own `metadata` or `generateMetadata` with a unique title, description and canonical.
```

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  return [
    { url: "https://ledgerly.app/", lastModified: new Date() },
    { url: "https://ledgerly.app/pricing" },
    ...posts.map((p) => ({ url: `https://ledgerly.app/blog/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
// app/robots.ts returns { rules: [{ userAgent: "*", disallow: ["/api/", "/dashboard/"] }], sitemap: "https://ledgerly.app/sitemap.xml" }
```

**Astro:** `@astrojs/sitemap` plus a `<SEO>` head component. **Vite SPA:** prerender public routes (or move marketing pages to a static framework), and manage per-route titles with the router's head API.

## Structured data (JSON-LD)

Mark up only what is visible on the page and true. Structured data makes pages eligible for rich results; it does not guarantee them. Validate with Google's Rich Results Test and the Schema.org validator.

Home page: Organization and WebSite (WebSite helps Google show the right site name):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ledgerly.app/#org",
      "name": "Ledgerly",
      "url": "https://ledgerly.app/",
      "logo": "https://ledgerly.app/logo-512.png",
      "sameAs": ["https://github.com/ledgerly", "https://www.linkedin.com/company/ledgerly"]
    },
    {
      "@type": "WebSite",
      "@id": "https://ledgerly.app/#website",
      "name": "Ledgerly",
      "url": "https://ledgerly.app/",
      "publisher": { "@id": "https://ledgerly.app/#org" }
    }
  ]
}
</script>
```

| Page | Type | Notes |
| --- | --- | --- |
| SaaS or app | `SoftwareApplication` (`name`, `applicationCategory`, `offers`) | Rating stars need real `aggregateRating` or `review` data. Never invent ratings |
| Product | `Product` with `offers` (price, currency, availability) | Add `aggregateRating` and `review` only from real reviews |
| Blog post or article | `Article` or `BlogPosting` (`headline`, `image`, `datePublished`, `dateModified`, `author` with URL) | Real author pages strengthen E-E-A-T |
| Local business | `LocalBusiness` subtype (address, geo, opening hours, phone) | Must match the Google Business Profile exactly |
| Deep pages | `BreadcrumbList` | Mirrors the visible breadcrumbs |
| FAQ | `FAQPage` | Since 2023, Google shows FAQ rich results almost only for authoritative government and health sites. Fine as semantics; do not promise stars or dropdowns |
| Events, recipes, jobs, courses | Matching types | Follow Google's per-type required properties |

In Next.js, render JSON-LD with `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />`. The escaping prevents script injection.

## Search Console and indexing

- **Google Search Console:** add a Domain property (verified by DNS TXT record), submit the sitemap, check the Page indexing report and the Core Web Vitals report, and use URL Inspection's "Request indexing" for key launch pages.
- **Bing Webmaster Tools:** import the site from Search Console. Bing powers several AI assistants and other search engines. Consider IndexNow (supported by Bing, Yandex and others; not Google) for instant update pings.
- After a redesign or migration: map every old URL to a new one with a 301, keep the old sitemap briefly, and watch the indexing reports for a few weeks.

## Content quality and E-E-A-T

- People-first content written from real experience: original data, screenshots, examples and opinions a generic page cannot have.
- About page, author bylines with bios, contact details, and policies. Trust signals matter most for money and health topics.
- Mass-produced, thin AI pages created to rank violate Google's scaled-content-abuse policy and can sink the whole site. AI-assisted content is fine when it is reviewed, accurate and useful.
- Keep key pages fresh. Update content and `dateModified` when facts change, not cosmetically.

## Local SEO

Create and verify a Google Business Profile with the right category, hours, photos and services, and gather genuine reviews. Keep name, address and phone (NAP) identical everywhere: site, profile, directories. Give each location its own page with `LocalBusiness` markup, embedded map and directions.

## International

Use `hreflang` only when real localized versions exist. Make the annotations reciprocal, include `x-default`, use self-referencing canonicals per language, and put each language at its own URL (subdirectory or subdomain), never as client-side language switching on a single URL.

## Avoid

Keyword stuffing, hidden text, doorway pages, meta keywords (ignored), buying links, auto-generated tag pages with no content, blocking CSS or JavaScript in `robots.txt`, launching with `noindex`, changing URLs without redirects, and promising rankings.

## Launch SEO checklist

- [ ] No `noindex` or `Disallow: /` in production (`check-url.mjs`)
- [ ] Unique title, description and canonical on every public route
- [ ] `og:image` and Twitter card on key pages, tested by pasting the link into a chat app
- [ ] `robots.txt` and `sitemap.xml` live, and the sitemap is submitted to Search Console and Bing
- [ ] Organization and WebSite JSON-LD on the home page, plus page-type schema where relevant, validated
- [ ] Real 404 status for missing pages; 301s for any changed URLs
- [ ] `lang` set; favicons present; HTTPS with one canonical host
- [ ] Core Web Vitals in the good range on mobile (or a plan to get there)
