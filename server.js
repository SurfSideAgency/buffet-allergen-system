// server.js - Sistema de Alérgenos CON TRADUCCIÓN MULTIIDIOMA
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = process.env.PORT || 3000;

// Configurar Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

// Configurar Claude API para traducciones
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Alérgenos UE
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

// ============= FUNCIÓN DE TRADUCCIÓN =============

async function translateDishName(dishName) {
    try {
        const message = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 200,
            messages: [{
                role: "user",
                content: `Traduce este nombre de plato culinario a inglés y francés. Responde SOLO en formato JSON sin explicaciones adicionales:

Plato: "${dishName}"

Formato de respuesta:
{
  "english": "traducción en inglés",
  "french": "traducción en francés"
}

Importante: Usa términos culinarios apropiados y naturales para cada idioma.`
            }]
        });

        const responseText = message.content[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const translations = JSON.parse(jsonMatch[0]);
            return {
                english: translations.english || dishName,
                french: translations.french || dishName
            };
        }

        // Fallback si no hay traducción
        return {
            english: dishName,
            french: dishName
        };

    } catch (error) {
        console.error('Error en traducción:', error);
        // Fallback en caso de error
        return {
            english: dishName,
            french: dishName
        };
    }
}

// ============= ENDPOINTS INGREDIENTES =============

