"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "@/lib/theme";
import { locales } from "@/lib/content";
import { useLocale, useContent } from "@/lib/i18n/LocaleContext";
import { useScrollToSection } from "@/components/scroll/SmoothScrollProvider";

const HOME_SECTION_ID = "section-01-first-encounter";

// The HUD is intentionally limited to these 4 destinations: "home" is
// the original scroll-motion homepage, the other three are real pages
// rather than in-page anchors. Labels come from content.nav so they
// translate per locale.
type NavItem =
  | { kind: "home"; label: string }
  | { kind: "page"; label: string; href: string };

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollToSection = useScrollToSection();
  const pathname = usePathname();
  const locale = useLocale();
  const content = useContent();
  const isHome = pathname === `/${locale}`;

  const NAV_ITEMS: NavItem[] = [
    { kind: "home", label: content.nav.home },
    { kind: "page", label: content.nav.impact, href: `/${locale}/hakkimizda` },
    { kind: "page", label: content.nav.products, href: `/${locale}/urunler` },
    { kind: "page", label: content.nav.contact, href: `/${locale}/iletisim` },
  ];

  // Swaps only the leading /tr or /en segment, keeping the rest of the path
  // — e.g. on /en/urunler this points to /tr/urunler.
  const otherLocale = locales.find((candidate) => candidate !== locale) ?? locale;
  const otherLocaleHref = `/${otherLocale}${pathname.slice(`/${locale}`.length)}`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Moves keyboard/screen-reader focus into the overlay the moment it
  // opens — without this, focus stayed on the hamburger button while the
  // full-screen menu visually took over, so a keyboard user's next Tab
  // press landed back in the (visually hidden-behind-the-overlay) page
  // content instead of the menu itself. Looked up via `querySelector`
  // inside the effect (not a ref threaded through `renderNavItem`'s
  // render-phase call) — this project's React Compiler lint flags any
  // closure created during render that so much as references a ref
  // object, even one only assigned inside a later-executing callback ref;
  // see [[eslint_react_compiler_immutability]].
  useEffect(() => {
    if (menuOpen) dialogRef.current?.querySelector("a")?.focus();
  }, [menuOpen]);

  // On the home page, the "home" link smooth-scrolls to the top section via
  // Lenis (no real navigation). On any other page it's a real link back to
  // "/{locale}" — SmoothScrollProvider's own mount effect leaves the page at
  // the top since there's no hash to resolve.
  const handleHomeClick = (event: React.MouseEvent) => {
    setMenuOpen(false);
    if (!isHome) return;
    event.preventDefault();
    scrollToSection(HOME_SECTION_ID);
  };

  const renderNavItem = (item: NavItem, className: string) => {
    if (item.kind === "home") {
      return (
        <a
          key={item.label}
          href={isHome ? `#${HOME_SECTION_ID}` : `/${locale}`}
          onClick={handleHomeClick}
          className={className}
          style={{ color: colors.charcoal, fontFamily: className.includes("font-light") ? "var(--font-display)" : undefined }}
        >
          {item.label}
        </a>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={() => setMenuOpen(false)}
        className={className}
        style={{ color: colors.charcoal, fontFamily: className.includes("font-light") ? "var(--font-display)" : undefined }}
      >
        {item.label}
      </Link>
    );
  };

  // A bordered pill (not plain text like the other nav items) so the
  // language option reads as its own distinct control at a glance, on both
  // desktop and mobile — the size/padding is the only thing that varies per
  // placement.
  const renderLanguageSwitch = (className: string) => (
    <Link
      href={otherLocaleHref}
      onClick={() => setMenuOpen(false)}
      className={`rounded-full border transition-opacity hover:opacity-70 ${className}`}
      style={{ borderColor: colors.mutedCycleRed, color: colors.mutedCycleRed }}
    >
      {content.nav.switchTo}
    </Link>
  );

  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-6 py-5 transition-colors duration-500 md:px-10"
        style={{
          backgroundColor: scrolled ? `${colors.warmLinen}e6` : "transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(8px)" : "none",
        }}
      >
        <a
          href={isHome ? `#${HOME_SECTION_ID}` : `/${locale}`}
          onClick={handleHomeClick}
          className="text-sm font-medium tracking-[0.25em] uppercase"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          Hempact
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) =>
            renderNavItem(item, "text-xs tracking-[0.15em] uppercase transition-opacity hover:opacity-70")
          )}
          {renderLanguageSwitch("px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase")}
          <button
            type="button"
            aria-label={menuOpen ? content.nav.menuClose : content.nav.menuOpen}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-8 w-8 flex-col items-center justify-center gap-1.5"
          >
            <span
              className="h-px w-5 transition-transform duration-300"
              style={{
                backgroundColor: colors.charcoal,
                transform: menuOpen ? "translateY(3.5px) rotate(45deg)" : "none",
              }}
            />
            <span
              className="h-px w-5 transition-transform duration-300"
              style={{
                backgroundColor: colors.charcoal,
                transform: menuOpen ? "translateY(-3.5px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        </nav>

        {/* Language pill lives here too (not just inside the hamburger
            overlay) so switching languages on mobile doesn't require
            opening the menu first — it was previously only reachable from
            inside the full-screen overlay, easy to miss entirely. */}
        <div className="flex items-center gap-3 md:hidden">
          {renderLanguageSwitch("px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase")}
          <button
            type="button"
            aria-label={menuOpen ? content.nav.menuClose : content.nav.menuOpen}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-8 w-8 flex-col items-center justify-center gap-1.5"
          >
            <span
              className="h-px w-5 transition-transform duration-300"
              style={{
                backgroundColor: colors.charcoal,
                transform: menuOpen ? "translateY(3.5px) rotate(45deg)" : "none",
              }}
            />
            <span
              className="h-px w-5 transition-transform duration-300"
              style={{
                backgroundColor: colors.charcoal,
                transform: menuOpen ? "translateY(-3.5px) rotate(-45deg)" : "none",
              }}
            />
          </button>
        </div>
      </header>

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={content.nav.menuOpen}
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 transition-opacity duration-300"
        style={{
          backgroundColor: colors.warmLinen,
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
        }}
        aria-hidden={!menuOpen}
      >
        {NAV_ITEMS.map((item) =>
          renderNavItem(item, "text-2xl font-light tracking-wide transition-opacity hover:opacity-70")
        )}
        {renderLanguageSwitch("px-7 py-2 text-lg font-medium tracking-wide")}
      </div>
    </>
  );
}
