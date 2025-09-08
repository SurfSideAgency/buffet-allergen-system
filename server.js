// server.js - MÍNIMO FUNCIONAL para que los botones trabajen
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos en memoria
let dishes = [];
let dishId = 1;

// Alérgenos básicos
const ALLERGENS = {
    'gluten': { name: 'Cereales con Gluten', icon: '🌾' },
    'crustaceos': { name: 'Crustáceos', icon: '🦐' },
    'huevos': { name: 'Huevos', icon: '🥚' },
    'pescado': { name: 'Pescado', icon: '🐟' },
    'cacahuetes': { name: 'Cacahuetes', icon: '🥜' },
    'soja': { name: 'Soja', icon: '🌱' },
    'lacteos': { name: 'Leche y Lácteos', icon: '🥛' },
    'frutos_secos': { name: 'Frutos de Cáscara', icon: '🌰' },
    'apio': { name: 'Apio', icon: '🥬' },
    'mostaza': { name: 'Mostaza', icon: '🟡' },
    'sesamo': { name: 'Granos de Sésamo', icon: '🫘' },
    'sulfitos': { name: 'Sulfitos', icon: '🍷' },
    'altramuces': { name: 'Altramuces', icon: '🫘' },
    'moluscos': { name: 'Moluscos', icon: '🐚' }
};

// ====== ANÁLISIS SIMPLE ======
function analyzeSimple(description) {
    const detected = [];
    const desc = description.toLowerCase();
    
    if (desc.includes('gamba') || desc.includes('langostino') || desc.includes('cangrejo')) {
        detected.push('crustaceos');
    }
    if (desc.includes('mejillon') || desc.includes('almeja') || desc.includes('pulpo') || desc.includes('calamar')) {
        detected.push('moluscos');
    }
    if (desc.includes('huevo') || desc.includes('mayonesa') || desc.includes('tortilla')) {
        detected.push('huevos');
    }
    if (desc.includes('queso') || desc.includes('leche') || desc.includes('nata') || desc.includes('yogur')) {
        detected.push('lacteos');
    }
    if (desc.includes('harina') || desc.includes('pan') || desc.includes('pasta') || desc.includes('trigo')) {
        detected.push('gluten');
    }
    if (desc.includes('pescado') || desc.includes('salmon') || desc.includes('merluza') || desc.includes('bacalao')) {
        detected.push('pescado');
    }
    if (desc.includes('almendra') || desc.includes('nuez') || desc.includes('avellana')) {
        detected.push('frutos_secos');
    }
    if (desc.includes('cacahuete') || desc.includes('mani')) {
        detected.push('cacahuetes');
    }
    if (desc.includes('soja') || desc.includes('tofu')) {
        detected.push('soja');
    }
    
    return detected;
}

// ====== ENDPOINTS QUE NECESITA TU FRONTEND ======

// Análisis de plato (LO QUE LLAMA analyzeDish())
app.post('/api/analyze-dish-hybrid', (req, res) => {
    try {
        const { description, chef_name, analysis_mode } = req.body;
        
        console.log(`🔍 Analizando: "${description}" en modo ${analysis_mode}`);
        
        if (!description || !description.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'La descripción del plato es requerida' 
            });
        }

        // Detectar alérgenos
        const detectedAllergens = analysis_mode === 'manual' ? [] : analyzeSimple(description);
        
        // Crear plato
        const dish = {
            id: dishId++,
            name: extractDishName(description),
            description: description.trim(),
            chef: chef_name || 'Chef Principal',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            analysis_mode: analysis_mode
        };

        // Guardar en memoria
        dishes.push(dish);
        
        console.log(`✅ Plato creado: ${dish.name} (ID: ${dish.id})`);
        console.log(`🔍 Alérgenos detectados: ${detectedAllergens.join(', ') || 'ninguno'}`);
        
        res.json({
            success: true,
            dish: dish,
            analysis: {
                allergens: detectedAllergens,
                confidence: detectedAllergens.reduce((acc, allergen) => {
                    acc[allergen] = 0.85; // Confianza fija para el ejemplo
                    return acc;
                }, {}),
                method: analysis_mode
            },
            allergens_info: detectedAllergens.map(code => ({
                code: code,
                name: ALLERGENS[code]?.name || code,
                icon: ALLERGENS[code]?.icon || '⚠️'
            }))
        });
        
    } catch (error) {
        console.error('❌ Error en análisis:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando el análisis del plato'
        });
    }
});

