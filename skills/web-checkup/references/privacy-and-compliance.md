# Privacy, Consent and Legal Pages

Use this file before launching anything that collects data (forms, accounts, analytics, payments, newsletters) or serves users in the EU, UK or California. This is practical engineering guidance, not legal advice. For regulated products (health, finance, children), tell the user to get a lawyer's review.

## Inventory first

List every place personal data enters or leaves:

- forms (contact, signup, checkout, newsletter, waitlist);
- accounts and profiles;
- analytics, session replay, heatmaps and advertising pixels;
- third-party embeds (YouTube, maps, chat widgets, fonts loaded from third-party CDNs);
- error tracking and logs;
- email and SMS providers, payment providers, AI providers that receive user input.

Each third party that receives personal data is a processor. List it in the privacy policy, and sign a data processing agreement where required.

## Required pages

- **Privacy policy:** what data you collect, why, the legal basis (EU and UK), who receives it, retention periods, international transfers, users' rights (access, deletion, correction, portability, objection), how to contact you, and the effective date. It must match what the site actually does.
- **Terms of service** for apps, accounts and paid products.
- **Cookie or tracking notice:** can be part of the privacy policy, plus the consent UI if you need one.
- **Imprint (Impressum)** if the business targets Germany or Austria.
- **Accessibility statement:** recommended, and expected under the European Accessibility Act for covered services.
- **Refund, shipping and returns policies** for ecommerce.

Link them all in the footer, and link the privacy policy next to every form that collects personal data.

## Cookies and consent

- **EU and UK:** non-essential cookies and similar storage (analytics, advertising, session replay, most third-party embeds) require **prior opt-in consent**. Strictly necessary storage (session, cart, security, load balancing, remembering the consent choice itself) does not.
- A valid consent banner offers **Reject** as prominently as **Accept** on the first layer, has no pre-ticked boxes, blocks scripts until consent is given, lets users withdraw consent as easily as they gave it, and records the consent.
- **Google Analytics 4 and Google Ads in the EEA** need Consent Mode v2 wired to a consent banner.
- **California (CCPA/CPRA):** if you "sell" or "share" personal data (including some advertising pixels), provide a "Do Not Sell or Share My Personal Information" link and honor the Global Privacy Control (GPC) browser signal.
- **The simplest compliant path** for many marketing sites is cookieless, privacy-friendly analytics (Plausible, Fathom, Umami, Simple Analytics, Cloudflare Web Analytics, Vercel Web Analytics). These often need no banner, but confirm the vendor's current documentation and your jurisdiction.
- **Banner UX:** do not let it destroy the experience. Reserve its space or overlay it without shifting layout (CLS), load it fast, keep it accessible (keyboard, focus, contrast), and never cover the content entirely on mobile.

## Embeds

- YouTube: use `youtube-nocookie.com` or a click-to-load facade.
- Maps: use a static image with a link, or load the map on click.
- Fonts: self-host. Loading Google Fonts from Google's CDN has been ruled a GDPR violation by a German court.
- Chat widgets and social embeds: load only after consent or interaction.

## Forms and email

- **Collect the minimum.** Every optional field is a liability and a conversion cost.
- **Marketing consent** is a separate, unchecked checkbox, never bundled with terms acceptance.
- **Newsletters:** double opt-in is recommended (and expected in Germany). Every email has a one-click unsubscribe. Bulk senders need SPF, DKIM, DMARC and one-click unsubscribe headers (Gmail and Yahoo requirements).
- **Spam protection** that respects privacy: a honeypot field, a time-to-submit check, server-side rate limits and Cloudflare Turnstile. Avoid invasive CAPTCHAs where possible.
- Send form data over HTTPS only, store it with access control, and delete it when it is no longer needed.

## Accounts and data rights

- Users can delete their account from inside the product (required by app stores for apps with accounts, and expected under GDPR). Deletion also removes or anonymizes data at your processors.
- Users can export their data, or request it with a documented, timely process.
- Store passwords only through a proper auth provider or a strong hash ([security-playbooks.md](security-playbooks.md#authentication)).
- Set and enforce retention periods for logs, analytics and inactive accounts.

## Children

If the product targets children, or knowingly collects data from them, special rules apply (COPPA in the US under 13, GDPR-K age limits of 13 to 16 in the EU, the UK Age Appropriate Design Code). Recommend legal review, and minimize data collection.

## AI features

- Tell users when they are interacting with AI, and where their input goes (which provider, and whether it is used for training).
- Do not send personal or sensitive data to AI providers without a basis and a processing agreement. Use providers' zero-retention or no-training options where available.
- The EU AI Act adds transparency duties for some AI systems (for example, disclosing chatbots and labeling AI-generated content in certain contexts). Flag it when relevant.

## Pre-launch privacy checklist

- [ ] Privacy policy matches actual data flows and third parties, and is linked in the footer and next to forms
- [ ] No non-essential cookies or trackers fire before consent where consent is required (check the DevTools Application and Network tabs on first load)
- [ ] Reject is as easy as Accept; consent can be withdrawn
- [ ] Fonts self-hosted; embeds behind facades or consent
- [ ] Forms collect only what they need; marketing consent is separate and unchecked
- [ ] Account deletion and data export paths exist (if there are accounts)
- [ ] Imprint, terms, refund and shipping pages where applicable
