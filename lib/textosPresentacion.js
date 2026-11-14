// Todos los textos de la página de presentación, en español y en inglés.
// Para cambiar una frase, cámbiala aquí (sin tocar el diseño).
import { formatoPrecio } from "./servicio";

const DIAS = {
  es: ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"],
  en: ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"],
};
// [6, 0] → "sábados y domingos" (de lunes a domingo)
export function diasDeVisita(dias, idioma) {
  if (!Array.isArray(dias) || dias.length === 0) return null;
  if (dias.length === 7) return idioma === "en" ? "every day" : "todos los días";
  const orden = [...dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DIAS[idioma][d]);
  const y = idioma === "en" ? " and " : " y ";
  return orden.length === 1 ? orden[0] : orden.slice(0, -1).join(", ") + y + orden[orden.length - 1];
}

// Lo que incluye cada tamaño (lib/servicio.js) traducido.
const INCLUYE_EN = {
  "Hasta 10 plantas": "Up to 10 plants",
  "Visita de ~1 hora": "About a 1-hour visit",
  "Riego, poda ligera y limpieza de hojas": "Watering, light pruning and leaf cleaning",
  "Revisión de plagas": "Pest check",
  "De 11 a 25 plantas": "11 to 25 plants",
  "Visita de ~2 horas": "About a 2-hour visit",
  "Todo lo del pequeño": "Everything in Small",
  "Abono y cambio de tierra ligero": "Fertilizer and a light soil top-up",
  "Más de 25 plantas": "More than 25 plants",
  "Visita de ~3 horas": "About a 3-hour visit",
  "Todo lo del mediano": "Everything in Medium",
  "Plan de cuidado por escrito": "A written care plan",
};
const NOMBRE_EN = { pequeno: "Small", mediano: "Medium", grande: "Large" };
export function textoIncluye(linea, idioma) {
  return idioma === "en" ? INCLUYE_EN[linea] || linea : linea;
}
export function nombreTamano(t, idioma) {
  return idioma === "en" ? `${NOMBRE_EN[t.key] || t.nombre} garden` : `Jardín ${t.nombre.toLowerCase()}`;
}

