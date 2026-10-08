import type { MetadataRoute } from "next";

function origen(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: origen(), lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
