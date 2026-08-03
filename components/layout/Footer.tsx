"use client";

import { colors } from "@/lib/theme";
import { useContent } from "@/lib/i18n/LocaleContext";

export function Footer() {
  const content = useContent();

  return (
    <footer
      className="w-full px-6 py-8 text-center text-xs tracking-[0.1em] md:px-10"
      style={{ backgroundColor: colors.warmLinen, color: colors.charcoal }}
    >
      © {new Date().getFullYear()} Hempact. {content.footer.rights}
    </footer>
  );
}
