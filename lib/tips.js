// Tips de cuidado y datos curiosos. Cada día la app muestra una selección
// distinta (3 tips + 3 datos, intercalados) que cambia a medianoche, hora CDMX.
// Para agregar más, solo añade un renglón nuevo a las listas de abajo.
import { diasEntre } from "./fechas";

export const TIPS_CUIDADO = [
  { id: "riego", emoji: "💧", titulo: "El error más común: regar de más", texto: "Más plantas mueren por exceso de riego que por falta de agua. Antes de regar, mete un dedo 2-3 cm en la tierra — si se siente húmeda, espera un día más." },
  { id: "luz", emoji: "☀️", titulo: "No toda la 'luz' es igual", texto: "Luz indirecta brillante significa cerca de una ventana pero sin que el sol pegue directo en las hojas. El sol directo de mediodía puede quemarlas." },
  { id: "hojas", emoji: "🍂", titulo: "Hojas amarillas no siempre es lo mismo", texto: "Una hoja amarilla vieja que se cae sola es normal. Varias hojas amarillas a la vez casi siempre es señal de exceso de riego." },
  { id: "plagas", emoji: "🔍", titulo: "Revisa el envés de las hojas", texto: "Los ácaros y cochinillas casi siempre aparecen primero por debajo de las hojas. Revisa ahí cada par de semanas, antes de que se noten por arriba." },
  { id: "trasplante", emoji: "🪴", titulo: "¿Cuándo cambiar de maceta?", texto: "Si ves raíces saliendo por el hoyo de abajo, o el agua ya no se absorbe y se queda encharcada arriba, es momento de una maceta más grande." },
  { id: "humedad", emoji: "🌫️", titulo: "Ambientes secos afectan más de lo que crees", texto: "El aire acondicionado y la calefacción bajan mucho la humedad. Agrupar varias plantas juntas ayuda a que se den un poco de humedad entre ellas." },
  { id: "agua-reposada", emoji: "🚰", titulo: "Deja reposar el agua", texto: "Si tu agua de la llave tiene mucho cloro, déjala unas horas en un recipiente abierto antes de regar. Las plantas sensibles, como las calateas, lo agradecen." },
  { id: "drenaje", emoji: "🕳️", titulo: "Sin agujero, la maceta es una trampa", texto: "Una maceta sin drenaje deja el agua estancada en el fondo y pudre las raíces. Si la que te gusta no tiene hoyos, úsala como cubremaceta y deja la planta en su maceta con agujeros." },
  { id: "girar", emoji: "🔄", titulo: "Gira tu planta cada semana", texto: "Las plantas crecen hacia la luz. Dale un cuarto de vuelta a la maceta cada semana y crecerá pareja en lugar de chueca." },
  { id: "limpiar-hojas", emoji: "🧽", titulo: "Limpia las hojas", texto: "El polvo tapa la luz que necesita la hoja. Pásale un paño húmedo suave cada par de semanas y tu planta aprovechará mejor la luz." },
  { id: "suculentas", emoji: "🌵", titulo: "Suculentas: poco, pero bien", texto: "Riega mucho de una vez y luego deja que la tierra se seque por completo antes del siguiente riego. Regar poquito y seguido las pudre." },
  { id: "invierno", emoji: "❄️", titulo: "En invierno, menos agua", texto: "Con menos luz y más frío casi todas las plantas crecen más lento y usan menos agua. Si sigues regando igual que en verano, la tierra tarda mucho en secar." },
  { id: "manana", emoji: "🌅", titulo: "Riega por la mañana", texto: "Así la planta aprovecha el agua durante el día y la tierra no se queda mojada toda la noche, que es cuando se favorecen los hongos." },
  { id: "puntas-cafes", emoji: "🟤", titulo: "¿Puntas cafés en las hojas?", texto: "Casi siempre es aire muy seco, riego irregular o acumulación de sales del agua o del abono. Corta la parte seca con tijeras limpias y revisa tu rutina de riego." },
  { id: "poda", emoji: "✂️", titulo: "Podar también es cuidar", texto: "Quitar hojas secas y tallos largos o maltratados ayuda a que la planta gaste su energía en brotes nuevos, y evita que se junten hongos." },
  { id: "abono", emoji: "🧪", titulo: "Más abono no es mejor", texto: "Abona solo en primavera y verano, cada 4 a 6 semanas y diluido. Un exceso de fertilizante quema las raíces y puede hacerle más daño que bien." },
  { id: "tierra", emoji: "🟫", titulo: "La tierra también se cansa", texto: "Con el tiempo la tierra se compacta y pierde nutrientes. Renueva la capa de arriba cada año o cambia la tierra completa cada dos." },
  { id: "cuarentena", emoji: "🛑", titulo: "Cuarentena para plantas nuevas", texto: "Pon a las plantas recién compradas lejos de las demás unas dos semanas. Así, si traen plagas, no se las pasan a todo tu jardín." },
  { id: "mosquitas", emoji: "🦟", titulo: "Mosquitas en la tierra", texto: "Esas mosquitas pequeñas aparecen cuando la tierra está siempre húmeda. Deja secar la capa de arriba entre riegos y casi siempre desaparecen." },
  { id: "vidrio", emoji: "🪟", titulo: "Cuidado con el sol detrás del vidrio", texto: "El sol directo que pasa por una ventana puede quemar las hojas aunque afuera no haga tanto calor, sobre todo al mediodía y en la tarde." },
  { id: "aclimatar", emoji: "🚚", titulo: "Los cambios de lugar estresan", texto: "Si mueves tu planta a un sitio con muy distinta luz, puede soltar hojas por el cambio. Hazlo poco a poco y dale un par de semanas para adaptarse." },
  { id: "reposo", emoji: "😴", titulo: "Reposo no es muerte", texto: "Algunas plantas frenan o pierden hojas en invierno como parte de su ciclo natural. Antes de rendirte, revisa que el tallo y las raíces sigan firmes." },
  { id: "etiolacion", emoji: "📏", titulo: "Tallos largos y flacos piden luz", texto: "Si tu planta se estira con hojas pequeñas y muy separadas, está buscando más luz. Acércala a una ventana brillante." },
  { id: "maceta-tamano", emoji: "🥣", titulo: "Una maceta enorme no siempre ayuda", texto: "Demasiada tierra retiene demasiada agua. Al cambiar de maceta, sube solo 2 o 3 cm de diámetro respecto a la anterior." },
  { id: "hojas-caidas", emoji: "😵", titulo: "Hojas caídas: revisa la tierra primero", texto: "Una planta caída puede tener sed o puede estar ahogada. Toca la tierra antes de regar: seca, dale agua; empapada, espera." },
  { id: "esquejes", emoji: "🌱", titulo: "Multiplica tus plantas gratis", texto: "El pothos y la tradescantia echan raíces en un vaso con agua. Corta un tallo justo debajo de un nudo y espera unas semanas." },
  { id: "lluvia", emoji: "🌧️", titulo: "Aprovecha el agua de lluvia", texto: "En temporada de lluvias en la ciudad, junta agua en un recipiente limpio. Suele ser más suave que la de la llave y a muchas plantas les cae de maravilla." },
  { id: "altura", emoji: "⛰️", titulo: "En CDMX el sol pega más fuerte", texto: "A más de 2,200 metros de altura la radiación del sol es más intensa. Una planta que aguanta sol directo en la costa puede quemarse más rápido aquí." },
  { id: "frio", emoji: "🥶", titulo: "Madrugadas frías", texto: "En invierno las noches pueden bajar mucho, sobre todo en azoteas y balcones. Mete o aleja de ventanas y aire frío a las plantas más sensibles." },
  { id: "viento", emoji: "💨", titulo: "El viento seca más rápido", texto: "En balcones y azoteas la tierra se seca más pronto por el viento. Revisa la humedad con más frecuencia que en una planta de interior." },
  { id: "orquideas", emoji: "🌸", titulo: "Orquídeas: que respiren las raíces", texto: "Sus raíces necesitan aire. Riega, deja escurrir bien y nunca dejes agua acumulada en el plato ni en el fondo de la maceta." },
  { id: "vertical", emoji: "🧱", titulo: "Jardín vertical: las de arriba se secan primero", texto: "En un muro verde el agua baja y la parte de arriba se seca antes. Revisa con la mano cada nivel en lugar de regar todo igual." },
  { id: "mascotas", emoji: "🐾", titulo: "Plantas y mascotas", texto: "Algunas plantas comunes, como el pothos, la monstera y el lirio de la paz, pueden ser tóxicas para perros y gatos. Si tienes mascotas, ponlas fuera de su alcance." },
];

