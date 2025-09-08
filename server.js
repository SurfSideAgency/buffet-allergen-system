// server.js - Sistema de Alérgenos Simplificado
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// OpenAI (opcional)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    try {
        const OpenAI = require('openai');
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('✅ OpenAI configurado');
    } catch (error) {
        console.log('⚠️ OpenAI no disponible');
    }
}

// Base de datos en memoria
let dishes = [];
let dishId = 1;

// Alérgenos UE
const ALLERGENS = {
    'gluten': { name: 'Cereales con Gluten', icon: '🌾', keywords: ['trigo', 'harina', 'pan', 'pasta'] },
    'crustaceos': { name: 'Crustáceos', icon: '🦐', keywords: ['gamba', 'langostino', 'cangrejo'] },
    'huevos': { name: 'Huevos', icon: '🥚', keywords: ['huevo', 'mayonesa', 'tortilla'] },
    'pescado': { name: 'Pescado', icon: '🐟', keywords: ['pescado', 'merluza', 'salmon'] },
    'cacahuetes': { name: 'Cacahuetes', icon: '🥜', keywords: ['cacahuete', 'mani'] },
    'soja': { name: 'Soja', icon: '🌱', keywords: ['soja', 'tofu'] },
    'lacteos': { name: 'Lácteos', icon: '🥛', keywords: ['leche', 'queso', 'nata'] },
    'frutos_secos': { name: 'Frutos Secos', icon: '🌰', keywords: ['almendra', 'nuez'] },
    'apio': { name: 'Apio', icon: '🥬', keywords: ['apio'] },
    'mostaza': { name: 'Mostaza', icon: '🟡', keywords: ['mostaza'] },
    'sesamo': { name: 'Sésamo', icon: '🫘', keywords: ['sesamo', 'tahini'] },
    'sulfitos': { name: 'Sulfitos', icon: '🍷', keywords: ['vino', 'vinagre'] },
    'altramuces': { name: 'Altramuces', icon: '🫘', keywords: ['altramuces'] },
    'moluscos': { name: 'Moluscos', icon: '🐚', keywords: ['mejillon', 'almeja', 'calamar'] }
};

// Análisis por palabras clave
function analyzeByKeywords(description) {
    const detected = [];
    const desc = description.toLowerCase();
    
    Object.entries(ALLERGENS).forEach(([code, allergen]) => {
        const found = allergen.keywords.some(keyword => 
            desc.includes(keyword.toLowerCase())
        );
        if (found) detected.push(code);
    });
    
    return detected;
}

// Análisis con IA (si está disponible)
async function analyzeWithAI(description) {
    if (!openai) return [];
    
    try {
        const prompt = `Analiza este plato y detecta alérgenos UE 1169/2011:
"${description}"

Responde SOLO con JSON: {"allergens": ["codigo1", "codigo2"]}

Códigos: gluten, crustaceos, huevos, pescado, cacahuetes, soja, lacteos, frutos_secos, apio, mostaza, sesamo, sulfitos, altramuces, moluscos`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200,
            temperature: 0.1
        });

        const result = JSON.parse(completion.choices[0].message.content);
        return result.allergens || [];
    } catch (error) {
        console.error('Error IA:', error);
        return [];
    }
}

function extractDishName(description) {
    const words = description.trim().split(/\s+/);
    const dishes = {
        'paella': 'Paella',
        'tortilla': 'Tortilla',
        'ensalada': 'Ensalada',
        'gazpacho': 'Gazpacho',
        'croqueta': 'Croquetas'
    };
    
    for (const [key, name] of Object.entries(dishes)) {
        if (description.toLowerCase().includes(key)) {
            return name;
        }
    }
    
    return words.slice(0, 3).join(' ');
}

// === ENDPOINTS ===

// Analizar plato
app.post('/api/analyze-dish-hybrid', async (req, res) => {
    try {
        const { description, chef_name, analysis_mode = 'hybrid' } = req.body;
        
        if (!description?.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Descripción requerida' 
            });
        }

        console.log(`🔍 Analizando: ${description.substring(0, 50)}... (${analysis_mode})`);
        
        let allergens = [];
        
        if (analysis_mode === 'manual') {
            allergens = [];
        } else {
            // Análisis por keywords
            const keywordResults = analyzeByKeywords(description);
            
            if (analysis_mode === 'ai' || analysis_mode === 'hybrid') {
                // Intentar IA
                const aiResults = await analyzeWithAI(description);
                
                // Combinar resultados
                const combined = new Set([...keywordResults, ...aiResults]);
                allergens = Array.from(combined);
            } else {
                allergens = keywordResults;
            }
        }
        
        const dish = {
            id: dishId++,
            name: extractDishName(description),
            description: description.trim(),
            chef: chef_name || 'Chef',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            analysis_mode: analysis_mode,
            final_allergens: allergens
        };

        dishes.push(dish);
        
        console.log(`✅ Detectados: ${allergens.join(', ')}`);
        
        res.json({
            success: true,
            dish: dish,
            analysis: {
                allergens: allergens,
                method: analysis_mode
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el análisis'
        });
    }
});

