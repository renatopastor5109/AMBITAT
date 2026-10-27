// Datos públicos del negocio que usa la página de presentación (/conoce).
// Las zonas se editan en /admin → Servicio; esta es la lista de arranque.
import { RESPONSABLE } from "./legal";

export const ZONAS_INICIALES = ["Ciudad de México"];
export const MAX_ZONAS = 40;

// Lista limpia: sin vacíos, sin repetidos, nombres cortos.
export function normalizarZonas(lista) {
  if (!Array.isArray(lista)) return ZONAS_INICIALES;
  const vistas = new Set();
  const salida = [];
  for (const z of lista) {
    if (typeof z !== "string") continue;
    const limpia = z.replace(/\s+/g, " ").trim().slice(0, 50);
    const clave = limpia.toLowerCase();
    if (!limpia || vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(limpia);
    if (salida.length >= MAX_ZONAS) break;
  }
  return salida.length ? salida : ZONAS_INICIALES;
}

// "+52 55 8022 5354" → "525580225354" (para wa.me)
export const WHATSAPP_NUMERO = RESPONSABLE.telefono.replace(/\D/g, "");
export function enlaceWhatsApp(texto) {
  return `https://wa.me/${WHATSAPP_NUMERO}${texto ? "?text=" + encodeURIComponent(texto) : ""}`;
}
