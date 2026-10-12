# AI Search Visibility (GEO / AEO)

Use this file when the user wants to be found and cited by ChatGPT, Perplexity, Claude, Gemini, Copilot or Google's AI Overviews and AI Mode.

## What actually matters

- **Google's AI features run on core Search.** Google states that no special markup or file is required for AI Overviews or AI Mode, and that normal SEO best practices apply. Do not write separate "AI content", and do not chop pages into fragments for AI. Write for people and organize clearly. Everything in [seo.md](seo.md) applies first.
- **Other assistants retrieve through their own crawlers or partner indexes** (ChatGPT search uses its own crawler plus Bing, Copilot uses Bing, Perplexity uses its own index). They reward pages that are crawlable without JavaScript, extractable and clearly attributed, and they lean on third-party sources (reviews, forums, Wikipedia, directories).
- **Strong organic rankings remain the best predictor of being cited.** Structure is a layer on top, not a replacement.

## Crawler access

AI user agents serve different purposes. Blocking a training crawler does not remove you from AI search, and blocking a search crawler does.

| Token | Owner | Purpose |
| --- | --- | --- |
| `OAI-SearchBot` | OpenAI | ChatGPT search results and citations |
| `ChatGPT-User` | OpenAI | Fetches made when a user asks ChatGPT to read a page |
| `GPTBot` | OpenAI | Model training |
| `Claude-SearchBot` | Anthropic | Claude search results |
| `Claude-User` | Anthropic | User-directed fetches |
| `ClaudeBot` | Anthropic | Model training |
| `PerplexityBot` | Perplexity | Perplexity search index |
| `Perplexity-User` | Perplexity | User-directed fetches |
| `Google-Extended` | Google | Gemini training and grounding controls. Does **not** affect Google Search or AI Overviews (those use Googlebot) |
| `Applebot-Extended` | Apple | Apple Intelligence training opt-out |
| `CCBot` | Common Crawl | Open dataset that many models train on |
| `Bingbot` | Microsoft | Bing index, which feeds Copilot and other assistants |

Vendors change these names. Verify against their current documentation before relying on a specific token.

**Policy A: maximum discoverability (default for most marketing sites)**

```text
User-agent: *
Disallow: /api/
Disallow: /dashboard/

Sitemap: https://example.com/sitemap.xml
```

**Policy B: be cited in AI search, but opt out of model training**

```text
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: *
Disallow: /api/
Disallow: /dashboard/

Sitemap: https://example.com/sitemap.xml
```

**Check the CDN as well as `robots.txt`.** Since July 2025, Cloudflare blocks AI crawlers by default on new domains, and WAF or bot-fight rules can silently block search crawlers too. If AI visibility matters, review the Cloudflare "AI Crawl Control" and bot settings, and allow the search and user-fetch agents you want.

## Make content extractable and citable

- **Server-render content.** Most AI crawlers do not execute JavaScript. A client-rendered SPA can be invisible to them. Check the raw HTML with `curl -s https://example.com | grep "<h1"`.
- **Lead with the answer.** Open each key page or section with a clear one- to two-sentence definition or answer of about 40 to 60 words, then the detail.
- **State facts plainly** on the page that should own them: what the product is, who it is for, pricing, integrations, limits, locations, founding facts. If an assistant describes you wrongly, the page that should state that fact is probably vague.
- **Comparison tables** for "X vs Y" and "best X for Y" queries, written honestly.
- **FAQ sections** in natural question language, answering real objections.
- **Statistics and claims with sources and dates.** Name the author, with credentials, and show publish and update dates.
- **Consistent entity data:** the same name, description, logo and links across the site, Organization schema with `sameAs`, social profiles, directories, GitHub, Crunchbase and Wikipedia where legitimately applicable.
- **Semantic HTML and accessible names.** Agents that browse pages rely on the same accessibility tree that screen readers use, so [accessibility.md](accessibility.md) helps here too.

## Off-site presence

Assistants cite third-party sources heavily. Ask: where do the cited sources for your target prompts come from? Typical levers are review platforms (G2, Capterra, Trustpilot, app stores), relevant community discussions where the brand participates honestly, comparison and "best of" articles, documentation and GitHub presence for developer tools, podcasts and press. Never fake reviews or astroturf communities.

## llms.txt

`/llms.txt` is an optional, experimental proposal: a markdown summary of the site with links to key pages. Some tools read it; major search engines do not treat it as a ranking or citation signal. Add it when it is cheap (docs sites especially), never at the expense of crawlability, real content or metadata, and do not claim it improves visibility.

## Measure

- Keep a list of 10 to 20 revenue-relevant prompts, phrased the way people actually ask ("best invoicing tool for freelancers in Germany", "Ledgerly vs FreshBooks").
- Run them periodically in ChatGPT (with search), Perplexity, Gemini, Copilot and Google AI Mode. Record whether you are mentioned or cited, and who is cited instead.
- Treat the sources cited for competitors as a to-do list (pages to improve, directories and review sites to be present on).
- Expect variance: run each prompt several times, and track trends rather than single answers.

Sources: Google Search Central's guidance on AI features, vendor crawler documentation, and the ai-seo skill in coreyhaines31/marketingskills (MIT).
