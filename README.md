# 🍽️ Sistema de Detección de Alérgenos

Sistema simplificado para detectar alérgenos automáticamente en platos mediante IA.

## 📁 Estructura del Proyecto

```
allergen-system/
├── data/
│   ├── allergens.json      # Base de datos de alérgenos (14 oficiales UE)
│   └── ingredients.json    # Base de datos de ingredientes
├── public/
│   └── index.html          # Interfaz web simplificada
├── server.js               # Servidor Express
├── package.json            # Dependencias
└── README.md              # Este archivo
```

## 🚀 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
```bash
npm install
```

3. **Crear las carpetas necesarias**
```bash
mkdir data
```

4. **Crear los archivos JSON** en la carpeta `data/`:
   - `allergens.json` (base de alérgenos)
   - `ingredients.json` (base de ingredientes)

5. **Iniciar el servidor**
```bash
npm start
```

6. **Abrir en navegador**
```
http://localhost:3000
```

## 📝 Cómo Funciona

### Flujo Simple:

1. **Entrada**: El chef describe el plato e ingredientes
2. **Detección**: La IA analiza y detecta alérgenos automáticamente
3. **Resultado**: Se muestra la lista de alérgenos detectados
4. **Etiqueta**: Se puede generar e imprimir la etiqueta oficial

### Ejemplo:

**Entrada:**
> Paella valenciana con arroz, gambas, mejillones, pollo y azafrán

**Detección automática:**
- 🦐 Crustáceos (gambas)
- 🐚 Moluscos (mejillones)

**Resultado:**
Etiqueta imprimible con todos los alérgenos detectados.

## ⚠️ Alérgenos Detectables

El sistema detecta los 14 alérgenos oficiales de la UE:

1. 🌾 Cereales con gluten
2. 🦐 Crustáceos
3. 🥚 Huevos
4. 🐟 Pescado
5. 🥜 Cacahuetes
6. 🌱 Soja
7. 🥛 Leche y lácteos
8. 🌰 Frutos de cáscara
9. 🥬 Apio
10. 🟡 Mostaza
11. 🫘 Sésamo
12. 🍷 Sulfitos
13. 🫘 Altramuces
14. 🐚 Moluscos

## 🔧 API Endpoints

### POST `/api/analyze`
Analiza un plato y detecta alérgenos.

**Body:**
```json
{
  "description": "Paella con gambas y mejillones",
  "chef": "Chef Principal"
}
```

**Response:**
```json
{
  "success": true,
  "dish": {
    "id": 1,
    "name": "Paella",
    "allergens": ["crustaceos", "moluscos"]
  },
  "allergens": [
    {
      "code": "crustaceos",
      "name": "Crustáceos",
      "icon": "🦐"
    }
  ]
}
```

### POST `/api/generate-label`
Genera etiqueta HTML imprimible.

### GET `/api/dishes`
Obtiene platos del día actual.

## 📄 Archivos JSON

### allergens.json
Contiene la definición de cada alérgeno con:
- Nombre oficial
- Icono
- Descripción
- Palabras clave para detección

### ingredients.json
Base de ingredientes comunes organizados por categorías con sus alérgenos asociados.

## 🎨 Características

✅ Detección automática con IA  
✅ Interfaz simple e intuitiva  
✅ Etiquetas imprimibles  
✅ Cumple normativa UE 1169/2011  
✅ Historial de platos del día  
✅ Sin base de datos externa (todo en memoria)  
✅ Diseño responsive

## 🔒 Normativa

Sistema diseñado conforme al Reglamento UE 1169/2011 sobre información alimentaria al consumidor.

## 📦 Despliegue en Vercel

El proyecto incluye `vercel.json` configurado. Solo necesitas:

```bash
vercel
```

## 💡 Mejoras Futuras

- [ ] Integración con IA real (OpenAI, Claude)
- [ ] Base de datos persistente
- [ ] Escaneo de imágenes
- [ ] Multi-idioma
- [ ] Export PDF profesional
- [ ] API REST completa

## 📞 Soporte

Para soporte, abre un issue en el repositorio.

---

**Versión:** 4.0.0 - Sistema Simplificado  
**Licencia:** MIT
