const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cargar bases de datos JSON
const ALLERGENS = JSON.parse(fs.readFileSync('./data/allergens.json', 'utf8'));
const INGREDIENTS = JSON.parse(fs.readFileSync('./data/ingredients.json', 'utf8'));

// Almacenamiento temporal de platos
let dishes = [];
let dishId = 1;

// ====== DETECCIÓN INTELIGENTE DE ALÉRGENOS ======
function detectAllergens(description) {
    const detectedAllergens = new Set();
    const lowerDesc = description.toLowerCase();
    
    // Buscar por keywords en cada alérgeno
    Object.entries(ALLERGENS).forEach(([code, allergen]) => {
        allergen.keywords.forEach(keyword => {
            if (lowerDesc.includes(keyword.toLowerCase())) {
                detectedAllergens.add(code);
            }
        });
    });
    
    return Array.from(detectedAllergens);
}

// ====== API: ANALIZAR PLATO ======
app.post('/api/analyze', (req, res) => {
    try {
        const { description, chef } = req.body;
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: 'Descripción del plato requerida'
            });
        }
        
        console.log(`🔍 Analizando: "${description}"`);
        
        // Detección automática
        const detectedAllergens = detectAllergens(description);
        
        // Crear plato
        const dish = {
            id: dishId++,
            name: description.split(',')[0].trim(),
            description: description,
            chef: chef || 'Chef Principal',
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            allergens: detectedAllergens
        };
        
        dishes.push(dish);
        
        // Información detallada de alérgenos
        const allergensInfo = detectedAllergens.map(code => ({
            code,
            name: ALLERGENS[code].name,
            icon: ALLERGENS[code].icon,
            description: ALLERGENS[code].description
        }));
        
        console.log(`✅ Detectados ${detectedAllergens.length} alérgenos`);
        
        res.json({
            success: true,
            dish,
            allergens: allergensInfo
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error analizando el plato'
        });
    }
});

// ====== API: GENERAR ETIQUETA ======
app.post('/api/generate-label', (req, res) => {
    try {
        const { dishId } = req.body;
        
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }
        
        console.log(`📄 Generando etiqueta: ${dish.name}`);
        
        const html = generateLabelHTML(dish);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando etiqueta'
        });
    }
});

// ====== API: OBTENER PLATOS ======
app.get('/api/dishes', (req, res) => {
    const today = new Date().toLocaleDateString('es-ES');
    const todayDishes = dishes.filter(d => d.date === today);
    
    res.json({
        success: true,
        dishes: todayDishes,
        count: todayDishes.length
    });
});

// ====== FUNCIÓN: GENERAR HTML DE ETIQUETA ======
function generateLabelHTML(dish) {
    const allergensHTML = dish.allergens.length > 0
        ? dish.allergens.map(code => {
            const allergen = ALLERGENS[code];
            return `
                <div class="allergen-item">
                    <span class="icon">${allergen.icon}</span>
                    <div>
                        <strong>${allergen.name}</strong>
                        <p>${allergen.description}</p>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="safe">✅ SIN ALÉRGENOS DETECTADOS</div>';
    
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
            font-family: Arial, sans-serif; 
            background: #f5f5f5; 
            padding: 20px;
            line-height: 1.6;
        }
        .label {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 1.8rem; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 0.9rem; }
        .content {
            padding: 30px;
        }
        .dish-info {
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .dish-name {
            font-size: 1.8rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .dish-meta {
            color: #7f8c8d;
            font-size: 0.9rem;
        }
        .allergens-section h3 {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .allergen-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background: #fff5f5;
            border-left: 4px solid #e74c3c;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .allergen-item .icon {
            font-size: 2rem;
        }
        .allergen-item strong {
            display: block;
            color: #c0392b;
            font-size: 1rem;
        }
        .allergen-item p {
            color: #7f8c8d;
            font-size: 0.85rem;
            margin-top: 4px;
        }
        .safe {
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border-radius: 12px;
            color: #155724;
            font-size: 1.2rem;
            font-weight: bold;
        }
        .print-btn {
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            color: white;
            border: none;
            padding: 15px;
            border-radius: 8px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            margin-top: 20px;
        }
        .print-btn:hover {
            opacity: 0.9;
        }
        @media print {
            body { background: white; padding: 0; }
            .print-btn { display: none; }
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="header">
            <h1>🍽️ ETIQUETA DE ALÉRGENOS</h1>
            <p>Normativa UE 1169/2011</p>
        </div>
        
        <div class="content">
            <div class="dish-info">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-meta">
                    <p>${dish.description}</p>
                    <p style="margin-top: 10px;">
                        <strong>Chef:</strong> ${dish.chef} | 
                        <strong>Fecha:</strong> ${dish.date}
                    </p>
                </div>
            </div>
            
            <div class="allergens-section">
                <h3>${dish.allergens.length > 0 ? '⚠️ Alérgenos Detectados' : '✅ Estado del Plato'}</h3>
                ${allergensHTML}
            </div>
            
            <button onclick="window.print()" class="print-btn">
                🖨️ Imprimir Etiqueta
            </button>
        </div>
    </div>
</body>
</html>`;
}

// Página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor activo en puerto ${port}`);
    console.log(`⚠️ ${Object.keys(ALLERGENS).length} alérgenos cargados`);
    console.log(`🥘 Base de ingredientes lista`);
    console.log('✅ Sistema simplificado funcionando');
});

module.exports = app;
