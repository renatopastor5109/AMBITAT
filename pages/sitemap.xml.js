import { SITE_URL } from "../components/Seo";

// Genera /sitemap.xml: la lista de páginas que Google debe conocer.
const PAGINAS = [
  { path: "/", priority: "1.0", freq: "weekly" },
  { path: "/identificar-plantas", priority: "0.9", freq: "monthly" },
];

export async function getServerSideProps({ res }) {
  const hoy = new Date().toISOString().split("T")[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGINAS.map(
  (p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${hoy}</lastmod><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
).join("\n")}
</urlset>`;
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
