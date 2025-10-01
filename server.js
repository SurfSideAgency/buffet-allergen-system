// server.js - Sistema de Alérgenos CORREGIDO
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos en memoria
let dishes = [];
let dishId = 1;

// Alérgenos UE 1169/2011
const ALLERGENS = {
    'gluten': { name: 'Cereales con Gluten', icon: '🌾', description: 'Trigo, centeno, cebada, avena' },
    'crustaceos': { name: 'Crustáceos', icon: '🦐', description: 'Gambas, langostinos, cangrejos' },
    'huevos': { name: 'Huevos', icon: '🥚', description: 'Huevos y productos derivados' },
    'pescado': { name: 'Pescado', icon: '🐟', description: 'Pescado y productos derivados' },
    'cacahuetes': { name: 'Cacahuetes', icon: '🥜', description: 'Cacahuetes y productos derivados' },
    'soja': { name: 'Soja', icon: '🌱', description: 'Soja y productos derivados' },
    'lacteos': { name: 'Leche y Lácteos', icon: '🥛', description: 'Leche y productos lácteos' },
    'frutos_secos': { name: 'Frutos de Cáscara', icon: '🌰', description: 'Almendras, nueces, avellanas' },
    'apio': { name: 'Apio', icon: '🥬', description: 'Apio y productos derivados' },
    'mostaza': { name: 'Mostaza', icon: '🟡', description: 'Mostaza y productos derivados' },
    'sesamo': { name: 'Granos de Sésamo', icon: '🫘', description: 'Sésamo y productos derivados' },
    'sulfitos': { name: 'Sulfitos', icon: '🍷', description: 'Vino, conservas, frutos secos' },
    'altramuces': { name: 'Altramuces', icon: '🫘', description: 'Altramuces y productos derivados' },
    'moluscos': { name: 'Moluscos', icon: '🐚', description: 'Mejillones, almejas, caracoles' }
};

// Detección de alérgenos por keywords
function detectAllergens(description) {
    const keywords = {
        'gluten': ['trigo', 'harina', 'pan', 'pasta', 'centeno', 'cebada', 'avena', 'gluten'],
        'crustaceos': ['gambas', 'langostinos', 'cangrejo', 'camarón', 'bogavante'],
        'huevos': ['huevo', 'huevos', 'clara', 'yema', 'mayonesa', 'tortilla'],
        'pescado': ['pescado', 'salmón', 'atún', 'merluza', 'bacalao', 'anchoa', 'sardina'],
        'cacahuetes': ['cacahuete', 'cacahuetes', 'maní'],
        'soja': ['soja', 'salsa de soja', 'tofu', 'edamame'],
        'lacteos': ['leche', 'queso', 'mantequilla', 'nata', 'yogur', 'crema', 'lácteo'],
        'frutos_secos': ['almendra', 'nuez', 'avellana', 'pistacho', 'anacardo'],
        'apio': ['apio'],
        'mostaza': ['mostaza'],
        'sesamo': ['sésamo', 'sesamo', 'ajonjolí', 'tahini'],
        'sulfitos': ['vino', 'sulfito', 'conserva', 'vinagre'],
        'altramuces': ['altramuz', 'altramuces', 'lupino'],
        'moluscos': ['mejillón', 'almeja', 'calamar', 'pulpo', 'sepia', 'caracol']
    };

    const detectedAllergens = new Set();
    const lowerDesc = description.toLowerCase();
    
    Object.entries(keywords).forEach(([allergen, words]) => {
        words.forEach(word => {
            if (lowerDesc.includes(word.toLowerCase())) {
                detectedAllergens.add(allergen);
            }
        });
    });
    
    return Array.from(detectedAllergens);
}

// ENDPOINTS

// Analizar plato
app.post('/api/analyze', async (req, res) => {
    try {
        const { description, chef, elaboration } = req.body;
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: 'Descripción del plato requerida'
            });
        }
        
        const detectedAllergens = detectAllergens(description);
        
        let dishName = description.split('con')[0].trim();
        if (!dishName || dishName.length > 100) {
            dishName = description.substring(0, 50);
        }
        
        const dish = {
            id: dishId++,
            name: dishName,
            description: description,
            chef: chef || 'Chef Principal',
            elaboration: elaboration || '',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            allergens: detectedAllergens,
            analysis_mode: 'keywords'
        };
        
        dishes.push(dish);
        
        console.log(`✅ Plato creado: ${dish.name}`);
        
        res.json({
            success: true,
            dish: dish,
            allergens_info: detectedAllergens.map(code => ({
                code: code,
                name: ALLERGENS[code]?.name || code,
                icon: ALLERGENS[code]?.icon || '⚠️'
            }))
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando el análisis'
        });
    }
});

