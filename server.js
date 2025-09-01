// server.js - Sistema de Alérgenos Mejorado con Funcionalidad Híbrida

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const PDFDocument = require('pdfkit');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Base de datos mejorada
let dishes = [];
let dishId = 1;

// Alérgenos oficiales UE 1169/2011
const ALLERGENS = {
    'gluten': { 
        name: 'Cereales con gluten', 
        icon: '🌾', 
        description: 'Trigo, centeno, cebada, avena, espelta, kamut',
        keywords: ['trigo', 'harina', 'pan', 'pasta', 'cebada', 'centeno', 'avena', 'espelta']
    },
    'crustaceos': { 
        name: 'Crustáceos', 
        icon: '🦐', 
        description: 'Gambas, langostinos, cangrejos, langostas',
        keywords: ['gamba', 'langostino', 'cangrejo', 'langosta', 'bogavante', 'cigala']
    },
    'huevos': { 
        name: 'Huevos', 
        icon: '🥚', 
        description: 'Huevos y productos derivados',
        keywords: ['huevo', 'clara', 'yema', 'mayonesa', 'tortilla']
    },
    'pescado': { 
        name: 'Pescado', 
        icon: '🐟', 
        description: 'Pescado y productos derivados',
        keywords: ['merluza', 'salmon', 'bacalao', 'atun', 'sardina', 'lubina', 'dorada']
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
        keywords: ['leche', 'queso', 'mantequilla', 'nata', 'yogur', 'crema']
    },
    'frutos_secos': { 
        name: 'Frutos de cáscara', 
        icon: '🌰', 
        description: 'Almendras, avellanas, nueces, etc.',
        keywords: ['almendra', 'nuez', 'avellana', 'pistacho', 'anacardo', 'pecan']
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
        keywords: ['vino', 'vinagre', 'frutos secos procesados', 'conservas']
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
        keywords: ['mejillon', 'almeja', 'caracol', 'calamar', 'pulpo', 'sepia', 'ostra', 'vieira']
    }
};

// ====== FUNCIONES DE ANÁLISIS ======

// Análisis híbrido con IA mejorada
async function analyzeAllergensByDescription(description, mode = 'hybrid') {
    const detectedAllergens = [];
    const confidence = {};
    
    try {
        if (mode === 'manual') {
            // Modo manual: no usar IA, devolver array vacío para que el chef decida
            return {
                allergens: [],
                confidence: {},
                method: 'manual',
                message: 'Análisis manual - Chef decide todos los alérgenos'
            };
        }

        // Análisis básico por palabras clave (fallback si falla IA)
        const keywordAnalysis = analyzeByKeywords(description);
        
        if (mode === 'ai' || mode === 'hybrid') {
            try {
                // Análisis con IA OpenAI
                const aiAnalysis = await analyzeWithOpenAI(description);
                
                // Combinar resultados de IA con análisis de palabras clave
                const combinedResults = combineAnalysisResults(aiAnalysis, keywordAnalysis);
                
                return {
                    allergens: combinedResults.allergens,
                    confidence: combinedResults.confidence,
                    method: mode,
                    ai_analysis: aiAnalysis,
                    keyword_analysis: keywordAnalysis,
                    message: `Análisis ${mode === 'ai' ? 'con IA' : 'híbrido'} completado`
                };
                
            } catch (error) {
                console.error('Error en análisis IA:', error);
                
                // Fallback a análisis por keywords
                return {
                    allergens: keywordAnalysis.allergens,
                    confidence: keywordAnalysis.confidence,
                    method: 'keyword_fallback',
                    error: error.message,
                    message: 'Análisis con palabras clave (IA no disponible)'
                };
            }
        }
        
    } catch (error) {
        console.error('Error general en análisis:', error);
        return {
            allergens: [],
            confidence: {},
            method: 'error',
            error: error.message,
            message: 'Error en el análisis'
        };
    }
}

