// server.js - Sistema COMPLETO con Control de Dispositivos
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const robotoBase64 = require('./fontData');

GlobalFonts.register(Buffer.from(robotoBase64, 'base64'), 'Roboto');

const app = express();
const port = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

// Sin secreto no se firma nada: este repo es público, así que un valor por
// defecto en el código permitiría a cualquiera fabricarse un token de admin
// válido. Si falta la variable, el panel se bloquea en vez de quedar abierto.
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_ENABLED = Boolean(JWT_SECRET);

if (!ADMIN_ENABLED) {
    console.error(
        'FALTA JWT_SECRET: el panel de administración queda deshabilitado. ' +
        'Configúrala en las variables de entorno para reactivarlo.'
    );
}

// Firma las URLs públicas de imagen. Usa el secreto de admin si existe y, si
// no, la clave de Supabase, que también es secreta y estable entre instancias.
const IMAGE_URL_SECRET = JWT_SECRET || process.env.SUPABASE_KEY || 'sin-secreto';

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

// ============= LÍMITE DE INTENTOS =============
// Vercel es serverless y no conserva estado entre peticiones, así que el
// contador vive en Supabase. Si la tabla no existe todavía la comprobación
// se salta (y lo avisa por consola) en vez de dejar a nadie fuera.

const RATE_LIMITS = {
    admin: { max: 10, windowMinutes: 15 },
    licencia: { max: 20, windowMinutes: 15 }
};

function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || 'desconocida';
}

async function tooManyAttempts(tipo, identificador) {
    const { max, windowMinutes } = RATE_LIMITS[tipo];
    const desde = new Date(Date.now() - windowMinutes * 60000).toISOString();

    const { count, error } = await supabase
        .from('intentos_login')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', tipo)
        .eq('identificador', identificador)
        .gte('created_at', desde);

    if (error) {
        console.error('Límite de intentos no aplicado (¿falta la tabla intentos_login?):', error.message);
        return false;
    }

    return (count || 0) >= max;
}

async function registrarIntentoFallido(tipo, identificador) {
    const { error } = await supabase
        .from('intentos_login')
        .insert([{ tipo, identificador }]);
    if (error) {
        console.error('No se pudo registrar el intento fallido:', error.message);
    }
}

async function limpiarIntentos(tipo, identificador) {
    await supabase
        .from('intentos_login')
        .delete()
        .eq('tipo', tipo)
        .eq('identificador', identificador);
}

async function checkAdmin(req, res, next) {
    if (!ADMIN_ENABLED) {
        return res.status(503).json({
            success: false,
            error: 'Panel de administración no disponible: falta configurar JWT_SECRET'
        });
    }

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

// Pública a propósito: la descarga el servidor de Sertag, que no puede
// enviar cabeceras de licencia. Va firmada con HMAC para que no se pueda
// enumerar por MAC, y solo expone el plato ya visible en el buffet.
app.get('/api/public/screen-image/:mac/:token', async (req, res) => {
    try {
        const { mac, token } = req.params;

        if (token !== screenImageToken(mac)) {
            return res.status(403).send('Token inválido');
        }

        const { data: screen } = await supabase
            .from('esl_screens')
            .select('current_dish_id')
            .eq('mac', mac)
            .single();

        if (!screen || !screen.current_dish_id) {
            return res.status(404).send('Pantalla sin plato asignado');
        }

        const { data: dish } = await supabase
            .from('dishes')
            .select('*')
            .eq('id', screen.current_dish_id)
            .single();

        if (!dish) return res.status(404).send('Plato no encontrado');

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: screen.current_dish_id });

        const imageBuffer = generateScreenImage(dish, allergens || []);

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', imageBuffer.length);
        res.setHeader('Cache-Control', 'no-store');
        res.send(imageBuffer);
    } catch (error) {
        console.error('Error sirviendo imagen de pantalla:', error);
        res.status(500).send('Error generando la imagen');
    }
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
                deviceControl: 'enabled',
                // La app oculta el escáner de etiquetas si esto es false, para
                // no ofrecer un botón que sólo devolvería un error. En cuanto
                // se configure OPENAI_API_KEY aparece solo, sin tocar código.
                labelScanner: Boolean(process.env.OPENAI_API_KEY) ? 'enabled' : 'disabled'
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

        const ip = clientIp(req);

        if (await tooManyAttempts('licencia', ip)) {
            return res.status(429).json({
                success: false,
                error: 'Demasiados intentos de activación. Espera unos minutos e inténtalo de nuevo.'
            });
        }

        const { data: establishment, error } = await supabase
            .from('establishments')
            .select('*')
            .eq('license_key', licenseKey)
            .single();

        if (error || !establishment) {
            await registrarIntentoFallido('licencia', ip);
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

        await limpiarIntentos('licencia', ip);

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
        if (!ADMIN_ENABLED) {
            return res.status(503).json({
                success: false,
                error: 'Panel de administración no disponible: falta configurar JWT_SECRET'
            });
        }

        const ip = clientIp(req);

        if (await tooManyAttempts('admin', ip)) {
            return res.status(429).json({
                success: false,
                error: 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.'
            });
        }

        const { username, password } = req.body;

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !admin) {
            await registrarIntentoFallido('admin', ip);
            return res.json({
                success: false,
                error: 'Credenciales incorrectas'
            });
        }

        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            await registrarIntentoFallido('admin', ip);
            return res.json({
                success: false,
                error: 'Credenciales incorrectas'
            });
        }

        await limpiarIntentos('admin', ip);

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

