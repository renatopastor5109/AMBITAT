// Enlace para invitar amigos: ambitat.vercel.app/r/<CÓDIGO>
import { esCodigoValido } from "../../lib/crecimiento";

export async function getServerSideProps({ params }) {
  const codigo = String(params.codigo || "").toUpperCase();
  return {
    redirect: { destination: esCodigoValido(codigo) ? `/?ref=${encodeURIComponent(codigo)}` : "/", permanent: false },
  };
}

export default function Invitacion() {
  return null;
}
