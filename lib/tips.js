// Tips de cuidado y datos curiosos que aparecen en la tarjeta de "Stories".
// Cada día se eligen 6 distintos (3 tips + 3 datos), los mismos para todos
// ese día. Para agregar uno nuevo, copia una línea y cambia el texto; el "id"
// debe ser único.
//   tipo: "tip"  → consejo práctico de cuidado
//   tipo: "dato" → dato curioso ("¿Sabías que...?")

export const TIPS_POOL = [
  // ---------------- Tips de cuidado ----------------
  { id: "riego-dedo", tipo: "tip", emoji: "💧", titulo: "El error más común: regar de más", texto: "Más plantas mueren por exceso de agua que por falta. Antes de regar, mete un dedo 2-3 cm en la tierra: si se siente húmeda, espera un día más." },
  { id: "luz-indirecta", tipo: "tip", emoji: "☀️", titulo: "No toda la 'luz' es igual", texto: "Luz indirecta brillante significa cerca de una ventana pero sin que el sol pegue directo en las hojas. El sol directo de mediodía puede quemarlas." },
  { id: "hojas-amarillas", tipo: "tip", emoji: "🍂", titulo: "Hojas amarillas no siempre es lo mismo", texto: "Una hoja vieja que se pone amarilla y se cae sola es normal. Varias hojas amarillas a la vez casi siempre son señal de exceso de riego." },
  { id: "plagas-enves", tipo: "tip", emoji: "🔍", titulo: "Revisa debajo de las hojas", texto: "Los ácaros y las cochinillas casi siempre aparecen primero por debajo de las hojas. Revisa ahí cada par de semanas, antes de que se noten por arriba." },
  { id: "maceta-cambio", tipo: "tip", emoji: "🪴", titulo: "¿Cuándo cambiar de maceta?", texto: "Si salen raíces por el hoyo de abajo o el agua se queda encharcada arriba, es momento de una maceta un poco más grande (solo 2-5 cm más de diámetro)." },
  { id: "humedad-grupos", tipo: "tip", emoji: "🌫️", titulo: "Júntalas para más humedad", texto: "El aire acondicionado y la calefacción secan mucho el ambiente. Agrupar varias plantas ayuda a que se den un poco de humedad entre ellas." },
  { id: "drenaje", tipo: "tip", emoji: "🕳️", titulo: "Sin hoyo, no hay planta feliz", texto: "Una maceta sin agujero de drenaje acumula agua en el fondo y pudre las raíces. Si te encanta una maceta sin hoyo, úsala como cubremaceta." },
  { id: "girar", tipo: "tip", emoji: "🔄", titulo: "Gírala cada semana", texto: "Las plantas crecen hacia la luz. Si giras la maceta un cuarto de vuelta cada semana, crecen derechas y parejas en lugar de chuecas." },
  { id: "polvo", tipo: "tip", emoji: "🧽", titulo: "Limpia sus hojas", texto: "El polvo tapa la luz que las hojas necesitan. Pásales un trapo húmedo suave cada mes, sobre todo a las de hojas grandes como la monstera o el ficus." },
  { id: "abono-temporada", tipo: "tip", emoji: "🌱", titulo: "Abona cuando están creciendo", texto: "Abona en primavera y verano, cuando la planta saca hojas nuevas. En invierno casi no crecen y el abono de más puede quemar sus raíces." },
  { id: "riego-manana", tipo: "tip", emoji: "🌅", titulo: "Mejor riega en la mañana", texto: "Regar temprano le da a la planta agua para el día y deja que las hojas se sequen. Regar de noche deja la tierra húmeda muchas horas y favorece hongos." },
  { id: "riego-abajo", tipo: "tip", emoji: "🥣", titulo: "Prueba regar por abajo", texto: "Pon la maceta en un plato con agua 15-20 minutos y deja que absorba desde el fondo. Las raíces se hidratan parejo y no mojas las hojas." },
  { id: "cuarentena", tipo: "tip", emoji: "🧳", titulo: "Planta nueva, cuarentena corta", texto: "Cuando compres una planta, déjala separada de las demás un par de semanas. Si trae alguna plaga escondida, no se la pasa a tu jardín." },
  { id: "pellizcar", tipo: "tip", emoji: "✂️", titulo: "Corta las puntas para que se ponga frondosa", texto: "Si cortas la punta de un tallo largo justo arriba de una hoja, la planta saca brotes nuevos a los lados y se ve más llena." },
  { id: "esquejes", tipo: "tip", emoji: "🫙", titulo: "Multiplica tus plantas gratis", texto: "El potus, el teléfono y muchas más echan raíz en un vaso con agua. Corta un pedazo con al menos un nudo y en unas semanas tendrás una planta nueva." },
  { id: "sol-cdmx", tipo: "tip", emoji: "🏔️", titulo: "En CDMX el sol pega más fuerte", texto: "A 2,240 metros de altura el sol es más intenso. Si vas a sacar una planta de interior al balcón, acostúmbrala poco a poco o se le pueden quemar las hojas." },
  { id: "lluvias", tipo: "tip", emoji: "🌧️", titulo: "En temporada de lluvias, riega menos", texto: "De junio a septiembre llueve casi diario en la tarde. Las plantas de exterior casi no necesitan riego extra; revisa que las macetas drenen bien." },
  { id: "invierno-seco", tipo: "tip", emoji: "🧊", titulo: "Invierno: menos agua, más cuidado del frío", texto: "En invierno las plantas crecen más lento y toman menos agua. Aléjalas de ventanas muy frías en la noche y de los calentadores." },
  { id: "barro", tipo: "tip", emoji: "🏺", titulo: "Las macetas de barro respiran", texto: "El barro deja salir la humedad y la tierra se seca más rápido. Son ideales para suculentas y cactus; en plantas que aman la humedad, riega un poco más seguido." },
  { id: "agua-temperatura", tipo: "tip", emoji: "🌡️", titulo: "Agua al tiempo, no helada", texto: "El agua muy fría puede estresar las raíces de las plantas tropicales. Usa agua a temperatura ambiente; puedes dejarla en la regadera desde la noche anterior." },

  // ---------------- Datos curiosos ----------------
  { id: "jitomate-sonidos", tipo: "dato", emoji: "🍅", titulo: "Las plantas 'hacen ruido' cuando tienen sed", texto: "Científicos grabaron que las plantas de jitomate emiten chasquidos ultrasónicos cuando les falta agua. Nosotros no los oímos, pero algunos animales sí podrían." },
  { id: "bambu", tipo: "dato", emoji: "🎋", titulo: "La planta más rápida del mundo", texto: "Algunas especies de bambú pueden crecer casi un metro en un solo día. Es una de las plantas de crecimiento más rápido que se conocen." },
  { id: "girasol", tipo: "dato", emoji: "🌻", titulo: "Los girasoles jóvenes siguen al sol", texto: "De jóvenes giran durante el día siguiendo al sol. Ya adultos se quedan viendo hacia el este, donde sale el sol, y así atraen a más abejas en la mañana." },
  { id: "sansevieria-noche", tipo: "dato", emoji: "🌙", titulo: "La lengua de suegra 'respira' de noche", texto: "A diferencia de la mayoría de las plantas, abre sus poros en la noche para no perder agua con el calor del día. Por eso aguanta tanto tiempo sin riego." },
  { id: "nasa", tipo: "dato", emoji: "🚀", titulo: "El estudio de la NASA tiene letra chiquita", texto: "Un famoso estudio de la NASA mostró que las plantas limpian el aire en cámaras cerradas. Pero en una casa real harían falta muchísimas plantas por metro cuadrado para notar la diferencia. Igual te hacen sentir mejor." },
  { id: "espinas", tipo: "dato", emoji: "🌵", titulo: "Las espinas del cactus son hojas", texto: "Las espinas son hojas que se transformaron para no perder agua y para defenderse. La fotosíntesis la hace el tallo verde." },
  { id: "mimosa", tipo: "dato", emoji: "🌿", titulo: "Una planta que se 'esconde'", texto: "La mimosa (dormilona) cierra sus hojas en segundos cuando la tocas. Es una defensa para parecer menos apetitosa a los animales." },
  { id: "matusalen", tipo: "dato", emoji: "🌲", titulo: "Un árbol de casi 5,000 años", texto: "Un pino en California, apodado Matusalén, tiene alrededor de 4,800 años. Ya estaba vivo cuando se construyeron las pirámides de Egipto." },
  { id: "vainilla", tipo: "dato", emoji: "🌸", titulo: "La vainilla es una orquídea mexicana", texto: "La vainilla viene de una orquídea originaria de México. Los totonacas de Papantla, Veracruz, la cultivaban mucho antes de que llegara a Europa." },
  { id: "nochebuena", tipo: "dato", emoji: "🎄", titulo: "La nochebuena es de México", texto: "Su nombre náhuatl es cuetlaxóchitl y es nativa de México. Lo que parecen pétalos rojos en realidad son hojas; sus flores son los botoncitos amarillos del centro." },
  { id: "dalia", tipo: "dato", emoji: "🌺", titulo: "Nuestra flor nacional", texto: "La dalia es la flor nacional de México desde 1963. Es originaria de aquí y hoy existen miles de variedades en todo el mundo." },
  { id: "megadiverso", tipo: "dato", emoji: "🇲🇽", titulo: "México es un país megadiverso", texto: "En México hay más de 20 mil especies de plantas, y cerca de la mitad solo existen aquí. Es de los países con más variedad de plantas del planeta." },
  { id: "tule", tipo: "dato", emoji: "🌳", titulo: "El árbol del Tule", texto: "Este ahuehuete en Oaxaca tiene uno de los troncos más gruesos del mundo: mide unos 42 metros alrededor. El ahuehuete es el árbol nacional de México." },
  { id: "cuna-alimentos", tipo: "dato", emoji: "🌽", titulo: "México le dio al mundo muchos alimentos", texto: "El maíz, el chile, el aguacate, el frijol y el cacao se domesticaron en México y Mesoamérica hace miles de años." },
  { id: "paxtle", tipo: "dato", emoji: "🎁", titulo: "El heno de los nacimientos es una planta", texto: "El 'paxtle' o heno es una tillandsia, una planta sin raíces en tierra que toma agua y nutrientes del aire con unos pelitos en sus hojas." },
  { id: "cuna-moises", tipo: "dato", emoji: "🤍", titulo: "La cuna de Moisés no es un lirio", texto: "Aunque en inglés le dicen 'lirio de la paz', es pariente de la monstera y del anturio. Lo blanco que parece una flor es una hoja modificada." },
  { id: "platano", tipo: "dato", emoji: "🍌", titulo: "El plátano no es un árbol", texto: "La planta de plátano es una hierba gigante: su 'tronco' son hojas enrolladas muy apretadas. Es la planta herbácea con flor más grande del mundo." },
  { id: "fresa", tipo: "dato", emoji: "🍓", titulo: "Los puntitos de la fresa son sus frutos", texto: "Cada 'semillita' de la fresa es en realidad un fruto diminuto con una semilla adentro. La parte roja que nos comemos es el tallo de la flor engrosado." },
  { id: "venus", tipo: "dato", emoji: "🪤", titulo: "La venus atrapamoscas sabe contar", texto: "Para cerrarse necesita que la toquen dos veces en unos 20 segundos. Así no gasta energía cerrándose con una gota de lluvia." },
  { id: "verde", tipo: "dato", emoji: "🟢", titulo: "¿Por qué las hojas son verdes?", texto: "Las plantas aprovechan sobre todo la luz roja y azul para hacer fotosíntesis. La luz verde la reflejan más, y por eso las vemos verdes." },
];

