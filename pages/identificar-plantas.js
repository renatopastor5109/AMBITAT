import Link from "next/link";

import Seo from "../components/Seo";


const C = {
  cream: "#F6EFE2",
  pine: "#2F4A3A",
  wood: "#7A5638",
  gold: "#C9A24A",
  ink: "#2B2620",
};

const pasos = [
  { n: "1", t: "Toma una foto", d: "De la hoja, la flor o la planta completa. Con buena luz funciona mejor." },
  { n: "2", t: "La IA la identifica", d: "En segundos te dice el nombre común, el científico y cómo está de salud." },
  { n: "3", t: "Cuídala sin olvidos", d: "Guárdala en tu jardín y Ámbitat te avisa cuándo toca regarla." },
];

const funciones = [
  { t: "Identificación con IA", d: "Reconoce plantas de interior, suculentas, cactus, flores y árboles." },
  { t: "Diagnóstico de salud", d: "Hojas amarillas, manchas, plagas o exceso de riego: te dice qué pasa y qué hacer." },
  { t: "Recordatorios de riego", d: "Una cuenta regresiva por planta y un aviso diario para que no se te seque ninguna." },
  { t: "Tu jardín en un lugar", d: "Todas tus plantas guardadas con su foto, cuidados e historial." },
];

const faqs = [
  {
    q: "¿Cómo puedo identificar una planta con una foto?",
    a: "Abre Ámbitat, toma o sube una foto de la planta y la inteligencia artificial te dirá qué especie es, junto con sus cuidados básicos.",
  },
  {
    q: "¿Ámbitat es gratis?",
    a: "Sí. Puedes identificar plantas y guardar tu jardín sin pagar.",
  },
  {
    q: "¿Necesito descargar una app?",
    a: "No. Ámbitat funciona desde el navegador de tu celular o computadora. También puedes agregarla a tu pantalla de inicio.",
  },
  {
    q: "¿Puede decirme si mi planta está enferma?",
    a: "Sí. Además de identificarla, la IA revisa la foto en busca de señales como hojas amarillas, manchas, plagas o falta de agua, y te sugiere qué hacer.",
  },
  {
    q: "¿Qué tipo de plantas reconoce?",
    a: "Plantas de interior y exterior: monsteras, pothos, suculentas, cactus, helechos, orquídeas, árboles frutales, hierbas aromáticas y muchas más.",
  },
];

export default function IdentificarPlantas() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const btn = {
    display: "inline-block",
    background: C.pine,
    color: C.cream,
    padding: "14px 28px",
    borderRadius: 999,
    fontWeight: 700,
    textDecoration: "none",
    fontSize: 17,
    boxShadow: "0 4px 14px rgba(47,74,58,.25)",
  };

  return (
    <main style={{ background: C.cream, color: C.ink, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <Seo
        title="Identificar plantas con IA gratis | Ámbitat"
        description="Identifica cualquier planta con una foto. Ámbitat usa inteligencia artificial para decirte qué planta es, si está enferma y cuándo regarla. Gratis y en español."
        path="/identificar-plantas"
        extraJsonLd={faqSchema}
      />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>
        {/* Encabezado */}
        <header style={{ padding: "22px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 22, color: C.pine }}><img src="/logo.png" alt="Ámbitat" style={{ height: 34, width: "auto" }} /></span>
          <Link href="/" style={{ color: C.wood, fontWeight: 600, textDecoration: "none" }}>
            Abrir app →
          </Link>
        </header>

        {/* Hero */}
        <section style={{ textAlign: "center", padding: "48px 0 56px" }}>
          <p style={{ color: C.gold, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontSize: 13, margin: 0 }}>
            Identificador de plantas con IA
          </p>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 52px)", lineHeight: 1.1, margin: "14px 0 18px", color: C.pine }}>
            Identifica cualquier planta con una foto
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, maxWidth: 620, margin: "0 auto 30px", color: C.wood }}>
            Ámbitat usa inteligencia artificial para decirte qué planta es, si está sana y cuándo regarla. Gratis, en
            español y sin descargar nada.
          </p>
          <Link href="/" style={btn}>Identificar mi planta gratis</Link>
        </section>

        {/* Cómo funciona */}
        <section style={{ padding: "40px 0" }}>
          <h2 style={{ color: C.pine, fontSize: 30, textAlign: "center", marginBottom: 28 }}>Cómo funciona</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            {pasos.map((p) => (
              <div key={p.n} style={{ background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 2px 10px rgba(122,86,56,.08)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: C.gold, color: "#fff", fontWeight: 800, display: "grid", placeItems: "center", marginBottom: 12 }}>
                  {p.n}
                </div>
                <h3 style={{ margin: "0 0 6px", color: C.pine }}>{p.t}</h3>
                <p style={{ margin: 0, lineHeight: 1.5, color: C.wood }}>{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funciones */}
        <section style={{ padding: "40px 0" }}>
          <h2 style={{ color: C.pine, fontSize: 30, textAlign: "center", marginBottom: 28 }}>
            Más que un identificador de plantas
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {funciones.map((f) => (
              <div key={f.t} style={{ borderLeft: `4px solid ${C.gold}`, padding: "6px 0 6px 16px" }}>
                <h3 style={{ margin: "0 0 6px", color: C.pine }}>{f.t}</h3>
                <p style={{ margin: 0, lineHeight: 1.5, color: C.wood }}>{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section style={{ padding: "40px 0" }}>
          <h2 style={{ color: C.pine, fontSize: 30, textAlign: "center", marginBottom: 24 }}>Preguntas frecuentes</h2>
          {faqs.map((f) => (
            <details key={f.q} style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", marginBottom: 12 }}>
              <summary style={{ fontWeight: 700, cursor: "pointer", color: C.pine }}>{f.q}</summary>
              <p style={{ margin: "10px 0 0", lineHeight: 1.55, color: C.wood }}>{f.a}</p>
            </details>
          ))}
        </section>

        {/* Cierre */}
        <section style={{ textAlign: "center", padding: "48px 0 64px" }}>
          <h2 style={{ color: C.pine, fontSize: 28, margin: "0 0 18px" }}>¿Qué planta tienes en casa?</h2>
          <Link href="/" style={btn}>Descubrirlo ahora</Link>
        </section>

        <footer style={{ borderTop: `1px solid ${C.gold}55`, padding: "20px 0 32px", textAlign: "center", color: C.wood, fontSize: 14 }}>
          Ámbitat · Hecho en Ciudad de México 🌱
        </footer>
      </div>
    </main>
  );
}