// Análisis por palabras clave
function analyzeByKeywords(description) {
    const detectedAllergens = [];
    const confidence = {};
    const descriptionLower = description.toLowerCase();
    
    Object.entries(ALLERGENS).forEach(([code, allergen]) => {
        let matches = 0;
        let totalKeywords = allergen.keywords.length;
        
        allergen.keywords.forEach(keyword => {
            if (descriptionLower.includes(keyword.toLowerCase())) {
                matches++;
            }
        });
        
        if (matches > 0) {
            detectedAllergens.push(code);
            confidence[code] = Math.min(0.95, (matches / totalKeywords) * 0.8 + 0.2);
        }
    });
    
    return {
        allergens: detectedAllergens,
        confidence: confidence
    };
}

// Análisis con OpenAI
async function analyzeWithOpenAI(description) {
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

    try {
        const result = JSON.parse(completion.choices[0].message.content);
        return {
            allergens: result.detected_allergens || [],
            confidence: result.confidence || {},
            reasoning: result.reasoning || {}
        };
    } catch (error) {
        throw new Error('Respuesta de IA inválida: ' + error.message);
    }
}

// Combinar resultados de diferentes métodos de análisis
function combineAnalysisResults(aiAnalysis, keywordAnalysis) {
    const allAllergens = new Set([...aiAnalysis.allergens, ...keywordAnalysis.allergens]);
    const combinedResults = {
        allergens: [],
        confidence: {}
    };
    
    allAllergens.forEach(allergen => {
        const aiConf = aiAnalysis.confidence[allergen] || 0;
        const keywordConf = keywordAnalysis.confidence[allergen] || 0;
        
        // Promedio ponderado (IA tiene más peso)
        const finalConfidence = (aiConf * 0.7 + keywordConf * 0.3);
        
        if (finalConfidence > 0.3) { // Umbral de confianza mínimo
            combinedResults.allergens.push(allergen);
            combinedResults.confidence[allergen] = finalConfidence;
        }
    });
    
    return combinedResults;
}

