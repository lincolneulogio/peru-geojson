import type { MetadataRoute } from "next";
import { urlDelSitio } from "@/lib/sitio";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${urlDelSitio()}/sitemap.xml`,
  };
}
