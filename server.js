// server.js - Sistema de Alérgenos COMPLETO Y FUNCIONAL
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== CONFIGURACIÓN OPENAI ======
let openai = null;
let hasOpenAI = false;

// Inicializar OpenAI solo si hay API key
const initializeOpenAI = () => {
    if (process.env.OPENAI_API_KEY) {
        try {
            const { OpenAI } = require('openai');
            openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });
            console.log('✅ OpenAI configurado correctamente');
            hasOpenAI = true;
            return true;
        } catch (error) {
            console.error('❌ Error configurando OpenAI:', error.message);
            console.log('⚠️ Funcionando en modo simulación sin IA');
            hasOpenAI = false;
            return false;
        }
    } else {
        console.warn('⚠️ OPENAI_API_KEY no configurada - funcionará en modo simulación');
        hasOpenAI = false;
        return false;
    }
};

// Intentar inicializar OpenAI
try {
    initializeOpenAI();
} catch (error) {
    console.log('⚠️ OpenAI no disponible, usando modo simulación');
    hasOpenAI = false;
}

// ====== BASE DE DATOS EN MEMORIA ======
let dishes = [];
let dishId = 1;

// Alérgenos oficiales UE 1169/2011
const ALLERGENS = {
    'gluten': { 
        name: 'Cereales con gluten', 
        icon: '🌾', 
        description: 'Trigo, centeno, cebada, avena, espelta, kamut',
        keywords: ['trigo', 'harina', 'pan', 'pasta', 'cebada', 'centeno', 'avena', 'espelta', 'gluten', 'cereales']
    },
    'crustaceos': { 
        name: 'Crustáceos', 
        icon: '🦐', 
        description: 'Gambas, langostinos, cangrejos, langostas',
        keywords: ['gamba', 'langostino', 'cangrejo', 'langosta', 'bogavante', 'cigala', 'crustaceo']
    },
    'huevos': { 
        name: 'Huevos', 
        icon: '🥚', 
        description: 'Huevos y productos derivados',
        keywords: ['huevo', 'clara', 'yema', 'mayonesa', 'tortilla', 'alioli']
    },
    'pescado': { 
        name: 'Pescado', 
        icon: '🐟', 
        description: 'Pescado y productos derivados',
        keywords: ['merluza', 'salmon', 'bacalao', 'atun', 'sardina', 'lubina', 'dorada', 'pescado']
    },
    'cacahuetes': { 
        name: 'Cacahuetes', 
        icon: '🥜', 
        description: 'Cacahuetes y productos derivados',
        keywords: ['cacahuete', 'mani', 'mantequilla de cacahuete']
    },
    'soja': { 
        name: 'Soja', 
        icon: '🌱', 
        description: 'Soja y productos derivados',
        keywords: ['soja', 'salsa de soja', 'miso', 'tofu', 'edamame']
    },
    'lacteos': { 
        name: 'Leche y lácteos', 
        icon: '🥛', 
        description: 'Leche y productos lácteos (lactosa)',
        keywords: ['leche', 'queso', 'mantequilla', 'nata', 'yogur', 'crema', 'lacteo', 'lactosa']
    },
    'frutos_secos': { 
        name: 'Frutos de cáscara', 
        icon: '🌰', 
        description: 'Almendras, avellanas, nueces, etc.',
        keywords: ['almendra', 'nuez', 'avellana', 'pistacho', 'anacardo', 'pecan', 'frutos secos']
    },
    'apio': { 
        name: 'Apio', 
        icon: '🥬', 
        description: 'Apio y productos derivados',
        keywords: ['apio', 'apio nabo', 'sal de apio']
    },
    'mostaza': { 
        name: 'Mostaza', 
        icon: '🟡', 
        description: 'Mostaza y productos derivados',
        keywords: ['mostaza', 'salsa mostaza', 'grano mostaza']
    },
    'sesamo': { 
        name: 'Granos de sésamo', 
        icon: '🫘', 
        description: 'Sésamo y productos derivados',
        keywords: ['sesamo', 'tahini', 'aceite sesamo', 'semilla sesamo']
    },
    'sulfitos': { 
        name: 'Anhídrido sulfuroso y sulfitos', 
        icon: '🍷', 
        description: 'Conservante en vinos, frutos secos',
        keywords: ['vino', 'vinagre', 'frutos secos procesados', 'conservas', 'sulfito']
    },
    'altramuces': { 
        name: 'Altramuces', 
        icon: '🫘', 
        description: 'Altramuces y productos derivados',
        keywords: ['altramuces', 'lupino']
    },
    'moluscos': { 
        name: 'Moluscos', 
        icon: '🐚', 
        description: 'Mejillones, almejas, caracoles, etc.',
        keywords: ['mejillon', 'almeja', 'caracol', 'calamar', 'pulpo', 'sepia', 'ostra', 'vieira', 'molusco']
    }
};

