import type { MetadataRoute } from "next";
import notesData from "@/data/notes.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gardenx.qzz.io";

  // Standard static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/graph`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Dynamic note routes
  const noteRoutes: MetadataRoute.Sitemap = Object.keys(notesData || {}).map((slug) => ({
    url: `${baseUrl}/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...noteRoutes];
}