// Número a partir de un texto (siempre el mismo para el mismo texto).
function semillaDe(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Revuelve una lista de forma predecible usando la semilla.
function revolver(lista, semilla) {
  const copia = [...lista];
  let s = semilla || 1;
  for (let i = copia.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Los 6 del día ("YYYY-MM-DD"): 3 tips y 3 datos, intercalados.
// Se van recorriendo en orden revuelto para que no se repitan seguido.
export function tipsDelDia(dia, cuantos = 6) {
  const tips = TIPS_POOL.filter((t) => t.tipo === "tip");
  const datos = TIPS_POOL.filter((t) => t.tipo === "dato");
  const [y, m, d] = dia.split("-").map(Number);
  const numeroDia = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const mitad = Math.ceil(cuantos / 2);

  // Un orden revuelto fijo que se recorre completo antes de repetir.
  function tomar(lista, desde, n, etiqueta) {
    const orden = revolver(lista, semillaDe(etiqueta));
    const res = [];
    for (let k = 0; k < n; k++) res.push(orden[(desde + k) % orden.length]);
    return res;
  }
  const delDiaTips = tomar(tips, numeroDia * mitad, mitad, "tips");
  const delDiaDatos = tomar(datos, numeroDia * (cuantos - mitad), cuantos - mitad, "datos");
  const resultado = [];
  for (let k = 0; k < mitad; k++) {
    if (delDiaDatos[k]) resultado.push(delDiaDatos[k]);
    if (delDiaTips[k]) resultado.push(delDiaTips[k]);
  }
  return resultado.slice(0, cuantos);
}
