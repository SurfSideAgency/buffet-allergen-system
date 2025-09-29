// server.js - Sistema de Alérgenos CON INGREDIENTES - COMPLETO
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ====== MIDDLEWARE BÁSICO ======
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== BASE DE DATOS EN MEMORIA ======
let dishes = [];
let dishId = 1;

// ====== ALÉRGENOS UE 1169/2011 ======
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

// ====== BASE DE DATOS DE INGREDIENTES ======
const INGREDIENTS = {
    // CEREALES Y HARINAS
    'harina_trigo': { name: 'Harina de trigo', category: '🌾 Cereales', allergens: ['gluten'] },
    'pan': { name: 'Pan', category: '🌾 Cereales', allergens: ['gluten'] },
    'pasta': { name: 'Pasta', category: '🌾 Cereales', allergens: ['gluten'] },
    'arroz': { name: 'Arroz', category: '🌾 Cereales', allergens: [] },
    'avena': { name: 'Avena', category: '🌾 Cereales', allergens: ['gluten'] },
    
    // LÁCTEOS
    'leche': { name: 'Leche', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'queso': { name: 'Queso', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'mantequilla': { name: 'Mantequilla', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'nata': { name: 'Nata', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'yogur': { name: 'Yogur', category: '🥛 Lácteos', allergens: ['lacteos'] },
    
    // HUEVOS
    'huevos': { name: 'Huevos', category: '🥚 Huevos', allergens: ['huevos'] },
    'clara_huevo': { name: 'Clara de huevo', category: '🥚 Huevos', allergens: ['huevos'] },
    'yema_huevo': { name: 'Yema de huevo', category: '🥚 Huevos', allergens: ['huevos'] },
    
    // PESCADOS
    'salmon': { name: 'Salmón', category: '🐟 Pescados', allergens: ['pescado'] },
    'merluza': { name: 'Merluza', category: '🐟 Pescados', allergens: ['pescado'] },
    'bacalao': { name: 'Bacalao', category: '🐟 Pescados', allergens: ['pescado'] },
    'atun': { name: 'Atún', category: '🐟 Pescados', allergens: ['pescado'] },
    'lubina': { name: 'Lubina', category: '🐟 Pescados', allergens: ['pescado'] },
    'dorada': { name: 'Dorada', category: '🐟 Pescados', allergens: ['pescado'] },
    
    // MARISCOS - CRUSTÁCEOS
    'gambas': { name: 'Gambas', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    'langostinos': { name: 'Langostinos', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    'cangrejo': { name: 'Cangrejo', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    'cigalas': { name: 'Cigalas', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    
    // MARISCOS - MOLUSCOS
    'mejillones': { name: 'Mejillones', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'almejas': { name: 'Almejas', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'calamares': { name: 'Calamares', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'pulpo': { name: 'Pulpo', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'sepia': { name: 'Sepia', category: '🐚 Moluscos', allergens: ['moluscos'] },
    
    // FRUTOS SECOS
    'almendras': { name: 'Almendras', category: '🌰 Frutos Secos', allergens: ['frutos_secos'] },
    'nueces': { name: 'Nueces', category: '🌰 Frutos Secos', allergens: ['frutos_secos'] },
    'avellanas': { name: 'Avellanas', category: '🌰 Frutos Secos', allergens: ['frutos_secos'] },
    'pistachos': { name: 'Pistachos', category: '🌰 Frutos Secos', allergens: ['frutos_secos'] },
    'anacardos': { name: 'Anacardos', category: '🌰 Frutos Secos', allergens: ['frutos_secos'] },
    'cacahuetes': { name: 'Cacahuetes', category: '🥜 Legumbres', allergens: ['cacahuetes'] },
    
    // CARNES
    'pollo': { name: 'Pollo', category: '🍗 Carnes', allergens: [] },
    'ternera': { name: 'Ternera', category: '🥩 Carnes', allergens: [] },
    'cerdo': { name: 'Cerdo', category: '🥓 Carnes', allergens: [] },
    'cordero': { name: 'Cordero', category: '🐑 Carnes', allergens: [] },
    'pavo': { name: 'Pavo', category: '🦃 Carnes', allergens: [] },
    'conejo': { name: 'Conejo', category: '🐰 Carnes', allergens: [] },
    
    // VERDURAS Y HORTALIZAS
    'tomate': { name: 'Tomate', category: '🍅 Verduras', allergens: [] },
    'cebolla': { name: 'Cebolla', category: '🧅 Verduras', allergens: [] },
    'ajo': { name: 'Ajo', category: '🧄 Verduras', allergens: [] },
    'pimiento': { name: 'Pimiento', category: '🫑 Verduras', allergens: [] },
    'apio': { name: 'Apio', category: '🥬 Verduras', allergens: ['apio'] },
    'zanahoria': { name: 'Zanahoria', category: '🥕 Verduras', allergens: [] },
    'lechuga': { name: 'Lechuga', category: '🥬 Verduras', allergens: [] },
    'espinacas': { name: 'Espinacas', category: '🥬 Verduras', allergens: [] },
    'calabacin': { name: 'Calabacín', category: '🥒 Verduras', allergens: [] },
    'berenjena': { name: 'Berenjena', category: '🍆 Verduras', allergens: [] },
    
    // LEGUMBRES
    'garbanzos': { name: 'Garbanzos', category: '🫘 Legumbres', allergens: [] },
    'lentejas': { name: 'Lentejas', category: '🫘 Legumbres', allergens: [] },
    'judias': { name: 'Judías', category: '🫘 Legumbres', allergens: [] },
    
    // SALSAS Y CONDIMENTOS
    'mayonesa': { name: 'Mayonesa', category: '🥫 Salsas', allergens: ['huevos'] },
    'mostaza': { name: 'Mostaza', category: '🥫 Salsas', allergens: ['mostaza'] },
    'salsa_soja': { name: 'Salsa de soja', category: '🥫 Salsas', allergens: ['soja', 'gluten'] },
    'aceite_oliva': { name: 'Aceite de oliva', category: '🫒 Aceites', allergens: [] },
    'aceite_sesamo': { name: 'Aceite de sésamo', category: '🫒 Aceites', allergens: ['sesamo'] },
    'aceite_girasol': { name: 'Aceite de girasol', category: '🫒 Aceites', allergens: [] },
    
    // ESPECIAS Y HIERBAS
    'azafran': { name: 'Azafrán', category: '🌿 Especias', allergens: [] },
    'perejil': { name: 'Perejil', category: '🌿 Hierbas', allergens: [] },
    'oregano': { name: 'Orégano', category: '🌿 Hierbas', allergens: [] },
    'albahaca': { name: 'Albahaca', category: '🌿 Hierbas', allergens: [] },
    'romero': { name: 'Romero', category: '🌿 Hierbas', allergens: [] },
    'tomillo': { name: 'Tomillo', category: '🌿 Hierbas', allergens: [] },
    
    // OTROS
    'vino_blanco': { name: 'Vino blanco', category: '🍷 Bebidas', allergens: ['sulfitos'] },
    'vino_tinto': { name: 'Vino tinto', category: '🍷 Bebidas', allergens: ['sulfitos'] },
    'cerveza': { name: 'Cerveza', category: '🍺 Bebidas', allergens: ['gluten'] },
    'tofu': { name: 'Tofu', category: '🌱 Vegetal', allergens: ['soja'] },
    'sal': { name: 'Sal', category: '🧂 Condimentos', allergens: [] },
    'pimienta': { name: 'Pimienta', category: '🧂 Condimentos', allergens: [] },
    'limon': { name: 'Limón', category: '🍋 Frutas', allergens: [] },
    'patata': { name: 'Patata', category: '🥔 Tubérculos', allergens: [] }
};

// ====== ENDPOINT: OBTENER INGREDIENTES ======
app.get('/api/ingredients', (req, res) => {
    try {
        // Agrupar ingredientes por categoría
        const categorized = {};
        
        Object.entries(INGREDIENTS).forEach(([code, ingredient]) => {
            const category = ingredient.category;
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push({
                code: code,
                ...ingredient
            });
        });
        
        res.json({
            success: true,
            ingredients: INGREDIENTS,
            categorized: categorized,
            total: Object.keys(INGREDIENTS).length
        });
    } catch (error) {
        console.error('❌ Error obteniendo ingredientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo ingredientes'
        });
    }
});

// ====== ENDPOINT: ANALIZAR PLATO POR INGREDIENTES ======
app.post('/api/analyze-by-ingredients', (req, res) => {
    try {
        const { dish_name, ingredients, chef_name } = req.body;
        
        if (!dish_name || !ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({
                success: false,
                error: 'Nombre del plato e ingredientes son requeridos'
            });
        }
        
        console.log(`🔍 Analizando plato: "${dish_name}" con ${ingredients.length} ingredientes`);
        
        // Calcular alérgenos desde ingredientes
        const detectedAllergens = new Set();
        const ingredientDetails = [];
        
        ingredients.forEach(ingredientCode => {
            const ingredient = INGREDIENTS[ingredientCode];
            if (ingredient) {
                ingredientDetails.push({
                    code: ingredientCode,
                    name: ingredient.name,
                    category: ingredient.category
                });
                
                // Añadir alérgenos de este ingrediente
                ingredient.allergens.forEach(allergen => {
                    detectedAllergens.add(allergen);
                });
            }
        });
        
        const allergensArray = Array.from(detectedAllergens);
        
        // Crear objeto del plato
        const dish = {
            id: dishId++,
            name: dish_name,
            ingredients: ingredientDetails,
            ingredient_codes: ingredients,
            chef: chef_name || 'Chef Principal',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            final_allergens: allergensArray,
            analysis_mode: 'ingredients'
        };
        
        // Guardar en memoria
        dishes.push(dish);
        
        console.log(`✅ Plato creado: ${dish.name} (ID: ${dish.id})`);
        console.log(`📊 ${ingredientDetails.length} ingredientes, ${allergensArray.length} alérgenos detectados`);
        
        res.json({
            success: true,
            dish: dish,
            allergens: allergensArray,
            allergens_info: allergensArray.map(code => ({
                code: code,
                name: ALLERGENS[code]?.name || code,
                icon: ALLERGENS[code]?.icon || '⚠️'
            }))
        });
        
    } catch (error) {
        console.error('❌ Error analizando por ingredientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando los ingredientes',
            details: error.message
        });
    }
});

// ====== GENERAR ETIQUETA CON DATOS ======
app.post('/api/generate-label-with-data', (req, res) => {
    try {
        const { dish, allergens } = req.body;
        
        if (!dish) {
            return res.status(400).json({
                success: false,
                error: 'Datos del plato requeridos'
            });
        }
        
        console.log(`📄 Generando etiqueta: ${dish.name}`);
        
        const htmlContent = generateLabelHTML(dish, allergens || []);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="etiqueta_${dish.name.replace(/\s+/g, '_')}.html"`);
        res.send(htmlContent);
        
    } catch (error) {
        console.error('❌ Error generando etiqueta:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando etiqueta',
            details: error.message
        });
    }
});

// ====== GUARDAR PLATO ======
app.post('/api/save-dish', (req, res) => {
    try {
        const { dish_id } = req.body;
        
        const dishIndex = dishes.findIndex(d => d.id === dish_id);
        
        if (dishIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }
        
        console.log(`💾 Plato guardado: ${dishes[dishIndex].name}`);
        
        res.json({
            success: true,
            dish: dishes[dishIndex],
            message: 'Plato guardado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error guardando plato:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando plato'
        });
    }
});

// ====== OBTENER PLATOS DE HOY ======
app.get('/api/dishes/today', (req, res) => {
    try {
        const today = new Date().toLocaleDateString('es-ES');
        const todayDishes = dishes
            .filter(dish => dish.date === today)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`📋 Devolviendo ${todayDishes.length} platos de hoy`);
        res.json(todayDishes);
    } catch (error) {
        console.error('❌ Error obteniendo platos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo platos'
        });
    }
});

// ====== ESTADO DEL SISTEMA ======
app.get('/api/system-status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        ingredients_count: Object.keys(INGREDIENTS).length,
        dishes_count: dishes.length,
        allergens_count: Object.keys(ALLERGENS).length,
        timestamp: new Date().toISOString(),
        version: '3.0.0 - Ingredients'
    });
});

// ====== FUNCIÓN AUXILIAR: GENERAR HTML ETIQUETA ======
function generateLabelHTML(dish, allergens) {
    const hasAllergens = allergens && allergens.length > 0;
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            background: #f8f9fa; 
            padding: 20px;
        }
        .label-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 { font-size: 2rem; margin-bottom: 10px; }
        .dish-info {
            padding: 30px 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .dish-name {
            font-size: 1.8rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
        }
        .ingredients-section {
            margin-top: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .ingredients-section h4 {
            margin-bottom: 10px;
            color: #2c3e50;
        }
        .ingredient-tag {
            display: inline-block;
            padding: 5px 10px;
            margin: 3px;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 15px;
            font-size: 0.9rem;
        }
        .allergen-section { padding: 30px 20px; }
        .safe-notice {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            color: #155724;
        }
        .danger-notice {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border: 2px solid #dc3545;
            border-radius: 10px;
            padding: 25px;
            color: #721c24;
        }
        .allergen-list {
            display: grid;
            gap: 10px;
            margin-top: 15px;
        }
        .allergen-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 15px;
            background: rgba(220, 53, 69, 0.1);
            border-radius: 8px;
            border-left: 4px solid #dc3545;
        }
        .print-btn {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.1rem;
            cursor: pointer;
            margin: 10px;
        }
        @media print { .no-print { display: none !important; } }
    </style>
</head>
<body>
    <div class="label-container">
        <div class="header">
            <h1>🍽️ ETIQUETA DE ALÉRGENOS</h1>
            <p>Sistema de Gestión - Normativa UE 1169/2011</p>
        </div>

        <div class="dish-info">
            <div class="dish-name">${dish.name}</div>
            <p><strong>Chef:</strong> ${dish.chef} | <strong>Fecha:</strong> ${dish.date}</p>
            
            ${dish.ingredients && dish.ingredients.length > 0 ? `
                <div class="ingredients-section">
                    <h4>📝 Ingredientes utilizados:</h4>
                    ${dish.ingredients.map(ing => 
                        `<span class="ingredient-tag">${ing.name}</span>`
                    ).join('')}
                </div>
            ` : ''}
        </div>

        <div class="allergen-section">
            ${hasAllergens ? `
                <div class="danger-notice">
                    <h3>⚠️ CONTIENE ALÉRGENOS</h3>
                    <div class="allergen-list">
                        ${allergens.map(code => {
                            const allergen = ALLERGENS[code];
                            if (!allergen) return '';
                            return `
                                <div class="allergen-item">
                                    <span style="font-size: 1.5rem;">${allergen.icon}</span>
                                    <div>
                                        <div style="font-weight: bold;">${allergen.name}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">${allergen.description}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="safe-notice">
                    <h3>✅ SIN ALÉRGENOS</h3>
                    <p>Este plato NO contiene ninguno de los 14 alérgenos de declaración obligatoria.</p>
                </div>
            `}
        </div>

        <div style="text-align: center; padding: 20px;" class="no-print">
            <button onclick="window.print()" class="print-btn">🖨️ Imprimir Etiqueta</button>
        </div>
    </div>
</body>
</html>`;
}

// ====== PÁGINA PRINCIPAL ======
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// ====== AÑADIR ANTES DE app.listen() ======

// Configurar multer para imágenes
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Base de datos de ingredientes personalizados (EN MEMORIA)
let customIngredients = {};
let ingredientId = 1;

// NUEVO: Escanear etiqueta (SIMULADO - sin IA real)
app.post('/api/scan-ingredient-label', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se recibió ninguna imagen'
            });
        }

        console.log('📸 Imagen recibida:', req.file.originalname);

        // SIMULACIÓN (espera 2 segundos para parecer real)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Respuesta simulada
        const simulatedResponse = {
            nombre: "Ingrediente detectado",
            alergenos: [],
            categoria: "📦 Personalizado"
        };

        res.json({
            success: true,
            data: simulatedResponse,
            message: 'Análisis completado (simulación)'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando imagen'
        });
    }
});

// NUEVO: Guardar ingrediente personalizado
app.post('/api/custom-ingredients', (req, res) => {
    try {
        const { name, category, allergens, brand, notes } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'El nombre es requerido'
            });
        }

        const code = `custom_${ingredientId++}`;
        
        customIngredients[code] = {
            code: code,
            name: name,
            category: category || '📦 Personalizado',
            allergens: allergens || [],
            brand: brand || '',
            notes: notes || '',
            created_at: new Date().toISOString(),
            is_custom: true
        };

        console.log(`✅ Ingrediente guardado: ${name}`);

        res.json({
            success: true,
            ingredient: customIngredients[code]
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando'
        });
    }
});

// NUEVO: Obtener ingredientes personalizados
app.get('/api/custom-ingredients', (req, res) => {
    res.json({
        success: true,
        ingredients: customIngredients,
        count: Object.keys(customIngredients).length
    });
});

// NUEVO: Eliminar ingrediente
app.delete('/api/custom-ingredients/:code', (req, res) => {
    const { code } = req.params;
    
    if (!customIngredients[code]) {
        return res.status(404).json({
            success: false,
            error: 'No encontrado'
        });
    }

    delete customIngredients[code];
    console.log(`🗑️ Ingrediente eliminado`);

    res.json({ success: true });
});

// MODIFICAR el endpoint existente /api/ingredients
// Busca esta función y reemplázala:
app.get('/api/ingredients', (req, res) => {
    try {
        // Combinar ingredientes base con personalizados
        const allIngredients = { ...INGREDIENTS, ...customIngredients };
        
        const categorized = {};
        
        Object.entries(allIngredients).forEach(([code, ingredient]) => {
            const category = ingredient.category;
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push({
                code: code,
                ...ingredient
            });
        });
        
        res.json({
            success: true,
            ingredients: allIngredients,
            categorized: categorized,
            total: Object.keys(allIngredients).length,
            custom_count: Object.keys(customIngredients).length
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo ingredientes'
        });
    }
});

// MODIFICAR también el endpoint /api/analyze-by-ingredients
// Añade esta línea al inicio de la función (después de las validaciones):
const allIngredients = { ...INGREDIENTS, ...customIngredients };

// Y reemplaza todas las referencias a INGREDIENTS[ingredientCode]
// por allIngredients[ingredientCode]

// ====== INICIAR SERVIDOR ======
app.listen(port, () => {
    console.log(`🚀 Servidor en puerto ${port}`);
    console.log(`📋 Sistema de Alérgenos v3.0.0 - Por Ingredientes`);
    console.log(`🥘 ${Object.keys(INGREDIENTS).length} ingredientes configurados`);
    console.log(`⚠️ ${Object.keys(ALLERGENS).length} alérgenos UE`);
    console.log('✅ Sistema listo');
});

module.exports = app;