export const TEXTOS = {
  es: {
    tituloPagina: "Ámbitat · Cuidado de plantas en CDMX: app gratis y mantenimiento a domicilio",
    descripcion: (min) =>
      `Identifica tus plantas con una foto y recibe avisos de riego gratis. Y si quieres que alguien las cuide, vamos a tu casa o negocio en la Ciudad de México desde ${formatoPrecio(min)}.`,
    menu: [["#la-app", "La app"], ["#mantenimiento", "Mantenimiento"], ["#casas-y-negocios", "Casas y negocios"], ["#preguntas", "Preguntas"]],
    abrirApp: "Abrir la app",
    h1: "Tus plantas, bien cuidadas. En tu casa o con tu celular.",
    entrada: "¿Tu monstera tiene hojas amarillas? Tómale una foto: la app te dice qué tiene, cómo cuidarla y cuándo regarla. Y si prefieres que alguien lo haga por ti, vamos a tu casa o negocio en la Ciudad de México.",
    abrirAppGratis: "Abrir la app gratis",
    verMantenimiento: "Ver el mantenimiento",
    nota: "Sin descargar nada. Funciona en celular y en computadora.",
    demo: {
      etiqueta: "Demostración de la app Ámbitat",
      miJardin: "Mi jardín",
      analizando: "Analizando…",
      listo: "Listo",
      instruccion: "Toca una planta para escanearla",
      ahora: "ahora",
      otra: "Probar con otra planta",
      pie: "Así funciona. Toca una planta.",
    },
    appTitulo: "Una app que se acuerda por ti",
    appFilas: [
      ["📸", "Escanea cualquier planta", "Su nombre, cuánta luz y agua necesita, si es tóxica para tus mascotas y qué plagas vigilar."],
      ["💧", "Avisos de riego y del clima", "Te llega un aviso el día que le toca agua, y otro cuando viene frío, calor o lluvia fuerte en la ciudad."],
      ["🛋️", "Tu jardín por cuartos", "Agrupa tus plantas por sala, balcón u oficina y riega todo un cuarto de un toque."],
    ],
    empezar: "Empezar con mi primera planta",
    mantTitulo: "Mantenimiento a domicilio",
    mantSub: (dias) =>
      `${dias ? `Vamos los ${dias}, ` : "Vamos "}a la hora que elijas, y revisamos planta por planta. Reservas y pagas en la app, con tarjeta o en OXXO.`,
    pasos: [
      ["Abre la app y entra a Tienda.", "Elige el tamaño de tu jardín."],
      ["Escoge fecha y hora.", "El calendario solo te enseña días con lugar."],
      ["Paga y listo.", "Te llega la confirmación y puedes cambiar o cancelar desde la app."],
    ],
    reservar: "Reservar mi visita",
    publicosTitulo: "Para tu casa y para tu negocio",
    casaTitulo: "En tu casa",
    casaTexto: "Para el depa con plantas en la ventana o la terraza que ya se te salió de las manos. Tú escaneas y la app te avisa; si algo se complica, vamos nosotros.",
    negocioTitulo: "En tu negocio",
    negocioTexto: "Cafés, restaurantes, oficinas y consultorios. Tus plantas se ven bien frente a tus clientes y tú no tienes que estar pendiente de regarlas.",
    negocioBoton: "Escríbenos para tu negocio",
    mensajeNegocio: "Hola, vi Ámbitat y quiero mantenimiento de plantas para mi negocio:",
    zonasTitulo: "Dónde damos servicio",
    noVesTuColonia: "¿No ves tu colonia?",
    preguntanos: "Pregúntanos por WhatsApp",
    preguntasTitulo: "Preguntas frecuentes",
    pieGrande: "¿Tienes una planta que no sabes cómo cuidar?",
    terminos: "Términos y condiciones",
    privacidad: "Aviso de privacidad",
    mensajeWa: "Hola, vi Ámbitat y quiero información sobre el mantenimiento de plantas.",
    preguntas: ({ tamanos, zonas, dias }) => [
      ["¿La app cuesta?", "No. Identificar tus plantas, ver cómo cuidarlas y recibir los avisos de riego es gratis."],
      ["¿Necesito descargar algo?", "No hace falta tienda de apps: se abre en el navegador de tu celular o tu computadora. Si quieres, la agregas a tu pantalla de inicio y se usa como cualquier app."],
      ["¿Necesito crear una cuenta?", "Para empezar, no: puedes escanear y guardar hasta 3 plantas sin cuenta. Para guardar más o reservar un mantenimiento, entras con Google o con tu correo."],
      ["¿Qué incluye el mantenimiento?", "Revisión de cada planta, riego, poda ligera, limpieza de hojas y revisión de plagas. En jardines medianos y grandes también abono y cambio de tierra ligero."],
      ["¿Qué días van?", dias ? `Las visitas son los ${dias}. En la app solo aparecen los días con lugar.` : "En la app solo aparecen los días con lugar."],
      ["¿Cuánto cuesta?", `Depende de cuántas plantas tengas: ${tamanos.map((t) => `${t.nombre.toLowerCase()} ${formatoPrecio(t.precio)}`).join(", ")} (MXN, impuestos incluidos).`],
      ["¿Dónde dan servicio?", `En la Ciudad de México: ${zonas.join(", ")}. Si no ves tu colonia, escríbenos por WhatsApp.`],
      ["¿Cómo pago?", "En la app, con tarjeta de crédito o débito. Si tu visita es en 3 días o más, también puedes pagar en efectivo en OXXO."],
      ["¿Puedo cambiar o cancelar mi cita?", "Sí, desde la app. Cambiar la fecha no cuesta nada hasta 24 horas antes. Si cancelas con 48 horas o más de anticipación te devolvemos todo tu pago."],
      ["¿Qué tan exacta es la identificación?", "Muy buena con fotos claras de la hoja y la planta completa, pero es inteligencia artificial y puede equivocarse. Tómala como una guía."],
    ],
  },
  en: {
    tituloPagina: "Ámbitat · Plant care in Mexico City: free app and in-home maintenance",
    descripcion: (min) =>
      `Identify your plants with a photo and get free watering reminders. If you'd rather have someone look after them, we visit your home or business in Mexico City from ${formatoPrecio(min)}.`,
    menu: [["#la-app", "The app"], ["#mantenimiento", "Maintenance"], ["#casas-y-negocios", "Homes & businesses"], ["#preguntas", "FAQ"]],
    abrirApp: "Open the app",
    h1: "Your plants, well looked after. At home or from your phone.",
    entrada: "Yellow leaves on your monstera? Take a photo: the app tells you what's wrong, how to care for it and when to water. And if you'd rather someone did it for you, we come to your home or business in Mexico City.",
    abrirAppGratis: "Open the free app",
    verMantenimiento: "See maintenance",
    nota: "Nothing to download. Works on your phone and your computer.",
    demo: {
      etiqueta: "Ámbitat app demo",
      miJardin: "My garden",
      analizando: "Analyzing…",
      listo: "Done",
      instruccion: "Tap a plant to scan it",
      ahora: "now",
      otra: "Try another plant",
      pie: "This is how it works. Tap a plant.",
    },
    appTitulo: "An app that remembers for you",
    appFilas: [
      ["📸", "Scan any plant", "Its name, how much light and water it needs, whether it's toxic to pets and which pests to watch for."],
      ["💧", "Watering and weather alerts", "You get a reminder on the day it needs water, and another when cold, heat or heavy rain is coming to the city."],
      ["🛋️", "Your garden, room by room", "Group your plants by living room, balcony or office and water a whole room in one tap."],
    ],
    empezar: "Start with my first plant",
    mantTitulo: "In-home maintenance",
    mantSub: (dias) => `${dias ? `We visit on ${dias}, ` : "We visit "}at the time you choose, and check every plant. You book and pay in the app, by card or cash at OXXO.`,
    pasos: [
      ["Open the app and go to Shop.", "Pick the size of your garden."],
      ["Choose a date and time.", "The calendar only shows days with openings."],
      ["Pay and you're set.", "You get a confirmation and can reschedule or cancel from the app."],
    ],
    reservar: "Book my visit",
    publicosTitulo: "For your home and your business",
    casaTitulo: "At home",
    casaTexto: "For the apartment with plants on the windowsill, or the terrace that got out of hand. You scan and the app reminds you; if things get complicated, we come over.",
    negocioTitulo: "At your business",
    negocioTexto: "Cafés, restaurants, offices and clinics. Your plants look good in front of your customers and you don't have to remember to water them.",
    negocioBoton: "Message us about your business",
    mensajeNegocio: "Hi, I saw Ámbitat and I'd like plant maintenance for my business:",
    zonasTitulo: "Where we work",
    noVesTuColonia: "Don't see your neighborhood?",
    preguntanos: "Ask us on WhatsApp",
    preguntasTitulo: "Frequently asked questions",
    pieGrande: "Got a plant you don't know how to care for?",
    terminos: "Terms and conditions",
    privacidad: "Privacy notice",
    mensajeWa: "Hi, I saw Ámbitat and I'd like information about plant maintenance.",
    preguntas: ({ tamanos, zonas, dias }) => [
      ["Does the app cost anything?", "No. Identifying your plants, seeing how to care for them and getting watering reminders is free."],
      ["Do I need to download anything?", "No app store needed: it opens in your phone or computer browser. If you like, add it to your home screen and use it like any other app."],
      ["Do I need an account?", "Not to start: you can scan and save up to 3 plants without one. To save more or book a maintenance visit, sign in with Google or your email."],
      ["What does maintenance include?", "A check of every plant, watering, light pruning, leaf cleaning and a pest check. Medium and large gardens also get fertilizer and a light soil top-up."],
      ["Which days do you visit?", dias ? `Visits are on ${dias}. The app only shows days with openings.` : "The app only shows days with openings."],
      ["How much is it?", `It depends on how many plants you have: ${tamanos.map((t) => `${(NOMBRE_EN[t.key] || t.nombre).toLowerCase()} ${formatoPrecio(t.precio)}`).join(", ")} (MXN, taxes included).`],
      ["Where do you work?", `In Mexico City: ${zonas.join(", ")}. If you don't see your neighborhood, message us on WhatsApp.`],
      ["How do I pay?", "In the app, by credit or debit card. If your visit is 3 or more days away, you can also pay cash at OXXO."],
      ["Can I reschedule or cancel?", "Yes, from the app. Changing the date is free up to 24 hours before. Cancel 48 hours or more ahead and we refund your full payment."],
      ["How accurate is the identification?", "Very good with clear photos of the leaf and the whole plant, but it's AI and can be wrong. Treat it as a guide."],
    ],
  },
};

