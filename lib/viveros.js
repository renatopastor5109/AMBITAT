// Viveros y tiendas de plantas en CDMX, repartidos por zona.
// - placeId: identificador del lugar en Google Maps. Sirve para abrir el
//   lugar en Maps y para pedir su foto (pages/api/foto-vivero.js solo acepta
//   los placeId de esta lista, para que nadie use tu llave de Google para otra cosa).
// Para agregar un vivero: copia una línea y cambia los datos.
export const VIVEROS = [
  { nombre: "Mercado De Plantas", zona: "Coyoacán", direccion: "Calle Melchor Ocampo 4, Del Carmen, Coyoacán", rating: 4.6, placeId: "ChIJH3lj_-n_0YUR6OzHY323WJ4" },
  { nombre: "Vivero del Bosque", zona: "Coyoacán", direccion: "Av. México / Melchor Ocampo 100, Del Carmen, Coyoacán", rating: 4.8, placeId: "ChIJ0WtfBOr_0YUR8RuhOftH6Gg" },
  { nombre: "Botéo Lomas", zona: "Lomas de Chapultepec", direccion: "Barrilaco 365A, Lomas de Chapultepec, Miguel Hidalgo", rating: 4.8, placeId: "ChIJNRMRKQUB0oURZzNHWuli7Ck" },
  { nombre: "Sucu Sucu", zona: "Polanco", direccion: "Av. Isaac Newton 178, Polanco V Secc, Miguel Hidalgo", rating: 4.3, placeId: "ChIJwybt4Vf50YURTeF5kOTcUDQ" },
  { nombre: "Botéo Condesa", zona: "Condesa", direccion: "C. Atlixco 13, Colonia Condesa, Cuauhtémoc", rating: 4.8, placeId: "ChIJne5-_1H_0YURmq6XOJ_QdK0" },
  { nombre: "Vivero 64", zona: "Roma Norte", direccion: "C. de Chiapas 64, Roma Nte., Cuauhtémoc", rating: 4.5, placeId: "ChIJvSldLLD_0YURoQNSkUWDtlQ" },
  { nombre: "Plantería Mary", zona: "Roma Sur", direccion: "Quintana Roo 49A, Roma Sur, Cuauhtémoc", rating: 4.4, placeId: "ChIJ-1EB3hv_0YURBZaxTktNdhg" },
  { nombre: "Vinde Garden Center", zona: "Gustavo A. Madero", direccion: "Av. Talismán 45B, Col. Estrella, Gustavo A. Madero", rating: 4.8, placeId: "ChIJg5VTlUL50YURJX8Z5q19mhs" },
  { nombre: "Madreselva Xochimilco", zona: "Xochimilco", direccion: "C. Madreselva, Xaltocan, Xochimilco", rating: 4.7, placeId: "ChIJqz07ABYBzoURqZHPq6ZzknY" },
  { nombre: "Mercado de Plantas Cuemanco", zona: "Xochimilco", direccion: "Av. Canal Nacional 2000, Coapa, Cuemanco, Xochimilco", rating: 4.7, placeId: "ChIJsfF52ysCzoURGFvC0x7gPrw" },
];

export function mapsUrl(placeId) {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}
