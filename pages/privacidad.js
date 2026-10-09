// Aviso de privacidad integral de Ámbitat → ambitat.vercel.app/privacidad
// Los datos del responsable se editan en lib/legal.js.
import PaginaLegal, { Dato, Seccion, Tabla, Resumen } from "../components/PaginaLegal";
import { RESPONSABLE as R } from "../lib/legal";

export default function Privacidad() {
  return (
    <PaginaLegal
      titulo="Aviso de privacidad"
      descripcion="Cómo Ámbitat recaba, usa y protege tus datos personales."
      otra={{ href: "/terminos", texto: "Términos y condiciones" }}
    >
      <Resumen>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={{ color: "#fff" }}>Usamos tus datos para que la app funcione: guardar tus plantas, analizarlas con inteligencia artificial, mandarte recordatorios y agendar y cobrar tu mantenimiento.</li>
          <li style={{ color: "#fff" }}>No vendemos tus datos ni los usamos para publicidad de terceros.</li>
          <li style={{ color: "#fff" }}>Las fotos de tus plantas se analizan con un servicio de IA solo para darte el resultado.</li>
          <li style={{ color: "#fff" }}>Puedes pedir ver, corregir o borrar tus datos cuando quieras escribiendo a <Dato v={R.correo} />.</li>
        </ul>
      </Resumen>

      <Seccion n={1} titulo="Quién es responsable de tus datos">
        <p>
          <Dato v={R.nombre} /> (en adelante, “Ámbitat”), con domicilio en <Dato v={R.domicilio} />, es responsable del uso y
          protección de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares y demás normas aplicables.
        </p>
        <p>
          Para cualquier tema relacionado con tus datos escríbenos a <Dato v={R.correo} />.
        </p>
      </Seccion>

      <Seccion n={2} titulo="Qué datos recabamos">
        <h3>Si usas la app sin cuenta</h3>
        <p>Un identificador anónimo que se guarda en tu navegador y lo que tú agregues: tus plantas y sus fotos.</p>
        <h3>Tu cuenta</h3>
        <p>
          Tu correo electrónico. Si entras con Google, Apple o Facebook, también el nombre, correo y foto de perfil que ese servicio
          nos comparta. No usamos contraseñas: entras con esos servicios o con un código que te mandamos por correo.
        </p>
        <h3>Tus plantas</h3>
        <p>
          Las fotos que tomas o subes, el nombre y la fase de crecimiento que indiques, el resultado de cada análisis, tu historial
          de riegos y fotos de seguimiento, y los cambios de nombre que hagas. Antes de subir una foto, la app la reduce de tamaño,
          lo que también borra datos ocultos del archivo como la ubicación GPS.
        </p>
        <h3>Si reservas un mantenimiento</h3>
        <p>
          Nombre, teléfono, correo, dirección donde se hará el servicio, fecha y hora, tamaño de tu jardín, las notas que agregues
          y el estado y método de tu pago (tarjeta u OXXO). <strong>Los datos de tu tarjeta los recibe y guarda directamente
          Stripe</strong>, nuestro procesador de pagos: nosotros nunca vemos ni guardamos el número completo; solo podemos ver la
          marca y los últimos 4 dígitos.
        </p>
        <h3>Otros</h3>
        <ul>
          <li>Si activas los recordatorios: un identificador técnico de tu navegador para poder mandarte notificaciones.</li>
          <li>Los mensajes que nos mandes desde el buzón de sugerencias o por correo.</li>
          <li>Un registro de cuántos análisis haces, para aplicar el límite diario y evitar abusos.</li>
          <li>Estadísticas anónimas de visitas (Vercel Analytics, que no usa cookies) y datos técnicos de conexión, como la dirección IP y el tipo de navegador, que nuestro proveedor de alojamiento registra por seguridad.</li>
        </ul>
        <p>
          <strong>No recabamos datos personales sensibles</strong> (como salud, religión u origen étnico) y no usamos tu ubicación
          GPS. Te pedimos no incluir personas, documentos ni datos personales en tus fotos.
        </p>
      </Seccion>

      <Seccion n={3} titulo="Para qué usamos tus datos">
        <h3>Finalidades necesarias para darte el servicio</h3>
        <ul>
          <li>Crear y mantener tu cuenta o tu sesión sin cuenta.</li>
          <li>Guardar tu jardín, tus fotos y tu historial.</li>
          <li>Identificar tus plantas y evaluar su salud con inteligencia artificial.</li>
          <li>Calcular y mandarte recordatorios de riego.</li>
          <li>Agendar, confirmar, cobrar y realizar el mantenimiento a domicilio, y contactarte sobre tu cita por teléfono, correo o WhatsApp.</li>
          <li>Darte tu comprobante de pago y, si lo pides, tu factura.</li>
          <li>Atender tus dudas, quejas, cancelaciones y solicitudes sobre tus datos.</li>
          <li>Proteger la app contra abusos y fraudes, y cumplir con nuestras obligaciones legales y fiscales.</li>
        </ul>
        <h3>Finalidades adicionales</h3>
        <ul>
          <li>Mejorar la app; por ejemplo, revisar los cambios de nombre que haces a tus plantas para que el análisis se equivoque menos.</li>
          <li>Generar estadísticas generales de uso que no te identifican.</li>
        </ul>
        <p>
          Si no quieres que usemos tus datos para estas finalidades adicionales, escríbenos a <Dato v={R.correo} />. Negarte no
          afecta en nada el servicio que recibes.
        </p>
        <p>
          Hoy no te mandamos publicidad. Si algún día queremos hacerlo, te pediremos permiso antes y podrás darte de baja en
          cualquier momento.
        </p>
      </Seccion>

      <Seccion n={4} titulo="Con quién compartimos tus datos">
        <p>
          Para que la app funcione usamos proveedores que tratan tus datos <strong>por cuenta nuestra</strong> y solo para lo que
          les pedimos:
        </p>
        <Tabla
          cols={["Proveedor", "Para qué", "Qué datos"]}
          filas={[
            ["Supabase", "Base de datos, inicio de sesión y almacenamiento de fotos", "Cuenta, jardín, fotos y reservaciones"],
            ["Vercel", "Aloja la app y mide visitas de forma anónima", "Datos técnicos de conexión"],
            ["Anthropic", "Analiza las fotos con inteligencia artificial", "Las fotos y el nombre o fase que escribas; nunca tu nombre ni tu correo"],
            ["Stripe", "Procesa pagos con tarjeta y en OXXO", "Correo, monto y datos de pago"],
            ["Resend", "Envía los correos con tu código de acceso", "Tu correo"],
            ["Google, Apple o Facebook", "Solo si eliges entrar con ellos", "Lo necesario para confirmar quién eres"],
          ]}
        />
        <p>
          Algunos de estos proveedores guardan la información en servidores fuera de México, principalmente en Estados Unidos, con
          medidas de seguridad equivalentes o mayores a las que exige la ley mexicana.
        </p>
        <p>
          Si reservas un mantenimiento, el personal de Ámbitat que hará la visita conocerá tu nombre, teléfono y dirección para
          poder atenderte.
        </p>
        <p>
          <strong>No vendemos ni rentamos tus datos.</strong> Solo los compartiríamos con autoridades cuando una ley o una orden
          judicial nos obligue.
        </p>
      </Seccion>

      <Seccion n={5} titulo="Cuánto tiempo guardamos tus datos">
        <ul>
          <li>
            <strong>Cuenta y jardín:</strong> mientras tengas tu cuenta. Si pides borrarla, eliminamos tus datos a más tardar en 30
            días.
          </li>
          <li>
            <strong>Uso sin cuenta:</strong> tu acceso vive en tu navegador. Si borras los datos del navegador o cambias de celular,
            ya no podrás entrar a ese jardín. Podemos eliminar jardines sin cuenta que no se usen en 12 meses.
          </li>
          <li>
            <strong>Reservaciones y pagos:</strong> el tiempo que nos exijan las leyes fiscales y mercantiles, generalmente 5 años.
          </li>
          <li>
            <strong>Registro de análisis</strong> para el límite diario: solo el tiempo necesario para evitar abusos.
          </li>
        </ul>
      </Seccion>

      <Seccion n={6} titulo="Tus derechos y cómo ejercerlos">
        <p>En cualquier momento puedes:</p>
        <ul>
          <li><strong>Acceder</strong>: saber qué datos tenemos de ti y cómo los usamos.</li>
          <li><strong>Rectificar</strong>: corregirlos o actualizarlos.</li>
          <li><strong>Cancelar</strong>: pedir que los borremos.</li>
          <li><strong>Oponerte</strong> a que los usemos para alguna finalidad, incluido el tratamiento automatizado.</li>
          <li><strong>Revocar tu consentimiento</strong> o <strong>limitar</strong> el uso de tus datos.</li>
        </ul>
        <p>
          Muchos datos los puedes cambiar tú mismo en la app; por ejemplo, el nombre de tus plantas. Para todo lo demás, escribe
          a <Dato v={R.correo} /> con el asunto <em>“Derechos sobre mis datos”</em> e incluye:
        </p>
        <ul>
          <li>Tu nombre y el correo de tu cuenta, o una forma de identificar tu jardín sin cuenta.</li>
          <li>Qué derecho quieres ejercer y sobre qué datos.</li>
          <li>Un documento que acredite tu identidad o, si lo haces por alguien más, la de su representante.</li>
        </ul>
        <p>
          Te responderemos en un máximo de <strong>20 días hábiles</strong>. Si procede tu solicitud, la haremos efectiva dentro de
          los <strong>15 días hábiles</strong> siguientes.
        </p>
        <p>
          <strong>Sobre la inteligencia artificial:</strong> el análisis de tus fotos es automático, pero solo sirve para darte
          consejos sobre tus plantas y no se usa para tomar decisiones sobre ti. Siempre puedes corregir el resultado.
        </p>
        <p>
          Si consideras que no atendimos bien tu solicitud, puedes acudir a la autoridad en materia de protección de datos
          personales (actualmente, la Secretaría Anticorrupción y Buen Gobierno).
        </p>
      </Seccion>

      <Seccion n={7} titulo="Cookies y almacenamiento en tu navegador">
        <p>
          No usamos cookies de publicidad ni de rastreo. La app guarda en tu navegador lo indispensable para funcionar: tu sesión
          (para que no tengas que entrar cada vez) y preferencias como los consejos que ya viste. Si borras esos datos, se cierra
          tu sesión.
        </p>
        <p>
          Cuando pagas, la página de pago de Stripe puede usar sus propias cookies por seguridad y para prevenir fraudes.
        </p>
      </Seccion>

      <Seccion n={8} titulo="Cómo protegemos tus datos">
        <ul>
          <li>Toda la comunicación viaja cifrada (HTTPS).</li>
          <li>Cada persona solo puede ver su propio jardín y sus propias reservaciones.</li>
          <li>Las llaves de acceso a nuestros sistemas solo viven en nuestros servidores.</li>
          <li>Los pagos los procesa Stripe, que cumple con el estándar de seguridad de la industria de tarjetas (PCI DSS).</li>
        </ul>
        <p>
          Ningún sistema es 100% infalible. Si ocurriera una vulneración de seguridad que afecte de forma importante tus derechos,
          te avisaremos sin demora para que puedas protegerte.
        </p>
      </Seccion>

      <Seccion n={9} titulo="Menores de edad">
        <p>
          Ámbitat no está dirigida a menores de 18 años. Si eres menor, usa la app con permiso y acompañamiento de tu madre, padre
          o tutor. Solo personas mayores de edad pueden reservar y pagar servicios.
        </p>
      </Seccion>

      <Seccion n={10} titulo="Cambios a este aviso">
        <p>
          Si cambiamos este aviso, publicaremos la nueva versión en esta misma página con su fecha. Si el cambio es importante, te
          avisaremos en la app o por correo.
        </p>
        <p>
          Al usar Ámbitat confirmas que leíste este aviso de privacidad.
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
