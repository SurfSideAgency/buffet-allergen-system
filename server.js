const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Datos en memoria
let dishes = [];
let dishId = 1;

// Alérgenos básicos
const ALLERGENS = {
    'gluten': { name: 'Gluten', icon: '🌾' },
    'crustaceos': { name: 'Crustáceos', icon: '🦐' },
    'huevos': { name: 'Huevos', icon: '🥚' },
    'pescado': { name: 'Pescado', icon: '🐟' },
    'lacteos': { name: 'Lácteos', icon: '🥛' },
    'frutos_secos': { name: 'Frutos Secos', icon: '🌰' },
    'moluscos': { name: 'Moluscos', icon: '🐚' }
};

// Análisis simple por keywords
function analyzeSimple(description) {
    const detected = [];
    const desc = description.toLowerCase();
    
    if (desc.includes('gamba') || desc.includes('langostino')) detected.push('crustaceos');
    if (desc.includes('mejillon') || desc.includes('almeja')) detected.push('moluscos');
    if (desc.includes('huevo') || desc.includes('mayonesa')) detected.push('huevos');
    if (desc.includes('queso') || desc.includes('leche')) detected.push('lacteos');
    if (desc.includes('harina') || desc.includes('pan')) detected.push('gluten');
    if (desc.includes('pescado') || desc.includes('salmon')) detected.push('pescado');
    if (desc.includes('almendra') || desc.includes('nuez')) detected.push('frutos_secos');
    
    return detected;
}

// === ENDPOINTS ===

// Test básico
app.get('/', (req, res) => {
    res.send(`
        <h1>🍽️ Sistema de Alérgenos</h1>
        <p>Estado: ✅ Funcionando</p>
        <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
        <a href="/test">Ir a Test</a>
    `);
});

// Página de test
app.get('/test', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Alérgenos</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .form { background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; }
        input, textarea, button { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
        button { background: #007bff; color: white; font-weight: bold; cursor: pointer; }
        button:hover { background: #0056b3; }
        .result { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .allergen { display: inline-block; background: #ff6b6b; color: white; padding: 5px 10px; margin: 3px; border-radius: 15px; }
    </style>
</head>
<body>
    <h1>🍽️ Test Sistema de Alérgenos</h1>
    
    <div class="form">
        <h3>Analizar Plato</h3>
        <textarea id="description" placeholder="Describe el plato (ej: Paella con gambas y mejillones)"></textarea>
        <input type="text" id="chef" value="Chef Test" placeholder="Nombre del chef">
        <button onclick="analyzedish()">🔍 Analizar</button>
    </div>
    
    <div id="results"></div>
    
    <script>
        async function analyzeDish() {
            const description = document.getElementById('description').value;
            const chef = document.getElementById('chef').value;
            
            if (!description) {
                alert('Describe el plato');
                return;
            }
            
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description, chef })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showResults(data);
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
        
        function showResults(data) {
            const allergens = data.allergens || [];
            const html = \`
                <div class="result">
                    <h3>\${data.dish.name}</h3>
                    <p><strong>Descripción:</strong> \${data.dish.description}</p>
                    <p><strong>Chef:</strong> \${data.dish.chef}</p>
                    <p><strong>Alérgenos detectados:</strong></p>
                    \${allergens.length === 0 ? 
                        '<p style="color: green;">✅ Sin alérgenos detectados</p>' :
                        allergens.map(a => \`<span class="allergen">\${a.icon} \${a.name}</span>\`).join('')
                    }
                    <br><br>
                    <button onclick="generateLabel(\${data.dish.id})">📄 Generar Etiqueta</button>
                </div>
            \`;
            document.getElementById('results').innerHTML = html;
        }
        
        async function generateLabel(dishId) {
            try {
                const response = await fetch(\`/api/label/\${dishId}\`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'etiqueta.html';
                a.click();
            } catch (error) {
                alert('Error generando etiqueta: ' + error.message);
            }
        }
    </script>
</body>
</html>
    `);
});

// API: Analizar plato
app.post('/api/analyze', (req, res) => {
    try {
        const { description, chef } = req.body;
        
        if (!description) {
            return res.status(400).json({ success: false, error: 'Descripción requerida' });
        }
        
        const allergens = analyzeSimple(description);
        
        const dish = {
            id: dishId++,
            name: description.split(' ').slice(0, 3).join(' '),
            description: description,
            chef: chef || 'Chef',
            date: new Date().toLocaleDateString('es-ES'),
            allergens: allergens
        };
        
        dishes.push(dish);
        
        const allergenDetails = allergens.map(code => ({
            code,
            name: ALLERGENS[code]?.name || code,
            icon: ALLERGENS[code]?.icon || '⚠️'
        }));
        
        console.log(`✅ Plato analizado: ${dish.name} - ${allergens.length} alérgenos`);
        
        res.json({
            success: true,
            dish: dish,
            allergens: allergenDetails
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Error interno' });
    }
});

// API: Generar etiqueta
app.get('/api/label/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }
        
        const allergens = dish.allergens || [];
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Etiqueta - ${dish.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .etiqueta { max-width: 500px; margin: 0 auto; border: 2px solid #333; padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .allergens { background: ${allergens.length > 0 ? '#ffe6e6' : '#e6ffe6'}; padding: 15px; border-radius: 5px; }
        .allergen { display: inline-block; background: #ff4444; color: white; padding: 3px 8px; margin: 2px; border-radius: 10px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="etiqueta">
        <div class="header">
            <h2>🍽️ INFORMACIÓN DE ALÉRGENOS</h2>
            <p>Sistema de Gestión de Buffet</p>
        </div>
        
        <h3>${dish.name}</h3>
        <p><strong>Descripción:</strong> ${dish.description}</p>
        <p><strong>Chef:</strong> ${dish.chef}</p>
        <p><strong>Fecha:</strong> ${dish.date}</p>
        
        <div class="allergens">
            ${allergens.length === 0 ? `
                <h4 style="color: green;">✅ SIN ALÉRGENOS</h4>
                <p>Este plato es seguro para personas con alergias.</p>
            ` : `
                <h4 style="color: red;">⚠️ CONTIENE ALÉRGENOS</h4>
                ${allergens.map(code => {
                    const allergen = ALLERGENS[code];
                    return `<span class="allergen">${allergen?.icon || '⚠️'} ${allergen?.name || code}</span>`;
                }).join('')}
            `}
        </div>
        
        <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
            Generado: ${new Date().toLocaleString('es-ES')}<br>
            Sistema de Alérgenos v1.0
        </p>
    </div>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="etiqueta_${dish.name.replace(/\s+/g, '_')}.html"`);
        res.send(html);
        
    } catch (error) {
        console.error('Error etiqueta:', error);
        res.status(500).json({ success: false, error: 'Error generando etiqueta' });
    }
});

// API: Salud
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        dishes: dishes.length,
        version: '1.0.0'
    });
});

// Iniciar servidor
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Servidor corriendo en puerto ${port}`);
        console.log(`📋 Sistema básico de alérgenos`);
        console.log(`🔗 Test: http://localhost:${port}/test`);
    });
}

module.exports = app;
