.dish-info {
            padding: 25px 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .dish-name {
            font-size: 1.6rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            text-align: center;
        }
        .allergen-section { 
            padding: 25px 20px; 
        }
        .safe-notice {
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            color: #155724;
        }
        .danger-notice {
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            border: 2px solid #dc3545;
            border-radius: 10px;
            padding: 20px;
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
            padding: 12px 15px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .allergen-item .icon {
            font-size: 1.5rem;
        }
        .footer {
            padding: 15px;
            background: #f8f9fa;
            text-align: center;
            font-size: 0.8rem;
            color: #6c757d;
        }
        @media print { 
            body { 
                background: white; 
                padding: 0; 
                margin: 0;
            }
            .label-container {
                box-shadow: none;
                width: 100%;
                max-width: 400px;
                margin: 0 auto;
            }
        }
    </style>
</head>
<body>
    <div class="label-container">
        <div class="header">
            <h1>🍽️ INFORMACIÓN ALIMENTARIA</h1>
            <p style="font-size: 0.9rem; opacity: 0.9;">Reglamento UE 1169/2011</p>
        </div>

        <div class="dish-info">
            <div class="dish-name">${dish.name}</div>
            <p style="text-align: center; color: #6c757d; font-size: 0.9rem;">
                ${dish.chef} | ${dish.date}
            </p>
        </div>

        <div class="allergen-section">
            ${hasAllergens ? `
                <div class="danger-notice">
                    <h3 style="margin-bottom: 10px; font-size: 1.1rem;">⚠️ CONTIENE ALÉRGENOS</h3>
                    <div class="allergen-list">
                        ${dish.allergens.map(code => {
                            const allergen = ALLERGENS[code];
                            if (!allergen) return '';
                            return `
                                <div class="allergen-item">
                                    <span class="icon">${allergen.icon}</span>
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; color: #dc3545;">${allergen.name}</div>
                                        <div style="font-size: 0.8rem; color: #6c757d; margin-top: 2px;">
                                            ${allergen.description}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : `
                <div class="safe-notice">
                    <h3 style="font-size: 1.2rem; margin-bottom: 10px;">✅ SIN ALÉRGENOS</h3>
                    <p>Este plato NO contiene ninguno de los 14 alérgenos de declaración obligatoria.</p>
                </div>
            `}
        </div>

        <div class="footer">
            <p>Sistema de Gestión de Alérgenos</p>
            <p>Documento generado el ${new Date().toLocaleString('es-ES')}</p>
        </div>
    </div>
</body>
</html>`;
}

// ====== FUNCIÓN: GENERAR RECETARIO OFICIAL PARA SANIDAD ======
function generateRecipeDocument(dish) {
    // Parsear ingredientes del texto si no hay lista estructurada
    const ingredientsList = dish.ingredients_text || dish.description;
    const ingredientsArray = ingredientsList
        .split(/[,;]/)
        .map(i => i.trim())
        .filter(i => i.length > 0);
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recetario - ${dish.name}</title>
    <style>
        @page { 
            size: A4; 
            margin: 20mm;
        }
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        body { 
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        .document {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .header h1 {
            color: #2c3e50;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .header-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
            font-size: 14px;
        }
        .section {
            margin: 25px 0;
            padding: 20px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            background: #f8f9fa;
        }
        .section h3 {
            margin: 0 0 15px 0;
            color: #2c3e50;
            font-size: 16px;
            border-bottom: 2px solid #D4AF37;
            padding-bottom: 8px;
        }
        .ingredients-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin: 15px 0;
        }
        .ingredient-item {
            padding: 5px 10px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #D4AF37;
        }
        .allergen-alert {
            background: #fff5f5;
            border: 2px solid #dc3545;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
        }
        .allergen-alert h4 {
            color: #dc3545;
            margin-bottom: 10px;
        }
        .allergen-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 10px;
        }
        .allergen-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: white;
            border-radius: 4px;
            border: 1px solid #fecaca;
        }
        .elaboration-box {
            min-height: 200px;
            padding: 15px;
            background: white;
            border: 2px solid #dee2e6;
            border-radius: 4px;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.8;
        }
        .elaboration-placeholder {
            color: #6c757d;
            font-style: italic;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 15px 0;
        }
        .info-item {
            padding: 10px;
            background: white;
            border-radius: 4px;
            text-align: center;
        }
        .info-item label {
            display: block;
            font-weight: bold;
            color: #6c757d;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .signature-section {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid #dee2e6;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
        }
        .signature-box {
            text-align: center;
        }
        .signature-line {
            border-top: 2px solid #333;
            margin-top: 60px;
            padding-top: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            font-size: 11px;
            color: #6c757d;
        }
        .no-allergens {
            background: #d4edda;
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            color: #155724;
        }
        @media print {
            .section {
                break-inside: avoid;
            }
            .signature-section {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="document">
        <!-- Encabezado -->
        <div class="header">
            <h1>📋 FICHA TÉCNICA - RECETARIO OFICIAL</h1>
            <div class="header-info">
                <div>
                    <p><strong>Establecimiento:</strong> _________________________</p>
                    <p><strong>Dirección:</strong> _________________________</p>
                    <p><strong>Nº Registro Sanitario:</strong> _________________________</p>
                </div>
                <div>
                    <p><strong>Fecha:</strong> ${dish.date}</p>
                    <p><strong>Código Receta:</strong> #${String(dish.id).padStart(5, '0')}</p>
                    <p><strong>Versión:</strong> 1.0</p>
                </div>
            </div>
        </div>

        <!-- Información del Plato -->
        <div class="section">
            <h3>📍 IDENTIFICACIÓN DEL PLATO</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p><strong>Nombre del Plato:</strong></p>
                    <p style="font-size: 18px; color: #2c3e50; font-weight: bold; margin-top: 5px;">
                        ${dish.name}
                    </p>
                </div>
                <div>
                    <p><strong>Categoría:</strong> Plato Principal</p>
                    <p><strong>Chef Responsable:</strong> ${dish.chef}</p>
                    <p><strong>Raciones:</strong> ___ personas</p>
                </div>
            </div>
        </div>

        <!-- Lista de Ingredientes -->
        <div class="section">
            <h3>🥘 LISTA DE INGREDIENTES</h3>
            <div class="ingredients-grid">
                ${ingredientsArray.map(ing => `
                    <div class="ingredient-item">• ${ing}</div>
                `).join('')}
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #6c757d;">
                <strong>Nota:</strong> Especificar cantidades exactas en gramos/litros según producción
            </p>
        </div>

        <!-- Información de Alérgenos -->
        <div class="section">
            <h3>⚠️ INFORMACIÓN DE ALÉRGENOS (Reglamento UE 1169/2011)</h3>
            ${dish.allergens && dish.allergens.length > 0 ? `
                <div class="allergen-alert">
                    <h4>⚠️ ESTE PLATO CONTIENE LOS SIGUIENTES ALÉRGENOS:</h4>
                    <div class="allergen-grid">
                        ${dish.allergens.map(code => {
                            const allergen = ALLERGENS[code];
                            if (!allergen) return '';
                            return `
                                <div class="allergen-item">
                                    <span style="font-size: 20px;">${allergen.icon}</span>
                                    <div>
                                        <strong>${allergen.name}</strong>
                                        <div style="font-size: 11px; color: #6c757d;">
                                            ${allergen.description}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                    <strong>Trazas:</strong> Posible contaminación cruzada: _________________________
                </p>
            ` : `
                <div class="no-allergens">
                    <h4>✅ PLATO SIN ALÉRGENOS</h4>
                    <p>Este plato NO contiene ninguno de los 14 alérgenos de declaración obligatoria</p>
                </div>
            `}
        </div>

        <!-- Proceso de Elaboración -->
        <div class="section">
            <h3>👨‍🍳 PROCESO DE ELABORACIÓN</h3>
            <div class="elaboration-box">
                ${dish.elaboration ? 
                    dish.elaboration : 
                    `<span class="elaboration-placeholder">
1. Preparación previa (mise en place):
   _____________________________________________________________
   _____________________________________________________________

2. Elaboración paso a paso:
   _____________________________________________________________
   _____________________________________________________________
   _____________________________________________________________
   _____________________________________________________________

3. Presentación y acabado:
   _____________________________________________________________
   _____________________________________________________________

4. Puntos críticos de control:
   _____________________________________________________________
   _____________________________________________________________
                    </span>`
                }
            </div>
        </div>

        <!-- Información Adicional -->
        <div class="section">
            <h3>📊 INFORMACIÓN TÉCNICA</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Temperatura de Servicio</label>
                    <p>_____ °C</p>
                </div>
                <div class="info-item">
                    <label>Tiempo de Conservación</label>
                    <p>_____ horas/días</p>
                </div>
                <div class="info-item">
                    <label>Tipo de Conservación</label>
                    <p>Refrigeración / Congelación</p>
                </div>
            </div>
            <div style="margin-top: 20px;">
                <p><strong>Valor Nutricional (por 100g):</strong></p>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
                    <div>Kcal: _____</div>
                    <div>Proteínas: _____g</div>
                    <div>Carbohidratos: _____g</div>
                    <div>Grasas: _____g</div>
                </div>
            </div>
        </div>

        <!-- Observaciones -->
        <div class="section">
            <h3>📝 OBSERVACIONES Y NOTAS</h3>
            <div style="min-height: 80px; padding: 10px; background: white; border: 1px dashed #dee2e6;">
                <p style="color: #6c757d; font-style: italic;">
                    _____________________________________________________________<br>
                    _____________________________________________________________<br>
                    _____________________________________________________________
                </p>
            </div>
        </div>

        <!-- Firmas -->
        <div class="signature-section">
            <div class="signature-box">
                <p><strong>ELABORADO POR</strong></p>
                <div class="signature-line">
                    <p>${dish.chef}</p>
                    <p style="font-size: 11px; color: #6c757d;">Chef de Cocina</p>
                </div>
            </div>
            <div class="signature-box">
                <p><strong>REVISADO POR</strong></p>
                <div class="signature-line">
                    <p>_________________</p>
                    <p style="font-size: 11px; color: #6c757d;">Jefe de Cocina</p>
                </div>
            </div>
            <div class="signature-box">
                <p><strong>APROBADO POR</strong></p>
                <div class="signature-line">
                    <p>_________________</p>
                    <p style="font-size: 11px; color: #6c757d;">Responsable de Calidad</p>
                </div>
            </div>
        </div>

        <!-- Pie de página -->
        <div class="footer">
            <p><strong>DOCUMENTO OFICIAL PARA CONTROL SANITARIO</strong></p>
            <p>Cumplimiento del Reglamento (UE) nº 1169/2011 sobre información alimentaria</p>
            <p>Real Decreto 126/2015 - Información alimentaria de alimentos sin envasar</p>
            <p style="margin-top: 10px;">
                Generado el ${new Date().toLocaleString('es-ES')} | 
                Sistema de Gestión de Alérgenos v1.0
            </p>
        </div>
    </div>
</body>
</html>`;
}

// ====== ESTADO DEL SISTEMA ======
app.get('/api/system-status', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        ingredients_count: Object.keys(INGREDIENTS).length,
        allergens_count: Object.keys(ALLERGENS).length,
        dishes_count: dishes.length,
        ai_enabled: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString(),
        version: '5.0.0 - Con Recetario'
    });
});

// ====== PÁGINA PRINCIPAL ======
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== INICIAR SERVIDOR ======
app.listen(port, () => {
    console.log(`🚀 Servidor en puerto ${port}`);
    console.log(`📋 Sistema de Alérgenos v5.0.0 - Con Recetario`);
    console.log(`🥘 ${Object.keys(INGREDIENTS).length} ingredientes configurados`);
    console.log(`⚠️ ${Object.keys(ALLERGENS).length} alérgenos UE`);
    console.log(`🤖 IA: ${process.env.OPENAI_API_KEY ? 'Activada (OpenAI)' : 'Desactivada (usando keywords)'}`);
    console.log('✅ Sistema listo');
    
    if (!process.env.OPENAI_API_KEY) {
        console.log('💡 Para activar IA, añade OPENAI_API_KEY en las variables de entorno');
    }
});

module.exports = app;// server.js - Sistema de Alérgenos con Recetario para Sanidad
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
    'gluten': { 
        name: 'Cereales con Gluten', 
        icon: '🌾', 
        description: 'Trigo, centeno, cebada, avena, espelta, kamut',
        keywords: ['trigo', 'harina', 'pan', 'pasta', 'centeno', 'cebada', 'avena', 'gluten', 'espelta', 'kamut', 'cuscús', 'bulgur', 'seitán']
    },
    'crustaceos': { 
        name: 'Crustáceos', 
        icon: '🦐', 
        description: 'Gambas, langostinos, cangrejos, langosta, cigalas',
        keywords: ['gambas', 'langostinos', 'cangrejo', 'camarón', 'bogavante', 'crustáceo', 'langosta', 'cigala', 'nécora', 'centollo', 'gamba']
    },
    'huevos': { 
        name: 'Huevos', 
        icon: '🥚', 
        description: 'Huevos y productos derivados',
        keywords: ['huevo', 'huevos', 'clara', 'yema', 'mayonesa', 'tortilla', 'merengue', 'albúmina', 'ovoalbúmina', 'lisozima']
    },
    'pescado': { 
        name: 'Pescado', 
        icon: '🐟', 
        description: 'Pescado y productos derivados',
        keywords: ['pescado', 'salmón', 'atún', 'merluza', 'bacalao', 'anchoa', 'sardina', 'lubina', 'dorada', 'rape', 'rodaballo', 'lenguado', 'boquerón', 'trucha']
    },
    'cacahuetes': { 
        name: 'Cacahuetes', 
        icon: '🥜', 
        description: 'Cacahuetes y productos derivados',
        keywords: ['cacahuete', 'cacahuetes', 'maní', 'crema de cacahuete', 'mantequilla de maní']
    },
    'soja': { 
        name: 'Soja', 
        icon: '🌱', 
        description: 'Soja y productos derivados',
        keywords: ['soja', 'salsa de soja', 'tofu', 'edamame', 'miso', 'tempeh', 'lecitina de soja', 'proteína de soja']
    },
    'lacteos': { 
        name: 'Leche y Lácteos', 
        icon: '🥛', 
        description: 'Leche y productos lácteos (incluida lactosa)',
        keywords: ['leche', 'queso', 'mantequilla', 'nata', 'yogur', 'crema', 'lácteo', 'lactosa', 'cuajada', 'requesón', 'ricota', 'mascarpone', 'suero', 'caseína']
    },
    'frutos_secos': { 
        name: 'Frutos de Cáscara', 
        icon: '🌰', 
        description: 'Almendras, avellanas, nueces, anacardos, pistachos, nueces de Brasil, macadamias',
        keywords: ['almendra', 'nuez', 'avellana', 'pistacho', 'anacardo', 'castaña', 'pecana', 'macadamia', 'nuez de Brasil', 'piñón']
    },
    'apio': { 
        name: 'Apio', 
        icon: '🥬', 
        description: 'Apio y productos derivados',
        keywords: ['apio', 'apionabo', 'sal de apio']
    },
    'mostaza': { 
        name: 'Mostaza', 
        icon: '🟡', 
        description: 'Mostaza y productos derivados',
        keywords: ['mostaza', 'mostaza de Dijon', 'grano de mostaza', 'salsa mostaza']
    },
    'sesamo': { 
        name: 'Granos de Sésamo', 
        icon: '🫘', 
        description: 'Sésamo y productos derivados',
        keywords: ['sésamo', 'sesamo', 'ajonjolí', 'tahini', 'tahina', 'pasta de sésamo', 'aceite de sésamo']
    },
    'sulfitos': { 
        name: 'Dióxido de azufre y sulfitos', 
        icon: '🍷', 
        description: 'En concentraciones superiores a 10 mg/kg o 10 mg/litro',
        keywords: ['vino', 'sulfito', 'conserva', 'vinagre', 'fruta seca', 'E220', 'E221', 'E222', 'E223', 'E224', 'E226', 'E227', 'E228']
    },
    'altramuces': { 
        name: 'Altramuces', 
        icon: '🫘', 
        description: 'Altramuces y productos derivados',
        keywords: ['altramuz', 'altramuces', 'lupino', 'harina de altramuz']
    },
    'moluscos': { 
        name: 'Moluscos', 
        icon: '🐚', 
        description: 'Mejillones, almejas, caracoles, ostras, caracolas, bígaros',
        keywords: ['mejillón', 'almeja', 'calamar', 'pulpo', 'sepia', 'caracol', 'molusco', 'ostra', 'vieira', 'navaja', 'berberecho', 'caracola', 'bígaro']
    }
};

// ====== BASE DE DATOS DE INGREDIENTES ======
const INGREDIENTS = {
    // CEREALES Y HARINAS
    'harina_trigo': { name: 'Harina de trigo', category: '🌾 Cereales', allergens: ['gluten'] },
    'pan': { name: 'Pan', category: '🌾 Cereales', allergens: ['gluten'] },
    'pan_rallado': { name: 'Pan rallado', category: '🌾 Cereales', allergens: ['gluten'] },
    'pasta': { name: 'Pasta', category: '🌾 Cereales', allergens: ['gluten'] },
    'arroz': { name: 'Arroz', category: '🌾 Cereales', allergens: [] },
    'avena': { name: 'Avena', category: '🌾 Cereales', allergens: ['gluten'] },
    'cebada': { name: 'Cebada', category: '🌾 Cereales', allergens: ['gluten'] },
    'centeno': { name: 'Centeno', category: '🌾 Cereales', allergens: ['gluten'] },
    
    // LÁCTEOS
    'leche': { name: 'Leche', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'queso': { name: 'Queso', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'queso_parmesano': { name: 'Queso parmesano', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'queso_manchego': { name: 'Queso manchego', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'mantequilla': { name: 'Mantequilla', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'nata': { name: 'Nata', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'yogur': { name: 'Yogur', category: '🥛 Lácteos', allergens: ['lacteos'] },
    'bechamel': { name: 'Bechamel', category: '🥛 Lácteos', allergens: ['lacteos', 'gluten'] },
    
    // HUEVOS
    'huevos': { name: 'Huevos', category: '🥚 Huevos', allergens: ['huevos'] },
    'clara_huevo': { name: 'Clara de huevo', category: '🥚 Huevos', allergens: ['huevos'] },
    'yema_huevo': { name: 'Yema de huevo', category: '🥚 Huevos', allergens: ['huevos'] },
    'mayonesa': { name: 'Mayonesa', category: '🥚 Huevos', allergens: ['huevos'] },
    
    // PESCADOS
    'salmon': { name: 'Salmón', category: '🐟 Pescados', allergens: ['pescado'] },
    'merluza': { name: 'Merluza', category: '🐟 Pescados', allergens: ['pescado'] },
    'bacalao': { name: 'Bacalao', category: '🐟 Pescados', allergens: ['pescado'] },
    'atun': { name: 'Atún', category: '🐟 Pescados', allergens: ['pescado'] },
    'lubina': { name: 'Lubina', category: '🐟 Pescados', allergens: ['pescado'] },
    'dorada': { name: 'Dorada', category: '🐟 Pescados', allergens: ['pescado'] },
    'anchoas': { name: 'Anchoas', category: '🐟 Pescados', allergens: ['pescado'] },
    
    // MARISCOS - CRUSTÁCEOS
    'gambas': { name: 'Gambas', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    'langostinos': { name: 'Langostinos', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    'cangrejo': { name: 'Cangrejo', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    'bogavante': { name: 'Bogavante', category: '🦐 Mariscos', allergens: ['crustaceos'] },
    
    // MARISCOS - MOLUSCOS
    'mejillones': { name: 'Mejillones', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'almejas': { name: 'Almejas', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'calamares': { name: 'Calamares', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'pulpo': { name: 'Pulpo', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'sepia': { name: 'Sepia', category: '🐚 Moluscos', allergens: ['moluscos'] },
    'ostras': { name: 'Ostras', category: '🐚 Moluscos', allergens: ['moluscos'] },
    
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
    'jamon': { name: 'Jamón', category: '🥓 Carnes', allergens: [] },
    
    // VERDURAS Y HORTALIZAS
    'tomate': { name: 'Tomate', category: '🍅 Verduras', allergens: [] },
    'cebolla': { name: 'Cebolla', category: '🧅 Verduras', allergens: [] },
    'ajo': { name: 'Ajo', category: '🧄 Verduras', allergens: [] },
    'pimiento': { name: 'Pimiento', category: '🫑 Verduras', allergens: [] },
    'apio': { name: 'Apio', category: '🥬 Verduras', allergens: ['apio'] },
    'zanahoria': { name: 'Zanahoria', category: '🥕 Verduras', allergens: [] },
    'lechuga': { name: 'Lechuga', category: '🥬 Verduras', allergens: [] },
    'patata': { name: 'Patata', category: '🥔 Verduras', allergens: [] },
    'calabacin': { name: 'Calabacín', category: '🥒 Verduras', allergens: [] },
    'berenjena': { name: 'Berenjena', category: '🍆 Verduras', allergens: [] },
    
    // SALSAS Y CONDIMENTOS
    'mostaza': { name: 'Mostaza', category: '🥫 Salsas', allergens: ['mostaza'] },
    'salsa_soja': { name: 'Salsa de soja', category: '🥫 Salsas', allergens: ['soja', 'gluten'] },
    'ketchup': { name: 'Ketchup', category: '🥫 Salsas', allergens: [] },
    'aceite_oliva': { name: 'Aceite de oliva', category: '🫒 Aceites', allergens: [] },
    'aceite_girasol': { name: 'Aceite de girasol', category: '🌻 Aceites', allergens: [] },
    'aceite_sesamo': { name: 'Aceite de sésamo', category: '🫒 Aceites', allergens: ['sesamo'] },
    'vinagre': { name: 'Vinagre', category: '🥫 Salsas', allergens: ['sulfitos'] },
    
    // ESPECIAS Y HIERBAS
    'azafran': { name: 'Azafrán', category: '🌿 Especias', allergens: [] },
    'pimenton': { name: 'Pimentón', category: '🌿 Especias', allergens: [] },
    'perejil': { name: 'Perejil', category: '🌿 Hierbas', allergens: [] },
    'oregano': { name: 'Orégano', category: '🌿 Hierbas', allergens: [] },
    'albahaca': { name: 'Albahaca', category: '🌿 Hierbas', allergens: [] },
    'romero': { name: 'Romero', category: '🌿 Hierbas', allergens: [] },
    'tomillo': { name: 'Tomillo', category: '🌿 Hierbas', allergens: [] },
    'laurel': { name: 'Laurel', category: '🌿 Hierbas', allergens: [] },
    
    // LEGUMBRES
    'lentejas': { name: 'Lentejas', category: '🫘 Legumbres', allergens: [] },
    'garbanzos': { name: 'Garbanzos', category: '🫘 Legumbres', allergens: [] },
    'judias': { name: 'Judías', category: '🫘 Legumbres', allergens: [] },
    'soja': { name: 'Soja', category: '🫘 Legumbres', allergens: ['soja'] },
    'altramuces': { name: 'Altramuces', category: '🫘 Legumbres', allergens: ['altramuces'] },
    
    // OTROS
    'vino_blanco': { name: 'Vino blanco', category: '🍷 Bebidas', allergens: ['sulfitos'] },
    'vino_tinto': { name: 'Vino tinto', category: '🍷 Bebidas', allergens: ['sulfitos'] },
    'cerveza': { name: 'Cerveza', category: '🍺 Bebidas', allergens: ['gluten'] },
    'tofu': { name: 'Tofu', category: '🌱 Vegetal', allergens: ['soja'] },
    'tahini': { name: 'Tahini', category: '🥫 Salsas', allergens: ['sesamo'] },
    'sal': { name: 'Sal', category: '🧂 Condimentos', allergens: [] },
    'azucar': { name: 'Azúcar', category: '🍯 Condimentos', allergens: [] },
    'miel': { name: 'Miel', category: '🍯 Condimentos', allergens: [] }
};

// ====== FUNCIÓN: DETECCIÓN DE ALÉRGENOS POR KEYWORDS ======
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

// ====== FUNCIÓN: DETECCIÓN CON IA (OPCIONAL - REQUIERE API KEY) ======
async function detectAllergensWithAI(description) {
    // Si tienes OpenAI API configurada
    if (process.env.OPENAI_API_KEY) {
        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: `Eres un experto en seguridad alimentaria. Detecta alérgenos según UE 1169/2011.
                    Los códigos de alérgenos son: ${Object.keys(ALLERGENS).join(', ')}.
                    Responde SOLO con los códigos de alérgenos detectados separados por comas, sin explicaciones.`
                }, {
                    role: "user",
                    content: `Detecta alérgenos en: ${description}`
                }],
                temperature: 0.3,
                max_tokens: 100
            });
            
            const allergensText = response.choices[0].message.content.trim();
            const detectedCodes = allergensText.split(',').map(a => a.trim()).filter(a => ALLERGENS[a]);
            
            console.log('🤖 IA detectó:', detectedCodes);
            return detectedCodes;
            
        } catch (error) {
            console.error('⚠️ Error con IA, usando detección por keywords:', error.message);
            return detectAllergens(description);
        }
    }
    
    // Si no hay API key, usar detección por keywords
    return detectAllergens(description);
}

// ====== ENDPOINT: ANALIZAR PLATO ======
app.post('/api/analyze', async (req, res) => {
    try {
        const { description, chef, elaboration, ingredients_list } = req.body;
        
        if (!description) {
            return res.status(400).json({
                success: false,
                error: 'Descripción del plato requerida'
            });
        }
        
        console.log(`🔍 Analizando: "${description}"`);
        
        // Detectar alérgenos (con IA si está disponible, si no con keywords)
        const detectedAllergens = await detectAllergensWithAI(description);
        
        // Extraer nombre del plato (primera parte antes de "con")
        let dishName = description.split('con')[0].trim();
        if (!dishName) dishName = description.substring(0, 50);
        
        // Crear objeto del plato
        const dish = {
            id: dishId++,
            name: dishName,
            description: description,
            chef: chef || 'Chef Principal',
            elaboration: elaboration || '',
            ingredients_text: ingredients_list || description,
            date: new Date().toLocaleDateString('es-ES'),
            timestamp: new Date().toISOString(),
            allergens: detectedAllergens,
            analysis_mode: process.env.OPENAI_API_KEY ? 'AI' : 'keywords'
        };
        
        // Guardar en memoria
        dishes.push(dish);
        
        console.log(`✅ Plato creado: ${dish.name} (ID: ${dish.id})`);
        console.log(`📊 ${detectedAllergens.length} alérgenos detectados`);
        
        res.json({
            success: true,
            dish: dish,
            allergens_info: detectedAllergens.map(code => ({
                code: code,
                name: ALLERGENS[code]?.name || code,
                icon: ALLERGENS[code]?.icon || '⚠️',
                description: ALLERGENS[code]?.description || ''
            }))
        });
        
    } catch (error) {
        console.error('❌ Error analizando:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando el análisis',
            details: error.message
        });
    }
});

// ====== ENDPOINT: ACTUALIZAR ALÉRGENOS ======
app.post('/api/update-allergens', (req, res) => {
    try {
        const { dishId, allergens } = req.body;
        
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }
        
        dish.allergens = allergens;
        console.log(`📝 Actualizados alérgenos de ${dish.name}`);
        
        res.json({
            success: true,
            dish: dish
        });
        
    } catch (error) {
        console.error('❌ Error actualizando:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando alérgenos'
        });
    }
});

// ====== ENDPOINT: GENERAR ETIQUETA BUFFET ======
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
        
        console.log(`📄 Generando etiqueta buffet: ${dish.name}`);
        
        const htmlContent = generateLabelHTML(dish);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="etiqueta_${dish.name.replace(/\s+/g, '_')}.html"`);
        res.send(htmlContent);
        
    } catch (error) {
        console.error('❌ Error generando etiqueta:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando etiqueta'
        });
    }
});