// ============= FUNCIONES PANTALLAS SERTAG =============

const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 300;
const SCREEN_MARGIN = 16;
const SCREEN_BOTTOM_LIMIT = SCREEN_HEIGHT - 12;

// Parte el texto en líneas que quepan en maxWidth con la fuente ya fijada.
function splitIntoLines(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(test).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

// Busca la fuente más grande con la que el texto cabe en maxLines.
function fitText(ctx, text, maxWidth, maxLines, maxSize, minSize) {
    for (let size = maxSize; size >= minSize; size -= 1) {
        ctx.font = `bold ${size}px Roboto`;
        const lines = splitIntoLines(ctx, text, maxWidth);
        if (lines.length <= maxLines) return { size, lines };
    }
    ctx.font = `bold ${minSize}px Roboto`;
    const lines = splitIntoLines(ctx, text, maxWidth).slice(0, maxLines);
    const last = lines.length - 1;
    while (lines[last] && ctx.measureText(lines[last] + '…').width > maxWidth) {
        lines[last] = lines[last].slice(0, -1).trimEnd();
    }
    if (lines[last]) lines[last] += '…';
    return { size: minSize, lines };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// El tamaño de letra se calcula a partir del contenido para aprovechar toda
// la pantalla: en un buffet la etiqueta se lee de lejos, así que un plato con
// pocos alérgenos debe salir en grande y no apelotonado arriba.
function generateScreenImage(dish, allergens) {
    const canvas = createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.textAlign = 'left';
    ctx.textRendering = 'geometricPrecision';
    ctx.fontKerning = 'normal';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const contentWidth = SCREEN_WIDTH - SCREEN_MARGIN * 2;
    const codes = (allergens || []).filter(c => ALLERGENS[c]);
    const traces = (dish.traces || []).filter(c => ALLERGENS[c]);

    // --- Título ---
    const title = fitText(ctx, dish.name, contentWidth, 2, 34, 17);
    const titleLineHeight = Math.round(title.size * 1.18);
    let y = SCREEN_MARGIN + title.size;

    ctx.fillStyle = '#000000';
    for (const line of title.lines) {
        ctx.fillText(line, SCREEN_MARGIN, y);
        y += titleLineHeight;
    }

    y = y - titleLineHeight + title.size * 0.45;
    ctx.fillRect(SCREEN_MARGIN, y, contentWidth, 3);
    y += 3;

    // --- Reserva para las trazas, que van ancladas abajo ---
    let tracesBlock = null;
    if (traces.length > 0) {
        const text = 'Trazas: ' + traces.map(c => ALLERGENS[c].name).join(', ');
        const fitted = fitText(ctx, text, contentWidth, 2, 16, 12);
        const lineHeight = Math.round(fitted.size * 1.25);
        tracesBlock = { ...fitted, lineHeight, height: fitted.lines.length * lineHeight + 8 };
    }

    const bottomLimit = SCREEN_HEIGHT - SCREEN_MARGIN - (tracesBlock ? tracesBlock.height : 0);

    // --- Alérgenos ---
    if (codes.length > 0) {
        const headerSize = clamp(Math.round((bottomLimit - y) * 0.12), 15, 22);
        ctx.font = `bold ${headerSize}px Roboto`;
        ctx.fillStyle = '#FF0000';
        y += headerSize + 10;
        ctx.fillText('CONTIENE', SCREEN_MARGIN, y);
        y += 10;

        const cols = codes.length > 7 ? 2 : 1;
        const rows = Math.ceil(codes.length / cols);
        const available = bottomLimit - y;
        const rowHeight = clamp(available / rows, 18, 56);
        const fontSize = clamp(Math.round(rowHeight * 0.56), 13, 32);
        const bullet = Math.round(fontSize * 0.78);
        const colWidth = contentWidth / cols;

        // Si sobra sitio (platos con pocos alérgenos) centramos el bloque en
        // vertical en vez de dejarlo pegado arriba con media pantalla vacía.
        const blockTop = y + Math.max(0, (available - rows * rowHeight) / 2);

        ctx.font = `bold ${fontSize}px Roboto`;

        codes.forEach((code, i) => {
            const col = Math.floor(i / rows);
            const row = i % rows;
            const x = SCREEN_MARGIN + col * colWidth;
            const rowY = blockTop + row * rowHeight + rowHeight / 2;

            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x, Math.round(rowY - bullet * 0.78), bullet, bullet);
            ctx.fillStyle = '#000000';
            ctx.fillText(ALLERGENS[code].name, x + bullet + 8, rowY);
        });
    } else {
        const fitted = fitText(ctx, 'SIN ALERGENOS', contentWidth, 1, 40, 20);
        ctx.font = `bold ${fitted.size}px Roboto`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.fillText('SIN ALERGENOS', SCREEN_MARGIN, y + (bottomLimit - y) / 2);
        ctx.textBaseline = 'alphabetic';
    }

    // --- Trazas ---
    if (tracesBlock) {
        ctx.font = `bold ${tracesBlock.size}px Roboto`;
        ctx.fillStyle = '#000000';
        let ty = SCREEN_HEIGHT - SCREEN_MARGIN - (tracesBlock.lines.length - 1) * tracesBlock.lineHeight;
        for (const line of tracesBlock.lines) {
            ctx.fillText(line, SCREEN_MARGIN, ty);
            ty += tracesBlock.lineHeight;
        }
    }

    // La pantalla solo tiene blanco, negro y rojo. Fijamos cada píxel a uno
    // de los tres antes de codificar: el antialiasing de las fuentes deja
    // grises que el dithering de Sertag convierte en ruido, y eso es lo que
    // hacía que el texto se viera "comido" en el dispositivo.
    quantizeToScreenPalette(ctx);

    // PNG y no JPEG: sin pérdidas, así los bordes del texto llegan limpios.
    // (Ambos formatos funcionan siempre que imgsrc lleve el prefijo data URI.)
    return canvas.toBuffer('image/png');
}

const SCREEN_PALETTE = [
    [255, 255, 255], // blanco
    [0, 0, 0],       // negro
    [255, 0, 0]      // rojo
];

function quantizeToScreenPalette(ctx) {
    const image = ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    const d = image.data;

    for (let i = 0; i < d.length; i += 4) {
        let best = 0;
        let bestDist = Infinity;
        for (let p = 0; p < SCREEN_PALETTE.length; p++) {
            const [pr, pg, pb] = SCREEN_PALETTE[p];
            const dist = (d[i] - pr) ** 2 + (d[i + 1] - pg) ** 2 + (d[i + 2] - pb) ** 2;
            if (dist < bestDist) {
                bestDist = dist;
                best = p;
            }
        }
        d[i] = SCREEN_PALETTE[best][0];
        d[i + 1] = SCREEN_PALETTE[best][1];
        d[i + 2] = SCREEN_PALETTE[best][2];
        d[i + 3] = 255;
    }

    ctx.putImageData(image, 0, 0);
}

// Envuelve texto respetando maxLines/maxY; trunca con "…" si no cabe.
// Devuelve la coordenada Y de la última línea dibujada.
function wrapText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    if (options.font) ctx.font = options.font;
    const maxLines = options.maxLines || Infinity;
    const maxY = options.maxY || Infinity;

    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(testLine).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    let curY = y;
    for (let i = 0; i < lines.length; i++) {
        const isLastAllowedLine = i === maxLines - 1 && lines.length > maxLines;
        const wouldExceedHeight = i < lines.length - 1 && curY + lineHeight > maxY;

        if (isLastAllowedLine || wouldExceedHeight) {
            let truncated = lines[i];
            while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
                truncated = truncated.slice(0, -1).trimEnd();
            }
            ctx.fillText(truncated + '…', x, curY);
            return curY;
        }

        if (i >= maxLines) break;

        ctx.fillText(lines[i], x, curY);
        if (i < lines.length - 1) curY += lineHeight;
    }

    return curY;
}

