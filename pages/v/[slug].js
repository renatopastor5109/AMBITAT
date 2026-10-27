// Dirección de las tarjetas de cada vivero: ambitat.vercel.app/v/<vivero>
// Lleva a la app recordando de qué vivero viene la persona.
import { esSlugValido } from "../../lib/crecimiento";

export async function getServerSideProps({ params }) {
  const slug = String(params.slug || "").toLowerCase();
  return {
    redirect: { destination: esSlugValido(slug) ? `/?v=${encodeURIComponent(slug)}` : "/", permanent: false },
  };
}

export default function Vivero() {
  return null;
}
