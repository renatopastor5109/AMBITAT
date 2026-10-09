# Guía: dejar listo el inicio de sesión de Ámbitat

La app ya funciona sin cuenta y la pide solo al reservar, al activar recordatorios o al agregar la 4ª planta. Para que crear la cuenta funcione bien hay que configurar 4 cosas en tus cuentas de Supabase, Google, Resend y Apple. Yo no puedo hacerlo por ti porque viven en tus cuentas.

**Cómo saber qué te falta:** entra a `ambitat.vercel.app/admin`, abre la pestaña **Ajustes** y verás palomitas verdes (listo) o tachas rojas (falta). Ahí también hay un botón para mandarte un correo de prueba.

Orden recomendado: **0 → 1 → 2 → 3**. El paso 4 (Apple) es para más adelante.

---

## Paso 0 · Ajustes base en Supabase (5 min)

En **supabase.com → tu proyecto → Authentication**:

1. **URL Configuration**
   - *Site URL*: `https://ambitat.vercel.app`
   - *Redirect URLs* → Add URL: `https://ambitat.vercel.app/**`
   (Esto evita que los enlaces del correo te manden a `localhost`.)
2. **Sign In / Providers**
   - **Allow anonymous sign-ins**: ENCENDIDO. Es lo que permite usar la app sin cuenta. Si está apagado, la app pide cuenta desde el inicio.
   - **Allow manual linking**: ENCENDIDO. Permite que, al entrar con Google, las plantas que la persona ya tenía sin cuenta se queden en su cuenta.
   - **Email** debe estar activado.

---

## Paso 1 · Activar "Continuar con Google" (15 min)

**En Google Cloud** (console.cloud.google.com, con tu cuenta de Google):

1. Arriba, crea o elige un proyecto (por ejemplo "Ámbitat").
2. Ve a **Google Auth Platform → Branding**:
   - Nombre de la app: *Ámbitat*.
   - Correo de soporte: el tuyo.
   - Dominio autorizado: `ambitat.vercel.app`.
3. Ve a **Audience**: tipo **External** y presiona **Publish app**. Si se queda en "Testing", solo podrán entrar los correos que agregues a mano.
4. Ve a **Data Access**: deja los permisos básicos `openid`, `email` y `profile`. Así Google no pide revisión.
5. Ve a **Clients → Create client**:
   - Tipo: **Web application**.
   - *Authorized JavaScript origins*: `https://ambitat.vercel.app`.
   - *Authorized redirect URIs*: la "URL de regreso" que aparece en /admin → Ajustes. Se ve así: `https://TU-PROYECTO.supabase.co/auth/v1/callback`.
   - Presiona **Create** y copia el **Client ID** y el **Client secret**.

**En Supabase:**

6. Ve a **Authentication → Sign In / Providers → Google**. Actívalo, pega el Client ID y el Client secret y guarda.

✅ Revisa en /admin → Ajustes que "Continuar con Google" salga en verde.

---

## Paso 2 · Correos que sí lleguen, con Resend (20 min + espera del dominio)

El correo que trae Supabase de fábrica **solo manda a los miembros de tu equipo** y muy pocos por hora. Por eso a tus clientes no les llega el código.

**Lo que necesitas:** un dominio propio (por ejemplo `ambitat.mx`). Resend no deja mandar a otras personas sin un dominio verificado. Si no tienes uno, cómpralo en Namecheap, GoDaddy o Cloudflare (desde ~$200 MXN al año).

1. Crea una cuenta en **resend.com**. El plan gratis da 3,000 correos al mes y 100 al día.
2. Ve a **Domains → Add Domain** y escribe tu dominio. Resend te da unos registros DNS (TXT y MX). Cópialos en donde compraste el dominio. Puede tardar de minutos a unas horas en verificarse.
3. Ve a **API Keys → Create API Key** (permiso "Sending access") y cópiala.
4. En **Supabase → Authentication → Emails → SMTP Settings**, activa *Enable custom SMTP* y llena:
   - Sender email: `hola@tudominio.mx`
   - Sender name: `Ámbitat`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: tu API key de Resend
5. Guarda.
6. Opcional: en **Authentication → Rate Limits** sube "emails per hour" (por ejemplo a 100).

### Plantillas del correo (importante)

La app pide un **código de 6 dígitos**, así que el correo tiene que traerlo. Ve a **Authentication → Emails → Templates** y en estas dos plantillas pon este texto:

- **Magic Link** (para entrar)
- **Change Email Address** (para quien ya usaba la app sin cuenta y guarda su jardín)

```html
<h2>Tu código de Ámbitat</h2>
<p>Escribe este código en la app para entrar:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Si no lo pediste, ignora este correo.</p>
```

✅ En /admin → Ajustes → "Probar el correo de acceso", escribe un correo que **no** sea el de tu cuenta de Supabase. Si llega con un código de 6 dígitos, ya quedó. Si sale un error, el panel te dice qué falta.

---

## Paso 3 · Probar todo como cliente (5 min)

Hazlo en tu celular, en una ventana de incógnito:

1. Abre la app. Debe entrar directo, sin pedir cuenta.
2. Escanea una planta. Debe aparecer el aviso "Guarda tu jardín".
3. Toca **Entrar → Continuar con Google**. Al regresar, la planta debe seguir ahí.
4. En otra ventana de incógnito, prueba **Continuar con correo** y usa el código.
5. Ve a **Tienda → Reservar** sin cuenta. Te debe pedir entrar. Al entrar debe llevarte directo a elegir tamaño.

---

## Paso 4 · "Continuar con Apple" (más adelante)

Conviene cuando haya muchos usuarios de iPhone. Antes, considera esto:

- Cuesta **$99 USD al año** (Apple Developer Program).
- La "clave secreta" **vence cada 6 meses** y hay que generarla otra vez. Si se te pasa, el botón de Apple deja de funcionar. Pon un recordatorio.

Pasos, en developer.apple.com → Certificates, Identifiers & Profiles:

1. Anota tu **Team ID** (arriba a la derecha).
2. **Identifiers → App IDs → +**: crea uno y activa *Sign in with Apple*.
3. **Identifiers → Services IDs → +**: crea uno (por ejemplo `mx.ambitat.web`). Luego, en *Sign in with Apple → Configure*:
   - Domain: `TU-PROYECTO.supabase.co`
   - Return URL: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
4. **Keys → +**: activa *Sign in with Apple* y descarga el archivo **.p8**. Solo se descarga una vez; guárdalo bien.
5. En **Supabase → Sign In / Providers → Apple**:
   - Actívalo.
   - En *Client IDs* pon el Services ID.
   - Para el *Secret Key*, usa el generador que Supabase enlaza ahí. Ábrelo en Chrome, no en Safari, y dale tu Team ID, el Key ID, el Services ID y el archivo .p8.
6. Guarda. El botón negro de Apple aparece solo en la app cuando ya está activo.

---

## Fuentes
- [Supabase · Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase · Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend · Send with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase · Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase · Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
