// Página de presentación pública → ambitat.vercel.app/conoce
// Es la que se pone como "Sitio web" en Google Maps (Perfil de Negocio) y la
// que Google puede leer: la app (/) solo funciona en el navegador.
// Precios: /admin → Servicio. Zonas: /admin → Servicio → Zonas.
import Head from "next/head";
import { RESPONSABLE as R } from "../lib/legal";
import { formatoPrecio, tamanosConPrecios } from "../lib/servicio";
import { ZONAS_INICIALES, enlaceWhatsApp } from "../lib/negocio";
import { clienteAdmin } from "../lib/usuarioServidor";
import { obtenerPrecios, obtenerZonas } from "../lib/agendaServidor";

export async function getServerSideProps({ req, res }) {
  let precios = null;
  let zonas = ZONAS_INICIALES;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = clienteAdmin();
      [precios, zonas] = await Promise.all([obtenerPrecios(admin), obtenerZonas(admin)]);
    }
  } catch (err) {
    console.error("No se pudieron leer precios o zonas:", err.message);
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host || "ambitat.vercel.app"}`;
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  return { props: { tamanos: tamanosConPrecios(precios), zonas, sitio } };
}

const MENSAJE_WA = "Hola, vi Ámbitat y quiero información sobre el mantenimiento de plantas a domicilio.";

const PREGUNTAS = (tamanos, zonas) => [
  ["¿La app cuesta?", "No. Identificar tus plantas, ver cómo cuidarlas y recibir los avisos de riego es gratis."],
  [
    "¿Necesito crear una cuenta?",
    "Para empezar, no: puedes escanear y guardar hasta 3 plantas sin cuenta. Para guardar más o reservar un mantenimiento, entras con Google o con tu correo.",
  ],
  [
    "¿Qué incluye el mantenimiento?",
    "Revisión de cada planta, riego, poda ligera, limpieza de hojas y revisión de plagas. En jardines medianos y grandes también abono y cambio de tierra ligero.",
  ],
  [
    "¿Cuánto cuesta?",
    `Depende del tamaño de tu jardín: ${tamanos.map((t) => `${t.nombre.toLowerCase()} ${formatoPrecio(t.precio)}`).join(", ")} (MXN, impuestos incluidos).`,
  ],
  ["¿Dónde dan servicio?", `En la Ciudad de México: ${zonas.join(", ")}. Si no ves tu colonia, escríbenos por WhatsApp.`],
  ["¿Atienden jardines verticales?", "Sí. Elige el tamaño grande al reservar."],
  [
    "¿Cómo pago?",
    "En línea, con tarjeta de crédito o débito. Si tu visita es en 3 días o más, también puedes pagar en efectivo en OXXO.",
  ],
  [
    "¿Puedo cambiar o cancelar mi cita?",
    "Sí, desde la app. Cambiar la fecha no cuesta nada hasta 24 horas antes. Si cancelas con 48 horas o más de anticipación te devolvemos todo tu pago.",
  ],
  [
    "¿Qué tan exacta es la identificación?",
    "Muy buena con fotos claras de la hoja y la planta completa, pero es inteligencia artificial y puede equivocarse. Tómala como una guía.",
  ],
];

export default function Conoce({ tamanos = tamanosConPrecios(null), zonas = ZONAS_INICIALES, sitio = "https://ambitat.vercel.app" }) {
  const preguntas = PREGUNTAS(tamanos, zonas);
  const minimo = Math.min(...tamanos.map((t) => t.precio));
  const maximo = Math.max(...tamanos.map((t) => t.precio));
  const titulo = "Mantenimiento de plantas a domicilio en CDMX · Ámbitat";
  const descripcion = `Cuidamos tus plantas en tu casa desde ${formatoPrecio(minimo)}. Y con la app gratuita de Ámbitat identificas cualquier planta con una foto y te avisamos cuándo regarla.`;
  const datosNegocio = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${sitio}/conoce#negocio`,
    name: "Ámbitat",
    description: descripcion,
    url: `${sitio}/conoce`,
    logo: `${sitio}/icon-512.png`,
    image: `${sitio}/icon-512.png`,
    telephone: R.telefono,
    email: R.correo,
    priceRange: `${formatoPrecio(minimo)} – ${formatoPrecio(maximo)} MXN`,
    address: { "@type": "PostalAddress", addressLocality: "Ciudad de México", addressCountry: "MX" },
    areaServed: [{ "@type": "City", name: "Ciudad de México" }, ...zonas.filter((z) => z !== "Ciudad de México").map((z) => ({ "@type": "Place", name: `${z}, Ciudad de México` }))],
    makesOffer: tamanos.map((t) => ({
      "@type": "Offer",
      name: `Mantenimiento de plantas · jardín ${t.nombre.toLowerCase()}`,
      price: (t.precio / 100).toFixed(2),
      priceCurrency: "MXN",
      description: t.incluye.join(". "),
    })),
  };
  const datosPreguntas = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preguntas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <Head>
        <title>{titulo}</title>
        <meta name="description" content={descripcion} />
        <link rel="canonical" href={`${sitio}/conoce`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={descripcion} />
        <meta property="og:url" content={`${sitio}/conoce`} />
        <meta property="og:image" content={`${sitio}/icon-512.png`} />
        <meta property="og:locale" content="es_MX" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosNegocio) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosPreguntas) }} />
      </Head>
      <style>{ESTILOS}</style>

      <div className="cn">
        <header className="cn-barra">
          <a href="/conoce" className="cn-logo" aria-label="Ámbitat, inicio">
            <img src="/logo.png" alt="Ámbitat" />
          </a>
          <a href="/" className="cn-boton cn-boton-chico">
            Abrir la app
          </a>
        </header>

        {/* ---------- Portada: el árbol crece ---------- */}
        <section className="cn-portada">
          <div className="cn-portada-texto">
            <h1>Tus plantas, bien cuidadas. En tu casa o con tu celular.</h1>
            <p className="cn-entrada">
              Vamos a tu casa en la Ciudad de México a darle mantenimiento a tus plantas. Y entre visita y visita, nuestra app
              gratuita te dice qué planta tienes, cómo cuidarla y cuándo regarla.
            </p>
            <div className="cn-acciones">
              <a href="/" className="cn-boton">
                Abrir la app gratis
              </a>
              <a href={enlaceWhatsApp(MENSAJE_WA)} className="cn-boton cn-boton-claro" target="_blank" rel="noopener">
                Escríbenos por WhatsApp
              </a>
            </div>
            <p className="cn-nota">Mantenimiento desde {formatoPrecio(minimo)}. La app es gratis.</p>
          </div>
          <div className="cn-arbol" aria-hidden="true">
            <img className="cn-raices" src="/intro-arbol.jpg" alt="" />
            <img className="cn-copa" src="/intro-arbol.jpg" alt="" />
          </div>
        </section>

        {/* ---------- Mantenimiento ---------- */}
        <section className="cn-servicio" id="mantenimiento">
          <div className="cn-ancho">
            <h2>Mantenimiento a domicilio</h2>
            <p className="cn-sub">
              Llegamos a la hora que elijas y revisamos planta por planta. Pagas en línea al reservar, con tarjeta o en OXXO.
            </p>
            <div className="cn-precios">
              {tamanos.map((t, i) => (
                <article key={t.key} className={"cn-precio" + (i === 1 ? " cn-precio-medio" : "")}>
                  <h3>Jardín {t.nombre.toLowerCase()}</h3>
                  <p className="cn-monto">
                    {formatoPrecio(t.precio)} <span>MXN</span>
                  </p>
                  <ul>
                    {t.incluye.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <ol className="cn-pasos-reserva">
              <li>
                <span><strong>Abre la app y entra a Tienda.</strong> Elige el tamaño de tu jardín.</span>
              </li>
              <li>
                <span><strong>Escoge fecha y hora.</strong> El calendario solo te enseña días con lugar.</span>
              </li>
              <li>
                <span><strong>Paga y listo.</strong> Te llega la confirmación y puedes cambiar o cancelar desde la app.</span>
              </li>
            </ol>
            <a href="/" className="cn-boton cn-boton-crema">
              Reservar mi visita
            </a>
          </div>
        </section>

        {/* ---------- La app ---------- */}
        <section className="cn-app">
          <div className="cn-ancho">
            <h2>La app: cuida tus plantas con una foto</h2>
            <div className="cn-app-filas">
              <div className="cn-app-fila">
                <img src="/stages/s6.png" alt="" />
                <div>
                  <h3>Toma una foto</h3>
                  <p>Apunta la cámara a cualquier planta. No necesitas saber cómo se llama.</p>
                </div>
              </div>
              <div className="cn-app-fila">
                <img src="/stages/s5.png" alt="" />
                <div>
                  <h3>Te decimos qué es y cómo cuidarla</h3>
                  <p>Su nombre, cuánta luz y agua necesita, si es tóxica para tus mascotas y qué plagas vigilar.</p>
                </div>
              </div>
              <div className="cn-app-fila">
                <img src="/stages/s4.png" alt="" />
                <div>
                  <h3>Te avisamos cuándo regar</h3>
                  <p>Un recordatorio el día que le toca agua, y avisos cuando viene frío, calor o lluvia fuerte en la ciudad.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Zonas ---------- */}
        <section className="cn-zonas">
          <div className="cn-ancho">
            <h2>Dónde damos servicio</h2>
            <ul className="cn-chips">
              {zonas.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
            <p className="cn-sub">
              ¿No ves tu colonia?{" "}
              <a href={enlaceWhatsApp(MENSAJE_WA)} target="_blank" rel="noopener">
                Pregúntanos por WhatsApp
              </a>
              .
            </p>
          </div>
        </section>

        {/* ---------- Preguntas ---------- */}
        <section className="cn-preguntas">
          <div className="cn-ancho">
            <h2>Preguntas frecuentes</h2>
            {preguntas.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="cn-pie">
          <div className="cn-ancho">
            <p className="cn-pie-grande">¿Tienes una planta que no sabes cómo cuidar?</p>
            <div className="cn-acciones">
              <a href="/" className="cn-boton cn-boton-crema">
                Abrir la app gratis
              </a>
              <a href={enlaceWhatsApp(MENSAJE_WA)} className="cn-boton cn-boton-borde" target="_blank" rel="noopener">
                WhatsApp {R.telefono}
              </a>
            </div>
            <p className="cn-legal">
              <a href={`mailto:${R.correo}`}>{R.correo}</a>
              <span aria-hidden="true"> / </span>
              <a href="/terminos">Términos y condiciones</a>
              <span aria-hidden="true"> / </span>
              <a href="/privacidad">Aviso de privacidad</a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

const ESTILOS = `
:root {
  --oro: #E8C162;
  --pino: #3F5D3E;
  --pino-hondo: #28402A;
  --crema: #F5EFDD;
  --tinta: #221C13;
  --tinta-suave: #5c5240;
  --madera: #8B5A2E;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--oro); }
.cn { font-family: 'Inter', system-ui, sans-serif; color: var(--tinta); -webkit-font-smoothing: antialiased; }
.cn h1, .cn h2, .cn h3, .cn-pie-grande, .cn-monto { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; }
.cn a { color: inherit; }
.cn a:focus-visible, .cn summary:focus-visible { outline: 3px solid var(--pino-hondo); outline-offset: 3px; border-radius: 6px; }
.cn-ancho { max-width: 1040px; margin: 0 auto; padding: 0 20px; }
.cn-preguntas details { max-width: 760px; }

/* Barra */
.cn-barra { display: flex; justify-content: space-between; align-items: center; max-width: 1040px; margin: 0 auto; padding: 18px 20px; }
.cn-logo img { height: 34px; width: auto; display: block; }

/* Botones */
.cn-boton { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 24px; border-radius: 999px; background: var(--pino); color: #fff !important; font-weight: 700; font-size: 16px; text-decoration: none; border: 2px solid var(--pino); transition: background .15s, transform .15s; }
.cn-boton:hover { background: var(--pino-hondo); border-color: var(--pino-hondo); }
.cn-boton:active { transform: scale(0.98); }
.cn-boton-chico { min-height: 40px; padding: 0 16px; font-size: 14px; }
.cn-boton-claro { background: transparent; color: var(--tinta) !important; border-color: var(--tinta); }
.cn-boton-claro:hover { background: rgba(34,28,19,0.06); border-color: var(--tinta); }
.cn-boton-crema { background: var(--crema); color: var(--pino-hondo) !important; border-color: var(--crema); }
.cn-boton-crema:hover { background: #fff; border-color: #fff; }
.cn-boton-borde { background: transparent; border-color: rgba(245,239,221,0.6); }
.cn-boton-borde:hover { background: rgba(245,239,221,0.1); border-color: var(--crema); }
.cn-acciones { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }

/* Portada */
.cn-portada { max-width: 1040px; margin: 0 auto; padding: 10px 20px 0; display: grid; grid-template-columns: 1fr; align-items: end; }
.cn-portada h1 { font-size: clamp(40px, 9.5vw, 76px); line-height: 0.98; letter-spacing: -0.035em; font-weight: 800; margin: 18px 0 0; max-width: 12ch; }
.cn-entrada { font-size: 18px; line-height: 1.55; max-width: 34em; margin: 20px 0 0; color: #3a3122; }
.cn-nota { font-size: 14px; color: var(--tinta-suave); margin: 14px 0 0; }
.cn-arbol { position: relative; width: min(80%, 320px); aspect-ratio: 600 / 706; margin: 26px auto 0; justify-self: center; }
.cn-arbol img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.cn-raices { clip-path: inset(56.5% 0 0 0); animation: cnRaices 1.6s cubic-bezier(.3,.7,.2,1) both; }
.cn-copa { clip-path: inset(0 0 43.5% 0); animation: cnCopa 1.6s .15s cubic-bezier(.3,.7,.2,1) both; transform-origin: 50% 56%; }
@keyframes cnRaices { from { clip-path: inset(56.5% 0 43.5% 0); } to { clip-path: inset(56.5% 0 0 0); } }
@keyframes cnCopa { from { clip-path: inset(56.5% 0 43.5% 0); } to { clip-path: inset(0 0 43.5% 0); } }

/* Servicio (banda verde) */
.cn-servicio { background: var(--pino-hondo); color: var(--crema); padding: 64px 0 70px; border-radius: 36px 36px 0 0; margin-top: -2px; position: relative; }
.cn h2 { font-size: clamp(32px, 6vw, 48px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 800; margin: 0; max-width: 16ch; }
.cn-sub { font-size: 17px; line-height: 1.55; max-width: 36em; margin: 14px 0 0; opacity: 0.9; }
.cn-servicio .cn-sub { color: #e6dcc0; }
.cn-precios { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 34px; }
.cn-precio { background: rgba(245,239,221,0.07); border: 1px solid rgba(245,239,221,0.18); border-radius: 22px; padding: 22px 22px 18px; }
.cn-precio-medio { background: var(--crema); color: var(--tinta); border-color: var(--crema); }
.cn-precio h3 { font-size: 20px; margin: 0; font-weight: 600; letter-spacing: -0.01em; }
.cn-monto { font-size: 46px; font-weight: 800; letter-spacing: -0.04em; margin: 6px 0 12px; line-height: 1; }
.cn-monto span { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 0; opacity: 0.7; }
.cn-precio ul { list-style: none; padding: 0; margin: 0; }
.cn-precio li { font-size: 15px; line-height: 1.4; padding: 7px 0 7px 22px; position: relative; border-top: 1px solid rgba(245,239,221,0.14); }
.cn-precio-medio li { border-top-color: #e2d7b8; }
.cn-precio li::before { content: ""; position: absolute; left: 2px; top: 13px; width: 9px; height: 9px; border-radius: 50%; background: var(--oro); }
.cn-precio-medio li::before { background: var(--pino); }
.cn-pasos-reserva { list-style: none; counter-reset: paso; padding: 0; margin: 36px 0 30px; display: grid; gap: 14px; }
.cn-pasos-reserva li { counter-increment: paso; display: grid; grid-template-columns: 40px 1fr; gap: 12px; align-items: start; font-size: 16px; line-height: 1.5; color: #e6dcc0; }
.cn-pasos-reserva li::before { content: counter(paso); width: 40px; height: 40px; border-radius: 50%; background: var(--oro); color: var(--tinta); font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.cn-pasos-reserva strong { color: var(--crema); display: block; }
.cn-pasos-reserva li > span { padding-top: 8px; }

/* App */
.cn-app { background: var(--crema); padding: 64px 0; }
.cn-app-filas { display: grid; gap: 8px; margin-top: 30px; }
.cn-app-fila { display: grid; grid-template-columns: 76px 1fr; gap: 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid #e2d7b8; }
.cn-app-fila:last-child { border-bottom: none; }
.cn-app-fila img { width: 76px; height: 76px; object-fit: contain; background: #EFE6CC; border-radius: 20px; padding: 6px; }
.cn-app-fila h3 { font-size: 21px; margin: 0; font-weight: 600; letter-spacing: -0.01em; }
.cn-app-fila p { margin: 4px 0 0; font-size: 15.5px; line-height: 1.5; color: var(--tinta-suave); max-width: 40em; }

/* Zonas */
.cn-zonas { padding: 64px 0 56px; }
.cn-chips { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
.cn-chips li { background: var(--crema); border-radius: 999px; padding: 9px 16px; font-weight: 700; font-size: 15px; }
.cn-zonas .cn-sub a { font-weight: 700; }

/* Preguntas */
.cn-preguntas { padding: 8px 0 70px; }
.cn-preguntas h2 { margin-bottom: 20px; }
.cn details { border-top: 1.5px solid rgba(34,28,19,0.18); }
.cn details:last-of-type { border-bottom: 1.5px solid rgba(34,28,19,0.18); }
.cn summary { cursor: pointer; list-style: none; padding: 18px 40px 18px 0; font-weight: 700; font-size: 17px; position: relative; }
.cn summary::-webkit-details-marker { display: none; }
.cn summary::after { content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 26px; font-weight: 500; transition: transform .2s; }
.cn details[open] summary::after { transform: translateY(-50%) rotate(45deg); }
.cn details p { margin: 0 0 18px; font-size: 16px; line-height: 1.6; color: #3a3122; max-width: 38em; }

/* Pie */
.cn-pie { background: var(--pino-hondo); color: var(--crema); padding: 60px 0 40px; border-radius: 36px 36px 0 0; }
.cn-pie-grande { font-size: clamp(28px, 5.5vw, 42px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin: 0; max-width: 18ch; }
.cn-legal { margin: 44px 0 0; font-size: 14px; color: #cfc4a6; line-height: 1.8; }
.cn-legal a { color: #cfc4a6; }

@media (min-width: 760px) {
  .cn-portada { grid-template-columns: 1.15fr 0.85fr; gap: 30px; padding-top: 30px; }
  .cn-portada-texto { padding-bottom: 80px; }
  .cn-arbol { margin-top: 0; width: min(100%, 420px); }
  .cn-precios { grid-template-columns: repeat(3, 1fr); align-items: start; }
  .cn-precio-medio { transform: translateY(-14px); }
  .cn-pasos-reserva { grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .cn-pasos-reserva li { grid-template-columns: 1fr; }
  .cn-app-filas { grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .cn-app-fila { grid-template-columns: 1fr; border-bottom: none; align-items: start; }
  .cn-app-fila img { width: 96px; height: 96px; }
}
@media (prefers-reduced-motion: reduce) {
  .cn-raices, .cn-copa { animation: none; }
  .cn-boton { transition: none; }
}
`;
