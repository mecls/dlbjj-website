import type { MetadataRoute } from "next";
import { locais, seo } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = seo.url; // https://www.dlbjj.org

  return [
    {
      url: `${base}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...locais.map((local) => ({
      url: `${base}/${local.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
