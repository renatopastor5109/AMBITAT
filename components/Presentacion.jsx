// Página de presentación (web pública), en español e inglés. Se ve en "/" para
// quien llega por primera vez y en "/conoce".
// Textos: lib/textosPresentacion.js · Precios, zonas y días: /admin → Servicio.
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { RESPONSABLE as R } from "../lib/legal";
import { formatoPrecio, tamanosConPrecios } from "../lib/servicio";
import { ZONAS_INICIALES, enlaceWhatsApp } from "../lib/negocio";
import { AGENDA_INICIAL } from "../lib/agenda";
import { TEXTOS, DEMO, diasDeVisita, textoIncluye, nombreTamano } from "../lib/textosPresentacion";

function DemoTelefono({ t, idioma }) {
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

  const d = t.demo;
  const p = elegida?.[idioma];
  return (
    <div className="dm" ref={caja}>
      <div className="dm-telefono" aria-label={d.etiqueta} role="group">
        <div className="dm-isla" aria-hidden="true" />
        <div className={"dm-aviso" + (aviso ? " dm-aviso-ve" : "")} role="status" aria-live="polite">
          {aviso && p && (
            <>
              <img src="/icon-192.png" alt="" />
              <span>
                <strong>Ámbitat 🌿</strong> <em>{d.ahora}</em>
                <br />
                {p.aviso}
              </span>
            </>
          )}
        </div>
        <div className="dm-pantalla">
          <p className="dm-titulo">{fase === "elige" ? d.miJardin : fase === "escaneando" ? d.analizando : d.listo}</p>

          {fase === "elige" && (
            <div className="dm-elige">
              <p className="dm-instruccion">{d.instruccion}</p>
              <div className="dm-plantas">
                {DEMO.map((x) => (
                  <button
                    key={x.clave}
                    onClick={() => {
                      tocado.current = true;
                      escanear(x);
                    }}
                  >
                    <img src={x.img} alt="" />
                    <span>{x[idioma].nombre}</span>
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
                  <p className="dm-nombre">{p.nombre}</p>
                  <p className="dm-cientifico">{elegida.cientifico}</p>
                  <div className="dm-chips">
                    <span className={"dm-chip dm-" + elegida.tono}>{p.estado}</span>
                    {p.datos.map((x) => (
                      <span key={x} className="dm-chip">
                        {x}
                      </span>
                    ))}
                  </div>
                  <p className="dm-consejo">{p.consejo}</p>
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
            {d.otra}
          </button>
        ) : (
          <p>{d.pie}</p>
        )}
      </div>
    </div>
  );
}

export default function Presentacion({
  tamanos = tamanosConPrecios(null),
  zonas = ZONAS_INICIALES,
  sitio = "https://ambitat.vercel.app",
  diasVisita = AGENDA_INICIAL.diasSemana,
}) {
  // Español primero; el inglés se elige con el botón ES / EN (y se recuerda).
  const [idioma, setIdioma] = useState("es");
  useEffect(() => {
    try {
      if (localStorage.getItem("ambitat-idioma") === "en") setIdioma("en");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = idioma === "en" ? "en" : "es-MX";
  }, [idioma]);
  function cambiarIdioma(nuevo) {
    setIdioma(nuevo);
    try {
      localStorage.setItem("ambitat-idioma", nuevo);
    } catch {}
  }

  const t = TEXTOS[idioma];
  const dias = diasDeVisita(diasVisita, idioma);
  const preguntas = t.preguntas({ tamanos, zonas, dias });
  const minimo = Math.min(...tamanos.map((x) => x.precio));
  const maximo = Math.max(...tamanos.map((x) => x.precio));
  // Para Google siempre en español (es la versión principal).
  const es = TEXTOS.es;
  const descripcionEs = es.descripcion(minimo);
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
    description: descripcionEs,
    url: `${sitio}/`,
    logo: `${sitio}/icon-512.png`,
    image: `${sitio}/icon-512.png`,
    telephone: R.telefono,
    email: R.correo,
    priceRange: `${formatoPrecio(minimo)} – ${formatoPrecio(maximo)} MXN`,
    address: { "@type": "PostalAddress", addressLocality: "Ciudad de México", addressCountry: "MX" },
    areaServed: [{ "@type": "City", name: "Ciudad de México" }, ...zonas.filter((z) => z !== "Ciudad de México").map((z) => ({ "@type": "Place", name: `${z}, Ciudad de México` }))],
    makesOffer: tamanos.map((x) => ({
      "@type": "Offer",
      name: `Mantenimiento de plantas · ${nombreTamano(x, "es").toLowerCase()}`,
      price: (x.precio / 100).toFixed(2),
      priceCurrency: "MXN",
      description: x.incluye.join(". "),
    })),
  };
  const datosPreguntas = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: es.preguntas({ tamanos, zonas, dias: diasDeVisita(diasVisita, "es") }).map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <Head>
        <title>{es.tituloPagina}</title>
        <meta name="description" content={descripcionEs} />
        <link rel="canonical" href={`${sitio}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={es.tituloPagina} />
        <meta property="og:description" content={descripcionEs} />
        <meta property="og:url" content={`${sitio}/`} />
        <meta property="og:image" content={`${sitio}/icon-512.png`} />
        <meta property="og:locale" content="es_MX" />
        <meta property="og:locale:alternate" content="en_US" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosNegocio) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosPreguntas) }} />
      </Head>
      <style>{ESTILOS}</style>

      <div className="cn" lang={idioma === "en" ? "en" : "es-MX"}>
        <header className={"cn-barra" + (conSombra ? " cn-barra-sombra" : "")}>
          <div className="cn-barra-in">
            <a href="/conoce" className="cn-logo" aria-label="Ámbitat">
              <img src="/logo.png" alt="Ámbitat" />
            </a>
            <nav className="cn-menu" aria-label={idioma === "en" ? "Page sections" : "Secciones de la página"}>
              {t.menu.map(([href, texto]) => (
                <a key={href} href={href}>
                  {texto}
                </a>
              ))}
            </nav>
            <div className="cn-barra-der">
              <div className="cn-idioma" role="group" aria-label="Idioma / Language">
                <button aria-pressed={idioma === "es"} onClick={() => cambiarIdioma("es")} lang="es">
                  ES
                </button>
                <button aria-pressed={idioma === "en"} onClick={() => cambiarIdioma("en")} lang="en">
                  EN
                </button>
              </div>
              <a href="/app" className="cn-boton cn-boton-chico">
                {t.abrirApp}
              </a>
            </div>
          </div>
        </header>

        {/* ---------- Portada con la demo ---------- */}
        <section className="cn-portada">
          <div className="cn-portada-texto">
            <h1>{t.h1}</h1>
            <p className="cn-entrada">{t.entrada}</p>
            <div className="cn-acciones">
              <a href="/app" className="cn-boton">
                {t.abrirAppGratis}
              </a>
              <a href="#mantenimiento" className="cn-boton cn-boton-claro">
                {t.verMantenimiento}
              </a>
            </div>
            <p className="cn-nota">{t.nota}</p>
          </div>
          <DemoTelefono t={t} idioma={idioma} />
        </section>

        {/* ---------- La app ---------- */}
        <section className="cn-app" id="la-app">
          <div className="cn-ancho">
            <h2>{t.appTitulo}</h2>
            <div className="cn-app-filas">
              {t.appFilas.map(([icono, titulo, texto]) => (
                <div className="cn-app-fila" key={titulo}>
                  <span className="cn-icono" aria-hidden="true">
                    {icono}
                  </span>
                  <div>
                    <h3>{titulo}</h3>
                    <p>{texto}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="/app" className="cn-boton">
              {t.empezar}
            </a>
          </div>
        </section>

        {/* ---------- Mantenimiento ---------- */}
        <section className="cn-servicio" id="mantenimiento">
          <div className="cn-ancho">
            <h2>{t.mantTitulo}</h2>
            <p className="cn-sub">{t.mantSub(dias)}</p>
            <div className="cn-precios">
              {tamanos.map((x, i) => (
                <article key={x.key} className={"cn-precio" + (i === 1 ? " cn-precio-medio" : "")}>
                  <h3>{nombreTamano(x, idioma)}</h3>
                  <p className="cn-monto">
                    {formatoPrecio(x.precio)} <span>MXN</span>
                  </p>
                  <ul>
                    {x.incluye.map((l) => (
                      <li key={l}>{textoIncluye(l, idioma)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <ol className="cn-pasos-reserva">
              {t.pasos.map(([fuerte, resto]) => (
                <li key={fuerte}>
                  <span>
                    <strong>{fuerte}</strong> {resto}
                  </span>
                </li>
              ))}
            </ol>
            <a href="/app?ir=tienda" className="cn-boton cn-boton-crema">
              {t.reservar}
            </a>
          </div>
        </section>

        {/* ---------- Casas y negocios ---------- */}
        <section className="cn-publicos" id="casas-y-negocios">
          <div className="cn-ancho">
            <h2>{t.publicosTitulo}</h2>
            <div className="cn-publicos-grid">
              <div className="cn-publico cn-casa">
                <h3>{t.casaTitulo}</h3>
                <p>{t.casaTexto}</p>
              </div>
              <div className="cn-publico cn-negocio">
                <h3>{t.negocioTitulo}</h3>
                <p>{t.negocioTexto}</p>
                <a href={enlaceWhatsApp(t.mensajeNegocio)} className="cn-boton cn-boton-crema" target="_blank" rel="noopener">
                  {t.negocioBoton}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Zonas ---------- */}
        <section className="cn-zonas">
          <div className="cn-ancho">
            <h2>{t.zonasTitulo}</h2>
            <ul className="cn-chips">
              {zonas.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
            <p className="cn-sub">
              {t.noVesTuColonia}{" "}
              <a href={enlaceWhatsApp(t.mensajeWa)} target="_blank" rel="noopener">
                {t.preguntanos}
              </a>
              .
            </p>
          </div>
        </section>

        {/* ---------- Preguntas ---------- */}
        <section className="cn-preguntas" id="preguntas">
          <div className="cn-ancho">
            <h2>{t.preguntasTitulo}</h2>
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
              <p className="cn-pie-grande">{t.pieGrande}</p>
              <div className="cn-acciones">
                <a href="/app" className="cn-boton cn-boton-crema">
                  {t.abrirAppGratis}
                </a>
                <a href={enlaceWhatsApp(t.mensajeWa)} className="cn-boton cn-boton-borde" target="_blank" rel="noopener">
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
              <a href="/terminos">{t.terminos}</a>
              <span aria-hidden="true"> / </span>
              <a href="/privacidad">{t.privacidad}</a>
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
@media (max-width: 380px) { .cn-logo img { height: 26px; } .cn-barra-in { gap: 8px; padding: 12px 16px; } }
.cn-barra-der { display: flex; align-items: center; gap: 10px; }
.cn-idioma { display: flex; border: 1.5px solid rgba(34,28,19,.35); border-radius: 999px; overflow: hidden; }
.cn-idioma button { border: none; background: transparent; font-family: inherit; font-weight: 700; font-size: 12.5px; padding: 6px 9px; cursor: pointer; color: var(--tinta); }
.cn-idioma button[aria-pressed="true"] { background: var(--tinta); color: var(--crema); }
.cn-menu { display: none; gap: 26px; font-weight: 600; font-size: 15px; }
.cn-menu a { text-decoration: none; opacity: .8; }
.cn-menu a:hover { opacity: 1; text-decoration: underline; text-underline-offset: 4px; }

/* Botones */
.cn-boton { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; padding: 0 24px; border-radius: 999px; background: var(--pino); color: #fff !important; font-weight: 700; font-size: 16px; text-decoration: none; border: 2px solid var(--pino); transition: background .15s, transform .15s; cursor: pointer; font-family: inherit; text-align: center; }
.cn-boton:hover { background: var(--pino-hondo); border-color: var(--pino-hondo); }
.cn-boton:active { transform: scale(0.97); }
.cn-boton-chico { min-height: 40px; padding: 0 14px; font-size: 14px; white-space: nowrap; }
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


/* Casas y negocios */
.cn-publicos { padding: 70px 0 20px; }
.cn-publicos-grid { display: grid; gap: 14px; margin-top: 28px; }
.cn-publico { border-radius: 28px; padding: 26px 24px; }
.cn-publico h3 { font-size: 26px; letter-spacing: -0.02em; margin: 0 0 10px; font-weight: 800; }
.cn-publico p { font-size: 16.5px; line-height: 1.55; margin: 0; max-width: 34em; }
.cn-casa { background: var(--crema); }
.cn-casa p { color: #3a3122; }
.cn-negocio { background: var(--madera); color: var(--crema); }
.cn-negocio p { color: #f1e4c8; margin-bottom: 22px; }

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
  .cn-pie-grid { grid-template-columns: 1fr auto; }
  .cn-pie-arbol { display: block; }
  .cn-publicos-grid { grid-template-columns: 1fr 1fr; }
  .cn-publico { padding: 34px 32px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .dm-telefono { transform: none; transition: none; }
  .dm *, .cn-boton { animation: none !important; transition: none !important; }
}
`;
