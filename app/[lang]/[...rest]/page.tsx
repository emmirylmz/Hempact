import { notFound } from "next/navigation";

// Catches any sub-path under a valid locale that doesn't match a real page
// (e.g. /tr/typo) so it renders our own branded app/[lang]/not-found.tsx
// instead of falling through to Next's generic, unstyled global 404 —
// without this, an unmatched path resolves to no route at all, which Next
// serves via its own top-level /_not-found rather than this layout's
// sibling not-found.tsx. Named routes (hakkimizda/urunler/iletisim) still
// take priority over this catch-all.
export default function CatchAll() {
  notFound();
}
