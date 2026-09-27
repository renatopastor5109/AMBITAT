import { Html, Head, Main, NextScript } from "next/document";

// Le dice a Google que el sitio está en español de México.
export default function Document() {
  return (
    <Html lang="es-MX">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
