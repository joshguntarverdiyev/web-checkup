# Security Playbooks: Fix Patterns by Stack

Copyable patterns for the issues in [security.md](security.md). Adapt names to the project, and check API details against the installed library versions.

## Secrets and environment variables

| Framework | Prefix that ships to the browser |
| --- | --- |
| Next.js | `NEXT_PUBLIC_` |
| Vite (React, Vue, Svelte) | `VITE_` |
| Create React App | `REACT_APP_` |
| Expo / React Native | `EXPO_PUBLIC_` |
| Astro, SvelteKit | `PUBLIC_` |
| Nuxt | `NUXT_PUBLIC_`, and the `runtimeConfig.public` block |

**Safe in the browser:** Stripe publishable keys (`pk_`), the Supabase anon or publishable key (only with RLS enforced), Firebase web config (only with security rules enforced), public analytics IDs, Turnstile site keys.

**Never in the browser:** the Supabase service-role or secret key (`sb_secret_`), Stripe secret (`sk_`) and webhook (`whsec_`) secrets, AI provider keys (OpenAI, Anthropic, Google), database URLs, JWT or session signing secrets, OAuth client secrets, SMTP, Twilio or Resend keys, cloud credentials.

Validate server environment variables at startup so a missing or misplaced key fails fast:

```ts
// src/env.server.ts
import "server-only";
import { z } from "zod";

export const env = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  APP_URL: z.string().url(),
}).parse(process.env);
```

`.gitignore` must contain `.env`, `.env.*` and `!.env.example`. Commit an `.env.example` with placeholder values only. If a key was ever committed: rotate it at the provider, then purge history if needed (`git filter-repo`), knowing that forks and clones may keep it.

## Next.js (App Router)

Every server action and route handler is a public POST or GET endpoint. Each one needs three steps, in this order: **validate, authenticate, authorize.**

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";

const DeleteProject = z.object({ id: z.string().uuid() });

export async function deleteProject(input: unknown) {
  const parsed = DeleteProject.safeParse(input);           // 1. validate
  if (!parsed.success) return { error: "Invalid request" };

  const session = await auth();                            // 2. authenticate
  if (!session?.user) return { error: "Sign in required" };

  const { count } = await db.project.deleteMany({          // 3. authorize: scope by owner
    where: { id: parsed.data.id, ownerId: session.user.id },
  });
  if (count === 0) return { error: "Project not found" };

  revalidatePath("/projects");
  return { ok: true };
}
```

```ts
// app/api/invoices/[id]/route.ts
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const invoice = await db.invoice.findFirst({
    where: { id, ownerId: session.user.id },               // never findUnique by id alone
    select: { id: true, number: true, total: true, status: true },
  });
  if (!invoice) return new Response("Not found", { status: 404 });
  return Response.json(invoice);
}
```

- Put data access in a server-only data access layer (`import "server-only"`) that performs the auth checks, so client components cannot import it.
- Pass client components only the fields they render. Never send full user rows (password hashes, tokens, internal flags).
- `middleware.ts` (renamed `proxy.ts` in Next.js 16) is a convenience redirect layer, not authorization. Check again where the data is read.
- Server actions compare the `Origin` and `Host` headers by default, which protects against CSRF. If you sit behind proxies, set `serverActions.allowedOrigins` deliberately instead of disabling the check.
- Keep `next`, `react` and `react-dom` on patched versions (see the CVEs in [security.md](security.md)).

## Supabase

1. **Enable RLS on every table in exposed schemas.** Tables created in the dashboard table editor have it on; tables created by SQL or migrations do not.

```sql
alter table public.projects enable row level security;

create policy "Owners read" on public.projects
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners insert" on public.projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners update" on public.projects
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);   -- stops users from reassigning ownership
create policy "Owners delete" on public.projects
  for delete to authenticated using ((select auth.uid()) = owner_id);
```

2. **Audit queries:**

```sql
-- tables without RLS
select tablename from pg_tables where schemaname = 'public' and rowsecurity = false;
-- policies that allow everything
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and (qual = 'true' or with_check = 'true');
```

3. **Never** use `using (true)` or `using (auth.uid() is not null)` for reading or changing private rows. Those let any user (or any signed-in user) touch every row.
4. **Sensitive columns** (`role`, `is_admin`, `credits`, `plan`) must not be user-updatable. Move them to a private table, or restrict column grants: `revoke update on profiles from authenticated; grant update (display_name, avatar_url) on profiles to authenticated;`
5. **Views** bypass RLS unless created with `with (security_invoker = true)`.
6. **`security definer` functions** bypass RLS. Keep them out of exposed schemas, `set search_path = ''`, and check `auth.uid()` inside.
7. **Storage buckets** need their own policies. Scope paths to the user: `(storage.foldername(name))[1] = (select auth.uid())::text`.
8. The service-role or secret key is used only on the server, never in a client bundle or mobile app.
9. Run the dashboard **Security Advisor** before launch and resolve every error.
10. Rate-limit counters and usage quotas must not live in a table users can write to.

## Firebase

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName', 'photoURL']);
      allow create, delete: if false;     // handled by trusted server code
    }
    match /{document=**} { allow read, write: if false; }   // deny by default
  }
}
```

