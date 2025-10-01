// server.js - Sistema de Alérgenos CON BASE DE DATOS
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Configurar Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

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

// ============= ENDPOINTS INGREDIENTES =============

// Obtener todos los ingredientes
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

// Buscar ingredientes
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

// Añadir ingrediente nuevo
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

// Crear plato con ingredientes
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

// Obtener platos guardados
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

        // Obtener alérgenos para cada plato
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

// Buscar platos
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

// Obtener plato por ID
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

// Platos de hoy
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

// ============= GENERAR DOCUMENTOS =============

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

        const html = generateLabelHTML({
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

// Estado del sistema
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
            dishes_count: dishCount || 0,
            ingredients_count: ingredientCount || 0,
            allergens_count: Object.keys(ALLERGENS).length,
            timestamp: new Date().toISOString(),
            version: '6.0.0'
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

// Página principal
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
            <p><strong>Chef:</strong> ${dish.chef} | <strong>Fecha:</strong> ${date}</p>
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

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
    console.log('✅ Sistema de Alérgenos v6.0.0 CON BASE DE DATOS');
    console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Configurado' : '❌ NO CONFIGURADO'}`);
});

module.exports = app;