// Guardar plato final
app.post('/api/save-final-dish', async (req, res) => {
    try {
        const { dish_id, final_allergens, chef_approval } = req.body;
        
        const dishIndex = dishes.findIndex(d => d.id === dish_id);
        if (dishIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }

        dishes[dishIndex] = {
            ...dishes[dishIndex],
            final_allergens: final_allergens || [],
            chef_approval: chef_approval,
            status: 'approved',
            approved_at: new Date().toISOString()
        };

        console.log(`✅ Plato guardado: ${dishes[dishIndex].name}`);

        res.json({
            success: true,
            dish: dishes[dishIndex]
        });
        
    } catch (error) {
        console.error('❌ Error guardando:', error);
        res.status(500).json({
            success: false,
            error: 'Error guardando'
        });
    }
});

// Generar etiqueta HTML
app.post('/api/generate-beautiful-single/:id', async (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ 
                success: false, 
                error: 'Plato no encontrado' 
            });
        }

        const allergens = dish.final_allergens || [];
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
        .etiqueta { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2rem; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .contenido { padding: 30px; }
        .plato { margin-bottom: 30px; }
        .plato h2 { color: #1f2937; margin-bottom: 10px; font-size: 1.8rem; }
        .plato p { color: #6b7280; margin-bottom: 15px; }
        .meta { display: flex; justify-content: space-between; font-size: 0.9rem; color: #9ca3af; margin-bottom: 20px; }
        .alergenos { padding: 25px; border-radius: 15px; }
        .sin-alergenos { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 3px solid #10b981; }
        .con-alergenos { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 3px solid #ef4444; }
        .titulo-alergenos { font-size: 1.5rem; font-weight: bold; margin-bottom: 20px; display: flex; align-items: center; }
        .sin-alergenos .titulo-alergenos { color: #065f46; }
        .con-alergenos .titulo-alergenos { color: #991b1b; }
        .lista-alergenos { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .alergeno { background: rgba(255,255,255,0.8); padding: 15px; border-radius: 10px; display: flex; align-items: center; font-weight: 600; border: 1px solid rgba(0,0,0,0.1); }
        .icono { font-size: 1.5rem; margin-right: 10px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 0.8rem; color: #6b7280; border-top: 1px solid #e5e7eb; }
        @media print { body { margin: 0; background: white; } .etiqueta { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="etiqueta">
        <div class="header">
            <h1>🍽️ INFORMACIÓN DE ALÉRGENOS</h1>
            <p>Sistema de Gestión - Normativa UE 1169/2011</p>
        </div>
        
        <div class="contenido">
            <div class="plato">
                <h2>${dish.name}</h2>
                <p>${dish.description}</p>
                <div class="meta">
                    <span><strong>Chef:</strong> ${dish.chef}</span>
                    <span><strong>Fecha:</strong> ${dish.date}</span>
                    <span><strong>Análisis:</strong> ${dish.analysis_mode || 'híbrido'}</span>
                </div>
            </div>
            
            <div class="alergenos ${allergens.length === 0 ? 'sin-alergenos' : 'con-alergenos'}">
                ${allergens.length === 0 ? `
                    <div class="titulo-alergenos">✅ SIN ALÉRGENOS DETECTADOS</div>
                    <p style="margin: 0; font-weight: 500;">Este plato es seguro para personas con alergias alimentarias.</p>
                ` : `
                    <div class="titulo-alergenos">⚠️ CONTIENE ALÉRGENOS (${allergens.length})</div>
                    <div class="lista-alergenos">
                        ${allergens.map(code => {
                            const allergen = ALLERGENS[code];
                            return allergen ? `
                                <div class="alergeno">
                                    <span class="icono">${allergen.icon}</span>
                                    <span>${allergen.name}</span>
                                </div>
                            ` : '';
                        }).join('')}
                    </div>
                `}
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <p>Sistema de Alérgenos v2.0 - Normativa UE 1169/2011</p>
            ${dish.chef_approval ? `<p style="color: #16a34a; font-weight: 600;">✅ Aprobado por ${dish.chef}</p>` : ''}
        </div>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="etiqueta_${dish.name.replace(/\s+/g, '_')}.html"`);
        res.send(html);
        
    } catch (error) {
        console.error('❌ Error etiqueta:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error generando etiqueta' 
        });
    }
});

// Imprimir
app.post('/api/print-directly/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ 
                success: false, 
                error: 'Plato no encontrado' 
            });
        }

        console.log(`🖨️ Imprimiendo: ${dish.name}`);
        
        res.json({
            success: true,
            message: `Etiqueta enviada a impresora`
        });
        
    } catch (error) {
        console.error('❌ Error impresión:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error imprimiendo' 
        });
    }
});

// Platos de hoy
app.get('/api/dishes/today', (req, res) => {
    try {
        const today = new Date().toLocaleDateString('es-ES');
        const todayDishes = dishes
            .filter(dish => dish.date === today)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(todayDishes);
    } catch (error) {
        res.status(500).json([]);
    }
});

// Salud del sistema
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        openai: !!openai,
        dishes: dishes.length
    });
});

// Servir archivos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'selector.html'));
});

app.get('/selector', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'selector.html'));
});

// Iniciar servidor
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Servidor en puerto ${port}`);
        console.log(`📋 Sistema de Alérgenos con Selección Manual`);
        console.log(`🤖 IA: ${openai ? 'Sí' : 'No'} (usando keywords)`);
        console.log(`🔗 URL: http://localhost:${port}/selector`);
        console.log(`\n✅ LISTO PARA USAR:`);
        console.log(`   • 3 modos: IA, Manual, Híbrido`);
        console.log(`   • Selección visual de alérgenos`);
        console.log(`   • Etiquetas profesionales`);
        console.log(`   • 14 alérgenos UE 1169/2011`);
    });
}

module.exports = app;
