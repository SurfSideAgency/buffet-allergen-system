# Sistema de Gestión de Alérgenos para Buffet

Sistema para gestión de alérgenos en buffets de hoteles/restaurantes, con
modelo de licencias por establecimiento. Conforme al Reglamento (UE)
1169/2011 y al RD 126/2015.

## Estructura del proyecto

```
server.js            Backend Express (todas las rutas y lógica)
public/
  index.html          App del chef (crear platos, ingredientes, etiquetas, pantallas Sertag)
  admin.html           Panel de administración (licencias, establecimientos, dispositivos)
  activation.html       Pantalla de activación de licencia
fontData.js           Fuente Roboto embebida en base64 (usada por @napi-rs/canvas)
fonts/Roboto-Regular.ttf
```

El JS del frontend va inline en los `.html` (los ficheros JS externos han
dado problemas de carga en el deploy de Vercel).

## Base de datos

Supabase (Postgres). Tablas principales: `establishments`, `ingredients`,
`dishes`, `dish_ingredients`, `esl_screens`. Los alérgenos de un plato se
calculan automáticamente como la unión de los alérgenos de sus ingredientes,
vía el RPC `get_dish_allergens`.

No hay datos de alérgenos/ingredientes en ficheros locales: todo vive en
Supabase.

## Variables de entorno

| Variable | Uso |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY` | Conexión a la base de datos |
| `JWT_SECRET` | Firma de tokens del panel admin |
| `SERTAG_API_BASE`, `SERTAG_USER`, `SERTAG_PASS` | Integración con pantallas e-ink Sertag |
| `SERTAG_DITHER_ALGORITHM` | Algoritmo de dithering enviado a Sertag (por defecto `floyd-steinberg`) |
| `OPENAI_API_KEY` | Opcional. Sugerencia de alérgenos por IA; sin ella, fallback por palabras clave |

## Instalación local

```bash
npm install
npm start
# http://localhost:3000
```

## Funcionalidad

- **Licencias por establecimiento**: códigos `BUFF-XXXX-XXXX-XXXX` /
  `LIC-XXXX-XXXX-XXXX`, con fingerprinting de dispositivo y límite de
  dispositivos configurable por establecimiento.
- **Platos e ingredientes**: el chef selecciona ingredientes de una base de
  datos compartida; los alérgenos y trazas se calculan automáticamente.
- **Etiquetas imprimibles**: HTML con distinción visual clara de alérgenos
  (paleta: azul `#2563EB`, rojo `#DC2626` alérgenos, ámbar `#F59E0B` trazas,
  verde `#10B981` sin alérgenos), con traducción EN/FR del nombre del plato.
- **Pantallas Sertag (e-ink 4.2", 400×300, blanco/negro/rojo)**: al asignar
  un plato a una pantalla, se genera una imagen PNG indexada a 3 colores y se
  envía por MQTT vía la API de Sertag.
- **Panel de administración**: gestión de establecimientos, licencias,
  extensión de vigencia, dispositivos activos.

## Endpoints principales

```
GET  /api/system-status
POST /api/license/verify-with-device
POST /api/admin/login                                    (JWT)
GET  /api/admin/establishments                            (admin)
POST /api/admin/establishments                             (admin)
PUT  /api/admin/establishments/:id                          (admin)
POST /api/admin/establishments/:id/extend                    (admin)
GET  /api/admin/establishments/:id/devices                    (admin)
POST /api/admin/establishments/:id/devices/:fingerprint/deactivate (admin)
PUT  /api/admin/establishments/:id/max-devices                 (admin)

GET  /api/ingredients                                     (licencia)
GET  /api/ingredients/search?q=
POST /api/ingredients
POST /api/dishes
GET  /api/dishes
GET  /api/dishes/search?q=
GET  /api/dishes/today
POST /api/generate-label            { dishId }
POST /api/generate-recipe-document   { dishId }

GET  /api/screens                                         (licencia)
POST /api/screens                    { mac, slotNumber? }
GET  /api/screens/:mac/status        (debug, consulta Sertag)
GET  /api/screens/:mac/preview?dishId=  (debug, PNG sin pasar por Sertag)
PUT  /api/screens/:mac/assign        { dishId }
POST /api/screens/refresh-all
```

Todos los endpoints marcados "licencia" requieren las cabeceras
`x-license-key` y `x-device-fingerprint`.

## Restricciones conocidas

- Vercel serverless: no hay estado en memoria entre peticiones, todo pasa
  por Supabase.
- El middleware de licencia (`checkLicenseWithDevice`) se aplica por ruta,
  después de las rutas públicas (`/`, `/admin`, `/activation`, login) — no
  cambiar ese orden o se bloquea el acceso a páginas esenciales.
- Contraseñas de admin en bcrypt, nunca en texto plano.