async function sertagLogin() {
    const res = await fetch(`${process.env.SERTAG_API_BASE}/user/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: process.env.SERTAG_USER,
            password: process.env.SERTAG_PASS
        })
    });
    const json = await res.json();
    return json.data?.token;
}

// imgsrc DEBE llevar el prefijo data URI. Comprobado contra el dispositivo
// real: con base64 "a pelo" (que es como lo documenta el manual) la API
// responde 20000 pero descarta la imagen sin más; con una URL de descarga la
// guarda en imageFile y nunca llega a bajarla. Solo con "data:image/...;base64,"
// la decodifica y genera el thumb en su servidor, que es el mismo estado que
// deja una subida manual desde el software oficial. Sirve tanto PNG como JPEG.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://buffet-allergen-system.vercel.app';

function screenImageToken(mac) {
    return crypto.createHmac('sha256', IMAGE_URL_SECRET).update(mac).digest('hex').slice(0, 16);
}

function screenImageUrl(mac) {
    return `${PUBLIC_BASE_URL}/api/public/screen-image/${encodeURIComponent(mac)}/${screenImageToken(mac)}?v=${Date.now()}`;
}

async function pushToScreen(mac, imageBuffer) {
    const token = await sertagLogin();
    if (!token) throw new Error('No se pudo autenticar con Sertag');

    const res = await fetch(
        `${process.env.SERTAG_API_BASE}/user/api/mqtt/publish/${mac}/display`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                algorithm: process.env.SERTAG_DITHER_ALGORITHM || 'floyd-steinberg',
                imgsrc: `data:image/png;base64,${imageBuffer.toString("base64")}`
            })
        }
    );
    return res.json();
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

const SPANISH_STOPWORDS = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'un', 'una',
    'unos', 'unas', 'al', 'a', 'para', 'por', 'sin', 'su', 'sus', 'plato'
]);

function tokenizeDishDescription(text) {
    return [...new Set(
        text
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length >= 3 && !SPANISH_STOPWORDS.has(word))
    )];
}

async function extractIngredientTermsWithAI(text) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'user',
                content: `Extrae los ingredientes de cocina mencionados en esta descripción de un plato, en español, sin cantidades ni artículos. Devuelve SOLO un array JSON de strings, nada más.\n\nDescripción: "${text}"`
            }],
            temperature: 0
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI respondió ${response.status}`);
    }

    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content || '[]';
    const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
    const terms = JSON.parse(cleaned);

    if (!Array.isArray(terms)) throw new Error('Respuesta de IA no es un array');
    return terms.map(t => sanitizeSearchTerm(t)).filter(Boolean);
}

