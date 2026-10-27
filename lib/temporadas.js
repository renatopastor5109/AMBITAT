// Consejos según la temporada en la Ciudad de México. Los usan la tarjeta
// "Hoy" de la app y el aviso semanal de los lunes.
//
// Temporadas de CDMX (aprox.):
//   · Secas y frías: noviembre – febrero (noches frías, heladas ocasionales)
//   · Secas y calurosas: marzo – mayo (sol fuerte, poco humedad)
//   · Lluvias: junio – octubre (aguaceros por la tarde)
//
// "plantas": palabras que deben aparecer en el nombre de alguna planta del
// jardín para que el consejo aplique (si no tiene, aplica para todos).

export const CONSEJOS_TEMPORADA = [
  // ---------- Lluvias ----------
  { id: "lluvias-riego", meses: [6, 7, 8, 9], emoji: "🌧️", titulo: "Temporada de lluvias", texto: "Si tus plantas están afuera, riégalas menos: toca la tierra antes y solo riega si está seca a 2 cm." },
  { id: "lluvias-suculentas", meses: [6, 7, 8, 9, 10], emoji: "🌵", plantas: ["suculent", "cactus", "echeveria", "aloe", "sábila", "sabila", "crasa"], titulo: "Protege del agua a tu {planta}", texto: "Con las lluvias, tu {planta} se puede pudrir. Si está afuera, ponla bajo techo y revisa que la maceta drene." },
  { id: "lluvias-hongos", meses: [7, 8, 9], emoji: "🍄", titulo: "Ojo con los hongos", texto: "La humedad trae hongos: quita hojas con manchas cafés y no mojes las hojas al regar." },
  { id: "lluvias-plato", meses: [6, 7, 8, 9], emoji: "🪴", titulo: "Vacía los platitos", texto: "El agua estancada en el plato pudre raíces y atrae mosquitos. Vacíalo después de cada lluvia." },
  // ---------- Fin de lluvias ----------
  { id: "octubre-transicion", meses: [10], emoji: "🍂", titulo: "Se van las lluvias", texto: "Vuelve poco a poco a tu riego normal y aprovecha para limpiar hojas secas antes del frío." },
  // ---------- Frío ----------
  { id: "frio-ventanas", meses: [11, 12, 1, 2], emoji: "🥶", titulo: "Noches frías", texto: "Aleja tus plantas tropicales de ventanas y puertas por la noche: el vidrio frío quema las hojas." },
  { id: "frio-riego", meses: [12, 1], emoji: "💧", titulo: "En invierno, menos agua", texto: "Con el frío las plantas crecen más lento y toman menos agua. Riega solo cuando la tierra esté seca." },
  { id: "frio-hierbas", meses: [11, 12, 1, 2], emoji: "🌿", plantas: ["albahaca", "hierbabuena", "menta", "cilantro", "perejil", "tomate", "chile"], titulo: "Mete tu {planta} en noches frías", texto: "Tu {planta} sufre debajo de 8 °C. En noches frías métela o cúbrela con una tela ligera." },
  { id: "frio-suculentas", meses: [12, 1], emoji: "🌵", plantas: ["suculent", "cactus", "echeveria", "aloe", "sábila", "sabila"], titulo: "Tu {planta} casi no necesita agua", texto: "En invierno tu {planta} descansa: riégala muy poco, más o menos cada 3 o 4 semanas." },
  { id: "frio-nochebuena", meses: [11, 12, 1], emoji: "🌺", plantas: ["nochebuena", "poinsettia", "flor de pascua"], titulo: "Cuida tu {planta}", texto: "Tu {planta} quiere luz brillante sin sol directo, nada de corrientes de aire frío y riego solo cuando la tierra esté seca." },
  // ---------- Secas y calor ----------
  { id: "secas-riego", meses: [3, 4, 5], emoji: "☀️", titulo: "Temporada de calor", texto: "Con el calor y el aire seco, la tierra se seca más rápido. Revisa tus macetas más seguido y riega temprano o al atardecer." },
  { id: "secas-humedad", meses: [2, 3, 4, 5], emoji: "💦", plantas: ["helecho", "calathea", "maranta", "orquídea", "orquidea", "anturio", "costilla", "monstera"], titulo: "Tu {planta} pide humedad", texto: "El aire seco le quema las puntas a tu {planta}. Ponla sobre un plato con piedras y agua, o junta varias plantas." },
  { id: "secas-polvo", meses: [2, 3, 4], emoji: "🧽", titulo: "Limpia el polvo de las hojas", texto: "En secas se junta mucho polvo y la planta respira y hace fotosíntesis peor. Pásale un trapo húmedo a las hojas." },
  { id: "primavera-abono", meses: [3, 4, 5], emoji: "🌱", titulo: "Época de abonar", texto: "Las plantas despiertan y empiezan a crecer: es buen momento para abonar cada 3 o 4 semanas." },
  { id: "primavera-trasplante", meses: [3, 4], emoji: "🪴", titulo: "Buen momento para trasplantar", texto: "Si a tu planta le salen raíces por abajo de la maceta, trasplántala ahora a una de 2 a 4 cm más grande." },
  { id: "mayo-sol", meses: [5], emoji: "😎", titulo: "Sol muy fuerte", texto: "El sol de mayo quema hojas. Si una planta está en ventana con sol directo de mediodía, ponle una cortina ligera." },
];

function normalizar(t) {
  return String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// El mejor consejo para este mes y este jardín (primero los que son de una
// planta que sí tiene). "semilla" cambia cuál sale, para no repetir siempre el mismo.
export function consejoDeTemporada(mes, nombresPlantas = [], semilla = 0) {
  const nombres = nombresPlantas.filter(Boolean);
  const delMes = CONSEJOS_TEMPORADA.filter((c) => c.meses.includes(mes));
  const especificos = [];
  delMes.forEach((c) => {
    if (!c.plantas) return;
    const planta = nombres.find((n) => c.plantas.some((p) => normalizar(n).includes(normalizar(p))));
    if (planta) especificos.push({ ...c, titulo: c.titulo.replace("{planta}", planta), texto: c.texto.replaceAll("{planta}", planta) });
  });
  const generales = delMes.filter((c) => !c.plantas);
  const lista = especificos.length ? especificos : generales;
  if (!lista.length) return null;
  return lista[Math.abs(semilla) % lista.length];
}
