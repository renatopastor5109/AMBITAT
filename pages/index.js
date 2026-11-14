// Una sola entrada: ambitat.../
//   · Quien llega por primera vez (y Google) ve la página de presentación.
//   · Quien ya usa la app (cookie "ambitat_app") entra directo a la app.
//   · Los enlaces de la app (?v= ?ref= ?ir= ?pago= y el regreso de Google o
//     del correo) siempre abren la app.
import Head from "next/head";
import dynamic from "next/dynamic";
import Presentacion from "../components/Presentacion";
import { datosPresentacion } from "../lib/presentacionServidor";

const BrotesApp = dynamic(() => import("../components/BrotesApp"), { ssr: false });

const PARAMS_DE_APP = ["v", "ref", "ir", "pago", "session_id", "code", "error", "error_description", "token_hash", "type"];

export async function getServerSideProps({ req, res, query }) {
  // La respuesta depende de la cookie: que ninguna caché la comparta.
  res.setHeader("Cache-Control", "private, no-cache");
  const usaLaApp = /(?:^|;\s*)ambitat_app=1/.test(req.headers.cookie || "");
  if (usaLaApp || PARAMS_DE_APP.some((p) => query[p] !== undefined)) return { props: { modo: "app" } };
  return { props: { modo: "web", ...(await datosPresentacion(req)) } };
}

// Antes de pintar la web: si este navegador ya usa la app (o viene regresando
// de iniciar sesión), se va directo a la app sin enseñar la web.
const SCRIPT_REGRESO = `(function(){try{
var h=location.hash||"";
var ya=localStorage.getItem("ambitat-intro-vista")||localStorage.getItem("ambitat-bienvenida-vista");
if(!ya){for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||"";if(k.indexOf("sb-")===0&&k.indexOf("auth-token")>-1){ya=1;break;}}}
if(ya||h.indexOf("access_token")>-1||h.indexOf("error_description")>-1){location.replace("/app"+location.search+h);}
}catch(e){}})();`;

export default function Inicio(props) {
  if (props.modo === "app") return <BrotesApp />;
  return (
    <>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_REGRESO }} />
      </Head>
      <Presentacion {...props} />
    </>
  );
}