// Los términos acaban interpolados en un filtro .or() de PostgREST, cuya
// sintaxis usa comas, paréntesis y puntos como separadores. Como el texto
// viene del usuario (y de lo que la IA decida devolver), se limita a letras,
// números y espacios antes de construir el filtro.
function sanitizeSearchTerm(term) {
    return String(term)
        .toLowerCase()
        .replace(/[^\p{L}\p{N} ]/gu, ' ')
        .trim()
        .slice(0, 40);
}

app.post('/api/suggest-ingredients', checkLicenseWithDevice, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, error: 'Falta la descripción del plato' });
        }

        let terms;
        let source;

        if (process.env.OPENAI_API_KEY) {
            try {
                terms = await extractIngredientTermsWithAI(text);
                source = 'ia';
            } catch (aiError) {
                console.error('IA no disponible, usando fallback por palabras clave:', aiError.message);
                terms = tokenizeDishDescription(text);
                source = 'keywords';
            }
        } else {
            terms = tokenizeDishDescription(text);
            source = 'keywords';
        }

        if (terms.length === 0) {
            return res.json({ success: true, source, suggestions: [] });
        }

        const orFilter = terms.map(term => `name.ilike.%${term}%`).join(',');

        const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .or(orFilter)
            .limit(50);

        if (error) throw error;

        const uniqueById = Object.values(
            (data || [])
                .filter(ing => ing.establishment_id === null || ing.establishment_id === req.establishment.id)
                .reduce((acc, ing) => {
                    acc[ing.id] = ing;
                    return acc;
                }, {})
        ).slice(0, 20);

        res.json({ success: true, source, suggestions: uniqueById });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const VALID_ALLERGEN_CODES = Object.keys(ALLERGENS);

