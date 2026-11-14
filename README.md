# Ámbitat

App para identificar y cuidar plantas con IA, con recordatorios de riego,
directorio de viveros en CDMX y reservación de mantenimiento a domicilio.
Se puede usar de inmediato sin cuenta (sesión anónima, hasta 3 plantas). La
cuenta se pide solo al reservar, al activar recordatorios o al agregar la 4ª
planta: Google (o Apple/Facebook si están activados) o un código de 6 dígitos
por correo, sin contraseñas. Al crear la cuenta, sus plantas se conservan.
Para dejarlo configurado, sigue `GUIA-CUENTAS.md` y revisa `/admin → Ajustes`.

## Cómo está armada

- `components/BrotesApp.jsx` — toda la app que ve el usuario.
- `pages/admin.js` — panel de citas para el dueño (`/admin`).
- `pages/api/` — código que corre en el servidor de Vercel:
  - `analizar-planta.js` — manda las fotos a la IA (requiere sesión, con límite diario).
  - `reservar.js` — crea la reservación y el cobro en Stripe (el precio lo pone el servidor).
  - `webhook-stripe.js` — Stripe avisa aquí cuando un pago se completa.
  - `horarios-ocupados.js` — qué horas ya están tomadas en una fecha.
  - `cancelar-reservacion.js` / `cambiar-reservacion.js` — el cliente cancela (con reembolso automático a tarjeta) o cambia su cita.
  - `ficha-planta.js` — ficha de cuidado de cada planta (se genera una vez con IA y se guarda).
  - `enviar-recordatorios.js` — recordatorios de riego diarios (Vercel Cron).
  - `foto-vivero.js` — fotos de los viveros desde Google Maps.
  - `admin/` — datos del panel de citas (con contraseña).
- `lib/` — piezas compartidas: precios (`servicio.js`), tu agenda de visitas
  (`agenda.js`, se edita en `/admin → Servicio`), disponibilidad
  (`horariosOcupados.js`), reglas de cancelación (`politicaCancelacion.js`),
  fechas en hora de CDMX (`fechas.js`) y viveros (`viveros.js`).

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Análisis de plantas con IA |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Base de datos |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (reservas, recordatorios, panel) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagos |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Notificaciones |
| `CRON_SECRET` | Obligatoria para que funcionen los recordatorios |
| `ADMIN_PASSWORD` | Panel `/admin` (usa una contraseña larga) |
| `GOOGLE_MAPS_API_KEY` | Opcional: fotos de los viveros |
| `NEXT_PUBLIC_SITE_URL` | La dirección principal de la app, sin diagonal al final (p. ej. `https://ambitat.mx`). Se usa en los enlaces de invitación, el pago con Stripe, los correos y Google |

Después de agregar o cambiar una variable hay que hacer **Redeploy**.

## Base de datos (Supabase → SQL Editor)

Los archivos `supabase-*.sql` crean las tablas y las reglas de seguridad.
Todos se pueden volver a correr sin problema. El más reciente es
`supabase-revision-6.sql` (notas de clientes, buzón y notificaciones desde el
panel). Antes de ese, en orden: `supabase-revision-5.sql` (Espacios), `supabase-revision-2.sql`, `supabase-revision-3.sql` (agenda
configurable y cancelaciones justas) y `supabase-revision-4.sql` (viveros
aliados con QR, "Invita a un amigo" y créditos).

## Páginas

- `/`: una sola entrada. Quien llega por primera vez (y Google) ve la página de presentación con una demo de la app; quien ya usa la app entra directo (cookie `ambitat_app`).
- `/app`: la app siempre (botones "Abrir la app", ícono instalado, QR, pagos).
- `/conoce`: la página de presentación aunque ya uses la app.
- En computadora la app tiene menú lateral; en celular, barra abajo. Las pantallas entran deslizándose.

## Panel /admin

- **Inicio**: visitas de hoy, dinero del mes, personas nuevas, uso de la app y plantas más comunes.
- **Calendario / Próximas / Historial**: tus citas.
- **Clientes**: quién te ha pagado, sus datos, sus citas y tus notas privadas.
- **Comunicar**: anuncio arriba en la app y notificación a todos (máx. una cada 12 h).
- **Buzón**: mensajes que te mandan desde la app y nombres que la gente corrige a la IA.
- **Servicio**: pausar reservaciones, precios, zonas y agenda.
- **Crecer**: viveros con QR e invitaciones. **Ajustes**: qué falta configurar.

Enlaces a una sección de la app (para anuncios y notificaciones): `/?ir=tienda`, `/?ir=camara`, `/?ir=comunidad`.

## Crecimiento

- Página de presentación pública: `/conoce` (precios y zonas salen de /admin → Servicio).
  Es la que va en Google Maps; ver `GUIA-GOOGLE-BUSINESS.md`. También hay `/sitemap.xml` y `/robots.txt`.

- `/admin → Crecer`: da de alta viveros, imprime su QR (`/v/<vivero>`) y mira
  cuánta gente llega de cada uno.
- Enlace de invitación de cada persona: `/r/<CÓDIGO>` (Mi cuenta → Invita a un amigo).
- Avisos del clima: `/api/clima` (Open-Meteo, sin llave) y el recordatorio
  diario `/api/enviar-recordatorios`, que los lunes manda un consejo de temporada.

## Desarrollo local (opcional)

```
npm install
cp .env.local.example .env.local   # y llena las variables
npm run dev
```