// Actualizar alérgenos
app.post('/api/update-allergens', (req, res) => {
    try {
        const { dishId, allergens } = req.body;
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }
        
        dish.allergens = allergens;
        res.json({ success: true, dish: dish });
        
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error actualizando' });
    }
});

// Generar etiqueta
app.post('/api/generate-label', (req, res) => {
    try {
        const { dishId } = req.body;
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }
        
        const html = generateLabelHTML(dish);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error generando etiqueta' });
    }
});

// Generar recetario
app.post('/api/generate-recipe-document', (req, res) => {
    try {
        const { dishId } = req.body;
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }
        
        const html = generateRecipeHTML(dish);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error generando recetario' });
    }
});

// Obtener platos de hoy
app.get('/api/dishes/today', (req, res) => {
    try {
        const today = new Date().toLocaleDateString('es-ES');
        const todayDishes = dishes
            .filter(dish => dish.date === today)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            dishes: todayDishes,
            count: todayDishes.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error obteniendo platos' });
    }
});

// Estado del sistema
app.get('/api/system-status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        dishes_count: dishes.length,
        allergens_count: Object.keys(ALLERGENS).length,
        ai_enabled: false,
        timestamp: new Date().toISOString(),
        version: '5.0.0'
    });
});

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Funciones auxiliares
function generateLabelHTML(dish) {
    const hasAllergens = dish.allergens && dish.allergens.length > 0;
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        body { font-family: Arial; background: #f8f9fa; padding: 20px; }
        .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .dish-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 10px; }
        .allergen { display: flex; align-items: center; gap: 10px; padding: 10px; background: #fee2e2; border-radius: 8px; margin: 5px 0; }
        .safe { background: #d4edda; padding: 20px; border-radius: 8px; text-align: center; color: #155724; }
        @media print { body { background: white; padding: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ ETIQUETA DE ALÉRGENOS</h1>
        </div>
        <div class="content">
            <div class="dish-name">${dish.name}</div>
            <p><strong>Chef:</strong> ${dish.chef} | <strong>Fecha:</strong> ${dish.date}</p>
            <hr>
            ${hasAllergens ? `
                <h3>⚠️ CONTIENE ALÉRGENOS:</h3>
                ${dish.allergens.map(code => {
                    const a = ALLERGENS[code];
                    return a ? `<div class="allergen"><span style="font-size:1.5rem">${a.icon}</span><div><strong>${a.name}</strong><br><small>${a.description}</small></div></div>` : '';
                }).join('')}
            ` : `
                <div class="safe">
                    <h3>✅ SIN ALÉRGENOS</h3>
                    <p>Este plato no contiene alérgenos declarados</p>
                </div>
            `}
        </div>
    </div>
</body>
</html>`;
}

function generateRecipeHTML(dish) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recetario - ${dish.name}</title>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 3px solid #2c3e50; padding-bottom: 15px; margin-bottom: 20px; }
        .section { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        h1 { color: #2c3e50; }
        h3 { color: #2c3e50; border-bottom: 2px solid #D4AF37; padding-bottom: 5px; }
        @media print { body { padding: 10px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 RECETARIO OFICIAL - CONTROL SANITARIO</h1>
        <p><strong>Fecha:</strong> ${dish.date} | <strong>Código:</strong> #${String(dish.id).padStart(5, '0')}</p>
    </div>
    
    <div class="section">
        <h3>🍽️ PLATO</h3>
        <h2>${dish.name}</h2>
        <p><strong>Chef Responsable:</strong> ${dish.chef}</p>
    </div>
    
    <div class="section">
        <h3>📝 INGREDIENTES</h3>
        <p>${dish.description}</p>
    </div>
    
    ${dish.elaboration ? `
        <div class="section">
            <h3>👨‍🍳 ELABORACIÓN</h3>
            <p style="white-space: pre-wrap;">${dish.elaboration}</p>
        </div>
    ` : ''}
    
    <div class="section">
        <h3>⚠️ ALÉRGENOS (Reglamento UE 1169/2011)</h3>
        ${dish.allergens.length > 0 ? `
            <p><strong>Este plato contiene:</strong></p>
            <ul>
                ${dish.allergens.map(code => {
                    const a = ALLERGENS[code];
                    return a ? `<li>${a.icon} ${a.name} - ${a.description}</li>` : '';
                }).join('')}
            </ul>
        ` : '<p>✅ Sin alérgenos declarados</p>'}
    </div>
    
    <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px;">
        <p><strong>Firma Chef:</strong> _________________</p>
        <p><strong>Firma Responsable:</strong> _________________</p>
    </div>
</body>
</html>`;
}

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
    console.log('✅ Sistema de Alérgenos v5.0.0');
});

module.exports = app;