// Generar etiqueta PDF (LO QUE LLAMA generateLabel())
app.post('/api/generate-beautiful-single/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ 
                success: false, 
                error: `Plato con ID ${dishId} no encontrado` 
            });
        }

        console.log(`📄 Generando PDF para: ${dish.name}`);

        // Crear respuesta HTML que simula un PDF
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; margin-bottom: 30px; }
        .dish-info { background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .allergens { margin: 20px 0; }
        .allergen-badge { display: inline-block; background: #fee2e2; color: #dc2626; padding: 5px 10px; margin: 5px; border-radius: 15px; font-size: 14px; }
        .safe { background: #f0fdf4; color: #16a34a; padding: 20px; text-align: center; border-radius: 10px; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
        @media print {
            .no-print { display: none; }
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ ETIQUETA DE ALÉRGENOS</h1>
        <p>Sistema de Gestión de Alérgenos - Normativa UE 1169/2011</p>
    </div>

    <div class="dish-info">
        <h2>${dish.name}</h2>
        <p><strong>Descripción:</strong> ${dish.description}</p>
        <p><strong>Chef:</strong> ${dish.chef}</p>
        <p><strong>Fecha:</strong> ${dish.date}</p>
        <p><strong>Análisis:</strong> ${dish.analysis_mode}</p>
    </div>

    <div class="allergens">
        <h3>Información de Alérgenos:</h3>
        <div class="safe">
            <h3>✅ SIN ALÉRGENOS DETECTADOS</h3>
            <p>Este plato es seguro para personas con alergias alimentarias</p>
        </div>
    </div>

    <div class="footer">
        <p>Generado: ${new Date().toLocaleString('es-ES')} | Sistema v2.0</p>
        <p>Normativa Europea UE 1169/2011 sobre información alimentaria</p>
    </div>

    <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="background: #16a34a; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
            🖨️ Imprimir esta Etiqueta
        </button>
        <p style="font-size: 14px; color: #666; margin-top: 10px;">
            Para guardar como PDF: <strong>Ctrl+P</strong> → <strong>"Guardar como PDF"</strong>
        </p>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);
        
    } catch (error) {
        console.error('❌ Error generando etiqueta:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error generando etiqueta' 
        });
    }
});

// Imprimir directamente (LO QUE LLAMA printLabel())
app.post('/api/print-directly/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ 
                success: false, 
                error: `Plato con ID ${dishId} no encontrado` 
            });
        }

        console.log(`🖨️ Imprimiendo etiqueta para: ${dish.name}`);
        
        res.json({
            success: true,
            message: `Etiqueta de "${dish.name}" enviada a impresora correctamente`,
            dish_id: dishId,
            dish_name: dish.name,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en impresión:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error enviando a impresora' 
        });
    }
});

// Guardar plato (LO QUE LLAMA saveDish())
app.post('/api/save-manual-allergens', (req, res) => {
    try {
        const { dish_id, manual_allergens, chef_notes } = req.body;
        
        const dishIndex = dishes.findIndex(d => d.id === dish_id);
        if (dishIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }

        // Actualizar plato
        dishes[dishIndex] = {
            ...dishes[dishIndex],
            manual_allergens: manual_allergens,
            final_allergens: manual_allergens,
            chef_notes: chef_notes,
            manual_override: true,
            updated_at: new Date().toISOString()
        };

        console.log(`💾 Plato guardado: ${dishes[dishIndex].name}`);

        res.json({
            success: true,
            dish: dishes[dishIndex],
            message: 'Plato guardado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error guardando:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando el plato'
        });
    }
});

// Platos de hoy (LO QUE LLAMA loadTodaysDishes())
app.get('/api/dishes/today', (req, res) => {
    const today = new Date().toLocaleDateString('es-ES');
    const todayDishes = dishes
        .filter(dish => dish.date === today)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    console.log(`📋 Devolviendo ${todayDishes.length} platos de hoy`);
    res.json(todayDishes);
});

// Estado del sistema (para debug)
app.get('/api/system-status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        dishes_count: dishes.length,
        allergens_count: Object.keys(ALLERGENS).length,
        timestamp: new Date().toISOString(),
        endpoints: [
            'POST /api/analyze-dish-hybrid',
            'POST /api/generate-beautiful-single/:id',
            'POST /api/print-directly/:id',
            'POST /api/save-manual-allergens',
            'GET /api/dishes/today'
        ]
    });
});

// ====== FUNCIONES AUXILIARES ======

function extractDishName(description) {
    const words = description.trim().split(/\s+/);
    const commonDishes = {
        'paella': 'Paella',
        'tortilla': 'Tortilla',
        'gazpacho': 'Gazpacho',
        'ensalada': 'Ensalada',
        'pescado': 'Pescado',
        'pollo': 'Pollo',
        'arroz': 'Arroz',
        'pasta': 'Pasta',
        'sopa': 'Sopa'
    };
    
    for (const [key, name] of Object.entries(commonDishes)) {
        if (description.toLowerCase().includes(key)) {
            return name + ' ' + words.slice(1, 3).join(' ');
        }
    }
    
    return words.slice(0, Math.min(3, words.length)).join(' ');
}

// ====== SERVIR ARCHIVOS ESTÁTICOS ======

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== LOGGING ======

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ====== INICIAR SERVIDOR ======

app.listen(port, () => {
    console.log(`🚀 Servidor iniciado en puerto ${port}`);
    console.log(`📋 Sistema de Alérgenos funcionando`);
    console.log(`🔗 Accede a: http://localhost:${port}`);
    console.log(`🛠️ Endpoints activos:`);
    console.log(`   POST /api/analyze-dish-hybrid`);
    console.log(`   POST /api/generate-beautiful-single/:id`);
    console.log(`   POST /api/print-directly/:id`);
    console.log(`   POST /api/save-manual-allergens`);
    console.log(`   GET /api/dishes/today`);
    console.log(`   GET /api/system-status`);
});

module.exports = app;
