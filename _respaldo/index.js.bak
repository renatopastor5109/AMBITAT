import dynamic from "next/dynamic";

// ssr: false porque la app usa cámara, archivos e imágenes del navegador,
// cosas que no existen del lado del servidor.
const BrotesApp = dynamic(() => import("../components/BrotesApp"), { ssr: false });

export default function Home() {
  return <BrotesApp />;
}
