# Brand and Assets: Logo, Favicons, Social Images, Icons, Imagery

Assets are where AI-built sites look most unfinished: the framework favicon, a blank link preview, emoji standing in for icons, `div`-built fake screenshots. Use this file for any logo, icon, favicon, OG image or imagery work.

## When to touch the brand

- If a usable logo and palette exist, keep them. Improve how they are applied (sizing, clear space, contrast, favicon) instead of redesigning.
- Create a new mark only when there is none, or when the user asks.

## Logo

### Strategy first

Before drawing, write down the category, audience, the product's core action, the emotional promise, and what the brand must not look like. Pick symbols from meaning, never at random.

### Concept methods (use one, or combine two at most)

1. **Monogram plus meaning:** the initial shaped by a metaphor using a cut, fold, negative space or path. A plain letter in a circle is not a concept.
2. **Product action:** abstract the main verb (build: frame or scaffold; protect: boundary; convert: switch; speak: waveform; automate: loop).
3. **Metaphor fusion:** two relevant ideas reduced into one readable shape.
4. **Negative space:** a hidden arrow, protected center or internal path. It must be crisp at small sizes.
5. **Construction geometry:** a mark built from a clear system of circles, diagonals, grid modules or measured strokes.

Logo concept methods adapted from Taste-Skill's brandkit (MIT).

### Constraints

- Readable at 16 px and in one color. Works on light and dark backgrounds, and does not depend on a gradient.
- Simple enough to redraw from memory. No clipart and no stock icons.
- Avoid category clichés unless they are reinvented: the AI sparkle, brain or robot; the rocket for launch; the lightning bolt for speed; the generic shield-check for security; the leaf for eco.
- Not derivative of famous marks. Before committing a name or mark, search the trademark registers for the target markets (USPTO, EUIPO, WIPO Global Brand Database).

### Deliverables

