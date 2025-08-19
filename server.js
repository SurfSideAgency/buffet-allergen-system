const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Configuración OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos en memoria para el MVP
let dishes = [];
let dishId = 1;

// Alérgenos oficiales UE actualizados
const ALLERGENS = {
  'gluten': { name: 'GLUTEN', icon: '🌾', color: '#D2B48C', symbol: '⚠️' },
  'crustaceos': { name: 'CRUSTÁCEOS', icon: '🦐', color: '#CD5C5C', symbol: '🦞' },
  'huevos': { name: 'HUEVOS', icon: '🥚', color: '#FFD700', symbol: '🥚' },
  'pescado': { name: 'PESCADO', icon: '🐟', color: '#4682B4', symbol: '🐟' },
  'cacahuetes': { name: 'CACAHUETES', icon: '🥜', color: '#DEB887', symbol: '🥜' },
  'soja': { name: 'SOJA', icon: '🫘', color: '#90EE90', symbol: '🌱' },
  'lacteos': { name: 'LÁCTEOS', icon: '🥛', color: '#87CEEB', symbol: '🥛' },
  'frutos_secos': { name: 'FRUTOS CON CÁSCARA', icon: '🌰', color: '#8B4513', symbol: '🥥' },
  'apio': { name: 'APIO', icon: '🥬', color: '#ADFF2F', symbol: '🌿' },
  'mostaza': { name: 'MOSTAZA', icon: '🟡', color: '#FFD700', symbol: '🟨' },
  'sesamo': { name: 'SÉSAMO', icon: '🫘', color: '#F5DEB3', symbol: '⚪' },
  'sulfitos': { name: 'SULFITOS', icon: '🍷', color: '#483D8B', symbol: '💨' },
  'altramuces': { name: 'ALTRAMUCES', icon: '🫘', color: '#F4A460', symbol: '🟤' },
  'moluscos': { name: 'MOLUSCOS', icon: '🦪', color: '#FFB6C1', symbol: '🐚' }
};

// Prompt para análisis de ingredientes
const ANALYSIS_PROMPT = `
Eres un experto en seguridad alimentaria. Analiza este plato de buffet y detecta TODOS los posibles alérgenos según la normativa europea.

Plato descrito: "{dishDescription}"

Debes identificar alérgenos en:
- Ingredientes principales mencionados
- Ingredientes ocultos típicos (salsas, condimentos, etc.)
- Preparaciones culinarias que suelen contener alérgenos

Responde SOLO con un JSON válido en este formato:
{
  "dish_name": "nombre_del_plato",
  "detected_allergens": ["alergen1", "alergen2"],
  "confidence": 0.95,
  "ingredients_analysis": "breve explicación de por qué detectaste estos alérgenos"
}

Usa estos códigos de alérgenos: gluten, crustaceos, huevos, pescado, cacahuetes, soja, lacteos, frutos_secos, apio, mostaza, sesamo, sulfitos, altramuces, moluscos
`;

// Configuración de impresora
const PRINTER_CONFIG = {
  printer_name: process.env.PRINTER_NAME || 'default',
  paper_size: process.env.PAPER_SIZE || 'A4',
  auto_print: process.env.AUTO_PRINT === 'true' || false
};

// Función para generar etiqueta con Formato B
function generateLabelFormatB(dish) {
  const doc = new PDFDocument({ size: [200, 120], margins: { top: 10, bottom: 10, left: 10, right: 10 }});

  // Título del plato (Formato B)
  doc.fontSize(14).font('Helvetica-Bold')
     .fillColor('black')
     .text(dish.name.toUpperCase(), 15, 15, { align: 'center' });

  // Línea separadora
  doc.moveTo(15, 35).lineTo(185, 35).stroke();

  // Alérgenos
  if (dish.allergens.length > 0) {
    dish.allergens.forEach((allergenCode, index) => {
      const allergen = ALLERGENS[allergenCode];
      if (allergen) {
        const yPos = 45 + (index * 18);
        doc.fontSize(12).font('Helvetica')
           .fillColor('black')
           .text(`${allergen.icon} ${allergen.name.charAt(0) + allergen.name.slice(1).toLowerCase()}`, 15, yPos);
      }
    });
  } else {
    doc.fontSize(12).font('Helvetica')
       .fillColor('green')
       .text('✅ Sin alérgenos detectados', 15, 50, { align: 'center' });
  }

  return doc;
}