// ====== ENDPOINTS MEJORADOS ======

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

        console.log(`🔍 Analizando plato (modo: ${analysis_mode}): ${description}`);
        
        // Análisis de alérgenos
        const analysisResult = await analyzeAllergensByDescription(description, analysis_mode);
        
        // Crear objeto del plato
        const dish = {
            id: dishId++,
            name: extractDishName(description),
            description: description.trim(),
            chef: chef_name || 'Chef',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            analysis_mode: analysis_mode,
            ai_detected_allergens: analysisResult.ai_analysis?.allergens || [],
            final_allergens: analysisResult.allergens,
            confidence: analysisResult.confidence,
            method: analysisResult.method,
            analysis_details: analysisResult
        };

        // Guardar en memoria (en producción usar base de datos real)
        dishes.push(dish);
        
        console.log(`✅ Plato analizado: ${analysisResult.allergens.length} alérgenos detectados`);
        
        res.json({
            success: true,
            dish: dish,
            analysis: analysisResult,
            allergens_info: analysisResult.allergens.map(code => ({
                code: code,
                name: ALLERGENS[code].name,
                icon: ALLERGENS[code].icon,
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

// Endpoint para guardar alérgenos modificados manualmente
app.post('/api/save-manual-allergens', async (req, res) => {
    try {
        const { dish_id, manual_allergens, chef_notes } = req.body;
        
        const dishIndex = dishes.findIndex(d => d.id === dish_id);
        if (dishIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }

        // Actualizar el plato con los alérgenos manuales
        dishes[dishIndex] = {
            ...dishes[dishIndex],
            manual_allergens: manual_allergens,
            final_allergens: manual_allergens,
            chef_notes: chef_notes,
            manual_override: true,
            updated_at: new Date().toISOString()
        };

        console.log(`👨‍🍳 Alérgenos actualizados manualmente para plato ${dish_id}`);

        res.json({
            success: true,
            dish: dishes[dishIndex],
            message: 'Alérgenos actualizados correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error guardando alérgenos manuales:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando los cambios manuales'
        });
    }
});

// Mantener compatibilidad con el endpoint original
app.post('/api/analyze-dish', async (req, res) => {
    try {
        const { description, chef_name, selected_ingredients, analysis_mode } = req.body;
        
        // Si hay ingredientes seleccionados, usarlos para análisis más preciso
        let finalDescription = description;
        if (selected_ingredients && selected_ingredients.length > 0) {
            // Aquí podrías integrar con tu sistema de ingredientes existente
            finalDescription = `${description} - Ingredientes utilizados: ${selected_ingredients.join(', ')}`;
        }
        
        // Redirigir al nuevo endpoint híbrido
        const analysisResult = await analyzeAllergensByDescription(finalDescription, analysis_mode || 'hybrid');
        
        const dish = {
            id: dishId++,
            name: extractDishName(description),
            description: finalDescription,
            chef: chef_name || 'Chef',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            allergens: analysisResult.allergens,
            confidence: Object.values(analysisResult.confidence).reduce((a, b) => a + b, 0) / Object.keys(analysisResult.confidence).length || 0.5,
            method: analysisResult.method
        };

        dishes.push(dish);
        
        res.json({
            success: true,
            dish: dish,
            allergens_info: analysisResult.allergens.map(code => ({
                code: code,
                name: ALLERGENS[code].name,
                icon: ALLERGENS[code].icon
            }))
        });
        
    } catch (error) {
        console.error('❌ Error en análisis legacy:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando el plato'
        });
    }
});

// Estadísticas mejoradas
app.get('/api/allergen-statistics', (req, res) => {
    const stats = {
        total_dishes: dishes.length,
        analysis_modes: {
            ai: dishes.filter(d => d.analysis_mode === 'ai').length,
            manual: dishes.filter(d => d.analysis_mode === 'manual').length,
            hybrid: dishes.filter(d => d.analysis_mode === 'hybrid').length
        },
        allergen_frequency: {},
        manual_overrides: dishes.filter(d => d.manual_override).length,
        avg_confidence: 0
    };
    
    // Calcular frecuencia de alérgenos
    dishes.forEach(dish => {
        const allergens = dish.final_allergens || dish.allergens || [];
        allergens.forEach(allergen => {
            stats.allergen_frequency[allergen] = (stats.allergen_frequency[allergen] || 0) + 1;
        });
    });
    
    // Calcular confianza promedio
    const confidenceValues = dishes
        .map(d => d.confidence || 0)
        .filter(c => c > 0);
    
    stats.avg_confidence = confidenceValues.length > 0 
        ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length 
        : 0;
    
    res.json({
        success: true,
        statistics: stats,
        allergen_details: ALLERGENS
    });
});

// Obtener platos de hoy
app.get('/api/dishes/today', (req, res) => {
    const today = new Date().toLocaleDateString('es-ES');
    const todayDishes = dishes
        .filter(dish => dish.date === today)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(todayDishes);
});

// ====== FUNCIONES AUXILIARES ======

function extractDishName(description) {
    // Extraer nombre del plato de la descripción
    const words = description.trim().split(/\s+/);
    
    // Buscar patrones comunes de nombres de platos
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
            return name + ' ' + words.slice(1, 3).join(' ');
        }
    }
    
    // Si no se encuentra patrón, tomar las primeras 3-4 palabras
    return words.slice(0, Math.min(4, words.length)).join(' ');
}

// ====== ENDPOINTS DE GESTIÓN DE INGREDIENTES (COMPATIBILIDAD) ======

// Mantener endpoints existentes para ingredientes
let ingredients = [
    // Tu lista existente de ingredientes aquí
    { id: 1, code: 'pollo', name: 'Pollo', allergens: [], category: 'proteina', common: true },
    { id: 2, code: 'gambas', name: 'Gambas', allergens: ['crustaceos'], category: 'marisco', common: true },
    { id: 3, code: 'huevos', name: 'Huevos', allergens: ['huevos'], category: 'huevo', common: true },
    // ... resto de ingredientes
];

let ingredientId = ingredients.length + 1;

const INGREDIENT_CATEGORIES = {
    'proteina': { name: 'Proteínas', icon: '🥩', color: '#ef4444' },
    'pescado': { name: 'Pescados', icon: '🐟', color: '#3b82f6' },
    'marisco': { name: 'Mariscos', icon: '🦐', color: '#06b6d4' },
    'lacteo': { name: 'Lácteos', icon: '🥛', color: '#8b5cf6' },
    'huevo': { name: 'Huevos', icon: '🥚', color: '#f59e0b' },
    'cereal': { name: 'Cereales', icon: '🌾', color: '#d97706' },
    'verdura': { name: 'Verduras', icon: '🥬', color: '#10b981' },
    'condimento': { name: 'Condimentos', icon: '🧂', color: '#6b7280' }
};

// Obtener ingredientes
app.get('/api/ingredients', (req, res) => {
    const { category, search, common } = req.query;
    let filteredIngredients = ingredients;
    
    if (category && category !== 'all') {
        filteredIngredients = filteredIngredients.filter(ing => ing.category === category);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        filteredIngredients = filteredIngredients.filter(ing => 
            ing.name.toLowerCase().includes(searchLower) ||
            ing.code.toLowerCase().includes(searchLower)
        );
    }
    
    if (common === 'true') {
        filteredIngredients = filteredIngredients.filter(ing => ing.common);
    }
    
    res.json({
        success: true,
        ingredients: filteredIngredients,
        categories: INGREDIENT_CATEGORIES,
        total: filteredIngredients.length
    });
});

// ====== ENDPOINTS DE ETIQUETAS ======

// Generar etiqueta mejorada
app.post('/api/generate-beautiful-single/:id', async (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }

        // Crear PDF mejorado
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const filename = `etiqueta_${dish.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Header de la etiqueta
        doc.fontSize(24).fillColor('#1f2937').text('SISTEMA DE ALÉRGENOS', 50, 50);
        doc.fontSize(16).fillColor('#6b7280').text('Buffet Hotel - Normativa UE 1169/2011', 50, 80);
        
        // Línea separadora
        doc.moveTo(50, 110).lineTo(550, 110).stroke('#d1d5db');

        // Información del plato
        doc.fontSize(20).fillColor('#1f2937').text(dish.name, 50, 130);
        doc.fontSize(12).fillColor('#6b7280').text(dish.description, 50, 160, { width: 500, height: 60 });

        // Información del análisis
        const analysisText = `Análisis: ${dish.analysis_mode || dish.method || 'IA'} | Chef: ${dish.chef} | ${dish.date}`;
        doc.fontSize(10).fillColor('#9ca3af').text(analysisText, 50, 230);

        // Alérgenos
        const finalAllergens = dish.final_allergens || dish.allergens || [];
        
        if (finalAllergens.length === 0) {
            // Sin alérgenos
            doc.rect(50, 260, 500, 120).fill('#f0fdf4').stroke('#22c55e');
            doc.fontSize(18).fillColor('#15803d').text('✅ SIN ALÉRGENOS DETECTADOS', 70, 300);
            doc.fontSize(12).fillColor('#16a34a').text('Este plato es seguro para personas con alergias alimentarias', 70, 330);
        } else {
            // Con alérgenos
            doc.rect(50, 260, 500, 150).fill('#fef2f2').stroke('#ef4444');
            doc.fontSize(16).fillColor('#dc2626').text('⚠️ CONTIENE ALÉRGENOS', 70, 280);
            
            let yPos = 310;
            finalAllergens.forEach((allergenCode, index) => {
                if (ALLERGENS[allergenCode]) {
                    const allergen = ALLERGENS[allergenCode];
                    const confidence = dish.confidence ? dish.confidence[allergenCode] : null;
                    
                    doc.fontSize(12).fillColor('#991b1b');
                    let allergenText = `• ${allergen.icon} ${allergen.name}`;
                    if (confidence) {
                        allergenText += ` (${Math.round(confidence * 100)}%)`;
                    }
                    
                    doc.text(allergenText, 70, yPos);
                    yPos += 20;
                }
            });
        }

        // Footer
        doc.fontSize(8).fillColor('#6b7280');
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')} | Sistema v2.0`, 50, 750);
        doc.text('Normativa Europea UE 1169/2011 sobre información alimentaria', 50, 765);

        doc.end();
        
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
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }

        // Simular envío a impresora
        console.log(`🖨️ Imprimiendo etiqueta para: ${dish.name}`);
        
        res.json({
            success: true,
            message: `Etiqueta de "${dish.name}" enviada a impresora`
        });
        
    } catch (error) {
        console.error('❌ Error imprimiendo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error enviando a impresora' 
        });
    }
});

