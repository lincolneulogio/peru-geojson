export function urlDelSitio(): string {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada && configurada.trim() !== "") return configurada.replace(/\/$/, "");
  return "http://localhost:3000";
}