- Subcollections are **not** covered by their parent's rules. Write explicit rules for each one.
- Use custom claims (`request.auth.token.admin == true`) for roles, not a user-editable document field.
- Validate types and sizes on write. Use `request.time` for timestamps.
- Storage rules check `request.auth.uid` in the path, `request.resource.size` and `request.resource.contentType`.
- Enable App Check to reduce abuse from scripts. It is not a replacement for rules.
- Test rules with the emulator (`@firebase/rules-unit-testing`).

## Convex

- Every public `query` and `mutation` calls `ctx.auth.getUserIdentity()` and handles the signed-out case.
- Check ownership of the specific document, not just whether someone is logged in.
- Use `internalQuery`, `internalMutation` and `internalAction` for functions that only other server functions call.
- Validate arguments with `v` validators on every function.

## Databases and ORMs

- Use parameterized queries only. In Prisma, use tagged `$queryRaw` and never `$queryRawUnsafe` or `$executeRawUnsafe` with user input. In Drizzle, use the `sql` template.
- Never pass a request body straight into `where` or `data` (`findFirst({ where: req.body })` allows operator injection; `update({ data: req.body })` allows mass assignment). Parse with Zod and pick fields explicitly.
- Use least-privilege database users for the app. Never connect as the owner or superuser from serverless functions if you can avoid it.

## Authentication

