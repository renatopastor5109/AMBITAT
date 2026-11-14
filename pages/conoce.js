// Página de presentación → ambitat.../conoce (la misma que ve en "/" quien
// llega por primera vez). Es la que va en Google Maps.
import Presentacion from "../components/Presentacion";
import { datosPresentacion } from "../lib/presentacionServidor";

export async function getServerSideProps({ req, res }) {
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  return { props: await datosPresentacion(req) };
}

export default function Conoce(props) {
  return <Presentacion {...props} />;
}
