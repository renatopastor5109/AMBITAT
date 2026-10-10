import Head from "next/head";
import { Analytics } from "@vercel/analytics/react";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Ámbitat · Cuida tus plantas</title>
        <meta name="description" content="Identifica tus plantas con una foto, recibe recordatorios de riego y reserva mantenimiento a domicilio en CDMX." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#EAC468" />
        {/* Para poder agregarla a la pantalla de inicio (y en iPhone, recibir recordatorios) */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Ámbitat" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta property="og:title" content="Ámbitat · Cuida tus plantas" />
        <meta property="og:description" content="Identifica tus plantas con una foto y aprende a cuidarlas." />
        <meta property="og:image" content="/icon-512.png" />
      </Head>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