app.get('/api/ingredients', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .order('name');

        if (error) throw error;

        res.json({
            success: true,
            ingredients: data
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/ingredients/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .ilike('name', `%${q}%`)
            .order('name')
            .limit(20);

        if (error) throw error;

        res.json({
            success: true,
            ingredients: data
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/ingredients', async (req, res) => {
    try {
        const { name, category, allergens, traces } = req.body;

        const { data, error } = await supabase
            .from('ingredients')
            .insert([{ name, category, allergens, traces }])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            ingredient: data
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= ENDPOINTS PLATOS =============

app.post('/api/dishes', async (req, res) => {
    try {
        const { name, description, elaboration, chef, ingredients } = req.body;

        // 1. Crear el plato
        const { data: dish, error: dishError } = await supabase
            .from('dishes')
            .insert([{ name, description, elaboration, chef }])
            .select()
            .single();

        if (dishError) throw dishError;

        // 2. Añadir ingredientes al plato
        if (ingredients && ingredients.length > 0) {
            const dishIngredients = ingredients.map(ing => ({
                dish_id: dish.id,
                ingredient_id: ing.id,
                quantity: ing.quantity || ''
            }));

            const { error: ingredientsError } = await supabase
                .from('dish_ingredients')
                .insert(dishIngredients);

            if (ingredientsError) throw ingredientsError;
        }

        // 3. Obtener alérgenos del plato
        const { data: allergensData } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: dish.id });

        const allergens = allergensData || [];

        res.json({
            success: true,
            dish: {
                ...dish,
                allergens: allergens,
                ingredients: ingredients
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dishes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('dishes')
            .select(`
                *,
                dish_ingredients (
                    quantity,
                    ingredient:ingredients (*)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const dishesWithAllergens = await Promise.all(
            data.map(async (dish) => {
                const { data: allergens } = await supabase
                    .rpc('get_dish_allergens', { dish_id_param: dish.id });

                return {
                    ...dish,
                    allergens: allergens || []
                };
            })
        );

        res.json({
            success: true,
            dishes: dishesWithAllergens
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dishes/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        const { data, error } = await supabase
            .from('dishes')
            .select(`
                *,
                dish_ingredients (
                    quantity,
                    ingredient:ingredients (*)
                )
            `)
            .ilike('name', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const dishesWithAllergens = await Promise.all(
            data.map(async (dish) => {
                const { data: allergens } = await supabase
                    .rpc('get_dish_allergens', { dish_id_param: dish.id });
                return { ...dish, allergens: allergens || [] };
            })
        );

        res.json({
            success: true,
            dishes: dishesWithAllergens
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dishes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dishes')
            .select(`
                *,
                dish_ingredients (
                    quantity,
                    ingredient:ingredients (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: parseInt(id) });

        res.json({
            success: true,
            dish: {
                ...data,
                allergens: allergens || []
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dishes/today', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('dishes')
            .select(`
                *,
                dish_ingredients (
                    quantity,
                    ingredient:ingredients (*)
                )
            `)
            .eq('date', today)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const dishesWithAllergens = await Promise.all(
            data.map(async (dish) => {
                const { data: allergens } = await supabase
                    .rpc('get_dish_allergens', { dish_id_param: dish.id });
                return { ...dish, allergens: allergens || [] };
            })
        );

        res.json({
            success: true,
            dishes: dishesWithAllergens,
            count: dishesWithAllergens.length
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= GENERAR DOCUMENTOS CON TRADUCCIÓN =============

app.post('/api/generate-label', async (req, res) => {
    try {
        const { dishId } = req.body;

        const { data: dish, error } = await supabase
            .from('dishes')
            .select(`
                *,
                dish_ingredients (
                    quantity,
                    ingredient:ingredients (*)
                )
            `)
            .eq('id', dishId)
            .single();

        if (error) throw error;

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: dishId });

        // Traducir el nombre del plato
        const translations = await translateDishName(dish.name);

        const html = generateLabelHTML({
            ...dish,
            allergens: allergens || [],
            translations
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/generate-recipe-document', async (req, res) => {
    try {
        const { dishId } = req.body;

        const { data: dish, error } = await supabase
            .from('dishes')
            .select(`
                *,
                dish_ingredients (
                    quantity,
                    ingredient:ingredients (*)
                )
            `)
            .eq('id', dishId)
            .single();

        if (error) throw error;

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: dishId });

        const html = generateRecipeHTML({
            ...dish,
            allergens: allergens || []
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/system-status', async (req, res) => {
    try {
        const { count: dishCount } = await supabase
            .from('dishes')
            .select('*', { count: 'exact', head: true });

        const { count: ingredientCount } = await supabase
            .from('ingredients')
            .select('*', { count: 'exact', head: true });

        res.json({
            success: true,
            status: 'online',
            database: 'connected',
            translation: process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled',
            dishes_count: dishCount || 0,
            ingredients_count: ingredientCount || 0,
            allergens_count: Object.keys(ALLERGENS).length,
            timestamp: new Date().toISOString(),
            version: '7.0.0'
        });
    } catch (error) {
        res.json({
            success: false,
            status: 'error',
            database: 'disconnected',
            error: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= FUNCIONES AUXILIARES =============

function generateLabelHTML(dish) {
    const hasAllergens = dish.allergens && dish.allergens.length > 0;
    const date = dish.date ? new Date(dish.date).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 0;
        }
        .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
        }
        .header { 
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); 
            color: white; 
            padding: 25px; 
            text-align: center; 
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 1.4rem;
        }
        .content { 
            padding: 25px; 
        }
        .dish-names {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 5px solid #D4AF37;
        }
        .dish-name-primary { 
            font-size: 1.8rem; 
            font-weight: bold; 
            color: #2c3e50;
            margin-bottom: 15px;
            text-align: center;
        }
        .translations {
            display: grid;
            gap: 10px;
            margin-top: 15px;
        }
        .translation-item {
            background: white;
            padding: 10px 15px;
            border-radius: 8px;
            border: 2px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .flag {
            font-size: 1.5rem;
        }
        .translation-text {
            flex: 1;
        }
        .translation-label {
            font-size: 0.75rem;
            color: #6c757d;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        .translation-name {
            font-size: 1.1rem;
            color: #2c3e50;
            font-weight: 600;
        }
        .meta-info {
            font-size: 0.9rem;
            color: #6c757d;
            padding: 15px 0;
            border-bottom: 2px solid #e9ecef;
            margin-bottom: 20px;
        }
        .allergen { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            padding: 12px; 
            background: #fee2e2; 
            border-radius: 8px; 
            margin: 8px 0;
            border-left: 4px solid #dc3545;
        }
        .allergen-icon {
            font-size: 1.8rem;
        }
        .allergen-info {
            flex: 1;
        }
        .allergen-name {
            font-weight: bold;
            color: #991b1b;
            font-size: 1.05rem;
        }
        .allergen-desc {
            font-size: 0.85rem;
            color: #7f1d1d;
            margin-top: 2px;
        }
        .safe { 
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            padding: 25px; 
            border-radius: 10px; 
            text-align: center; 
            color: #155724;
            border: 3px solid #28a745;
        }
        .safe h3 {
            margin: 0 0 10px 0;
            font-size: 1.5rem;
        }
        h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.2rem;
        }
        @media print { 
            body { 
                background: white; 
                padding: 0; 
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ ETIQUETA DE ALÉRGENOS</h1>
            <div style="font-size: 0.9rem; opacity: 0.95;">Buffet Internacional</div>
        </div>
        <div class="content">
            <div class="dish-names">
                <div class="dish-name-primary">🇪🇸 ${dish.name}</div>
                
                <div class="translations">
                    <div class="translation-item">
                        <span class="flag">🇬🇧</span>
                        <div class="translation-text">
                            <div class="translation-label">English</div>
                            <div class="translation-name">${dish.translations?.english || dish.name}</div>
                        </div>
                    </div>
                    
                    <div class="translation-item">
                        <span class="flag">🇫🇷</span>
                        <div class="translation-text">
                            <div class="translation-label">Français</div>
                            <div class="translation-name">${dish.translations?.french || dish.name}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="meta-info">
                <strong>👨‍🍳 Chef:</strong> ${dish.chef} | 
                <strong>📅 Fecha:</strong> ${date}
            </div>
            
            ${hasAllergens ? `
                <h3>⚠️ CONTIENE ALÉRGENOS:</h3>
                ${dish.allergens.map(code => {
                    const a = ALLERGENS[code];
                    return a ? `
                        <div class="allergen">
                            <span class="allergen-icon">${a.icon}</span>
                            <div class="allergen-info">
                                <div class="allergen-name">${a.name}</div>
                                <div class="allergen-desc">${a.description}</div>
                            </div>
                        </div>
                    ` : '';
                }).join('')}
            ` : `
                <div class="safe">
                    <h3>✅ SIN ALÉRGENOS</h3>
                    <p style="margin: 0;">Este plato no contiene ninguno de los 14 alérgenos principales</p>
                </div>
            `}
        </div>
    </div>
</body>
</html>`;
}

function generateRecipeHTML(dish) {
    const date = dish.date ? new Date(dish.date).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES');
    
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
        <p><strong>Fecha:</strong> ${date} | <strong>Código:</strong> #${String(dish.id).padStart(5, '0')}</p>
    </div>
    
    <div class="section">
        <h3>🍽️ PLATO</h3>
        <h2>${dish.name}</h2>
        <p><strong>Chef Responsable:</strong> ${dish.chef}</p>
    </div>
    
    <div class="section">
        <h3>📝 INGREDIENTES</h3>
        ${dish.dish_ingredients ? `
            <ul>
                ${dish.dish_ingredients.map(di => 
                    `<li>${di.ingredient.name}${di.quantity ? ` (${di.quantity})` : ''}</li>`
                ).join('')}
            </ul>
        ` : `<p>${dish.description || 'No especificado'}</p>`}
    </div>
    
    ${dish.elaboration ? `
        <div class="section">
            <h3>👨‍🍳 ELABORACIÓN</h3>
            <p style="white-space: pre-wrap;">${dish.elaboration}</p>
        </div>
    ` : ''}
    
    <div class="section">
        <h3>⚠️ ALÉRGENOS (Reglamento UE 1169/2011)</h3>
        ${dish.allergens && dish.allergens.length > 0 ? `
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

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
    console.log('✅ Sistema de Alérgenos v7.0.0 - Con Traducción Multiidioma');
    console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Configurado' : '❌ NO CONFIGURADO'}`);
    console.log(`🌐 Traducción: ${process.env.ANTHROPIC_API_KEY ? '✅ Habilitada' : '❌ Deshabilitada'}`);
});

module.exports = app;
