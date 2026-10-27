import Head from "next/head";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";

export default function App({ Component, pageProps }) {
  // Chrome en Android avisa una sola vez, muy temprano, que la app se puede
  // instalar. Se guarda aquí para que la app ofrezca el botón "Instalar" después.
  useEffect(() => {
    function instalable(e) {
      e.preventDefault();
      window.__ambitatInstalar = e;
      window.dispatchEvent(new Event("ambitat-instalable"));
    }
    function instalada() {
      window.__ambitatInstalar = null;
      try {
        localStorage.setItem("ambitat-instalada", "1");
      } catch {}
      window.dispatchEvent(new Event("ambitat-instalable"));
    }
    window.addEventListener("beforeinstallprompt", instalable);
    window.addEventListener("appinstalled", instalada);
    return () => {
      window.removeEventListener("beforeinstallprompt", instalable);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);
  return (
    <>
      <Head>
        <title>Ámbitat · Cuida tus plantas</title>
        <meta name="description" content="Identifica tus plantas con una foto, recibe recordatorios de riego y reserva mantenimiento a domicilio en CDMX." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
