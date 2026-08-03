import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, type Locale } from "@/lib/content";

// Manual Accept-Language negotiation (no extra deps): picks the first
// preferred tag whose base language (e.g. "en" from "en-US") is one of our
// supported locales, falling back to defaultLocale otherwise. Now only the
// *fallback* path (see detectLocale below) — country-based geolocation
// takes priority whenever it's available, per an explicit request that the
// default locale reflect the visitor's country, not their browser/OS
// language setting.
function detectLocaleByLanguage(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const tag of preferred) {
    const base = tag.split("-")[0];
    if ((locales as readonly string[]).includes(base)) return base as Locale;
  }
  return defaultLocale;
}

// Country-code header set by the edge network the request passed through —
// checked in this order since either could be present depending on the
// deploy target: Vercel's own edge injects `x-vercel-ip-country` on every
// request (no extra API call, no latency, no config needed); Cloudflare
// injects `cf-ipcountry` the same way for any site proxied through it (even
// just DNS/CDN-level, not only Workers/Pages) — so this works unmodified
// whichever of those two the site ends up deployed on. Neither header
// exists locally in `next dev`/a bare Node host with no edge network in
// front of it — detectLocale's own fallback below covers that case.
function requestCountry(request: NextRequest): string | null {
  return request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry");
}

// Per an explicit request: the default locale should reflect the visitor's
// *country*, not their browser/OS language — only a Turkey-resolved IP
// should default to "tr"; every other country defaults to "en" regardless
// of what language their browser is set to (a Turkish-speaking visitor
// abroad still gets "en" by default; they can still switch languages
// manually via the site's own language switcher either way, this only
// controls the initial redirect). Falls back to the old Accept-Language
// negotiation only when no country header is present at all (local dev, or
// a host with no edge geolocation in front of it) — better than defaulting
// everyone to "en" with zero signal in those environments.
function detectLocale(request: NextRequest): Locale {
  const country = requestCountry(request);
  if (country) return country.toUpperCase() === "TR" ? "tr" : "en";
  return detectLocaleByLanguage(request);
}

// Next.js 16 renamed the middleware.ts convention to proxy.ts (function
// renamed middleware -> proxy) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  if (pathnameHasLocale) return;

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
