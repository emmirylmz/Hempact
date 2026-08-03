import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PATHS = ["", "/hakkimizda", "/urunler", "/iletisim"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: `${SITE_URL}/tr${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
    alternates: {
      languages: {
        tr: `${SITE_URL}/tr${path}`,
        en: `${SITE_URL}/en${path}`,
      },
    },
  }));
}