// Endpoint principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para procesar plato
app.post('/api/analyze-dish', async (req, res) => {
  try {
    const { description, chef_name = 'Chef Principal' } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Descripción del plato requerida' });
    }

    console.log('Analizando plato:', description);

    // Llamada a OpenAI para análisis
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: ANALYSIS_PROMPT.replace('{dishDescription}', description)
      }],
      temperature: 0.1,
      max_tokens: 500
    });

    let analysis;
    try {
      const content = completion.choices[0].message.content;
      console.log('Respuesta OpenAI:', content);
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      analysis = {
        dish_name: description.split(' ').slice(0, 3).join(' '),
        detected_allergens: [],
        confidence: 0.5,
        ingredients_analysis: "Error en el análisis automático"
      };
    }

    // Crear registro del plato
    const dish = {
      id: dishId++,
      description: description,
      name: analysis.dish_name,
      allergens: analysis.detected_allergens,
      confidence: analysis.confidence,
      analysis: analysis.ingredients_analysis,
      chef: chef_name,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('es-ES')
    };

    dishes.push(dish);

    res.json({
      success: true,
      dish: dish,
      allergens_info: analysis.detected_allergens.map(code => ({
        code,
        ...ALLERGENS[code]
      }))
    });

  } catch (error) {
    console.error('Error processing dish:', error);
    res.status(500).json({ 
      error: 'Error procesando el plato',
      details: error.message 
    });
  }
});

// Endpoint para generar etiqueta PDF simple
app.post('/api/generate-label-simple/:dishId', (req, res) => {
  try {
    const dishId = parseInt(req.params.dishId);
    const dish = dishes.find(d => d.id === dishId);
    
    if (!dish) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }

    const doc = generateLabelFormatB(dish);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiqueta_${dish.name.replace(/\s+/g, '_')}.pdf"`);
    
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Error generating simple label:', error);
    res.status(500).json({ error: 'Error generando etiqueta simple' });
  }
});

// Endpoint para imprimir directamente
app.post('/api/print-directly/:dishId', (req, res) => {
  try {
    const dishId = parseInt(req.params.dishId);
    const dish = dishes.find(d => d.id === dishId);
    
    if (!dish) {
      return res.status(404).json({ error: 'Plato no encontrado' });
    }

    // Simular impresión
    console.log(`🖨️ Enviando a impresora: ${PRINTER_CONFIG.printer_name}`);
    console.log(`📄 Plato: ${dish.name}`);
    console.log(`🚨 Alérgenos: ${dish.allergens.join(', ') || 'Ninguno'}`);

    res.json({ 
      success: true, 
      message: `Etiqueta enviada a ${PRINTER_CONFIG.printer_name}`,
      dish_name: dish.name,
      allergens_count: dish.allergens.length
    });

  } catch (error) {
    console.error('Error printing label:', error);
    res.status(500).json({ error: 'Error imprimiendo etiqueta' });
  }
});

// Endpoint para configurar impresora
app.post('/api/configure-printer', (req, res) => {
  const { printer_name, paper_size, auto_print } = req.body;
  
  PRINTER_CONFIG.printer_name = printer_name || 'default';
  PRINTER_CONFIG.paper_size = paper_size || 'A4';
  PRINTER_CONFIG.auto_print = auto_print || false;
  
  res.json({ 
    success: true, 
    message: 'Configuración de impresora actualizada',
    config: PRINTER_CONFIG
  });
});

// Endpoint para obtener platos del día
app.get('/api/dishes/today', (req, res) => {
  const today = new Date().toLocaleDateString('es-ES');
  const todayDishes = dishes.filter(d => d.date === today);
  res.json(todayDishes);
});

// Endpoint para obtener lista de alérgenos
app.get('/api/allergens', (req, res) => {
  res.json(ALLERGENS);
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${port}`);
  console.log(`📱 Abre: http://localhost:${port}`);
  console.log(`🔑 OpenAI configurado: ${process.env.OPENAI_API_KEY ? 'SÍ' : 'NO'}`);
  console.log(`🖨️ Impresora: ${PRINTER_CONFIG.printer_name}`);
});
