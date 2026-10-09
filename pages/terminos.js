// Términos y condiciones de Ámbitat → ambitat.vercel.app/terminos
// Los datos del responsable se editan en lib/legal.js. Los precios salen
// solos de lib/servicio.js, así que siempre coinciden con la Tienda.
import PaginaLegal, { Dato, Seccion, Tabla, Resumen } from "../components/PaginaLegal";
import { RESPONSABLE as R } from "../lib/legal";
import { TAMANOS, HORARIOS_DISPONIBLES, DIAS_MAXIMOS_ANTICIPACION, formatoPrecio } from "../lib/servicio";

export default function Terminos() {
  return (
    <PaginaLegal
      titulo="Términos y condiciones"
      descripcion="Reglas de uso de la app Ámbitat y del servicio de mantenimiento a domicilio."
      otra={{ href: "/privacidad", texto: "Aviso de privacidad" }}
    >
      <Resumen>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={{ color: "#fff" }}>La app es gratuita. Sus consejos son una guía: la IA puede equivocarse.</li>
          <li style={{ color: "#fff" }}>El mantenimiento a domicilio se paga por adelantado según el tamaño de tu jardín.</li>
          <li style={{ color: "#fff" }}>Puedes cancelar con reembolso total hasta 48 horas antes de tu cita, o dentro de los 5 días hábiles siguientes a tu pago si la visita aún no se realiza.</li>
          <li style={{ color: "#fff" }}>Para cualquier cosa: <Dato v={R.correo} /> o <Dato v={R.telefono} />.</li>
        </ul>
      </Resumen>

      <Seccion n={1} titulo="Quiénes somos y aceptación">
        <p>
          Ámbitat es una app de cuidado de plantas y un servicio de mantenimiento de jardines operados por <Dato v={R.nombre} />,
          con domicilio en <Dato v={R.domicilio} /> (en adelante, “Ámbitat”, “nosotros”).
        </p>
        <p>
          Al usar la app o contratar un servicio aceptas estos términos y nuestro <a href="/privacidad">Aviso de privacidad</a>.
          Si no estás de acuerdo, por favor no uses Ámbitat.
        </p>
      </Seccion>

      <Seccion n={2} titulo="Qué ofrece Ámbitat">
        <ul>
          <li>
            <strong>App gratuita:</strong> identificación de plantas y revisión de su salud con inteligencia artificial,
            seguimiento con fotos, recordatorios de riego, consejos, datos curiosos y un directorio de viveros en la Ciudad de
            México.
          </li>
          <li>
            <strong>Mantenimiento a domicilio (con costo):</strong> visitas para cuidar tus plantas y jardines, incluidos los
            jardines verticales.
          </li>
        </ul>
      </Seccion>

      <Seccion n={3} titulo="Tu cuenta">
        <ul>
          <li>
            Puedes usar la app <strong>sin cuenta</strong> con hasta 3 plantas. Esos datos solo están ligados a tu navegador: si
            borras sus datos o cambias de celular, puedes perderlos.
          </li>
          <li>
            Para tener más plantas, recibir recordatorios o reservar, necesitas una cuenta. Se crea con Google, con Apple (cuando
            esté disponible) o con un código que te mandamos por correo.
          </li>
          <li>Eres responsable de cuidar el acceso a tu correo y a las cuentas con las que entras, y de que tus datos sean verdaderos.</li>
          <li>Debes ser mayor de 18 años o usar la app con permiso de tu madre, padre o tutor.</li>
        </ul>
      </Seccion>

      <Seccion n={4} titulo="Sobre la inteligencia artificial">
        <p>
          Los análisis, diagnósticos, frecuencias de riego y consejos se generan automáticamente y son <strong>solo una guía</strong>.
          La IA puede equivocarse al identificar una planta o al evaluar su salud, sobre todo si la foto no es clara.
        </p>
        <p>
          <strong>No uses Ámbitat para decidir si una planta es comestible, medicinal o segura para personas o mascotas.</strong>{" "}
          Ante cualquier duda de ese tipo, consulta a un especialista.
        </p>
        <p>
          Para que el servicio funcione para todos, hay un límite diario de análisis por persona.
        </p>
      </Seccion>

      <Seccion n={5} titulo="Uso aceptable">
        <p>Al usar Ámbitat te comprometes a no:</p>
        <ul>
          <li>Subir fotos ilegales u ofensivas, o fotos de otras personas sin su permiso.</li>
          <li>Usar programas automáticos, intentar saltarte los límites o sobrecargar el servicio.</li>
          <li>Intentar entrar a datos o cuentas de otras personas, o copiar o desarmar el código de la app.</li>
          <li>Hacer reservaciones falsas o con datos de otra persona.</li>
        </ul>
        <p>Si no cumples estas reglas podemos suspender tu acceso.</p>
      </Seccion>

      <Seccion n={6} titulo="Tu contenido">
        <p>
          Tus fotos siguen siendo tuyas. Nos das permiso limitado para guardarlas, procesarlas (incluido enviarlas a nuestro
          proveedor de inteligencia artificial para analizarlas) y mostrártelas, solo para darte el servicio. Ese permiso termina
          cuando las borras o cierras tu cuenta.
        </p>
        <p>Si nos mandas sugerencias o ideas, podemos usarlas para mejorar Ámbitat sin obligación de pagarte por ellas.</p>
      </Seccion>

      <Seccion n={7} titulo="Recordatorios y directorio de viveros">
        <ul>
          <li>
            Los recordatorios dependen de tu navegador, de tu celular y de tu conexión, así que puede ser que alguno no llegue.
            Úsalos como apoyo, no como la única forma de cuidar tus plantas.
          </li>
          <li>
            El directorio de viveros muestra información pública de negocios con los que no tenemos relación comercial. Sus
            datos pueden cambiar y no somos responsables de sus productos, precios ni servicios.
          </li>
        </ul>
      </Seccion>

      <Seccion n={8} titulo="Servicio de mantenimiento a domicilio">
        <h3>8.1 Precios</h3>
        <p>
          El precio depende del tamaño de tu jardín. Los precios están en pesos mexicanos e{" "}
          <strong>incluyen todos los impuestos</strong>. El precio que se cobra es el que ves en la app al momento de pagar.
        </p>
        <Tabla
          cols={["Tamaño", "Precio", "Incluye"]}
          filas={TAMANOS.map((t) => [t.nombre, `${formatoPrecio(t.precio)} MXN`, t.incluye.join(" · ")])}
        />
        <p>
          Plantas nuevas, macetas, sustrato adicional o cualquier material extra se cotizan aparte y{" "}
          <strong>solo se cobran si los autorizas antes</strong>.
        </p>

        <h3>8.2 Zona y horarios</h3>
        <ul>
          <li>Damos servicio dentro de la Ciudad de México. Si tu dirección queda fuera de nuestra zona, te contactamos para reprogramar o devolverte tu dinero completo.</li>
          <li>Las visitas son sábados y domingos, en los horarios que muestra la app ({HORARIOS_DISPONIBLES.join(", ")}), con hasta {DIAS_MAXIMOS_ANTICIPACION} días de anticipación.</li>
          <li>La hora de llegada puede variar hasta 30 minutos por el tráfico. Si vamos a llegar más tarde, te avisamos.</li>
        </ul>

        <h3>8.3 Pago y confirmación</h3>
        <ul>
          <li>El servicio se paga por adelantado con tarjeta de crédito o débito, o en efectivo en OXXO, a través de Stripe.</li>
          <li>Con tarjeta, tu cita queda confirmada al aprobarse el pago. En OXXO tienes 2 días para pagar; tu cita se confirma cuando recibimos el pago.</li>
          <li>Si tu pago en OXXO llega cuando ese horario ya fue tomado por alguien más, te contactamos para darte otro horario o devolverte tu dinero completo, como prefieras.</li>
          <li>Tu comprobante aparece en la app. Si necesitas factura (CFDI), pídela a <Dato v={R.correo} /> dentro del mismo mes de tu pago, con tus datos fiscales.</li>
        </ul>

        <h3>8.4 Lo que necesitamos de ti</h3>
        <ul>
          <li>Que una persona mayor de edad esté presente durante la visita.</li>
          <li>Acceso seguro a las plantas. Si un jardín está en altura, en una zona con riesgo eléctrico o con otro peligro, el personal puede no realizar esa parte del trabajo.</li>
          <li>Que nos avises de mascotas, alergias o cualquier detalle importante en las notas de tu reservación.</li>
          <li>Datos de contacto y dirección correctos.</li>
        </ul>

        <h3>8.5 Cancelaciones, cambios y reembolsos</h3>
        <Tabla
          cols={["Situación", "Qué pasa"]}
          filas={[
            ["Cancelas dentro de los 5 días hábiles siguientes a tu pago y la visita aún no se realiza", "Reembolso del 100%"],
            ["Cancelas 48 horas o más antes de tu cita", "Reembolso del 100%"],
            ["Cancelas con menos de 48 horas de anticipación (fuera de los 5 días hábiles)", "Reembolso del 50%"],
            ["Cambias la fecha u hora 24 horas o más antes de tu cita", "Sin costo, según disponibilidad"],
            ["No hay nadie para recibirnos o no podemos entrar (esperamos 20 minutos e intentamos contactarte)", "Sin reembolso; podemos ofrecerte otra fecha"],
            ["Nosotros cancelamos (clima, causas de fuerza mayor u otra razón nuestra)", "Tú eliges: nueva fecha o reembolso del 100%"],
          ]}
        />
        <p>
          Para cancelar o cambiar tu cita escríbenos a <Dato v={R.correo} /> o al WhatsApp <Dato v={R.telefono} /> con tu nombre
          y la fecha de tu reservación. La cancelación cuenta desde el momento en que recibimos tu mensaje.
        </p>
        <p>
          Los reembolsos se hacen al mismo medio de pago a través de Stripe. A tarjeta suelen verse en 5 a 10 días hábiles,
          según tu banco. Si pagaste en OXXO, te pediremos una cuenta bancaria para depositarte.
        </p>

        <h3>8.6 Garantía y quejas</h3>
        <ul>
          <li>Si algo del trabajo no quedó bien, avísanos dentro de las <strong>72 horas</strong> siguientes a la visita, de preferencia con fotos. Regresamos a corregirlo sin costo.</li>
          <li>
            Las plantas son seres vivos. Su salud depende de la luz, el riego, las plagas y el clima, así que no podemos
            garantizar que una planta no se enferme o muera después de la visita.
          </li>
          <li>Si nuestro personal llegara a causar algún daño en tu casa, repórtalo dentro de las 72 horas siguientes y responderemos conforme a la ley.</li>
        </ul>
      </Seccion>

      <Seccion n={9} titulo="Disponibilidad y cambios en la app">
        <p>
          Hacemos lo posible para que Ámbitat funcione siempre, pero puede haber fallas, mantenimientos o cambios. Podemos
          agregar, cambiar o quitar funciones de la app gratuita. Si un cambio afecta un servicio que ya pagaste, te avisaremos y
          podrás pedir tu reembolso.
        </p>
      </Seccion>

      <Seccion n={10} titulo="Responsabilidad">
        <p>
          En la medida que lo permita la ley, Ámbitat no es responsable por daños que resulten de seguir los consejos automáticos
          de la app, de recordatorios que no lleguen o de información de terceros, como la del directorio de viveros. Cuando se
          trate de un servicio pagado, nuestra responsabilidad se limita al monto que pagaste por ese servicio, salvo en los casos
          en que la ley no permita esa limitación.
        </p>
        <p>Nada de lo dicho en estos términos limita los derechos que te da la Ley Federal de Protección al Consumidor.</p>
      </Seccion>

      <Seccion n={11} titulo="Propiedad intelectual">
        <p>
          La marca Ámbitat, su logotipo, diseño, ilustraciones, textos y código son propiedad de Ámbitat o se usan con permiso.
          No puedes copiarlos ni usarlos sin nuestra autorización por escrito.
        </p>
      </Seccion>

      <Seccion n={12} titulo="Cierre de cuenta">
        <p>
          Puedes pedir que borremos tu cuenta en cualquier momento escribiendo a <Dato v={R.correo} />. Nosotros podemos
          suspender o cerrar cuentas que no cumplan estos términos. Si eso pasa y tienes un servicio pagado pendiente, te
          devolvemos lo que corresponda.
        </p>
      </Seccion>

      <Seccion n={13} titulo="Cambios a estos términos">
        <p>
          Si cambiamos estos términos publicaremos la nueva versión aquí con su fecha y, si el cambio es importante, te avisaremos
          en la app o por correo. Cada reservación pagada se rige por los términos que estaban vigentes cuando la pagaste.
        </p>
      </Seccion>

      <Seccion n={14} titulo="Ley aplicable, quejas y contacto">
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Si tienes una queja, primero escríbenos para
          resolverla. También puedes acudir a la Procuraduría Federal del Consumidor (PROFECO). Para cualquier controversia
          judicial serán competentes los tribunales de la Ciudad de México.
        </p>
        <p>
          <strong>Contacto:</strong> <Dato v={R.correo} /> · WhatsApp <Dato v={R.telefono} /> · <Dato v={R.domicilio} />
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