- An SVG symbol and an SVG wordmark, plus horizontal and stacked lockups.
- Light and dark variants, and a one-color version.
- Clear-space rule (for example, the height of the symbol's main stroke) and minimum size.
- The favicon set and social images below.

### Honest limits

Hand-coding an SVG logo with an LLM usually produces weak, generic marks. Better options, in order: (1) a strong typographic wordmark set in a well-chosen face with custom spacing and one modified glyph, built as outlined SVG; (2) a simple geometric mark you can specify exactly; (3) an image-generation tool for exploration, followed by vector redrawing; (4) a human designer for the final mark. Say so to the user instead of shipping clipart.

## Favicon and app icons

Replace the framework defaults (`vite.svg`, `next.svg`, the stock `favicon.ico`). A default favicon in production is a strong tell.

Minimal modern set:

| File | Size | Purpose |
| --- | --- | --- |
| `favicon.ico` | 32×32 | Legacy browsers, RSS readers, some crawlers |
| `icon.svg` | vector | Modern browsers; can adapt to dark mode internally |
| `apple-touch-icon.png` | 180×180 | iOS home screen. Use a solid background and no transparency |
| `icon-192.png`, `icon-512.png` | 192 and 512 | Web app manifest, Android |
| `icon-maskable-512.png` | 512 | Android adaptive icons. Keep the mark inside the central 80% safe zone |

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

```json
{
  "name": "Product Name",
  "short_name": "Product",
  "icons": [
    { "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/icon-512.png", "type": "image/png", "sizes": "512x512" },
    { "src": "/icon-maskable-512.png", "type": "image/png", "sizes": "512x512", "purpose": "maskable" }
  ],
  "theme_color": "#121214",
  "background_color": "#121214",
  "display": "standalone",
  "start_url": "/"
}
```

A dark-mode-aware SVG favicon:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>path{fill:#121214}@media (prefers-color-scheme:dark){path{fill:#f4f4f5}}</style>
  <path d="..."/>
</svg>
```

**Next.js App Router:** place `app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png` and `app/manifest.ts` in the app directory; the framework generates the tags. **Astro and Vite:** put the files in `public/` and add the tags to the root layout or `index.html`.

The favicon must read at 16 px. Simplify the mark for small sizes (drop the wordmark, thicken strokes).

## Social share images (Open Graph)

Without them, every link shared in Slack, iMessage, WhatsApp, LinkedIn or X shows a blank or random card.

- 1200×630 px, JPG or PNG (WebP is not supported everywhere), ideally under 300 KB and always under 1 MB.
- Keep important text in the central safe area, because some platforms crop to a square or 1.91:1.
- Use a large title (60 px or more at 1200 wide), the logo, and a real visual. No paragraph text.
- Use absolute URLs in the tags.
- Per-page images for key pages (home, pricing, every blog post, product pages). Generate them dynamically with `next/og` (`ImageResponse`, `app/opengraph-image.tsx`), Satori, or a build-time script.
- Tags: `og:title`, `og:description`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:url`, `og:type`, `og:site_name`, and `twitter:card=summary_large_image`. See [seo.md](seo.md#complete-head-template).
- Test with the Facebook Sharing Debugger, LinkedIn Post Inspector, and by pasting the URL into Slack or iMessage. Platforms cache previews, so re-scrape after changes.

## Icons

### Choose one family by character

| Library | Character | Notes |
| --- | --- | --- |
| Lucide | Clean, neutral, 1,500+ icons | The most common default. Tune `strokeWidth` and size so it doesn't look stock |
| Phosphor | Six weights, including duotone; warmer | Good when the brand needs more personality |
| Tabler | 5,000+ icons, 1.5 stroke by default | Broad coverage for dense apps |
| Heroicons | Tailwind team; outline and solid | Small set, very consistent |
| Radix Icons | Crisp 15 px UI icons | Dense product UI |
| Material Symbols | Variable font (weight, fill, grade, optical size) | Material-flavored products |
| Hugeicons, Iconoir | Distinct styles | Alternatives with a fresher look |

Keep the project's existing icon library unless there is a strong reason to change it.

### Rules

- **One family per product.** Never mix stroke styles.
- **Sizes on a grid:** 16, 20 and 24 px (and 32 for features). Match stroke weight to the adjacent text weight: lighter strokes (1.25 to 1.5) next to regular text, 2 next to medium or bold.
- **Optical alignment:** center icons on the text's x-height or cap height, not the line box. Inherit `currentColor`.
- **Accessibility:** decorative icons get `aria-hidden="true"`; icon-only buttons get `aria-label`. Pair critical or unfamiliar actions with a visible text label.
- **No emoji as UI icons** and no Unicode glyphs (✓ → ★) standing in for an icon system.
- **No hand-drawn paths** for standard icons. If a glyph is missing, use a second library's closest match with the same stroke, or draw it on the same 24 px grid with the same stroke.
- **Bundle size:** import icons individually (`import { Search } from "lucide-react"`, which tree-shakes). Never import a whole icon set in vanilla JavaScript; use per-icon imports or `unplugin-icons`.
- **Avoid cliché metaphors** on marketing surfaces (sparkles for AI, rocket, lightning, generic shield). Show what the feature actually does.

## Imagery

### Priority order

1. **Real product screenshots or recordings** for software. Real photography for physical products, places and people.
2. **Generated images** when no real ones exist: art-directed for the concept, one consistent style, the right aspect ratio per placement. Avoid the AI-image look (glossy 3D blobs, purple glow, uncanny hands and text).
3. **Licensed stock** that is specific, consistent in grade and crop, and never clichéd (handshakes, people pointing at screens).
4. **Clearly labeled placeholders** (`<!-- TODO: hero product photo, 1600×1000 -->`). Then tell the user exactly which images are needed and where.

### Rules

- **Never build fake product UI from `div`s** (pretend dashboards, terminals, chat windows with invented numbers). Use a real screenshot, an actual working mini-component of the real UI, or editorial imagery.
- **Illustration:** real illustration or none. Geometric SVG that you can specify exactly (shapes, diagrams, data, linework) is fine. Sketchy or "doodle" SVG scenes look amateur.
- **Social proof logos:** only real customers or integrations, used with permission. Render them in one color (monochrome) for visual calm. Simple Icons (`simple-icons`) covers most tech brands. Never present invented companies as customers.
- **Consistency:** one color grade, consistent crop ratios, and consistent corner and shadow treatment across all images.
- **Technical:** responsive `srcset` and `sizes`, AVIF or WebP, explicit `width` and `height`, `alt` text that describes the content (empty `alt=""` for decorative images), lazy loading below the fold, and `fetchpriority="high"` on the LCP image. See [performance.md](performance.md#images).
- **Rights:** confirm a license for every image, font and icon set. Do not hotlink images from other sites.

## Asset checklist

- No framework default favicon, title, or `vite.svg` or `next.svg` in `public/`.
- `favicon.ico`, `icon.svg`, `apple-touch-icon.png` and the manifest icons exist and render at 16 px.
- Every public page has an `og:image` at 1200×630 with alt text, and it looks good when pasted into a chat app.
- One icon family, a consistent size and stroke, accessible names on icon-only buttons.
- Images are real or properly generated, optimized, sized and licensed. No placeholder services remain.
- Logo lockups work on light and dark backgrounds and at small sizes.
