// server.js - Sistema con Licencias por Establecimiento
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Configurar Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

// Secret para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// ============= MIDDLEWARE DE AUTENTICACIÓN =============

// Middleware para verificar licencia activa
async function checkLicense(req, res, next) {
    const licenseKey = req.headers['x-license-key'];
    
    if (!licenseKey) {
        return res.status(401).json({ 
            success: false, 
            error: 'No se proporcionó código de licencia',
            requiresActivation: true
        });
    }

    try {
        const { data: establishment, error } = await supabase
            .from('establishments')
            .select('*')
            .eq('license_key', licenseKey)
            .single();

        if (error || !establishment) {
            return res.status(401).json({ 
                success: false, 
                error: 'Código de licencia inválido',
                requiresActivation: true
            });
        }

        // Verificar estado y expiración
        if (establishment.status !== 'active') {
            return res.status(403).json({ 
                success: false, 
                error: 'Licencia suspendida. Contacte con soporte.',
                licenseStatus: 'suspended'
            });
        }

        const now = new Date();
        const expiresAt = new Date(establishment.expires_at);

        if (expiresAt < now) {
            return res.status(403).json({ 
                success: false, 
                error: 'Licencia expirada. Renueve su suscripción.',
                licenseStatus: 'expired'
            });
        }

        // Agregar info del establecimiento a la request
        req.establishment = establishment;
        next();

    } catch (error) {
        console.error('Error verificando licencia:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error al verificar licencia' 
        });
    }
}

// Middleware para verificar admin
async function checkAdmin(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'No autorizado' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token inválido' 
        });
    }
}

// ============= ENDPOINTS DE LICENCIAS =============