// Plantas de ejemplo para la demo del teléfono.
export const DEMO = [
  {
    clave: "monstera",
    img: "/stages/s6.png",
    cientifico: "Monstera deliciosa",
    tono: "verde",
    es: { nombre: "Monstera", estado: "✅ Saludable", datos: ["💧 Cada 7 días", "☀️ Luz indirecta brillante", "🐾 Tóxica para mascotas"], consejo: "Gírala un poco cada semana para que crezca pareja.", aviso: "Tu Monstera necesita agua el jueves 💧" },
    en: { nombre: "Monstera", estado: "✅ Healthy", datos: ["💧 Every 7 days", "☀️ Bright indirect light", "🐾 Toxic to pets"], consejo: "Turn it a little each week so it grows evenly.", aviso: "Your Monstera needs water on Thursday 💧" },
  },
  {
    clave: "suculenta",
    img: "/stages/s3.png",
    cientifico: "Echeveria elegans",
    tono: "verde",
    es: { nombre: "Suculenta", estado: "✅ Saludable", datos: ["💧 Cada 14 días", "☀️ Sol directo", "🐾 Segura para mascotas"], consejo: "Riega solo cuando la tierra esté seca del todo.", aviso: "Viene lluvia fuerte: mete tu suculenta bajo techo 🌧️" },
    en: { nombre: "Succulent", estado: "✅ Healthy", datos: ["💧 Every 14 days", "☀️ Direct sun", "🐾 Safe for pets"], consejo: "Only water when the soil is completely dry.", aviso: "Heavy rain is coming: bring your succulent indoors 🌧️" },
  },
  {
    clave: "pothos",
    img: "/stages/s5.png",
    cientifico: "Epipremnum aureum",
    tono: "ambar",
    es: { nombre: "Pothos", estado: "⚠️ Hojas amarillas", datos: ["💧 Cada 7 a 10 días", "⛅ Luz media", "🐾 Tóxica para mascotas"], consejo: "Las hojas amarillas suelen ser exceso de agua: deja secar la tierra.", aviso: "Hoy no riegues tu Pothos: su tierra sigue húmeda 🌱" },
    en: { nombre: "Pothos", estado: "⚠️ Yellow leaves", datos: ["💧 Every 7 to 10 days", "⛅ Medium light", "🐾 Toxic to pets"], consejo: "Yellow leaves usually mean too much water: let the soil dry out.", aviso: "Skip watering your Pothos today: the soil is still damp 🌱" },
  },
];