export const DATOS_CURIOSOS = [
  { id: "d-bambu", emoji: "🎋", titulo: "El bambú que crece casi un metro al día", texto: "Algunas especies de bambú gigante pueden crecer cerca de un metro en solo 24 horas. Está entre las plantas de crecimiento más rápido del mundo." },
  { id: "d-platano", emoji: "🍌", titulo: "El plátano es una baya… y la fresa no", texto: "Botánicamente, el plátano cumple con la definición de baya y la fresa no. Los nombres de la cocina y los de la botánica no siempre coinciden." },
  { id: "d-girasol", emoji: "🌻", titulo: "Los girasoles jóvenes siguen al sol", texto: "Los girasoles jóvenes giran durante el día siguiendo al sol. Al madurar dejan de moverse y casi todos quedan mirando hacia el este." },
  { id: "d-mimosa", emoji: "🙈", titulo: "La planta que se cierra cuando la tocas", texto: "La dormilona (Mimosa pudica) pliega sus hojas en segundos si la rozas. Es un movimiento rápido que se cree que la protege de los herbívoros." },
  { id: "d-tomate", emoji: "🍅", titulo: "'Tomate' viene del náhuatl", texto: "La palabra viene de 'tomatl'. El jitomate y el tomate verde se domesticaron en México, y de aquí se fueron al mundo entero." },
  { id: "d-maiz", emoji: "🌽", titulo: "El maíz nació en México", texto: "Se domesticó hace cerca de 9,000 años a partir de un pasto silvestre llamado teocintle. Es una de las transformaciones de plantas más impresionantes de la historia." },
  { id: "d-nopal", emoji: "🌵", titulo: "Las 'pencas' del nopal son tallos", texto: "Lo que llamamos penca es en realidad un tallo aplanado. Hace la fotosíntesis y guarda agua, y las espinas son hojas transformadas." },
  { id: "d-aguacate", emoji: "🥑", titulo: "Aguacate: del náhuatl 'ahuacatl'", texto: "México es el mayor productor de aguacate del mundo. Su nombre viene del náhuatl ahuacatl." },
  { id: "d-tule", emoji: "🌳", titulo: "El árbol con el tronco más ancho", texto: "El Árbol del Tule, un ahuehuete en Oaxaca, tiene uno de los troncos más anchos que se han medido en el mundo." },
  { id: "d-venus", emoji: "🪤", titulo: "La atrapamoscas sabe contar", texto: "Sus trampas solo se cierran si algo toca dos veces los pelitos sensibles en unos 20 segundos. Así no gasta energía con una gota de lluvia." },
  { id: "d-aire", emoji: "🌬️", titulo: "¿Una planta purifica el aire de tu casa?", texto: "Menos de lo que se dice. Los estudios de laboratorio no se repiten igual en una casa con ventanas y puertas. Pero tener plantas sí puede mejorar tu ánimo." },
  { id: "d-verde", emoji: "🟢", titulo: "¿Por qué las hojas son verdes?", texto: "La clorofila absorbe sobre todo luz roja y azul y refleja la verde. Por eso vemos las hojas de ese color." },
  { id: "d-vainilla", emoji: "🍦", titulo: "La vainilla es una orquídea mexicana", texto: "Es el fruto de una orquídea originaria de México. Los totonacas fueron de los primeros en cultivarla." },
  { id: "d-chinampas", emoji: "🛶", titulo: "Chinampas: huertos flotantes", texto: "Las chinampas de Xochimilco son parcelas de cultivo sobre el agua, creadas desde tiempos prehispánicos. Todavía se usan para sembrar flores y verduras." },
  { id: "d-dalia", emoji: "🌺", titulo: "La dalia es la flor nacional", texto: "Es originaria de México y fue declarada flor nacional en 1963. Hay miles de variedades de todos los colores." },
  { id: "d-cempasuchil", emoji: "🏵️", titulo: "Cempasúchil: la flor de muerto", texto: "El cempasúchil (Tagetes erecta) es nativo de México y es el que adorna los altares del Día de Muertos. Su nombre viene del náhuatl y se suele traducir como 'flor de veinte pétalos'." },
  { id: "d-nochebuena", emoji: "🎄", titulo: "La nochebuena también es mexicana", texto: "Es originaria de México y lo que parecen pétalos rojos son en realidad hojas de colores, llamadas brácteas. Su flor de verdad es la pequeña amarilla del centro." },
  { id: "d-pando", emoji: "🍂", titulo: "Un bosque que es un solo ser", texto: "Pando, en Utah, es un bosque de álamos temblones conectados por las mismas raíces. Genéticamente es un solo organismo." },
  { id: "d-saguaro", emoji: "🌵", titulo: "El saguaro y su paciencia", texto: "Un cactus saguaro puede tardar unos 75 años en desarrollar su primer brazo." },
  { id: "d-loto", emoji: "🪷", titulo: "Semillas que esperan siglos", texto: "Semillas de loto de más de mil años, encontradas en un antiguo lago de China, lograron germinar cuando se les dio agua y calor." },
  { id: "d-transpiracion", emoji: "💦", titulo: "Un árbol grande 'suda' cientos de litros", texto: "Un árbol grande puede liberar cientos de litros de agua al día en forma de vapor por sus hojas. Los bosques ayudan a enfriar el ambiente." },
  { id: "d-chile", emoji: "🌶️", titulo: "Las aves no sienten el picante", texto: "La capsaicina, que hace picar al chile, no afecta a las aves. Por eso se comen los chiles y esparcen sus semillas." },
  { id: "d-helechos", emoji: "🌿", titulo: "Los helechos son más viejos que los dinosaurios", texto: "Los helechos llevan sobre la Tierra más de 300 millones de años, mucho antes de que aparecieran los dinosaurios." },
  { id: "d-jitomate", emoji: "🍅", titulo: "El jitomate es una fruta", texto: "Botánicamente es un fruto, porque se forma de la flor y lleva las semillas adentro. En la cocina lo tratamos como verdura." },
  { id: "d-oracion", emoji: "🙏", titulo: "Plantas que 'rezan' de noche", texto: "La maranta, también llamada planta de la oración, sube y pliega sus hojas al anochecer y las vuelve a abrir en la mañana." },
  { id: "d-monstera", emoji: "🍃", titulo: "¿Por qué la monstera tiene agujeros?", texto: "Se cree que los cortes y huecos de sus hojas dejan pasar la luz a las hojas de abajo y ayudan a que el viento no las rompa en la selva." },
  { id: "d-estomas", emoji: "🔬", titulo: "Las plantas respiran por el envés", texto: "Tienen pequeños poros llamados estomas, sobre todo debajo de las hojas, por donde entra el CO₂ y sale el vapor de agua." },
  { id: "d-cafe", emoji: "☕", titulo: "El café es una semilla", texto: "Los granos de café son las semillas de un fruto rojo parecido a una cereza. Se cultivan en México, sobre todo en Chiapas, Veracruz y Oaxaca." },
  { id: "d-especies", emoji: "🌎", titulo: "México, país megadiverso", texto: "En México viven más de 20,000 especies de plantas con flores, y muchas no existen en ningún otro lugar del mundo." },
  { id: "d-agave", emoji: "🪴", titulo: "El agave tarda años en madurar", texto: "Un agave tequilero tarda varios años en estar listo para cosecharse. Es una de las plantas más pacientes y valiosas de México." },
];

// ¿Cuántos tips y datos se muestran al día?
const TIPS_POR_DIA = 3;
const DATOS_POR_DIA = 3;

// Regresa la lista del día: tip, dato, tip, dato... y cada día avanza en las
// listas, así que no se repite nada hasta recorrerlas completas. Es la misma
// para todos los usuarios el mismo día. "hoy" es "YYYY-MM-DD" en hora CDMX.
export function tipsDelDia(hoy) {
  const d = Math.max(0, diasEntre("2026-01-01", hoy));
  const resultado = [];
  for (let k = 0; k < Math.max(TIPS_POR_DIA, DATOS_POR_DIA); k++) {
    if (k < TIPS_POR_DIA) {
      const t = TIPS_CUIDADO[(d * TIPS_POR_DIA + k) % TIPS_CUIDADO.length];
      resultado.push({ ...t, tipo: "tip" });
    }
    if (k < DATOS_POR_DIA) {
      const x = DATOS_CURIOSOS[(d * DATOS_POR_DIA + k) % DATOS_CURIOSOS.length];
      resultado.push({ ...x, tipo: "dato" });
    }
  }
  return resultado;
}
