// Datos que aparecen en el Aviso de privacidad (/privacidad) y en los
// Términos y condiciones (/terminos).
//
// ✏️ LLENA ESTOS DATOS antes de lanzar. Mientras tengan [corchetes], la
// página los muestra resaltados en amarillo para que no se te pasen.
export const RESPONSABLE = {
  // Tu nombre completo (persona física) o la razón social de tu empresa.
  nombre: "[Tu nombre completo o razón social]",
  // Domicilio para recibir notificaciones (lo pide la ley).
  domicilio: "[Calle y número, colonia, alcaldía, C.P., Ciudad de México]",
  // Correo donde atiendes dudas, cancelaciones y solicitudes de datos.
  correo: "[correo de contacto, p. ej. hola@ambitat.mx]",
  // WhatsApp o teléfono de atención a clientes.
  telefono: "[WhatsApp de atención, 10 dígitos]",
};

// Cambia esta fecha cada vez que modifiques el aviso o los términos.
export const ACTUALIZADO = "8 de octubre de 2026";

export const esPendiente = (v) => typeof v === "string" && v.startsWith("[");