- Use a maintained provider or library (Auth.js, Clerk, Supabase Auth, Firebase Auth, Better Auth, WorkOS). Do not build password storage, sessions or OAuth flows from scratch.
- If you must store passwords, hash them with argon2id (or bcrypt at cost 12 or more), never with a fast hash.
- Sessions: `HttpOnly; Secure; SameSite=Lax` cookies (use the `__Host-` prefix where possible). Rotate the session on login and privilege change, and invalidate it on logout and password change.
- JWTs: verify signature, algorithm, `iss`, `aud` and `exp` (for example `jose`'s `jwtVerify(token, key, { algorithms: ["HS256"], issuer, audience })`). Never use `decode` without verifying, and never accept `alg: none`.
- Password reset: 32 random bytes, store only a hash, expire in 15 to 60 minutes, single use, the same response whether or not the email exists, and invalidate other sessions after a reset.
- Offer MFA or passkeys for admin accounts at minimum.

## Payments (Stripe)

```ts
// Server decides the price. The client sends only a plan key.
const PlanKey = z.enum(["pro_monthly", "pro_yearly"]);
const PRICE_IDS = { pro_monthly: env.STRIPE_PRICE_PRO_MONTHLY, pro_yearly: env.STRIPE_PRICE_PRO_YEARLY };

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const plan = PlanKey.parse((await req.json()).plan);
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    client_reference_id: session.user.id,        // set on the server, never from the body
    success_url: `${env.APP_URL}/billing?status=success`,
    cancel_url: `${env.APP_URL}/pricing`,
  });
  return Response.json({ url: checkout.url });
}
```

```ts
// app/api/webhooks/stripe/route.ts: verify against the RAW body
export async function POST(req: Request) {
  const body = await req.text();                  // not req.json()
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (await alreadyProcessed(event.id)) return new Response(null, { status: 200 });  // idempotency
  // handle event types, update the database
  return new Response(null, { status: 200 });
}
```

- Subscription status comes from your database, kept in sync by webhooks, and is checked on every protected request. Never trust a client flag or a stale token claim.
- In Express, mount `express.raw({ type: "application/json" })` on the webhook route before any JSON parser.

## Generic webhook verification

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySignature(rawBody: string, signatureHex: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signatureHex, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
```

Also reject stale timestamps (more than 5 minutes old) and record processed event IDs.

## Input validation and output encoding

- Validate every external input at the server boundary with a runtime schema (Zod, Valibot, ArkType). TypeScript types do not exist at runtime.
- Bound string lengths, array sizes and numbers. Limit body size (`express.json({ limit: "100kb" })`, or route config in Next.js).
- **React escapes text by default.** The risks are the escape hatches:
  - `dangerouslySetInnerHTML`, `v-html`, `innerHTML`: sanitize with DOMPurify (`isomorphic-dompurify` on the server) or avoid them.
  - Markdown: `react-markdown` is safe by default. Do not add `rehype-raw` without `rehype-sanitize`.
  - User-supplied URLs in `href` or `src`: allow only `http:`, `https:` and `mailto:` (`new URL(value).protocol`).
  - Serialized state in `<script>`: escape `<` as `<` (`JSON.stringify(data).replace(/</g, "\\u003c")`).
- LLM output is untrusted input. Treat it exactly like user content.

## File uploads

- Enforce maximum size on the server (and in presigned upload policies with `content-length-range`).
- Detect the type from magic bytes (the `file-type` package), not the extension or client-supplied MIME type. Allowlist types.
- Generate random storage keys. Never use the user's file name as a path.
- Use private buckets with short-lived signed URLs for private files.
- Serve user uploads from a separate domain or with `Content-Disposition: attachment`. Never serve user SVG or HTML inline from your main origin (stored XSS).
- Re-encode images (for example with `sharp`). This also strips EXIF and GPS metadata.

## SSRF (features that fetch user URLs)

```ts
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported scheme");
  const addresses = await lookup(url.hostname, { all: true });
  for (const { address } of addresses) {
    if (ipaddr.process(address).range() !== "unicast") throw new Error("Address not allowed");
  }
  return url;
}
// Then fetch with { redirect: "manual" }, re-validate each redirect target, and set a timeout and a response size limit.
```

This blocks private, loopback, link-local (including the cloud metadata endpoint at 169.254.169.254) and other reserved ranges. For high-risk features, route egress through a filtering proxy to defeat DNS rebinding.

## Open redirects

```ts
export function safeRedirectPath(next: string | null, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
```

## CSRF and CORS

- Cookie-authenticated mutations: `SameSite=Lax` cookies, POST or PUT or DELETE only (never change state on GET), and an `Origin` header check or CSRF token for custom handlers.
- CORS: allowlist exact origins. Never reflect arbitrary origins with `Access-Control-Allow-Credentials: true`. Public read-only APIs can use `*`, but never with credentials.

## Rate limiting and abuse

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const loginLimiter = new Ratelimit({
  redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }), // validated env module
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:login",
});

const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
const { success } = await loginLimiter.limit(`${ip}:${email.toLowerCase()}`);
if (!success) return new Response("Too many attempts. Try again in a few minutes.", { status: 429 });
```

- Limit per IP **and** per account or user. Either alone is easy to bypass.
- Trust `x-forwarded-for` only when your host sets it (Vercel, Cloudflare and Netlify do). Behind custom proxies, configure trusted hops.
- Add a challenge (Cloudflare Turnstile, hCaptcha) to public forms: signup, contact, password reset.
- Set billing alerts on every provider, and hard spend limits on AI and SMS providers.

## LLM and AI features

- Keep provider keys on the server only. The browser talks to your API, and your API talks to the model.
- Enforce per-user quotas in server-side storage, cap `max_tokens` and input length, set timeouts, and set a provider spend limit.
- Treat model output as untrusted: render it as text or sanitized markdown, validate structured output with a schema, and never execute it.
- Tools and function calling: allowlist tools, validate every argument, and run each tool with the **requesting user's** permissions (never a broad service identity). Require explicit user confirmation, bound to the exact arguments, for side effects (sending, deleting, paying).
- Content the model reads (web pages, emails, documents, issues) can contain injected instructions. It must not be able to trigger side effects without confirmation.
- Do not put secrets or private data in system prompts. Assume prompts can leak.
- Reference: OWASP Top 10 for LLM Applications (prompt injection, sensitive information disclosure, improper output handling, excessive agency, unbounded consumption).

## Express and Node servers

```ts
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);                         // only if exactly one trusted proxy sits in front
app.use(helmet());
app.use(cors({ origin: ["https://app.example.com"], credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", rateLimit({ windowMs: 10 * 60_000, limit: 20 }));
```

Add a final error handler that logs details on the server and returns a generic message to the client.

## Supply chain

- Before adding any package an AI suggested, confirm it exists and is the intended one: `npm view <name> repository.url time.created`. Check weekly downloads, maintainers and install scripts. Hallucinated names get registered by attackers ("slopsquatting").
- Commit the lockfile. Use `npm ci` (or the `--frozen-lockfile` equivalents) in CI.
- Enable Dependabot or Renovate. Review `npm audit --omit=dev`, prioritizing runtime-reachable high and critical issues.
- Prefer fewer dependencies. Self-propagating npm worms in 2025 showed that every dependency is an attack surface. Consider delaying adoption of brand-new versions (recent pnpm versions support a `minimumReleaseAge` setting).
- Pin GitHub Actions to commit SHAs. Enable 2FA on npm and GitHub.

## Logging

- Never log passwords, tokens, full card data, session IDs or secrets. Redact personal data where possible.
- Do log authentication failures, permission denials, admin actions and webhook failures, with timestamps and user IDs, for incident response.

Patterns informed by Chris Raroque's vibe-security skill (MIT), Cloudflare's security-audit skill (MIT), OWASP cheat sheets and vendor documentation.
