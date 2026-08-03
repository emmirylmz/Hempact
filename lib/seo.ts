import type { Metadata } from "next";
import type { Locale } from "@/lib/content";

export const SITE_URL = "https://hempactly.com";
const OG_IMAGE = "/images/og-image.jpg";

// path must start with "/" (or be "" for the locale root) — e.g. "/urunler".
export function buildMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = `${SITE_URL}/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: `${SITE_URL}/tr${path}`,
        en: `${SITE_URL}/en${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Hempact",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