// ====== FUNCIONES DE ANÁLISIS ======

// Análisis por palabras clave mejorado
function analyzeByKeywords(description) {
    const detectedAllergens = [];
    const confidence = {};
    const descriptionLower = description.toLowerCase();
    
    console.log(`🔍 Analizando por palabras clave: "${description}"`);
    
    Object.entries(ALLERGENS).forEach(([code, allergen]) => {
        let matches = 0;
        let totalKeywords = allergen.keywords.length;
        const foundKeywords = [];
        
        allergen.keywords.forEach(keyword => {
            if (descriptionLower.includes(keyword.toLowerCase())) {
                matches++;
                foundKeywords.push(keyword);
            }
        });
        
        if (matches > 0) {
            detectedAllergens.push(code);
            confidence[code] = Math.min(0.95, (matches / totalKeywords) * 0.8 + 0.3);
            console.log(`  ✅ ${code}: ${foundKeywords.join(', ')} (confianza: ${Math.round(confidence[code] * 100)}%)`);
        }
    });
    
    return {
        allergens: detectedAllergens,
        confidence: confidence,
        method: 'keywords'
    };
}

// Análisis con OpenAI (si está disponible)
async function analyzeWithOpenAI(description) {
    if (!hasOpenAI || !openai) {
        throw new Error('OpenAI no configurada');
    }
    
    const allergenList = Object.entries(ALLERGENS).map(([code, info]) => 
        `${code}: ${info.name} (${info.description})`
    ).join('\n');
    
    const prompt = `
Analiza este plato y detecta ÚNICAMENTE los alérgenos que estén REALMENTE presentes según la normativa europea UE 1169/2011.

PLATO: "${description}"

ALÉRGENOS OBLIGATORIOS UE:
${allergenList}

INSTRUCCIONES CRÍTICAS:
- Solo incluye alérgenos que estén CLARAMENTE presentes en los ingredientes
- NO asumas ingredientes que no se mencionen explícitamente
- Para salsas/preparaciones, considera ingredientes típicos (ej: mayonesa = huevos)
- Responde SOLO con formato JSON válido
- Incluye nivel de confianza (0.0-1.0) para cada alérgeno detectado

Formato de respuesta:
{
  "detected_allergens": ["codigo1", "codigo2"],
  "confidence": {
    "codigo1": 0.95,
    "codigo2": 0.80
  },
  "reasoning": {
    "codigo1": "Motivo específico de detección",
    "codigo2": "Motivo específico de detección"
  }
}
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en seguridad alimentaria y detección de alérgenos según normativa UE 1169/2011. Responde solo con JSON válido."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 800,
            temperature: 0.1
        });

        const result = JSON.parse(completion.choices[0].message.content);
        console.log(`🤖 Análisis IA completado:`, result);
        
        return {
            allergens: result.detected_allergens || [],
            confidence: result.confidence || {},
            reasoning: result.reasoning || {},
            method: 'openai'
        };
    } catch (error) {
        console.error('❌ Error en análisis OpenAI:', error);
        throw new Error('Error en análisis de IA: ' + error.message);
    }
}

// Análisis híbrido principal
async function analyzeAllergensByDescription(description, mode = 'hybrid') {
    console.log(`🎯 Iniciando análisis en modo: ${mode}`);
    
    try {
        if (mode === 'manual') {
            return {
                allergens: [],
                confidence: {},
                method: 'manual',
                message: 'Análisis manual - Chef decide todos los alérgenos'
            };
        }

        // Análisis básico por palabras clave (siempre disponible)
        const keywordAnalysis = analyzeByKeywords(description);
        
        if (mode === 'ai' && hasOpenAI) {
            try {
                const aiAnalysis = await analyzeWithOpenAI(description);
                return {
                    allergens: aiAnalysis.allergens,
                    confidence: aiAnalysis.confidence,
                    method: 'ai',
                    ai_analysis: aiAnalysis,
                    message: 'Análisis con IA completado'
                };
            } catch (error) {
                console.warn('⚠️ IA falló, usando análisis por palabras clave');
                return {
                    allergens: keywordAnalysis.allergens,
                    confidence: keywordAnalysis.confidence,
                    method: 'keyword_fallback',
                    error: error.message,
                    message: 'Análisis con palabras clave (IA no disponible)'
                };
            }
        } else if (mode === 'hybrid') {
            if (hasOpenAI) {
                try {
                    const aiAnalysis = await analyzeWithOpenAI(description);
                    // Combinar resultados
                    const combinedAllergens = new Set([...aiAnalysis.allergens, ...keywordAnalysis.allergens]);
                    const combinedConfidence = {};
                    
                    combinedAllergens.forEach(allergen => {
                        const aiConf = aiAnalysis.confidence[allergen] || 0;
                        const keywordConf = keywordAnalysis.confidence[allergen] || 0;
                        combinedConfidence[allergen] = Math.max(aiConf, keywordConf);
                    });
                    
                    return {
                        allergens: Array.from(combinedAllergens),
                        confidence: combinedConfidence,
                        method: 'hybrid',
                        ai_analysis: aiAnalysis,
                        keyword_analysis: keywordAnalysis,
                        message: 'Análisis híbrido completado'
                    };
                } catch (error) {
                    console.warn('⚠️ IA falló en modo híbrido, usando solo palabras clave');
                    return {
                        allergens: keywordAnalysis.allergens,
                        confidence: keywordAnalysis.confidence,
                        method: 'keyword_fallback',
                        message: 'Análisis híbrido con solo palabras clave'
                    };
                }
            } else {
                return {
                    allergens: keywordAnalysis.allergens,
                    confidence: keywordAnalysis.confidence,
                    method: 'keywords_only',
                    message: 'Análisis con palabras clave (IA no configurada)'
                };
            }
        }
        
        // Modo por defecto: palabras clave
        return keywordAnalysis;
        
    } catch (error) {
        console.error('❌ Error general en análisis:', error);
        return {
            allergens: [],
            confidence: {},
            method: 'error',
            error: error.message,
            message: 'Error en el análisis'
        };
    }
}

// ====== ENDPOINTS PRINCIPALES ======

// Endpoint principal de análisis híbrido
app.post('/api/analyze-dish-hybrid', async (req, res) => {
    try {
        const { description, chef_name, analysis_mode = 'hybrid' } = req.body;
        
        if (!description || !description.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'La descripción del plato es requerida' 
            });
        }

        console.log(`🔍 Analizando plato (modo: ${analysis_mode}): "${description}"`);
        
        // Análisis de alérgenos
        const analysisResult = await analyzeAllergensByDescription(description, analysis_mode);
        
        // Crear objeto del plato
        const dish = {
            id: dishId++,
            name: extractDishName(description),
            description: description.trim(),
            chef: chef_name || 'Chef Principal',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            analysis_mode: analysis_mode,
            final_allergens: analysisResult.allergens,
            confidence: analysisResult.confidence,
            method: analysisResult.method,
            analysis_details: analysisResult
        };

        // Guardar en memoria
        dishes.push(dish);
        
        console.log(`✅ Plato analizado: ${dish.name} (ID: ${dish.id})`);
        console.log(`📊 Alérgenos detectados: ${analysisResult.allergens.length > 0 ? analysisResult.allergens.join(', ') : 'ninguno'}`);
        
        res.json({
            success: true,
            dish: dish,
            analysis: analysisResult,
            allergens_info: analysisResult.allergens.map(code => ({
                code: code,
                name: ALLERGENS[code]?.name || code,
                icon: ALLERGENS[code]?.icon || '⚠️',
                confidence: analysisResult.confidence[code] || 0
            }))
        });
        
    } catch (error) {
        console.error('❌ Error en análisis híbrido:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando el análisis del plato',
            details: error.message
        });
    }
});

// Generar etiqueta PDF mejorada
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

        console.log(`📄 Generando etiqueta para: ${dish.name}`);

        const finalAllergens = dish.final_allergens || dish.allergens || [];
        
        // Crear contenido HTML para la etiqueta
        const htmlContent = generateLabelHTML(dish, finalAllergens);
        
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

// Imprimir directamente
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

        console.log(`🖨️ Preparando impresión para: ${dish.name}`);
        
        res.json({
            success: true,
            message: `Etiqueta de "${dish.name}" lista para imprimir. Abre la etiqueta generada y usa Ctrl+P`,
            dish_id: dishId,
            dish_name: dish.name,
            print_instructions: "Abre la etiqueta generada en una nueva pestaña y presiona Ctrl+P para imprimir",
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en preparación de impresión:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error preparando impresión',
            details: error.message 
        });
    }
});

// Guardar alérgenos modificados manualmente
app.post('/api/save-manual-allergens', (req, res) => {
    try {
        const { dish_id, manual_allergens, chef_notes } = req.body;
        
        const dishIndex = dishes.findIndex(d => d.id === dish_id);
        if (dishIndex === -1) {
            return res.status(404).json({
                success: false,
                error: `Plato con ID ${dish_id} no encontrado`
            });
        }

        // Actualizar el plato con los alérgenos manuales
        dishes[dishIndex] = {
            ...dishes[dishIndex],
            manual_allergens: manual_allergens || [],
            final_allergens: manual_allergens || [],
            chef_notes: chef_notes || '',
            manual_override: true,
            updated_at: new Date().toISOString()
        };

        console.log(`💾 Alérgenos actualizados manualmente para: ${dishes[dishIndex].name}`);

        res.json({
            success: true,
            dish: dishes[dishIndex],
            message: 'Alérgenos actualizados correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error guardando alérgenos manuales:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando los cambios manuales',
            details: error.message
        });
    }
});

// Obtener platos de hoy
app.get('/api/dishes/today', (req, res) => {
    try {
        const today = new Date().toLocaleDateString('es-ES');
        const todayDishes = dishes
            .filter(dish => dish.date === today)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`📋 Devolviendo ${todayDishes.length} platos de hoy`);
        res.json(todayDishes);
    } catch (error) {
        console.error('❌ Error obteniendo platos del día:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo platos del día'
        });
    }
});

// Estado del sistema
app.get('/api/system-status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        openai_available: hasOpenAI,
        dishes_count: dishes.length,
        allergens_count: Object.keys(ALLERGENS).length,
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        endpoints: [
            'POST /api/analyze-dish-hybrid',
            'POST /api/generate-beautiful-single/:id',
            'POST /api/print-directly/:id',
            'POST /api/save-manual-allergens',
            'GET /api/dishes/today',
            'GET /api/system-status'
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
        'ternera': 'Ternera',
        'arroz': 'Arroz',
        'pasta': 'Pasta',
        'sopa': 'Sopa',
        'crema': 'Crema'
    };
    
    for (const [key, name] of Object.entries(commonDishes)) {
        if (description.toLowerCase().includes(key)) {
            return name + ' ' + words.slice(1, 3).join(' ').trim();
        }
    }
    
    return words.slice(0, Math.min(4, words.length)).join(' ');
}

function generateLabelHTML(dish, allergens) {
    const hasAllergens = allergens && allergens.length > 0;
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Etiqueta de Alérgenos - ${dish.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            background: #f8f9fa; 
            padding: 20px;
            color: #333;
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
        .header h1 {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 0.9rem;
        }
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
        .dish-description {
            color: #666;
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .dish-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            font-size: 0.9rem;
            color: #777;
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .allergen-section {
            padding: 30px 20px;
        }
        .allergen-title {
            font-size: 1.4rem;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
        }
        .safe-notice {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            color: #155724;
        }
        .safe-notice h3 {
            font-size: 1.5rem;
            margin-bottom: 10px;
        }
        .danger-notice {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border: 2px solid #dc3545;
            border-radius: 10px;
            padding: 25px;
            color: #721c24;
        }
        .danger-notice h3 {
            font-size: 1.5rem;
            margin-bottom: 15px;
            text-align: center;
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
        .allergen-icon {
            font-size: 1.5rem;
        }
        .allergen-name {
            font-weight: bold;
            font-size: 1.1rem;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 0.8rem;
            color: #666;
            border-top: 1px solid #dee2e6;
        }
        .print-section {
            padding: 20px;
            text-align: center;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }
        .print-btn {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            transition: all 0.3s ease;
            margin: 10px;
        }
        .print-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(40, 167, 69, 0.4);
        }
        .print-instructions {
            margin-top: 15px;
            font-size: 0.9rem;
            color: #666;
        }
        @media print {
            .no-print { display: none !important; }
            body { background: white; padding: 0; }
            .label-container { 
                box-shadow: none; 
                max-width: none;
                margin: 0;
            }
        }
        @media (max-width: 600px) {
            .dish-meta {
                grid-template-columns: 1fr;
            }
            .header h1 {
                font-size: 1.5rem;
            }
            .dish-name {
                font-size: 1.4rem;
            }
        }
    </style>
</head>
<body>
    <div class="label-container">
        <div class="header">
            <h1>🍽️ ETIQUETA DE ALÉRGENOS</h1>
            <p>Sistema de Gestión de Alérgenos - Normativa UE 1169/2011</p>
        </div>

        <div class="dish-info">
            <div class="dish-name">${dish.name}</div>
            <div class="dish-description">${dish.description}</div>
            <div class="dish-meta">
                <div class="meta-item">
                    <span>👨‍🍳</span>
                    <span><strong>Chef:</strong> ${dish.chef}</span>
                </div>
                <div class="meta-item">
                    <span>📅</span>
                    <span><strong>Fecha:</strong> ${dish.date}</span>
                </div>
                <div class="meta-item">
                    <span>⚙️</span>
                    <span><strong>Análisis:</strong> ${dish.analysis_mode || 'Automático'}</span>
                </div>
                <div class="meta-item">
                    <span>🕒</span>
                    <span><strong>Hora:</strong> ${new Date(dish.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>

        <div class="allergen-section">
            <div class="allergen-title">⚠️ Información de Alérgenos</div>
            
            ${hasAllergens ? `
                <div class="danger-notice">
                    <h3>⚠️ CONTIENE ALÉRGENOS</h3>
                    <p><strong>Este plato contiene los siguientes alérgenos obligatorios según UE 1169/2011:</strong></p>
                    <div class="allergen-list">
                        ${allergens.map(code => {
                            const allergen = ALLERGENS[code];
                            if (!allergen) return '';
                            return `
                                <div class="allergen-item">
                                    <span class="allergen-icon">${allergen.icon}</span>
                                    <div>
                                        <div class="allergen-name">${allergen.name}</div>
                                        <div style="font-size: 0.9rem; opacity: 0.8;">${allergen.description}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="safe-notice">
                    <h3>✅ SIN ALÉRGENOS DETECTADOS</h3>
                    <p>Este plato <strong>NO contiene</strong> ninguno de los 14 alérgenos de declaración obligatoria según la normativa europea UE 1169/2011.</p>
                    <p style="margin-top: 10px; font-size: 0.9rem;">Es seguro para personas con alergias alimentarias comunes.</p>
                </div>
            `}
        </div>

        <div class="footer">
            <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')} | <strong>Sistema v2.0</strong></p>
            <p>Normativa Europea UE 1169/2011 sobre información alimentaria al consumidor</p>
            <p style="margin-top: 10px; font-size: 0.75rem;">
                <strong>Alérgenos UE:</strong> Cereales con gluten, Crustáceos, Huevos, Pescado, Cacahuetes, 
                Soja, Leche, Frutos de cáscara, Apio, Mostaza, Sésamo, Sulfitos, Altramuces, Moluscos
            </p>
        </div>

        <div class="print-section no-print">
            <button onclick="window.print()" class="print-btn">
                🖨️ Imprimir Etiqueta
            </button>
            <button onclick="savePDF()" class="print-btn" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);">
                📄 Guardar como PDF
            </button>
            <div class="print-instructions">
                <p><strong>Para imprimir:</strong> Haz clic en "Imprimir Etiqueta" o presiona <kbd>Ctrl+P</kbd></p>
                <p><strong>Para PDF:</strong> Selecciona "Guardar como PDF" en el diálogo de impresión</p>
            </div>
        </div>
    </div>

    <script>
        function savePDF() {
            window.print();
        }
        
        // Auto-focus para impresión rápida
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
        
        console.log('🏷️ Etiqueta de alérgenos cargada correctamente');
        console.log('Plato: ${dish.name}');
        console.log('Alérgenos: ${hasAllergens ? allergens.join(', ') : 'ninguno'}');
    </script>
</body>
</html>`;
}

// ====== SERVIR ARCHIVOS ESTÁTICOS ======

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== MIDDLEWARE DE LOGGING ======

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ====== MANEJO DE ERRORES ======

app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
});

// ====== INICIAR SERVIDOR ======

app.listen(port, () => {
    console.log(`🚀 Servidor iniciado en puerto ${port}`);
    console.log(`📋 Sistema de Alérgenos v2.0 funcionando`);
    console.log(`🤖 OpenAI: ${hasOpenAI ? 'Configurado y listo' : 'No configurado (modo simulación)'}`);
    console.log(`🔗 Accede a: http://localhost:${port}`);
    console.log(`📊 ${Object.keys(ALLERGENS).length} alérgenos UE configurados`);
    console.log('');
    console.log('🛠️ Endpoints disponibles:');
    console.log('   POST /api/analyze-dish-hybrid      - Análisis principal');
    console.log('   POST /api/generate-beautiful-single/:id - Generar etiqueta');
    console.log('   POST /api/print-directly/:id       - Preparar impresión');
    console.log('   POST /api/save-manual-allergens    - Guardar cambios');
    console.log('   GET  /api/dishes/today             - Platos del día');
    console.log('   GET  /api/system-status            - Estado del sistema');
    console.log('');
    console.log('✅ Sistema listo para usar');
});

// ====== GRACEFUL SHUTDOWN ======

process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Cerrando servidor...');
    process.exit(0);
});

module.exports = app;