// ====== REGISTRO SANITARIO ======

app.get('/api/sanitary-record', (req, res) => {
    try {
        const { start_date, end_date, chef, dish_name } = req.query;
        
        let filteredDishes = dishes;
        
        // Filtrar por fechas
        if (start_date || end_date) {
            filteredDishes = filteredDishes.filter(dish => {
                const dishDate = new Date(dish.timestamp);
                if (start_date && dishDate < new Date(start_date)) return false;
                if (end_date && dishDate > new Date(end_date)) return false;
                return true;
            });
        }
        
        // Filtrar por chef
        if (chef) {
            filteredDishes = filteredDishes.filter(dish => 
                dish.chef.toLowerCase().includes(chef.toLowerCase())
            );
        }
        
        // Filtrar por nombre de plato
        if (dish_name) {
            filteredDishes = filteredDishes.filter(dish => 
                dish.name.toLowerCase().includes(dish_name.toLowerCase())
            );
        }
        
        // Estadísticas
        const statistics = {
            total_dishes: filteredDishes.length,
            total_allergens: filteredDishes.reduce((total, dish) => {
                return total + (dish.final_allergens || dish.allergens || []).length;
            }, 0),
            unique_chefs: [...new Set(filteredDishes.map(d => d.chef))].length,
            date_range: {
                start: filteredDishes.length > 0 ? new Date(Math.min(...filteredDishes.map(d => new Date(d.timestamp)))) : null,
                end: filteredDishes.length > 0 ? new Date(Math.max(...filteredDishes.map(d => new Date(d.timestamp)))) : null
            }
        };
        
        res.json({
            success: true,
            dishes: filteredDishes.map(dish => ({
                ...dish,
                allergens: dish.final_allergens || dish.allergens || []
            })),
            statistics
        });
        
    } catch (error) {
        console.error('❌ Error cargando registro sanitario:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error cargando registro sanitario' 
        });
    }
});

// ====== CONFIGURACIÓN DE IMPRESORA ======

app.post('/api/configure-printer', (req, res) => {
    try {
        const { printer_name, paper_size, auto_print } = req.body;
        
        // Simular configuración de impresora
        console.log(`⚙️ Configuración de impresora actualizada:`, {
            printer_name,
            paper_size,
            auto_print
        });
        
        res.json({
            success: true,
            message: 'Configuración guardada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error configurando impresora:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error guardando configuración' 
        });
    }
});

// ====== SERVIR ARCHIVOS ESTÁTICOS ======

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== INICIAR SERVIDOR ======

app.listen(port, () => {
    console.log(`🚀 Servidor iniciado en puerto ${port}`);
    console.log(`📋 Sistema de Alérgenos Híbrido v2.0`);
    console.log(`🤖 IA: ${process.env.OPENAI_API_KEY ? 'Configurada' : 'No configurada'}`);
    console.log(`📊 Alérgenos UE: ${Object.keys(ALLERGENS).length} tipos`);
    console.log(`🔗 Accede a: http://localhost:${port}`);
});

// ====== MANEJO DE ERRORES ======

process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
});

module.exports = app;
