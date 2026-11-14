// Página de presentación (web pública). Se ve en "/" para quien llega por
// primera vez y en "/conoce". Precios y zonas: /admin → Servicio.
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { RESPONSABLE as R } from "../lib/legal";
import { formatoPrecio, tamanosConPrecios } from "../lib/servicio";
import { ZONAS_INICIALES, enlaceWhatsApp } from "../lib/negocio";

const MENSAJE_WA = "Hola, vi Ámbitat y quiero información sobre el mantenimiento de plantas a domicilio.";
const MENSAJE_VERTICAL = "Hola, vi Ámbitat y me interesa un jardín vertical. Te cuento de mi espacio:";

// ---------- Plantas de ejemplo para la demo ----------
const DEMO = [
  {
    clave: "monstera",
    nombre: "Monstera",
    cientifico: "Monstera deliciosa",
    img: "/stages/s6.png",
    estado: ["✅ Saludable", "verde"],
    datos: ["💧 Cada 7 días", "☀️ Luz indirecta brillante", "🐾 Tóxica para mascotas"],
    consejo: "Gírala un poco cada semana para que crezca pareja.",
    aviso: "Tu Monstera necesita agua el jueves 💧",
  },
  {
    clave: "suculenta",
    nombre: "Suculenta",
    cientifico: "Echeveria elegans",
    img: "/stages/s3.png",
    estado: ["✅ Saludable", "verde"],
    datos: ["💧 Cada 14 días", "☀️ Sol directo", "🐾 Segura para mascotas"],
    consejo: "Riega solo cuando la tierra esté seca del todo.",
    aviso: "Viene lluvia fuerte: mete tu suculenta bajo techo 🌧️",
  },
  {
    clave: "pothos",
    nombre: "Pothos",
    cientifico: "Epipremnum aureum",
    img: "/stages/s5.png",
    estado: ["⚠️ Hojas amarillas", "ambar"],
    datos: ["💧 Cada 7 a 10 días", "⛅ Luz media", "🐾 Tóxica para mascotas"],
    consejo: "Las hojas amarillas suelen ser exceso de agua: deja secar la tierra.",
    aviso: "Hoy no riegues tu Pothos: su tierra sigue húmeda 🌱",
  },
];

