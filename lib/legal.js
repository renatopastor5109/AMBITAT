// Datos que aparecen en el Aviso de privacidad (/privacidad) y en los
// Términos y condiciones (/terminos).
//
// ✏️ LLENA ESTOS DATOS antes de lanzar. Mientras tengan [corchetes], la
// página los muestra resaltados en amarillo para que no se te pasen.
export const RESPONSABLE = {
  // Tu nombre completo (persona física) o la razón social de tu empresa.
  nombre: "Renato Pastor Rodriguez",
  // Domicilio para recibir notificaciones (lo pide la ley).
  domicilio: "Ciudad de México, México",
  // Correo donde atiendes dudas, cancelaciones y solicitudes de datos.
  correo: "ambitataapp@gmail.com",
  // WhatsApp o teléfono de atención a clientes.
  telefono: "+52 55 8022 5354",
};

// Cambia esta fecha cada vez que modifiques el aviso o los términos.
export const ACTUALIZADO = "13 de octubre de 2026";

export const esPendiente = (v) => typeof v === "string" && v.startsWith("[");
