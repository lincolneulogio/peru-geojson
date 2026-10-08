import type { MetadataRoute } from "next";
import { urlDelSitio } from "@/lib/sitio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: urlDelSitio(), lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
