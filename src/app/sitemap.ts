import type { MetadataRoute } from "next";
import notesData from "@/data/notes.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gardenx.qzz.io";

  // Standard static routes — the site is an SPA, so views use ?view= URLs
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/?view=graph`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/?view=changelog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Dynamic note routes — notes live at /?p=slug
  const noteRoutes: MetadataRoute.Sitemap = Object.keys(notesData || {}).map((slug) => ({
    url: `${baseUrl}/?p=${encodeURIComponent(slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...noteRoutes];
}