async function extractIngredientFromLabelImage(imageDataUrl) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `Esta es una foto de la etiqueta de un producto alimentario. Extrae:
- "name": el nombre del producto (string)
- "allergens": alérgenos que CONTIENE (normalmente resaltados en negrita en la lista de ingredientes), usando SOLO estos códigos: ${VALID_ALLERGEN_CODES.join(', ')}
- "traces": alérgenos de la frase "puede contener trazas de..." si aparece, con los mismos códigos

Devuelve SOLO un objeto JSON con esas tres claves, nada más. Si no puedes leer la etiqueta con confianza, devuelve "name": "" y arrays vacíos.`
                    },
                    {
                        type: 'image_url',
                        image_url: { url: imageDataUrl }
                    }
                ]
            }],
            temperature: 0
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI respondió ${response.status}`);
    }

    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content || '{}';
    const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
        name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
        allergens: Array.isArray(parsed.allergens)
            ? parsed.allergens.filter(code => VALID_ALLERGEN_CODES.includes(code))
            : [],
        traces: Array.isArray(parsed.traces)
            ? parsed.traces.filter(code => VALID_ALLERGEN_CODES.includes(code))
            : []
    };
}

app.post('/api/scan-ingredient-label', checkLicenseWithDevice, async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.status(400).json({
                success: false,
                error: 'El escaneo de etiquetas requiere IA activada (falta configurar OPENAI_API_KEY)'
            });
        }

        const { image } = req.body;

        if (!image || !image.startsWith('data:image/')) {
            return res.status(400).json({ success: false, error: 'Falta la imagen de la etiqueta' });
        }

        const suggestion = await extractIngredientFromLabelImage(image);
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Error escaneando etiqueta:', error);
        res.status(500).json({ success: false, error: 'No se pudo leer la etiqueta, inténtalo de nuevo o rellena a mano' });
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

        // Snapshot para trazabilidad: no debe romper la generación de la
        // etiqueta si la tabla aún no existe o falla el insert.
        try {
            const { error: snapshotError } = await supabase.from('etiquetas_impresas').insert([{
                dish_id: dish.id,
                establishment_id: req.establishment.id,
                datos_etiqueta: {
                    dishName: dish.name,
                    translations,
                    allergens: allergens || [],
                    traces: dish.traces || [],
                    establishmentName: req.establishment.name,
                    generatedAt: new Date().toISOString()
                }
            }]);
            if (snapshotError) {
                console.error('No se pudo guardar snapshot de etiqueta:', snapshotError.message);
            }
        } catch (snapshotError) {
            console.error('No se pudo guardar snapshot de etiqueta:', snapshotError.message);
        }

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

// ============= ENDPOINTS PANTALLAS SERTAG =============

app.get('/api/screens', checkLicenseWithDevice, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('esl_screens')
            .select('*, dish:dishes(id, name)')
            .eq('establishment_id', req.establishment.id)
            .order('slot_number');

        if (error) throw error;

        res.json({ success: true, screens: data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/screens', checkLicenseWithDevice, async (req, res) => {
    try {
        const { mac, slotNumber } = req.body;

        if (!mac) {
            return res.status(400).json({ success: false, error: 'Falta la dirección MAC' });
        }

        const normalizedMac = mac.trim().toUpperCase();

        let slot = slotNumber;
        if (!slot) {
            const { count } = await supabase
                .from('esl_screens')
                .select('*', { count: 'exact', head: true })
                .eq('establishment_id', req.establishment.id);
            slot = (count || 0) + 1;
        }

        const { data, error } = await supabase
            .from('esl_screens')
            .upsert([{
                mac: normalizedMac,
                establishment_id: req.establishment.id,
                slot_number: slot
            }], { onConflict: 'mac' })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, screen: data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DEBUG: Consultar estado real del dispositivo en Sertag
app.get('/api/screens/:mac/status', checkLicenseWithDevice, async (req, res) => {
    try {
        const token = await sertagLogin();
        const response = await fetch(
            `${process.env.SERTAG_API_BASE}/user/api/rest/devices/mac/${req.params.mac}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        res.json({ success: true, deviceInfo: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DEBUG: Ver la imagen generada directamente, sin pasar por Sertag
app.get('/api/screens/:mac/preview', checkLicenseWithDevice, async (req, res) => {
    try {
        const { data: dish } = await supabase
            .from('dishes')
            .select('*')
            .eq('id', req.query.dishId)
            .single();

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: req.query.dishId });

        const imageBuffer = generateScreenImage(dish, allergens || []);
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(imageBuffer);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/screens/:mac/assign', checkLicenseWithDevice, async (req, res) => {
    try {
        const { mac } = req.params;
        const { dishId } = req.body;

        const { data: screen, error: screenError } = await supabase
            .from('esl_screens')
            .update({ current_dish_id: dishId, updated_at: new Date().toISOString() })
            .eq('mac', mac)
            .eq('establishment_id', req.establishment.id)
            .select()
            .single();

        if (screenError) throw screenError;

        const { data: dish, error: dishError } = await supabase
            .from('dishes')
            .select('*')
            .eq('id', dishId)
            .single();

        if (dishError) throw dishError;

        const { data: allergens } = await supabase
            .rpc('get_dish_allergens', { dish_id_param: dishId });

        const imageBuffer = generateScreenImage(dish, allergens || []);
        const pushResult = await pushToScreen(mac, imageBuffer);

        res.json({ success: true, screen, pushResult });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/screens/refresh-all', checkLicenseWithDevice, async (req, res) => {
    try {
        const { data: screens, error } = await supabase
            .from('esl_screens')
            .select('*, dish:dishes(*)')
            .eq('establishment_id', req.establishment.id)
            .not('current_dish_id', 'is', null);

        if (error) throw error;

        const results = [];
        for (const screen of screens) {
            const { data: allergens } = await supabase
                .rpc('get_dish_allergens', { dish_id_param: screen.current_dish_id });

            const imageBuffer = generateScreenImage(screen.dish, allergens || []);
            const pushResult = await pushToScreen(screen.mac, imageBuffer);
            results.push({ mac: screen.mac, pushResult });

            await new Promise(r => setTimeout(r, 300));
        }

        res.json({ success: true, results });
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
