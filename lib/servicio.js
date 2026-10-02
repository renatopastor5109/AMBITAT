// Datos del servicio de mantenimiento, compartidos por la app y el servidor.
// El servidor es quien decide el precio: aunque alguien modifique la app en
// su navegador, siempre se cobra lo que diga aquí.

// Precio de la visita (en centavos, como los pide Stripe). Cámbialo aquí.
export const PRECIO_MANTENIMIENTO_CENTAVOS = 35000; // $350.00 MXN

export const HORARIOS_DISPONIBLES = ["9:00 am", "11:00 am", "1:00 pm", "3:00 pm", "5:00 pm"];

// Hasta cuántos días adelante se puede reservar.
export const DIAS_MAXIMOS_ANTICIPACION = 90;
