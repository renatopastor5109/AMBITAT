// /sitemap.xml: la lista de páginas públicas para Google.
export async function getServerSideProps({ req, res }) {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
  const paginas = [
    ["/conoce", "1.0", "weekly"],
    ["/", "0.8", "weekly"],
    ["/terminos", "0.3", "monthly"],
    ["/privacidad", "0.3", "monthly"],
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paginas.map(([p, prioridad, freq]) => `  <url><loc>${sitio}${p}</loc><changefreq>${freq}</changefreq><priority>${prioridad}</priority></url>`).join("\n") +
    `\n</urlset>\n`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}
export default function Sitemap() {
  return null;
}
