import Head from "next/head";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ambitat.vercel.app";

const DEFAULT_TITLE = "Ámbitat — Identifica y cuida tus plantas con IA";
const DEFAULT_DESC =
  "Toma una foto y Ámbitat identifica tu planta con inteligencia artificial, diagnostica su salud y te recuerda cuándo regarla. Gratis, en español.";

// Etiquetas para Google: título, descripción, idioma, vista previa al compartir y datos de "app".
export default function Seo({ title = DEFAULT_TITLE, description = DEFAULT_DESC, path = "/", extraJsonLd }) {
  const url = `${SITE_URL}${path}`;
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Ámbitat",
    alternateName: "Ambitat",
    url: SITE_URL,
    description: DEFAULT_DESC,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web, iOS, Android",
    inLanguage: "es-MX",
    offers: { "@type": "Offer", price: "0", priceCurrency: "MXN" },
  };
  const verification = process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="keywords" content="identificar plantas, identificador de plantas, IA de plantas, app para plantas, cuidado de plantas, recordatorio de riego, Ámbitat, ambitat" />
      <link rel="canonical" href={url} />
      <link rel="icon" href="/logo.png" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="es_MX" />
      <meta property="og:site_name" content="Ámbitat" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${SITE_URL}/logo.png`} />
      <meta name="twitter:card" content="summary" />
      {verification && <meta name="google-site-verification" content={verification} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      {extraJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(extraJsonLd) }} />
      )}
    </Head>
  );
}
