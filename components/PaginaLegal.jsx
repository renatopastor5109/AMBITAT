// Diseño compartido del Aviso de privacidad y los Términos y condiciones.
import Head from "next/head";
import { ACTUALIZADO, esPendiente } from "../lib/legal";

export const L = {
  bg: "#EAC468",
  card: "#F5EFDD",
  line: "#e2d7b8",
  ink: "#221C13",
  soft: "#6b6047",
  green: "#3F5D3E",
};
const F = "'Inter', sans-serif";

// Muestra un dato del responsable; si todavía no se llena, lo resalta.
export function Dato({ v }) {
  if (!esPendiente(v)) return <strong>{v}</strong>;
  return <mark style={{ background: "#ffe066", padding: "0 3px", borderRadius: 3 }}>{v}</mark>;
}

export function Seccion({ n, titulo, children }) {
  return (
    <section style={{ marginTop: 30 }} id={`s${n}`}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: L.ink, margin: "0 0 10px", letterSpacing: "-0.01em" }}>
        {n}. {titulo}
      </h2>
      {children}
    </section>
  );
}

export function Tabla({ cols, filas }) {
  return (
    <div style={{ margin: "10px 0" }}>
      <table className="legal-tabla" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "2px solid " + L.line, color: L.ink }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((c, j) => (
                <td key={j} data-label={cols[j]} style={{ padding: "8px 10px", borderBottom: "1px solid " + L.line, verticalAlign: "top", fontWeight: j === 0 ? 700 : 400 }}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Resumen({ children }) {
  return (
    <div style={{ background: L.green, color: "#fff", borderRadius: 18, padding: "16px 18px", marginTop: 22 }}>
      <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 15, color: "#fff" }}>En resumen</p>
      <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

export default function PaginaLegal({ titulo, descripcion, otra, children }) {
  return (
    <>
      <Head>
        <title>{`${titulo} · Ámbitat`}</title>
        <meta name="description" content={descripcion} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body { margin: 0; background: ${L.bg}; }
        .legal p, .legal li { font-size: 15px; line-height: 1.65; color: ${L.ink}; }
        .legal p { margin: 0 0 10px; }
        .legal ul { margin: 0 0 10px; padding-left: 20px; }
        .legal li { margin-bottom: 5px; }
        .legal a { color: ${L.green}; font-weight: 700; }
        .legal h3 { font-size: 15.5px; font-weight: 800; margin: 16px 0 6px; color: ${L.ink}; }
        @media (max-width: 560px) {
          .legal-tabla thead { display: none; }
          .legal-tabla, .legal-tabla tbody, .legal-tabla tr, .legal-tabla td { display: block; width: 100%; }
          .legal-tabla tr { box-sizing: border-box; background: #fff; border-radius: 14px; padding: 6px 4px; margin-bottom: 10px; }
          .legal-tabla td { box-sizing: border-box; border-bottom: none !important; padding: 4px 10px !important; }
          .legal-tabla td:not(:first-child)::before { content: attr(data-label) ": "; color: ${L.soft}; font-weight: 600; }
        }
        @media print { body { background: #fff; } .no-print { display: none; } }
      `}</style>
      <div style={{ fontFamily: F, padding: "20px 14px 48px" }}>
        <article className="legal" style={{ maxWidth: 760, margin: "0 auto", background: L.card, borderRadius: 26, padding: "26px 22px 34px", boxShadow: "0 20px 50px -30px rgba(0,0,0,0.4)" }}>
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <a href="/" style={{ textDecoration: "none", fontSize: 14 }}>← Volver a Ámbitat</a>
            <img src="/logo.png" alt="Ámbitat" style={{ height: 26, width: "auto" }} />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: L.ink, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h1>
          <p style={{ color: L.soft, fontSize: 13.5, margin: "8px 0 0" }}>Última actualización: {ACTUALIZADO}</p>
          {children}
          <hr style={{ border: 0, borderTop: "1px solid " + L.line, margin: "32px 0 16px" }} />
          <p className="no-print" style={{ fontSize: 13.5, color: L.soft }}>
            Consulta también: <a href={otra.href}>{otra.texto}</a>
          </p>
        </article>
      </div>
    </>
  );
}