// ====== ENDPOINT: GENERAR RECETARIO PARA SANIDAD ======
app.post('/api/generate-recipe-document', (req, res) => {
    try {
        const { dishId } = req.body;
        
        const dish = dishes.find(d => d.id === dishId);
        if (!dish) {
            return res.status(404).json({
                success: false,
                error: 'Plato no encontrado'
            });
        }
        
        console.log(`📋 Generando recetario oficial: ${dish.name}`);
        
        const htmlContent = generateRecipeDocument(dish);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="recetario_${dish.name.replace(/\s+/g, '_')}.html"`);
        res.send(htmlContent);
        
    } catch (error) {
        console.error('❌ Error generando recetario:', error);
        res.status(500).json({
            success: false,
            error: 'Error generando recetario'
        });
    }
});

// ====== ENDPOINT: OBTENER PLATOS DE HOY ======
app.get('/api/dishes/today', (req, res) => {
    try {
        const today = new Date().toLocaleDateString('es-ES');
        const todayDishes = dishes
            .filter(dish => dish.date === today)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`📋 Devolviendo ${todayDishes.length} platos de hoy`);
        res.json({
            success: true,
            dishes: todayDishes,
            count: todayDishes.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo platos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo platos'
        });
    }
});

// ====== ENDPOINT: OBTENER INGREDIENTES ======
app.get('/api/ingredients', (req, res) => {
    try {
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

// ====== FUNCIÓN: GENERAR HTML ETIQUETA BUFFET ======
function generateLabelHTML(dish) {
    const hasAllergens = dish.allergens && dish.allergens.length > 0;
    
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
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .label-container {
            width: 400px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 { 
            font-size: 1.5rem; 
            margin-bottom: 5px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        .dish-info {
            padding: 25px 20px;
            border-bottom: 2px solid #f0f0f0;
