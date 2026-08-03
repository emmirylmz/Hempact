# Hempact

Marketing site for **Hempact**, a hemp-fiber feminine hygiene pad brand.
Built as a single scroll-driven, cinematic story — from raw hemp fiber to
finished product to the brand's social-impact mission — rather than a
conventional home/products/about page layout.

Live at [hempactly.com](https://hempactly.com).

## Stack

- **Next.js 16** (App Router, Turbopack) — see `node_modules/next/dist/docs/`
  before assuming any API matches an earlier Next.js version; this project
  tracks a recent release with real breaking changes (e.g. `middleware.ts`
  is renamed `proxy.ts` — see below).
- **GSAP** + `ScrollTrigger` for the scroll-pinned, scrubbed animation on
  every section.
- **Tailwind CSS v4**.
- **TypeScript**, strict.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root path
redirects to a locale-prefixed route (`/tr` or `/en`, see below).

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Structure

- `app/[lang]/` — locale-prefixed routes: home, `hakkimizda` (about),
  `urunler` (products), `iletisim` (contact).
- `components/scenes/SectionNN*/` — one folder per home-page section.
  Each has a desktop component, a GSAP timeline hook, and (for sections
  01–07, 09–10, 12) a separate `MobileSceneNN.tsx` — mobile doesn't reuse
  the desktop scroll-pin logic, it's hosted inside a shared
  `components/scroll/MobileStage*.tsx` pinned container instead (see that
  file's own comments for why).
- `lib/content/{tr,en}.ts` — all page copy, keyed by section. Add new UI
  text here, not inline in components.
- `lib/theme.ts` — the shared color palette; every section's background
  color is one of these values, not an arbitrary hex.

## Locales

Routing is handled in `proxy.ts` (this Next.js version's renamed
`middleware.ts`). The default locale for an unprefixed request is chosen
by the visitor's **country** (via `x-vercel-ip-country` on Vercel or
`cf-ipcountry` on Cloudflare) — Turkey defaults to `/tr`, everywhere else
defaults to `/en`. Falls back to browser `Accept-Language` negotiation
when no country header is present (local dev, or a host with no edge
geolocation in front of it).

## Deployment

Requires a Node.js-capable host — `proxy.ts` does not work with Next's
static export, so `next.config.ts` intentionally has no `output: "export"`.
Verified working on Vercel; should work on any Node/edge host that
supports Next.js middleware.
