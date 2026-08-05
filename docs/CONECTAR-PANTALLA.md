# Conectar una pantalla nueva

Procedimiento seguido con la primera pantalla (MAC `D4:3D:39:83:EB:88`,
modelo SETPW0420_V2 de 4,2"). Son dos altas distintas: una en la plataforma
de Sertag y otra en la aplicación. Hacen falta las dos.

---

## Antes de empezar

- **WiFi de 2,4 GHz.** El dispositivo no ve las redes de 5 GHz. Si el router
  emite ambas con el mismo nombre, hay que separarlas o crear una red de 2,4
  específica.
- **La MAC del dispositivo.** Viene en la etiqueta trasera, con el formato
  `D4:3D:39:XX:XX:XX`. Conviene apuntarla junto al puesto del buffet donde se
  vaya a colocar.
- Credenciales de la plataforma de Sertag del establecimiento.

---

## Paso 1 — Alta en la plataforma de Sertag

**Plataforma:** http://192.144.234.153:8000/

**Credenciales:** no se escriben aquí a propósito. Este documento se comparte
con técnicos y proveedores, y una contraseña en un PDF no se puede revocar.
Están en el gestor de contraseñas de la agencia, entrada «Sertag – plataforma».
Pídelas a administración.


Con el **software oficial de Sertag** (no con esta aplicación):

1. Conectar la pantalla a la WiFi del establecimiento.
2. Registrarla en la plataforma, asociada a la cuenta del establecimiento.
3. Comprobar en la plataforma que el dispositivo aparece **en línea**.

Esto es cosa de Sertag y se hace una vez por pantalla. Hasta que el
dispositivo no esté aquí, la aplicación no puede enviarle nada.

### Cómo verificar que quedó bien

En la app, pestaña **Pantallas**, una vez dada de alta (paso 2), el sistema
puede consultar el estado real del dispositivo en Sertag. Los datos útiles:

- `status: true` → el dispositivo está en línea.
- `station.rssi` → cobertura WiFi. Alrededor de −47 es buena señal; por
  debajo de −75 conviene acercar el punto de acceso.
- `voltage` → nivel de batería.

---

## Paso 2 — Alta en la aplicación

1. Abrir la app con la licencia del establecimiento.
2. Pestaña **Pantallas** → botón **Añadir Pantalla**.
3. Escribir la MAC en formato `D4:3D:39:XX:XX:XX` (el campo valida el
   formato) y pulsar **Guardar**.

La pantalla aparece como un puesto más del buffet.

> **Ojo con las MAC repetidas.** Si esa MAC ya estaba dada de alta en otro
> establecimiento, al guardarla se **reasigna** al establecimiento actual y se
> la quita al anterior. Es lo que permite mover una pantalla de un cliente a
> otro, pero también lo que la puede desaparecer de donde estaba.

---

## Paso 3 — Enviar contenido

1. Crear el plato (pestaña **Nuevo Plato**) si no existe.
2. Pestaña **Pantallas** → en el puesto correspondiente, elegir el plato del
   desplegable → **Asignar y Enviar**.

La pantalla **parpadea** al repintar y tarda unos segundos. Eso es normal en
tinta electrónica.

Para reenviar a todas a la vez (al empezar el servicio, por ejemplo): botón
**Refrescar Todo el Buffet**.

---

## Si la pantalla no cambia

El aviso de envío puede salir correcto y aun así no verse nada. Por orden:

1. **¿Parpadea al enviar?**
   - Si parpadea pero no cambia el contenido: el mensaje llega pero la imagen
     no. Ver punto 3.
   - Si no parpadea: problema de red o de alta. Ver puntos 2 y 4.

2. **Comprobar que sigue en línea** en la plataforma de Sertag (`status` y
   `rssi`). Las pantallas se desconectan si cambia la contraseña del WiFi o
   si el router reparte otro rango de IP.

3. **Comprobar que Sertag procesó la imagen.** En el estado del dispositivo,
   el campo `images.imageFile` termina en un número que es la marca de tiempo
   de la última imagen generada. Si coincide con el momento del envío, Sertag
   la recibió y el problema es del dispositivo. Si no ha cambiado, la imagen
   se descartó antes de llegar.

   El campo `images.binFile` está **siempre vacío**, incluso cuando todo
   funciona. No sirve para diagnosticar.

4. **Reasignar el plato** desde la app. Es lo que resuelve la mayoría de los
   casos.

5. Si nada de lo anterior funciona, reiniciar el dispositivo desde la
   plataforma de Sertag.

---

## Nota técnica sobre el formato de imagen

Documentado aquí porque costó dar con ello y no está en el manual.

El manual de Sertag dice que el campo `imgsrc` admite «la imagen convertida a
base64». Eso **no funciona**: el servidor acepta la petición (responde
`code: 20000`) y descarta la imagen sin avisar. Tampoco funciona pasarle una
URL de descarga: la guarda y no la llega a bajar nunca.

Lo único que funciona es el **prefijo data URI completo**:

```
data:image/png;base64,iVBORw0KGgo...
```

Con eso Sertag decodifica la imagen y genera el thumb en su servidor, igual
que una subida manual desde el software oficial. Sirve tanto PNG como JPEG.
