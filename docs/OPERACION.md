# Guía de operación

Cómo dar de alta un cliente, conectar pantallas y el día a día del chef.

---

## 1. Dar de alta un cliente nuevo

Todo se hace desde el panel de administración: `https://buffet-allergen-system.vercel.app/admin`

1. Entra con tu usuario y contraseña de administrador.
2. **Crear establecimiento**: nombre del hotel/restaurante, fecha de
   caducidad de la licencia y número máximo de dispositivos.
3. El sistema genera un **código de licencia** con formato
   `BUFF-XXXX-XXXX-XXXX`. Ese código es lo único que necesita el cliente.
4. Se lo entregas al cliente.

El cliente entra en `https://buffet-allergen-system.vercel.app`, escribe el
código una sola vez y queda activado en ese dispositivo. No hay usuarios ni
contraseñas por chef: la licencia es del establecimiento.

### Control de dispositivos

Cada navegador que activa la licencia cuenta como un dispositivo. Cuando se
alcanza el máximo, la app avisa y no deja activar más.

Desde el panel puedes, por cada establecimiento:

- Ver los dispositivos activos.
- Desactivar uno (por ejemplo, si cambian de tablet).
- Subir o bajar el límite.
- Ampliar la vigencia de la licencia.
- Suspender el acceso (impago, fin de contrato).

**Limitación conocida**: el identificador de dispositivo lo genera el propio
navegador, así que un usuario con conocimientos técnicos puede alterarlo y
usar más dispositivos de los contratados. Sirve para clientes normales, no
como protección fuerte de ingresos.

---

## 2. Conectar una pantalla nueva

Son dos pasos, y el primero se hace **fuera** de esta aplicación.

### Paso 1 — Dar de alta el dispositivo en Sertag

Con el software oficial de Sertag: conectar la pantalla al WiFi del
establecimiento y registrarla en la plataforma. Esto es cosa de Sertag, no de
esta aplicación, y hay que hacerlo una vez por pantalla.

Requisitos de la pantalla: WiFi 2.4 GHz (no funciona en redes de 5 GHz).

### Paso 2 — Vincularla al establecimiento

En la app, pestaña **Pantallas** → **Añadir Pantalla** → escribir la MAC del
dispositivo (formato `D4:3D:39:XX:XX:XX`, viene en la etiqueta trasera o en
la plataforma de Sertag) → Guardar.

La pantalla aparece como un puesto del buffet y ya se le puede asignar plato.

> Si la MAC ya estaba dada de alta en otro establecimiento, al guardarla se
> **reasigna** al establecimiento actual. Útil cuando se mueve una pantalla de
> un cliente a otro, pero ojo: la quita del anterior.

---

## 3. El día a día del chef

1. **Pestaña Nuevo Plato** → escribir el nombre.
2. Añadir los ingredientes, de cualquiera de estas tres formas:
   - Buscarlos en la base de datos y tocarlos.
   - Describir el plato por escrito y pulsar *Sugerir Ingredientes*.
   - Dictar la descripción con el botón del micrófono y pulsar *Sugerir*.
3. El sistema calcula **solo** los alérgenos, sumando los de todos los
   ingredientes. El chef revisa y marca las trazas por contaminación cruzada.
4. **Guardar Plato**.
5. Desde ahí: *Etiqueta* para imprimir, o pestaña **Pantallas** para asignar
   el plato a un puesto y enviarlo.

### Ingredientes nuevos

Pestaña **Ingredientes** → rellenar nombre, categoría, alérgenos y trazas.
Si hay IA configurada, aparece además el botón de foto: se fotografía la
etiqueta del producto y rellena el formulario solo, para que el chef lo
revise antes de guardar.

Los ingredientes que crea un establecimiento son suyos; los que vienen de
serie los ven todos.

---

## 4. Mantenimiento

**Refrescar todo el buffet**: botón en la pestaña Pantallas. Reenvía a cada
pantalla el plato que tenga asignado. Útil al empezar el servicio o si una
pantalla se ha quedado con contenido viejo.

**Si una pantalla no cambia**:

1. Comprobar que sigue conectada al WiFi (en la plataforma de Sertag).
2. Reasignar el plato desde la app.
3. Las pantallas de tinta electrónica tardan unos segundos en repintar y
   parpadean al hacerlo: eso es normal.

**Trazabilidad**: cada etiqueta impresa guarda una copia de lo que decía en
ese momento (nombre, alérgenos, trazas, fecha). Sirve para justificar ante
una inspección qué información se dio un día concreto, aunque después haya
cambiado la receta.

---

## 5. Límites que conviene conocer

- La pantalla es de 4,2", 400×300 px y **solo tres colores**: blanco, negro y
  rojo. No admite fotos ni logotipos en color.
- Con muchos alérgenos el texto se reduce y pasa a dos columnas. A partir de
  ocho, los pictogramas se ven pequeños.
- La traducción de nombres de plato al inglés y francés usa un servicio
  gratuito con límite de uso: si falla, la etiqueta sale con el nombre en
  español y no se rompe nada.
- El escáner de etiquetas por foto y la sugerencia por IA requieren tener
  configurada `OPENAI_API_KEY`. Sin ella, la sugerencia funciona en modo
  básico por palabras clave y el botón de la cámara no aparece.
