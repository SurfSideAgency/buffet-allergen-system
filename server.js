// server.js - Sistema COMPLETO con Control de Dispositivos
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ALLERGENS = {
    'gluten': { name: 'Cereales con Gluten', icon: '🌾' },
    'crustaceos': { name: 'Crustáceos', icon: '🦐' },
    'huevos': { name: 'Huevos', icon: '🥚' },
    'pescado': { name: 'Pescado', icon: '🐟' },
    'cacahuetes': { name: 'Cacahuetes', icon: '🥜' },
    'soja': { name: 'Soja', icon: '🌱' },
    'lacteos': { name: 'Lácteos', icon: '🥛' },
    'frutos_secos': { name: 'Frutos Secos', icon: '🌰' },
    'apio': { name: 'Apio', icon: '🥬' },
    'mostaza': { name: 'Mostaza', icon: '🟡' },
    'sesamo': { name: 'Sésamo', icon: '🫘' },
    'sulfitos': { name: 'Sulfitos', icon: '🍷' },
    'altramuces': { name: 'Altramuces', icon: '🫘' },
    'moluscos': { name: 'Moluscos', icon: '🐚' }
};

// ============= MIDDLEWARE CON CONTROL DE DISPOSITIVOS =============

async function checkLicenseWithDevice(req, res, next) {
    const licenseKey = req.headers['x-license-key'];
    const deviceFingerprint = req.headers['x-device-fingerprint'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    if (!licenseKey) {
        return res.status(401).json({ 
            success: false, 
            error: 'No se proporcionó código de licencia',
            requiresActivation: true
        });
    }

    if (!deviceFingerprint) {
        return res.status(401).json({ 
            success: false, 
            error: 'Dispositivo no identificado',
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

        if (establishment.status !== 'active') {
            return res.status(403).json({ 
                success: false, 
                error: 'Licencia suspendida',
                licenseStatus: 'suspended'
            });
        }

        const now = new Date();
        const expiresAt = new Date(establishment.expires_at);

        if (expiresAt < now) {
            return res.status(403).json({ 
                success: false, 
                error: 'Licencia expirada',
                licenseStatus: 'expired'
            });
        }

        const { data: canActivate, error: deviceError } = await supabase
            .rpc('can_activate_device', {
                p_establishment_id: establishment.id,
                p_device_fingerprint: deviceFingerprint,
                p_ip_address: ipAddress,
                p_user_agent: userAgent
            });

        if (deviceError) {
            console.error('Error checking device:', deviceError);
            return res.status(500).json({ 
                success: false, 
                error: 'Error verificando dispositivo' 
            });
        }

        if (!canActivate) {
            const { data: activeDevices } = await supabase
                .rpc('get_active_devices', {
                    p_establishment_id: establishment.id
                });

            return res.status(403).json({ 
                success: false, 
                error: 'Límite de dispositivos alcanzado',
                maxDevices: establishment.max_devices || 3,
                activeDevices: activeDevices?.length || 0,
                devices: activeDevices,
                code: 'MAX_DEVICES_REACHED'
            });
        }

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

// ============= RUTAS PÚBLICAS =============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/activation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'activation.html'));
});

app.get('/api/system-status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('establishments')
            .select('id')
            .limit(1);

        res.json({
            success: true,
            status: 'online',
            database: error ? 'disconnected' : 'connected',
            version: '10.0.0',
            features: {
                translation: 'enabled',
                traces: 'enabled',
                licenses: 'enabled',
                deviceControl: 'enabled'
            }
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

// ============= ENDPOINTS DE LICENCIAS =============

app.post('/api/license/verify-with-device', async (req, res) => {
    try {
        const { licenseKey, deviceFingerprint } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];

        if (!licenseKey || !deviceFingerprint) {
            return res.json({ 
                success: false, 
                error: 'Faltan datos requeridos' 
            });
        }

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

        if (establishment.status === 'suspended') {
            return res.json({ 
                success: false, 
                error: 'Esta licencia está suspendida' 
            });
        }

        const now = new Date();
        const expiresAt = new Date(establishment.expires_at);
        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        if (expiresAt < now) {
            return res.json({ 
                success: false, 
                error: 'Esta licencia ha expirado' 
            });
        }

        const { data: canActivate } = await supabase
            .rpc('can_activate_device', {
                p_establishment_id: establishment.id,
                p_device_fingerprint: deviceFingerprint,
                p_ip_address: ipAddress,
                p_user_agent: userAgent
            });

        if (!canActivate) {
            const { data: activeDevices } = await supabase
                .rpc('get_active_devices', {
                    p_establishment_id: establishment.id
                });

            return res.json({ 
                success: false, 
                error: `Límite de ${establishment.max_devices || 3} dispositivos alcanzado`,
                code: 'MAX_DEVICES_REACHED',
                maxDevices: establishment.max_devices || 3,
                activeDevices: activeDevices?.length || 0
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
                status: establishment.status,
                maxDevices: establishment.max_devices || 3
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= ENDPOINTS DE ADMIN =============

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

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!validPassword) {
            return res.json({ 
                success: false, 
                error: 'Credenciales incorrectas' 
            });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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

app.get('/api/admin/establishments', checkAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('establishments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const establishments = await Promise.all(data.map(async est => {
            const now = new Date();
            const expiresAt = new Date(est.expires_at);
            const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            
            const { data: devices } = await supabase
                .rpc('get_active_devices', {
                    p_establishment_id: est.id
                });
            
            return {
                ...est,
                daysRemaining,
                isExpired: daysRemaining < 0,
                activeDevices: devices?.length || 0
            };
        }));

        res.json({
            success: true,
            establishments
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/establishments', checkAdmin, async (req, res) => {
    try {
        const { name, contact_email, contact_phone, address, durationMonths = 12, maxDevices = 3 } = req.body;

        const licenseKey = 'BUFF-' + Math.random().toString(36).substr(2, 4).toUpperCase() + 
                           '-' + Math.random().toString(36).substr(2, 4).toUpperCase() +
                           '-' + Math.random().toString(36).substr(2, 4).toUpperCase();

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
                status: 'active',
                max_devices: maxDevices
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

// NUEVO: Obtener dispositivos de un establecimiento
app.get('/api/admin/establishments/:id/devices', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .rpc('get_active_devices', {
                p_establishment_id: parseInt(id)
            });

        if (error) throw error;

        res.json({
            success: true,
            devices: data || []
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// NUEVO: Desactivar dispositivo
app.post('/api/admin/establishments/:id/devices/:fingerprint/deactivate', checkAdmin, async (req, res) => {
    try {
        const { id, fingerprint } = req.params;

        const { data, error } = await supabase
            .rpc('deactivate_device', {
                p_establishment_id: parseInt(id),
                p_device_fingerprint: decodeURIComponent(fingerprint)
            });

        if (error) throw error;

        res.json({
            success: true,
            message: 'Dispositivo desactivado'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// NUEVO: Actualizar límite de dispositivos
app.put('/api/admin/establishments/:id/max-devices', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { maxDevices } = req.body;

        const { data, error } = await supabase
            .from('establishments')
            .update({ max_devices: maxDevices })
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

// ============= FUNCIONES AUXILIARES =============

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

// ============= ENDPOINTS PROTEGIDOS CON CONTROL DE DISPOSITIVOS =============

app.get('/api/ingredients', checkLicenseWithDevice, async (req, res) => {
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

app.get('/api/ingredients/search', checkLicenseWithDevice, async (req, res) => {
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

app.post('/api/ingredients', checkLicenseWithDevice, async (req, res) => {
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

app.post('/api/dishes', checkLicenseWithDevice, async (req, res) => {
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

app.get('/api/dishes', checkLicenseWithDevice, async (req, res) => {
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

app.get('/api/dishes/search', checkLicenseWithDevice, async (req, res) => {
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
            .eq('establishment_id', req.establishment.id)
            .ilike('name', `%${q}%`)
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

app.get('/api/dishes/today', checkLicenseWithDevice, async (req, res) => {
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

app.post('/api/generate-label', checkLicenseWithDevice, async (req, res) => {
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

        const allergensHTML = allergens && allergens.length > 0 
            ? allergens.map(code => {
                const a = ALLERGENS[code];
                return a ? `<span class="allergen">${a.icon} ${a.name}</span>` : '';
              }).join('')
            : '<span class="no-allergens">✅ Sin Alérgenos</span>';

        const tracesHTML = dish.traces && dish.traces.length > 0
            ? `<div class="traces">
                <strong>Puede contener trazas de:</strong><br>
                ${dish.traces.map(code => {
                    const a = ALLERGENS[code];
                    return a ? `<span class="trace">${a.icon} ${a.name}</span>` : '';
                }).join('')}
               </div>`
            : '';

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
        .label { border: 3px solid #000; padding: 30px; background: white; }
        .dish-name { font-size: 32px; font-weight: bold; text-align: center; margin-bottom: 10px; }
        .translations { text-align: center; color: #666; font-size: 18px; margin-bottom: 30px; }
        .allergens-title { font-size: 20px; font-weight: bold; margin: 20px 0 10px; color: #d32f2f; }
        .allergen { display: inline-block; background: #ffebee; border: 2px solid #e57373; padding: 8px 12px; margin: 5px; border-radius: 8px; font-size: 16px; }
        .no-allergens { display: inline-block; background: #e8f5e9; border: 2px solid #81c784; padding: 10px 20px; border-radius: 8px; font-size: 18px; }
        .traces { margin-top: 20px; padding: 15px; background: #fff3e0; border: 2px solid #ffb74d; border-radius: 8px; }
        .trace { display: inline-block; background: #ffe082; padding: 5px 10px; margin: 3px; border-radius: 5px; font-size: 14px; }
        @media print { body { margin: 0; } .label { border: none; } }
    </style>
</head>
<body>
    <div class="label">
        <div class="dish-name">${dish.name}</div>
        <div class="translations">
            ${translations.english} | ${translations.french}
        </div>
        
        <div class="allergens-title">⚠️ Alérgenos:</div>
        <div>${allergensHTML}</div>
        
        ${tracesHTML}
        
        <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
            ${req.establishment.name} | ${new Date().toLocaleDateString('es-ES')}
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 15px 30px; font-size: 16px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 8px;">
            🖨️ Imprimir Etiqueta
        </button>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/generate-recipe-document', checkLicenseWithDevice, async (req, res) => {
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

        const ingredientsList = dish.dish_ingredients
            .map(di => `<li>${di.ingredient.name} ${di.quantity ? '(' + di.quantity + ')' : ''}</li>`)
            .join('');

        const allergensHTML = allergens && allergens.length > 0 
            ? allergens.map(code => {
                const a = ALLERGENS[code];
                return a ? `<li>${a.icon} ${a.name}</li>` : '';
              }).join('')
            : '<li>✅ Sin alérgenos</li>';

        const tracesHTML = dish.traces && dish.traces.length > 0
            ? `<h3>⚡ Trazas (Puede Contener)</h3>
               <ul>${dish.traces.map(code => {
                   const a = ALLERGENS[code];
                   return a ? `<li>${a.icon} ${a.name}</li>` : '';
               }).join('')}</ul>`
            : '';

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Receta - ${dish.name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .dish-name { font-size: 36px; font-weight: bold; margin-bottom: 10px; }
        .meta { color: #666; font-size: 14px; }
        .section { margin: 30px 0; }
        .section h3 { background: #f5f5f5; padding: 10px; border-left: 5px solid #2196F3; font-size: 20px; }
        ul { padding-left: 25px; }
        li { margin: 8px 0; }
        .allergens { background: #ffebee; padding: 15px; border-left: 5px solid #f44336; }
        .traces { background: #fff3e0; padding: 15px; border-left: 5px solid #ff9800; margin-top: 20px; }
        .elaboration { white-space: pre-line; background: #f9f9f9; padding: 15px; border-radius: 8px; }
        .footer { margin-top: 50px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="dish-name">${dish.name}</div>
        <div class="meta">
            <strong>Chef:</strong> ${dish.chef} | 
            <strong>Fecha:</strong> ${new Date(dish.created_at).toLocaleDateString('es-ES')} | 
            <strong>ID:</strong> #${dish.id}
        </div>
    </div>

    <div class="section">
        <h3>🥘 Ingredientes</h3>
        <ul>${ingredientsList}</ul>
    </div>

    ${dish.elaboration ? `
    <div class="section">
        <h3>👨‍🍳 Proceso de Elaboración</h3>
        <div class="elaboration">${dish.elaboration}</div>
    </div>
    ` : ''}

    <div class="section allergens">
        <h3>⚠️ Alérgenos Detectados</h3>
        <ul>${allergensHTML}</ul>
    </div>

    ${dish.traces && dish.traces.length > 0 ? `
    <div class="traces">
        ${tracesHTML}
    </div>
    ` : ''}

    <div class="footer">
        <strong>${req.establishment.name}</strong><br>
        Documento oficial de control sanitario | Conforme al Reglamento UE 1169/2011
    </div>

    <div style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 15px 30px; font-size: 16px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 8px;">
            🖨️ Imprimir Receta
        </button>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============= INICIAR SERVIDOR =============

app.listen(port, () => {
    console.log(`\n🚀 ════════════════════════════════════════════════════`);
    console.log(`   Sistema de Alérgenos v10.0.0 - CON CONTROL DE DISPOSITIVOS`);
    console.log(`🚀 ════════════════════════════════════════════════════\n`);
    console.log(`📡 Servidor: http://localhost:${port}`);
    console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? '✅ Conectado' : '❌ NO CONFIGURADO'}`);
    console.log(`🌐 Traducción: ✅ MyMemory API`);
    console.log(`⚡ Trazas: ✅ Habilitadas`);
    console.log(`🔐 Licencias: ✅ Sistema Activo`);
    console.log(`📱 Control Dispositivos: ✅ Activo`);
    console.log(`\n📄 Páginas disponibles:`);
    console.log(`   - Principal: http://localhost:${port}/`);
    console.log(`   - Admin: http://localhost:${port}/admin`);
    console.log(`   - Activación: http://localhost:${port}/activation\n`);
});

module.exports = app;
