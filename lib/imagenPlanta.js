// Arma (en el navegador) una imagen bonita de una planta para compartir en
// historias de Instagram o WhatsApp, con la marca de Ámbitat.
// Formato vertical 1080 × 1350.

const ANCHO = 1080;
const ALTO = 1350;
const COLORES = { fondo: "#EAC468", tarjeta: "#F5EFDD", tinta: "#221C13", suave: "#6b6047", verde: "#3F5D3E", naranja: "#C2703C" };

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // fotos de Supabase: sin esto no se puede exportar el canvas
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function rectRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Recorta el texto con "…" si no cabe.
function ajustar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(t + "…").width > ancho) t = t.slice(0, -1);
  return t + "…";
}

function pastilla(ctx, x, y, texto, fondo, color) {
  ctx.font = "700 34px Inter, sans-serif";
  const w = ctx.measureText(texto).width + 52;
  ctx.fillStyle = fondo;
  rectRedondo(ctx, x, y, w, 68, 34);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + 26, y + 35);
  ctx.textBaseline = "alphabetic";
  return w;
}

/**
 * planta: { nombre_comun, nombre_cientifico, imageUrl, estado_general, racha_riego, history }
 * enlace: texto del enlace a mostrar (p. ej. ambitat.vercel.app/r/ABC123)
 * Regresa un Blob PNG.
 */
export async function crearImagenPlanta(planta, { enlace, estadoTexto } = {}) {
  try {
    await Promise.all([document.fonts.load("800 60px Inter"), document.fonts.load("700 34px Inter"), document.fonts.load("italic 400 34px Inter")]);
  } catch {}

  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");

  // Fondo
  ctx.fillStyle = COLORES.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Tarjeta
  const m = 60;
  ctx.fillStyle = COLORES.tarjeta;
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  rectRedondo(ctx, m, m, ANCHO - 2 * m, ALTO - 2 * m - 90, 48);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Foto (si no se puede cargar, una ilustración)
  const fx = m + 36;
  const fy = m + 36;
  const fw = ANCHO - 2 * fx;
  const fh = 700;
  let foto = null;
  if (planta.imageUrl) foto = await cargarImagen(planta.imageUrl).catch(() => null);
  if (!foto) foto = await cargarImagen("/stages/s6.png").catch(() => null);
  ctx.save();
  rectRedondo(ctx, fx, fy, fw, fh, 32);
  ctx.clip();
  ctx.fillStyle = "#EFE6CC";
  ctx.fillRect(fx, fy, fw, fh);
  if (foto) {
    const esIlustracion = !planta.imageUrl || foto.src.includes("/stages/");
    if (esIlustracion) {
      const lado = Math.min(fw, fh) * 0.8;
      ctx.drawImage(foto, fx + (fw - lado) / 2, fy + (fh - lado) / 2, lado, lado);
    } else {
      const escala = Math.max(fw / foto.width, fh / foto.height);
      const w = foto.width * escala;
      const h = foto.height * escala;
      ctx.drawImage(foto, fx + (fw - w) / 2, fy + (fh - h) / 2, w, h);
    }
  }
  ctx.restore();

  // Nombre
  let y = fy + fh + 90;
  ctx.fillStyle = COLORES.tinta;
  ctx.font = "800 68px Inter, sans-serif";
  ctx.fillText(ajustar(ctx, planta.nombre_comun || "Mi planta", fw), fx, y);
  if (planta.nombre_cientifico) {
    y += 52;
    ctx.fillStyle = COLORES.suave;
    ctx.font = "italic 400 34px Inter, sans-serif";
    ctx.fillText(ajustar(ctx, planta.nombre_cientifico, fw), fx, y);
  }

  // Datos
  y += 46;
  let x = fx;
  const racha = planta.racha_riego || 0;
  if (racha >= 2) x += pastilla(ctx, x, y, `🔥 ${racha} riegos a tiempo`, "rgba(194,112,60,0.16)", COLORES.naranja) + 16;
  const primera = (planta.history || [])[0];
  const desde = primera?.dateISO ? new Date(primera.dateISO) : null;
  if (desde && !isNaN(desde)) {
    const dias = Math.max(1, Math.round((Date.now() - desde.getTime()) / 86400000));
    const t = dias === 1 ? "🌱 1 día conmigo" : `🌱 ${dias} días conmigo`;
    ctx.font = "700 34px Inter, sans-serif";
    if (x + ctx.measureText(t).width + 52 <= fx + fw) x += pastilla(ctx, x, y, t, "rgba(63,93,62,0.12)", COLORES.verde) + 16;
  }
  if (estadoTexto && x === fx) pastilla(ctx, x, y, estadoTexto, "rgba(63,93,62,0.12)", COLORES.verde);

  // Pie: logo + invitación
  const logo = await cargarImagen("/logo.png").catch(() => null);
  const pieY = ALTO - 92;
  if (logo) {
    const h = 64;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, m + 10, pieY - h / 2 - 6, w, h);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = COLORES.tinta;
  ctx.font = "700 32px Inter, sans-serif";
  ctx.fillText("Cuida tus plantas con una foto", ANCHO - m - 10, pieY - 8);
  ctx.fillStyle = COLORES.verde;
  ctx.font = "800 32px Inter, sans-serif";
  ctx.fillText(enlace || "ambitat.vercel.app", ANCHO - m - 10, pieY + 34);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen"))), "image/png"));
}