function DemoTelefono() {
  const [elegida, setElegida] = useState(null);
  const [fase, setFase] = useState("elige"); // elige | escaneando | resultado
  const [aviso, setAviso] = useState(false);
  const tiempos = useRef([]);
  const caja = useRef(null);
  const tocado = useRef(false);

  const limpiar = () => {
    tiempos.current.forEach(clearTimeout);
    tiempos.current = [];
  };
  function escanear(p) {
    limpiar();
    setElegida(p);
    setAviso(false);
    setFase("escaneando");
    tiempos.current.push(setTimeout(() => setFase("resultado"), 1700));
    tiempos.current.push(setTimeout(() => setAviso(true), 3100));
  }
  function otra() {
    limpiar();
    setFase("elige");
    setAviso(false);
  }

  // Se reproduce sola una vez, cuando el teléfono se ve en pantalla.
  useEffect(() => {
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (quieto || !caja.current || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !tocado.current) {
          obs.disconnect();
          tiempos.current.push(setTimeout(() => !tocado.current && escanear(DEMO[0]), 1100));
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(caja.current);
    return () => {
      obs.disconnect();
      limpiar();
    };
  }, []);

  return (
    <div className="dm" ref={caja}>
      <div className="dm-telefono" aria-label="Demostración de la app Ámbitat" role="group">
        <div className="dm-isla" aria-hidden="true" />
        <div className={"dm-aviso" + (aviso ? " dm-aviso-ve" : "")} role="status" aria-live="polite">
          {aviso && elegida && (
            <>
              <img src="/icon-192.png" alt="" />
              <span>
                <strong>Ámbitat 🌿</strong> <em>ahora</em>
                <br />
                {elegida.aviso}
              </span>
            </>
          )}
        </div>
        <div className="dm-pantalla">
          <p className="dm-titulo">{fase === "elige" ? "Mi jardín" : fase === "escaneando" ? "Analizando…" : "Listo"}</p>

          {fase === "elige" && (
            <div className="dm-elige">
              <p className="dm-instruccion">Toca una planta para escanearla</p>
              <div className="dm-plantas">
                {DEMO.map((p) => (
                  <button
                    key={p.clave}
                    onClick={() => {
                      tocado.current = true;
                      escanear(p);
                    }}
                  >
                    <img src={p.img} alt="" />
                    <span>{p.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {fase !== "elige" && elegida && (
            <div className="dm-escaner">
              <div className={"dm-visor" + (fase === "resultado" ? " dm-visor-chico" : "")}>
                <img src={elegida.img} alt="" />
                {fase === "escaneando" && <span className="dm-linea" aria-hidden="true" />}
                <i className="dm-esq a" />
                <i className="dm-esq b" />
                <i className="dm-esq c" />
                <i className="dm-esq d" />
              </div>
              {fase === "resultado" && (
                <div className="dm-resultado">
                  <p className="dm-nombre">{elegida.nombre}</p>
                  <p className="dm-cientifico">{elegida.cientifico}</p>
                  <div className="dm-chips">
                    <span className={"dm-chip dm-" + elegida.estado[1]}>{elegida.estado[0]}</span>
                    {elegida.datos.map((d) => (
                      <span key={d} className="dm-chip">
                        {d}
                      </span>
                    ))}
                  </div>
                  <p className="dm-consejo">{elegida.consejo}</p>
                </div>
              )}
            </div>
          )}

          <div className="dm-nav" aria-hidden="true">
            <span className="dm-nav-activo">🌿</span>
            <span>📷</span>
            <span>📍</span>
            <span>🛒</span>
          </div>
        </div>
      </div>
      <div className="dm-pie">
        {fase === "resultado" ? (
          <button
            className="dm-otra"
            onClick={() => {
              tocado.current = true;
              otra();
            }}
          >
            Probar con otra planta
          </button>
        ) : (
          <p>Así funciona. Toca una planta.</p>
        )}
      </div>
    </div>
  );
}

const PREGUNTAS = (tamanos, zonas) => [
  ["¿La app cuesta?", "No. Identificar tus plantas, ver cómo cuidarlas y recibir los avisos de riego es gratis."],
  [
    "¿Necesito descargar algo?",
    "No hace falta tienda de apps: se abre en el navegador de tu celular o tu computadora. Si quieres, la agregas a tu pantalla de inicio y se usa como cualquier app.",
  ],
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
  ["¿Atienden jardines verticales?", "Sí. Si ya tienes uno, elige el tamaño grande al reservar. Si quieres uno nuevo, escríbenos por WhatsApp y te mandamos una propuesta."],
  ["¿Cómo pago?", "En línea, con tarjeta de crédito o débito. Si tu visita es en 3 días o más, también puedes pagar en efectivo en OXXO."],
  [
    "¿Puedo cambiar o cancelar mi cita?",
    "Sí, desde la app. Cambiar la fecha no cuesta nada hasta 24 horas antes. Si cancelas con 48 horas o más de anticipación te devolvemos todo tu pago.",
  ],
  [
    "¿Qué tan exacta es la identificación?",
    "Muy buena con fotos claras de la hoja y la planta completa, pero es inteligencia artificial y puede equivocarse. Tómala como una guía.",
  ],
];

export default function Presentacion({ tamanos = tamanosConPrecios(null), zonas = ZONAS_INICIALES, sitio = "https://ambitat.vercel.app" }) {
  const preguntas = PREGUNTAS(tamanos, zonas);
  const minimo = Math.min(...tamanos.map((t) => t.precio));
  const maximo = Math.max(...tamanos.map((t) => t.precio));
  const titulo = "Ámbitat · Cuidado de plantas en CDMX: app gratis y mantenimiento a domicilio";
  const descripcion = `Identifica tus plantas con una foto y recibe avisos de riego gratis. Y si quieres que alguien las cuide, vamos a tu casa en la Ciudad de México desde ${formatoPrecio(minimo)}.`;
  const [conSombra, setConSombra] = useState(false);
  useEffect(() => {
    const alBajar = () => setConSombra(window.scrollY > 8);
    alBajar();
    window.addEventListener("scroll", alBajar, { passive: true });
    return () => window.removeEventListener("scroll", alBajar);
  }, []);

  const datosNegocio = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${sitio}/#negocio`,
    name: "Ámbitat",
    description: descripcion,
    url: `${sitio}/`,
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
        <link rel="canonical" href={`${sitio}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={descripcion} />
        <meta property="og:url" content={`${sitio}/`} />
        <meta property="og:image" content={`${sitio}/icon-512.png`} />
        <meta property="og:locale" content="es_MX" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosNegocio) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosPreguntas) }} />
      </Head>
      <style>{ESTILOS}</style>

      <div className="cn">
        <header className={"cn-barra" + (conSombra ? " cn-barra-sombra" : "")}>
          <div className="cn-barra-in">
            <a href="/conoce" className="cn-logo" aria-label="Ámbitat, inicio">
              <img src="/logo.png" alt="Ámbitat" />
            </a>
            <nav className="cn-menu" aria-label="Secciones de la página">
              <a href="#mantenimiento">Mantenimiento</a>
              <a href="#la-app">La app</a>
              <a href="#verticales">Jardines verticales</a>
              <a href="#preguntas">Preguntas</a>
            </nav>
            <a href="/app" className="cn-boton cn-boton-chico">
              Abrir la app
            </a>
          </div>
        </header>

        {/* ---------- Portada con la demo ---------- */}
        <section className="cn-portada">
          <div className="cn-portada-texto">
            <h1>Tus plantas, bien cuidadas. En tu casa o con tu celular.</h1>
            <p className="cn-entrada">
              Toma una foto y la app te dice qué planta es, cómo cuidarla y cuándo regarla. Y si prefieres que alguien lo haga por ti,
              vamos a tu casa en la Ciudad de México.
            </p>
            <div className="cn-acciones">
              <a href="/app" className="cn-boton">
                Abrir la app gratis
              </a>
              <a href="#mantenimiento" className="cn-boton cn-boton-claro">
                Ver el mantenimiento
              </a>
            </div>
            <p className="cn-nota">Sin descargar nada. Funciona en celular y en computadora.</p>
          </div>
          <DemoTelefono />
        </section>

        {/* ---------- La app ---------- */}
        <section className="cn-app" id="la-app">
          <div className="cn-ancho">
            <h2>Una app que se acuerda por ti</h2>
            <div className="cn-app-filas">
              <div className="cn-app-fila">
                <span className="cn-icono" aria-hidden="true">📸</span>
                <div>
                  <h3>Escanea cualquier planta</h3>
                  <p>Su nombre, cuánta luz y agua necesita, si es tóxica para tus mascotas y qué plagas vigilar.</p>
                </div>
              </div>
              <div className="cn-app-fila">
                <span className="cn-icono" aria-hidden="true">💧</span>
                <div>
                  <h3>Avisos de riego y del clima</h3>
                  <p>Te llega un aviso el día que le toca agua, y otro cuando viene frío, calor o lluvia fuerte en la ciudad.</p>
                </div>
              </div>
              <div className="cn-app-fila">
                <span className="cn-icono" aria-hidden="true">🛋️</span>
                <div>
                  <h3>Tu jardín por cuartos</h3>
                  <p>Agrupa tus plantas por sala, balcón u oficina y riega todo un cuarto de un toque.</p>
                </div>
              </div>
            </div>
            <a href="/app" className="cn-boton">
              Empezar con mi primera planta
            </a>
          </div>
        </section>

        {/* ---------- Mantenimiento ---------- */}
        <section className="cn-servicio" id="mantenimiento">
          <div className="cn-ancho">
            <h2>Mantenimiento a domicilio</h2>
            <p className="cn-sub">Llegamos a la hora que elijas y revisamos planta por planta. Pagas en línea al reservar, con tarjeta o en OXXO.</p>
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
                <span>
                  <strong>Abre la app y entra a Tienda.</strong> Elige el tamaño de tu jardín.
                </span>
              </li>
              <li>
                <span>
                  <strong>Escoge fecha y hora.</strong> El calendario solo te enseña días con lugar.
                </span>
              </li>
              <li>
                <span>
                  <strong>Paga y listo.</strong> Te llega la confirmación y puedes cambiar o cancelar desde la app.
                </span>
              </li>
            </ol>
            <a href="/app?ir=tienda" className="cn-boton cn-boton-crema">
              Reservar mi visita
            </a>
          </div>
        </section>

        {/* ---------- Jardines verticales (cuando tengas fotos reales, ponlas de fondo aquí) ---------- */}
        <section className="cn-verticales" id="verticales">
          <div className="cn-ancho">
            <div className="cn-verticales-caja">
              <h2>Jardines verticales</h2>
              <p>
                Un muro verde cambia por completo una sala, una terraza o una oficina. Cuéntanos de tu espacio (medidas, luz y una foto) y
                te mandamos una propuesta. También damos mantenimiento a los que ya existen.
              </p>
              <a href={enlaceWhatsApp(MENSAJE_VERTICAL)} className="cn-boton cn-boton-crema" target="_blank" rel="noopener">
                Cotizar por WhatsApp
              </a>
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
        <section className="cn-preguntas" id="preguntas">
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
          <div className="cn-ancho cn-pie-grid">
            <div>
              <p className="cn-pie-grande">¿Tienes una planta que no sabes cómo cuidar?</p>
              <div className="cn-acciones">
                <a href="/app" className="cn-boton cn-boton-crema">
                  Abrir la app gratis
                </a>
                <a href={enlaceWhatsApp(MENSAJE_WA)} className="cn-boton cn-boton-borde" target="_blank" rel="noopener">
                  WhatsApp {R.telefono}
                </a>
              </div>
            </div>
            <img className="cn-pie-arbol" src="/intro-arbol.jpg" alt="" />
          </div>
          <div className="cn-ancho">
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
@view-transition { navigation: auto; }
:root {
  --oro: #E8C162;
  --pino: #3F5D3E;
  --pino-hondo: #28402A;
  --crema: #F5EFDD;
  --crema-2: #EFE6CC;
  --tinta: #221C13;
  --tinta-suave: #5c5240;
  --madera: #8B5A2E;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 76px; }
html, body { margin: 0; background: var(--oro); }
.cn { font-family: 'Inter', system-ui, sans-serif; color: var(--tinta); -webkit-font-smoothing: antialiased; }
.cn h1, .cn h2, .cn h3, .cn-pie-grande, .cn-monto { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; }
.cn a { color: inherit; }
.cn a:focus-visible, .cn button:focus-visible, .cn summary:focus-visible { outline: 3px solid var(--pino-hondo); outline-offset: 3px; border-radius: 8px; }
.cn-ancho { max-width: 1120px; margin: 0 auto; padding: 0 20px; }

/* Barra fija */
.cn-barra { position: sticky; top: 0; z-index: 20; background: rgba(232,193,98,0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: box-shadow .25s; }
.cn-barra-sombra { box-shadow: 0 1px 0 rgba(34,28,19,0.08), 0 10px 30px -18px rgba(34,28,19,0.35); }
.cn-barra-in { display: flex; justify-content: space-between; align-items: center; gap: 16px; max-width: 1120px; margin: 0 auto; padding: 12px 20px; }
.cn-logo img { height: 32px; width: auto; display: block; }
.cn-menu { display: none; gap: 26px; font-weight: 600; font-size: 15px; }
.cn-menu a { text-decoration: none; opacity: .8; }
.cn-menu a:hover { opacity: 1; text-decoration: underline; text-underline-offset: 4px; }

/* Botones */
.cn-boton { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 24px; border-radius: 999px; background: var(--pino); color: #fff !important; font-weight: 700; font-size: 16px; text-decoration: none; border: 2px solid var(--pino); transition: background .15s, transform .15s; cursor: pointer; font-family: inherit; }
.cn-boton:hover { background: var(--pino-hondo); border-color: var(--pino-hondo); }
.cn-boton:active { transform: scale(0.97); }
.cn-boton-chico { min-height: 40px; padding: 0 16px; font-size: 14px; }
.cn-boton-claro { background: transparent; color: var(--tinta) !important; border-color: var(--tinta); }
.cn-boton-claro:hover { background: rgba(34,28,19,0.06); border-color: var(--tinta); }
.cn-boton-crema { background: var(--crema); color: var(--pino-hondo) !important; border-color: var(--crema); }
.cn-boton-crema:hover { background: #fff; border-color: #fff; }
.cn-boton-borde { background: transparent; border-color: rgba(245,239,221,0.6); }
.cn-boton-borde:hover { background: rgba(245,239,221,0.1); border-color: var(--crema); }
.cn-acciones { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }

/* Portada */
.cn-portada { max-width: 1120px; margin: 0 auto; padding: 18px 20px 56px; display: grid; grid-template-columns: 1fr; gap: 34px; align-items: center; }
.cn-portada h1 { font-size: clamp(40px, 9.5vw, 72px); line-height: 0.98; letter-spacing: -0.035em; font-weight: 800; margin: 10px 0 0; max-width: 12ch; }
.cn-entrada { font-size: 18px; line-height: 1.55; max-width: 32em; margin: 20px 0 0; color: #3a3122; }
.cn-nota { font-size: 14px; color: var(--tinta-suave); margin: 14px 0 0; }

/* ---------- Demo: teléfono ---------- */
.dm { justify-self: center; width: min(100%, 330px); }
.dm-telefono { position: relative; width: 100%; aspect-ratio: 9 / 18.6; background: var(--tinta); border-radius: 46px; padding: 11px; box-shadow: 0 40px 80px -30px rgba(40,64,42,0.75), inset 0 0 0 2px #3a3226; transform: rotate(-2.5deg); transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.dm-telefono:hover { transform: rotate(0); }
.dm-isla { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); width: 92px; height: 26px; border-radius: 14px; background: #000; z-index: 3; }
.dm-pantalla { position: relative; height: 100%; border-radius: 36px; overflow: hidden; background: #EAC468; display: flex; flex-direction: column; padding: 54px 16px 12px; }
.dm-titulo { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -0.02em; margin: 0 0 10px; }
.dm-elige { flex: 1; display: flex; flex-direction: column; }
.dm-instruccion { font-size: 13px; color: #4a4130; margin: 0 0 12px; }
.dm-plantas { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dm-plantas button { background: var(--crema); border: none; border-radius: 18px; padding: 10px 8px 10px; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 13px; color: var(--tinta); display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform .15s, box-shadow .15s; }
.dm-plantas button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px -12px rgba(40,64,42,.6); }
.dm-plantas button:active { transform: scale(.96); }
.dm-plantas button:first-child { grid-column: span 2; }
.dm-plantas button:first-child img { width: 92px; height: 92px; }
.dm-plantas img { width: 64px; height: 64px; object-fit: contain; }
.dm-escaner { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.dm-visor { position: relative; background: var(--pino-hondo); border-radius: 22px; height: 58%; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: height .5s cubic-bezier(.2,.8,.2,1); animation: dmEntra .35s ease both; }
.dm-visor-chico { height: 34%; }
.dm-visor img { width: 70%; height: 80%; object-fit: contain; }
.dm-linea { position: absolute; left: 8%; right: 8%; height: 3px; border-radius: 2px; background: #9fe07a; box-shadow: 0 0 18px 4px rgba(159,224,122,.6); animation: dmLinea 1.1s ease-in-out infinite alternate; }
.dm-esq { position: absolute; width: 22px; height: 22px; border: 0 solid #fff; }
.dm-esq.a { top: 12px; left: 12px; border-top-width: 3px; border-left-width: 3px; border-top-left-radius: 8px; }
.dm-esq.b { top: 12px; right: 12px; border-top-width: 3px; border-right-width: 3px; border-top-right-radius: 8px; }
.dm-esq.c { bottom: 12px; left: 12px; border-bottom-width: 3px; border-left-width: 3px; border-bottom-left-radius: 8px; }
.dm-esq.d { bottom: 12px; right: 12px; border-bottom-width: 3px; border-right-width: 3px; border-bottom-right-radius: 8px; }
.dm-resultado { margin-top: 10px; background: var(--crema); border-radius: 20px; padding: 12px 12px 10px; animation: dmSube .45s cubic-bezier(.2,.8,.2,1) both; overflow: hidden; }
.dm-nombre { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 21px; margin: 0; letter-spacing: -0.02em; }
.dm-cientifico { font-style: italic; font-size: 12px; color: var(--tinta-suave); margin: 1px 0 8px; }
.dm-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.dm-chip { font-size: 11px; font-weight: 700; background: var(--crema-2); border-radius: 999px; padding: 5px 8px; }
.dm-verde { background: rgba(63,93,62,.15); color: var(--pino); }
.dm-ambar { background: rgba(214,162,61,.25); color: #7a5410; }
.dm-consejo { font-size: 12px; line-height: 1.4; color: #3a3122; margin: 8px 0 0; }
.dm-nav { display: flex; justify-content: space-around; background: rgba(245,239,221,.92); border-radius: 18px; padding: 8px 4px; margin-top: 10px; font-size: 16px; }
.dm-nav span { padding: 4px 14px; border-radius: 12px; }
.dm-nav-activo { background: var(--pino); }
.dm-aviso { position: absolute; z-index: 4; top: 52px; left: 18px; right: 18px; display: flex; gap: 9px; align-items: center; background: rgba(255,255,255,.96); border-radius: 18px; padding: 9px 11px; font-size: 12px; line-height: 1.35; box-shadow: 0 16px 30px -14px rgba(0,0,0,.5); opacity: 0; transform: translateY(-16px) scale(.96); pointer-events: none; transition: opacity .35s, transform .45s cubic-bezier(.2,.8,.2,1); }
.dm-aviso-ve { opacity: 1; transform: none; }
.dm-aviso img { width: 30px; height: 30px; border-radius: 8px; }
.dm-aviso em { font-style: normal; color: var(--tinta-suave); font-size: 11px; }
.dm-pie { text-align: center; margin-top: 18px; min-height: 44px; }
.dm-pie p { margin: 10px 0 0; font-size: 14px; color: var(--tinta-suave); }
.dm-otra { background: transparent; border: 2px solid var(--tinta); border-radius: 999px; padding: 10px 18px; font-family: inherit; font-weight: 700; font-size: 14px; cursor: pointer; color: var(--tinta); }
.dm-otra:hover { background: rgba(34,28,19,.06); }
@keyframes dmLinea { from { top: 10%; } to { top: 88%; } }
@keyframes dmEntra { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }
@keyframes dmSube { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }

/* App */
.cn-app { background: var(--crema); padding: 70px 0; border-radius: 36px 36px 0 0; }
.cn h2 { font-size: clamp(32px, 6vw, 50px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 800; margin: 0; max-width: 17ch; }
.cn-app-filas { display: grid; gap: 4px; margin: 30px 0 32px; }
.cn-app-fila { display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-items: start; padding: 16px 0; border-bottom: 1px solid #e2d7b8; }
.cn-app-fila:last-child { border-bottom: none; }
.cn-icono { width: 56px; height: 56px; border-radius: 18px; background: var(--crema-2); display: flex; align-items: center; justify-content: center; font-size: 26px; }
.cn-app-fila h3 { font-size: 21px; margin: 2px 0 0; font-weight: 600; letter-spacing: -0.01em; }
.cn-app-fila p { margin: 4px 0 0; font-size: 15.5px; line-height: 1.5; color: var(--tinta-suave); max-width: 40em; }

/* Servicio (banda verde) */
.cn-servicio { background: var(--pino-hondo); color: var(--crema); padding: 70px 0; }
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
.cn-pasos-reserva li > span { padding-top: 8px; }
.cn-pasos-reserva strong { color: var(--crema); display: block; }

/* Jardines verticales: la foto ocupa todo */
.cn-verticales { position: relative; padding: 120px 0; background: #24401f url(/muro-hojas.svg) 0 0 / 200px 200px repeat; }
.cn-verticales-caja { background: rgba(34,28,19,.78); color: var(--crema); border-radius: 28px; padding: 30px 26px; max-width: 520px; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.cn-verticales-caja p { font-size: 17px; line-height: 1.55; margin: 14px 0 24px; color: #e6dcc0; }

/* Zonas */
.cn-zonas { padding: 70px 0 56px; }
.cn-chips { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-wrap: wrap; gap: 8px; }
.cn-chips li { background: var(--crema); border-radius: 999px; padding: 9px 16px; font-weight: 700; font-size: 15px; }
.cn-zonas .cn-sub a { font-weight: 700; }

/* Preguntas */
.cn-preguntas { padding: 8px 0 70px; }
.cn-preguntas h2 { margin-bottom: 20px; }
.cn details { border-top: 1.5px solid rgba(34,28,19,0.18); max-width: 780px; }
.cn details:last-of-type { border-bottom: 1.5px solid rgba(34,28,19,0.18); }
.cn summary { cursor: pointer; list-style: none; padding: 18px 40px 18px 0; font-weight: 700; font-size: 17px; position: relative; }
.cn summary::-webkit-details-marker { display: none; }
.cn summary::after { content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 26px; font-weight: 500; transition: transform .2s; }
.cn details[open] summary::after { transform: translateY(-50%) rotate(45deg); }
.cn details p { margin: 0 0 18px; font-size: 16px; line-height: 1.6; color: #3a3122; max-width: 38em; }

/* Pie */
.cn-pie { background: var(--pino-hondo); color: var(--crema); padding: 60px 0 36px; border-radius: 36px 36px 0 0; overflow: hidden; }
.cn-pie-grid { display: grid; gap: 20px; align-items: end; }
.cn-pie-grande { font-size: clamp(28px, 5.5vw, 44px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin: 0; max-width: 16ch; }
.cn-pie-arbol { width: 190px; justify-self: end; border-radius: 24px; display: none; }
.cn-legal { margin: 44px 0 0; font-size: 14px; color: #cfc4a6; line-height: 1.8; }
.cn-legal a { color: #cfc4a6; }

@media (min-width: 860px) {
  .cn-menu { display: flex; }
  .cn-portada { grid-template-columns: 1.1fr 0.9fr; gap: 40px; padding-top: 40px; padding-bottom: 90px; }
  .dm { width: 340px; }
  .cn-precios { grid-template-columns: repeat(3, 1fr); align-items: start; }
  .cn-precio-medio { transform: translateY(-14px); }
  .cn-pasos-reserva { grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .cn-app-filas { grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .cn-app-fila { grid-template-columns: 1fr; border-bottom: none; }
  .cn-verticales { padding: 170px 0; background-attachment: fixed; }
  .cn-pie-grid { grid-template-columns: 1fr auto; }
  .cn-pie-arbol { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .dm-telefono { transform: none; transition: none; }
  .dm *, .cn-boton { animation: none !important; transition: none !important; }
  .cn-verticales { background-attachment: scroll; }
}
`;