// Verificar y activar licencia
app.post('/api/license/verify', async (req, res) => {
    try {
        const { licenseKey } = req.body;

        const { data: establishment, error } = await supabase
            .from('establishments')
            .select('*')
            .eq('license_key', licenseKey)
            .single();

        if (error || !establishment) {
            return res.json({ 
                success: false, 
                error: 'Código de licencia no válido' 
            });
        }

        // Verificar estado
        if (establishment.status === 'suspended') {
            return res.json({ 
                success: false, 
                error: 'Esta licencia está suspendida. Contacte con soporte.' 
            });
        }

        const now = new Date();
        const expiresAt = new Date(establishment.expires_at);
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (expiresAt < now) {
            return res.json({ 
                success: false, 
                error: 'Esta licencia ha expirado. Renueve su suscripción.' 
            });
        }

        res.json({
            success: true,
            establishment: {
                id: establishment.id,
                name: establishment.name,
                licenseKey: establishment.license_key,
                expiresAt: establishment.expires_at,
                daysRemaining,
                status: establishment.status
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obtener info de licencia actual
app.get('/api/license/info', checkLicense, async (req, res) => {
    try {
        const establishment = req.establishment;
        const now = new Date();
        const expiresAt = new Date(establishment.expires_at);
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            establishment: {
                id: establishment.id,
                name: establishment.name,
                licenseKey: establishment.license_key,
                expiresAt: establishment.expires_at,
                daysRemaining,
                status: establishment.status,
                showWarning: daysRemaining <= 7
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= ENDPOINTS DE ADMIN =============

// Login de admin
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !admin) {
            return res.json({ 
                success: false, 
                error: 'Credenciales incorrectas' 
            });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!validPassword) {
            return res.json({ 
                success: false, 
                error: 'Credenciales incorrectas' 
            });
        }

        // Generar token
        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Actualizar último login
        await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('id', admin.id);

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Listar todos los establecimientos (Admin)
app.get('/api/admin/establishments', checkAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('establishments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Calcular días restantes para cada uno
        const establishments = data.map(est => {
            const now = new Date();
            const expiresAt = new Date(est.expires_at);
            const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            
            return {
                ...est,
                daysRemaining,
                isExpired: daysRemaining < 0
            };
        });

        res.json({
            success: true,
            establishments
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear nuevo establecimiento (Admin)
app.post('/api/admin/establishments', checkAdmin, async (req, res) => {
    try {
        const { name, contact_email, contact_phone, address, durationMonths = 1 } = req.body;

        // Generar código de licencia
        const { data: keyData } = await supabase.rpc('generate_license_key');
        const licenseKey = keyData;

        // Calcular fecha de expiración
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + parseInt(durationMonths));

        const { data, error } = await supabase
            .from('establishments')
            .insert([{
                name,
                license_key: licenseKey,
                contact_email,
                contact_phone,
                address,
                expires_at: expiresAt.toISOString(),
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            establishment: data
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Actualizar establecimiento (Admin)
app.put('/api/admin/establishments/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('establishments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            establishment: data
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Extender licencia (Admin)
app.post('/api/admin/establishments/:id/extend', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { months } = req.body;

        const { data: establishment } = await supabase
            .from('establishments')
            .select('expires_at')
            .eq('id', id)
            .single();

        const currentExpiry = new Date(establishment.expires_at);
        const now = new Date();
        
        // Si ya expiró, extender desde hoy, sino desde la fecha actual de expiración
        const baseDate = currentExpiry > now ? currentExpiry : now;
        baseDate.setMonth(baseDate.getMonth() + parseInt(months));

        const { data, error } = await supabase
            .from('establishments')
            .update({ 
                expires_at: baseDate.toISOString(),
                status: 'active'
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            establishment: data
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= ENDPOINTS PROTEGIDOS CON LICENCIA =============

// Traducción
async function translateDishName(dishName) {
    try {
        const englishResponse = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(dishName)}&langpair=es|en`
        );
        const englishData = await englishResponse.json();
        const englishTranslation = englishData.responseData?.translatedText || dishName;

        const frenchResponse = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(dishName)}&langpair=es|fr`
        );
        const frenchData = await frenchResponse.json();
        const frenchTranslation = frenchData.responseData?.translatedText || dishName;

        return {
            english: englishTranslation,
            french: frenchTranslation
        };
    } catch (error) {
        return {
            english: dishName,
            french: dishName
        };
    }
}

async function getTraces(ingredients) {
    const allTraces = new Set();
    
    for (const ing of ingredients) {
        const { data } = await supabase
            .from('ingredients')
            .select('traces')
            .eq('id', ing.id)
            .single();
        
        if (data && data.traces && Array.isArray(data.traces)) {
            data.traces.forEach(trace => allTraces.add(trace));
        }
    }
    
    return Array.from(allTraces);
}

// INGREDIENTES
app.get('/api/ingredients', checkLicense, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .or(`establishment_id.is.null,establishment_id.eq.${req.establishment.id}`)
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

app.get('/api/ingredients/search', checkLicense, async (req, res) => {
    try {
        const { q } = req.query;
        
        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .ilike('name', `%${q}%`)
            .or(`establishment_id.is.null,establishment_id.eq.${req.establishment.id}`)
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

app.post('/api/ingredients', checkLicense, async (req, res) => {
    try {
        const { name, category, allergens, traces } = req.body;

        const { data, error } = await supabase
            .from('ingredients')
            .insert([{ 
                name, 
                category, 
                allergens, 
                traces,
                establishment_id: req.establishment.id
            }])
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

// PLATOS
app.post('/api/dishes', checkLicense, async (req, res) => {
    try {
        const { name, description, elaboration, chef, ingredients, manualTraces } = req.body;

        const { data: dish, error: dishError } = await supabase
            .from('dishes')
            .insert([{ 
                name, 
                description, 
                elaboration, 
                chef,
                establishment_id: req.establishment.id
            }])
            .select()
            .single();

        if (dishError) throw dishError;

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

        const { data: allergensData } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: dish.id });

        const allergens = allergensData || [];
        const autoTraces = await getTraces(ingredients || []);
        const traces = manualTraces && manualTraces.length > 0 ? manualTraces : autoTraces;
        const filteredTraces = traces.filter(trace => !allergens.includes(trace));

        if (filteredTraces.length > 0) {
            await supabase
                .from('dishes')
                .update({ traces: filteredTraces })
                .eq('id', dish.id);
        }

        res.json({
            success: true,
            dish: {
                ...dish,
                allergens: allergens,
                traces: filteredTraces,
                ingredients: ingredients
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dishes', checkLicense, async (req, res) => {
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
            .eq('establishment_id', req.establishment.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const dishesWithAllergens = await Promise.all(
            data.map(async (dish) => {
                const { data: allergens } = await supabase
                    .rpc('get_dish_allergens', { dish_id_param: dish.id });

                return {
                    ...dish,
                    allergens: allergens || [],
                    traces: dish.traces || []
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

app.get('/api/dishes/today', checkLicense, async (req, res) => {
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
            .eq('establishment_id', req.establishment.id)
            .gte('date', today)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const dishesWithAllergens = await Promise.all(
            data.map(async (dish) => {
                const { data: allergens } = await supabase
                    .rpc('get_dish_allergens', { dish_id_param: dish.id });
                return { 
                    ...dish, 
                    allergens: allergens || [],
                    traces: dish.traces || []
                };
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

// GENERAR DOCUMENTOS
app.post('/api/generate-label', checkLicense, async (req, res) => {
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
            .eq('establishment_id', req.establishment.id)
            .single();

        if (error) throw error;

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: dishId });

        const translations = await translateDishName(dish.name);

        const html = generateLabelHTML({
            ...dish,
            allergens: allergens || [],
            traces: dish.traces || [],
            translations,
            establishment: req.establishment
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sistema de estado
app.get('/api/system-status', async (req, res) => {
    try {
        res.json({
            success: true,
            status: 'online',
            version: '9.0.0 - License System',
            features: {
                translation: 'enabled',
                traces: 'enabled',
                licenses: 'enabled'
            }
        });
    } catch (error) {
        res.json({
            success: false,
            status: 'error',
            error: error.message
        });
    }
});

// Página principal - redirigir a activación si no hay licencia
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Funciones auxiliares (generación HTML)
function generateLabelHTML(dish) {
    // ... (código anterior de generación de etiquetas)
    return `<!DOCTYPE html><html>...</html>`;
}

// Iniciar servidor
app.listen(port, () => {
    console.log(`\n🚀 ════════════════════════════════════════════════════`);
    console.log(`   Sistema de Alérgenos v9.0.0 - LICENSES SYSTEM`);
    console.log(`🚀 ════════════════════════════════════════════════════\n`);
    console.log(`📡 Servidor: http://localhost:${port}`);
    console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? '✅ Conectado' : '❌ NO CONFIGURADO'}`);
    console.log(`🌐 Traducción: ✅ MyMemory API (GRATIS)`);
    console.log(`⚡ Trazas: ✅ Habilitadas`);
    console.log(`🔐 Licencias: ✅ Sistema Activo`);
    console.log(`👨‍💼 Admin Panel: /admin\n`);
});

module.exports = app;
