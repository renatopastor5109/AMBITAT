// La app siempre: ambitat.../app (botones "Abrir la app", ícono instalado, QR).
import Head from "next/head";
import dynamic from "next/dynamic";

// ssr: false porque la app usa cámara, archivos e imágenes del navegador.
const BrotesApp = dynamic(() => import("../components/BrotesApp"), { ssr: false });

export default function PaginaApp() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <BrotesApp />
    </>
  );
}
