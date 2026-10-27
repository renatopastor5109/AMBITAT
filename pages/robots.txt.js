// /robots.txt: qué pueden leer los buscadores (todo menos el panel y la API).
export async function getServerSideProps({ req, res }) {
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.write(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /r/\nDisallow: /v/\n\nSitemap: ${sitio}/sitemap.xml\n`);
  res.end();
  return { props: {} };
}
export default function Robots() {
  return null;
}
