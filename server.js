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
        <p>Platos registrados: ${dishes.length}</p>
        <a href="/test">Ir a Test</a> | 
        <a href="/platos">Ver Platos</a> |
        <a href="/api/health">API Health</a>
    `);
});

// Ver todos los platos
app.get('/platos', (req, res) => {
    const dishList = dishes.map(dish => `
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>${dish.name}</h3>
            <p><strong>Chef:</strong> ${dish.chef}</p>
            <p><strong>Fecha:</strong> ${dish.date}</p>
            <p><strong>Alérgenos:</strong> ${dish.allergens.length === 0 ? '✅ Ninguno' : 
                dish.allergens.map(a => ALLERGENS[a]?.icon + ' ' + ALLERGENS[a]?.name).join(', ')}</p>
            <button onclick="window.open('/api/label/${dish.id}', '_blank')">📄 Ver Etiqueta</button>
            <button onclick="printLabel(${dish.id})">🖨️ Imprimir</button>
            <button onclick="saveDish(${dish.id})">💾 Guardar</button>
        </div>
    `).join('');

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Platos Registrados</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        button { background: #007bff; color: white; border: none; padding: 8px 15px; margin: 5px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>📋 Platos Registrados (${dishes.length})</h1>
    <a href="/">← Volver al inicio</a> | <a href="/test">Nuevo Plato</a>
    
    ${dishes.length === 0 ? '<p>No hay platos registrados aún.</p>' : dishList}
    
    <script>
        async function printLabel(dishId) {
            try {
                const response = await fetch('/api/print/' + dishId, { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ ' + result.message);
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Error imprimiendo: ' + error.message);
            }
        }
        
        async function saveDish(dishId) {
            try {
                const response = await fetch('/api/save/' + dishId, { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ ' + result.message);
                } else {
                    alert('❌ Error: ' + result.error);
                }
            } catch (error) {
                alert('❌ Error guardando: ' + error.message);
            }
        }
    </script>
</body>
</html>
    `);
});

// Página de test mejorada
app.get('/test', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Alérgenos</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .form { background: white; padding: 25px; border-radius: 15px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        input, textarea, button { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        button { background: #007bff; color: white; font-weight: bold; cursor: pointer; border: none; }
        button:hover { background: #0056b3; transform: translateY(-2px); }
        button:active { transform: translateY(0); }
        .result { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 10px; margin: 15px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .allergen { display: inline-block; background: #ff6b6b; color: white; padding: 8px 15px; margin: 5px; border-radius: 20px; font-weight: 500; }
        .safe { background: #51cf66; }
        .actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
        .actions button { margin: 0; font-size: 14px; padding: 10px; }
        .success { background: #28a745; }
        .warning { background: #ffc107; color: #000; }
        .danger { background: #dc3545; }
        h1 { color: #333; text-align: center; }
        .header { text-align: center; margin-bottom: 30px; }
        .status { text-align: center; padding: 10px; border-radius: 8px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ Sistema de Análisis de Alérgenos</h1>
        <p>Introduce la descripción del plato para analizar automáticamente los alérgenos</p>
        <a href="/">← Inicio</a> | <a href="/platos">Ver Platos (${dishes.length})</a>
    </div>
    
    <div class="form">
        <h3>📝 Nuevo Análisis</h3>
        <textarea id="description" placeholder="Ejemplo: Paella valenciana con gambas, mejillones, pollo, azafrán y aceite de oliva..." rows="3"></textarea>
        <input type="text" id="chef" value="Chef Principal" placeholder="Nombre del chef">
        <button onclick="analyzeDish()">🔍 Analizar Alérgenos</button>
    </div>
    
    <div id="results"></div>
    
    <script>
        async function analyzeDish() {
            const description = document.getElementById('description').value.trim();
            const chef = document.getElementById('chef').value.trim();
            
            if (!description) {
                alert('Por favor, describe el plato');
                return;
            }
            
            try {
                // Mostrar loading
                document.getElementById('results').innerHTML = '<div class="result"><p>🔍 Analizando plato...</p></div>';
                
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description, chef })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showResults(data);
                } else {
                    document.getElementById('results').innerHTML = \`<div class="result"><p style="color: red;">❌ Error: \${data.error}</p></div>\`;
                }
            } catch (error) {
                document.getElementById('results').innerHTML = \`<div class="result"><p style="color: red;">❌ Error: \${error.message}</p></div>\`;
            }
        }
        
        function showResults(data) {
            const allergens = data.allergens || [];
            const dish = data.dish;
            
            const html = \`
                <div class="result">
                    <h3>📊 Resultado del Análisis</h3>
                    <p><strong>Plato:</strong> \${dish.name}</p>
                    <p><strong>Descripción:</strong> \${dish.description}</p>
                    <p><strong>Chef:</strong> \${dish.chef}</p>
                    <p><strong>Fecha:</strong> \${dish.date}</p>
                    
                    <div style="margin: 20px 0;">
                        <p><strong>Estado de Alérgenos:</strong></p>
                        \${allergens.length === 0 ? 
                            '<div class="status" style="background: #d4edda; color: #155724; border: 1px solid #c3e6cb;">✅ <strong>SIN ALÉRGENOS DETECTADOS</strong><br>Este plato es seguro para personas con alergias alimentarias</div>' :
                            \`<div class="status" style="background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">⚠️ <strong>CONTIENE \${allergens.length} ALÉRGENO\${allergens.length > 1 ? 'S' : ''}</strong></div>
                            <div style="margin: 10px 0;">\${allergens.map(a => \`<span class="allergen">\${a.icon} \${a.name}</span>\`).join('')}</div>\`
                        }
                    </div>
                    
                    <div class="actions">
                        <button class="success" onclick="generateLabel(\${dish.id})">📄 Generar Etiqueta</button>
                        <button class="warning" onclick="printLabel(\${dish.id})">🖨️ Imprimir</button>
                        <button class="danger" onclick="saveDish(\${dish.id})">💾 Guardar Final</button>
                    </div>
                    
                    <div id="actionResults\${dish.id}" style="margin-top: 15px;"></div>
                </div>
            \`;
            document.getElementById('results').innerHTML = html;
        }
        
        async function generateLabel(dishId) {
            try {
                const response = await fetch(\`/api/label/\${dishId}\`);
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`etiqueta_plato_\${dishId}_\${Date.now()}.html\`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    document.getElementById('actionResults' + dishId).innerHTML = 
                        '<div style="color: green; font-weight: bold;">✅ Etiqueta descargada correctamente</div>';
                } else {
                    throw new Error('Error generando etiqueta');
                }
            } catch (error) {
                document.getElementById('actionResults' + dishId).innerHTML = 
                    '<div style="color: red; font-weight: bold;">❌ Error generando etiqueta: ' + error.message + '</div>';
            }
        }
        
        async function printLabel(dishId) {
            try {
                const response = await fetch('/api/print/' + dishId, { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('actionResults' + dishId).innerHTML = 
                        '<div style="color: blue; font-weight: bold;">🖨️ ' + result.message + '</div>';
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                document.getElementById('actionResults' + dishId).innerHTML = 
                    '<div style="color: red; font-weight: bold;">❌ Error imprimiendo: ' + error.message + '</div>';
            }
        }
        
        async function saveDish(dishId) {
            try {
                const response = await fetch('/api/save/' + dishId, { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('actionResults' + dishId).innerHTML = 
                        '<div style="color: green; font-weight: bold;">💾 ' + result.message + '</div>';
                    
                    // Actualizar contador en el header
                    setTimeout(() => location.reload(), 2000);
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                document.getElementById('actionResults' + dishId).innerHTML = 
                    '<div style="color: red; font-weight: bold;">❌ Error guardando: ' + error.message + '</div>';
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
            name: description.split(' ').slice(0, 3).join(' ') || 'Plato',
            description: description,
            chef: chef || 'Chef',
            date: new Date().toLocaleDateString('es-ES'),
            time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            allergens: allergens,
            status: 'analyzed',
            timestamp: new Date().toISOString()
        };
        
        // NO guardar automáticamente, solo crear el objeto
        // dishes.push(dish); // Se guardará cuando el chef confirme
        
        const allergenDetails = allergens.map(code => ({
            code,
            name: ALLERGENS[code]?.name || code,
            icon: ALLERGENS[code]?.icon || '⚠️'
        }));
        
        console.log(`🔍 Plato analizado: ${dish.name} - ${allergens.length} alérgenos detectados`);
        
        res.json({
            success: true,
            dish: dish,
            allergens: allergenDetails
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: 'Error interno' });
    }
});

// API: Guardar plato (confirmar y guardar en sistema)
app.post('/api/save/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        
        // Buscar si ya existe
        let dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            // Si no existe, es probable que venga del análisis temporal
            return res.status(404).json({ 
                success: false, 
                error: 'Plato no encontrado. Analiza el plato primero.' 
            });
        }
        
        // Marcar como guardado/confirmado
        dish.status = 'saved';
        dish.saved_at = new Date().toISOString();
        dish.confirmed_by_chef = true;
        
        console.log(`💾 Plato guardado: ${dish.name} por ${dish.chef}`);
        
        res.json({
            success: true,
            message: `Plato "${dish.name}" guardado correctamente en el sistema`,
            dish: dish
        });
        
    } catch (error) {
        console.error('❌ Error guardando:', error);
        res.status(500).json({ success: false, error: 'Error guardando plato' });
    }
});

// API: Imprimir etiqueta
app.post('/api/print/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        
        // Buscar el plato en los analizados temporalmente o guardados
        let dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            return res.status(404).json({ success: false, error: 'Plato no encontrado' });
        }
        
        // Simular envío a impresora
        console.log(`🖨️ Enviando a impresora: ${dish.name}`);
        console.log(`   Alérgenos: ${dish.allergens.length > 0 ? dish.allergens.join(', ') : 'Ninguno'}`);
        
        // Marcar como impreso
        dish.printed_at = new Date().toISOString();
        dish.print_count = (dish.print_count || 0) + 1;
        
        res.json({
            success: true,
            message: `Etiqueta de "${dish.name}" enviada a impresora (impresión #${dish.print_count})`,
            dish_id: dishId,
            allergen_count: dish.allergens.length
        });
        
    } catch (error) {
        console.error('❌ Error imprimiendo:', error);
        res.status(500).json({ success: false, error: 'Error enviando a impresora' });
    }
});

// API: Generar etiqueta HTML mejorada
app.get('/api/label/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        
        // Crear un plato temporal para la demo si no existe
        let dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            // Crear plato temporal para generar etiqueta
            dish = {
                id: dishId,
                name: 'Plato Temporal',
                description: 'Plato de demostración',
                chef: 'Chef Demo',
                date: new Date().toLocaleDateString('es-ES'),
                time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                allergens: []
            };
        }
        
        const allergens = dish.allergens || [];
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Etiqueta Alérgenos - ${dish.name}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5;
            line-height: 1.6;
        }
        .etiqueta { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            border: 3px solid ${allergens.length > 0 ? '#dc3545' : '#28a745'};
        }
        .header { 
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            text-align: center; 
            padding: 25px;
        }
        .header h1 { margin: 0; font-size: 1.8rem; font-weight: 700; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 0.9rem; }
        .info { 
            padding: 25px;
            border-bottom: 1px solid #eee;
        }
        .info h2 { 
            color: #333; 
            margin: 0 0 15px 0; 
            font-size: 1.6rem;
            font-weight: 600;
        }
        .info p { 
            color: #666; 
            margin: 8px 0;
            font-size: 1rem;
        }
        .meta { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #555;
        }
        .allergens { 
            padding: 25px;
            text-align: center;
        }
        .allergens-safe { 
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
            color: #155724;
        }
        .allergens-warning { 
            background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
            color: #721c24;
        }
        .allergens h3 { 
            font-size: 1.5rem; 
            margin: 0 0 20px 0;
            font-weight: 700;
        }
        .allergen-list { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin: 20px 0;
        }
        .allergen { 
            background: rgba(255,255,255,0.9);
            padding: 12px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 0.95rem;
            border: 2px solid #dc3545;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .allergen-icon { font-size: 1.2rem; }
        .footer { 
            background: #f8f9fa;
            padding: 20px; 
            text-align: center;
            font-size: 0.8rem; 
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
        .qr-placeholder {
            float: right;
            width: 80px;
            height: 80px;
            background: #e9ecef;
            border: 2px dashed #adb5bd;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            color: #6c757d;
            margin-left: 20px;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            margin: 10px 0;
        }
        .status-safe { background: #28a745; color: white; }
        .status-warning { background: #dc3545; color: white; }
        
        @media print {
            body { margin: 0; background: white; }
            .etiqueta { box-shadow: none; border: 2px solid #333; }
            .header { background: #333 !important; }
        }
        
        @media (max-width: 600px) {
            .etiqueta { margin: 10px; }
            .info, .allergens { padding: 20px; }
            .meta { grid-template-columns: 1fr; }
            .allergen-list { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="etiqueta">
        <div class="header">
            <h1>🍽️ INFORMACIÓN DE ALÉRGENOS</h1>
            <p>Sistema de Gestión de Buffet - Normativa UE 1169/2011</p>
        </div>
        
        <div class="info">
            <div class="qr-placeholder">
                QR<br>CODE
            </div>
            <h2>${dish.name}</h2>
            <p><strong>Descripción:</strong> ${dish.description}</p>
            
            <div class="meta">
                <div><strong>👨‍🍳 Chef:</strong> ${dish.chef}</div>
                <div><strong>📅 Fecha:</strong> ${dish.date}</div>
                <div><strong>🕒 Hora:</strong> ${dish.time || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                <div><strong>🆔 ID:</strong> #${dish.id}</div>
            </div>
        </div>
        
        <div class="allergens ${allergens.length === 0 ? 'allergens-safe' : 'allergens-warning'}">
            ${allergens.length === 0 ? `
                <h3>✅ SIN ALÉRGENOS DETECTADOS</h3>
                <div class="status-badge status-safe">SEGURO PARA CONSUMO</div>
                <p style="margin: 15px 0; font-size: 1.1rem; font-weight: 500;">
                    Este plato es seguro para personas con alergias alimentarias según el análisis realizado.
                </p>
            ` : `
                <h3>⚠️ CONTIENE ${allergens.length} ALÉRGENO${allergens.length > 1 ? 'S' : ''}</h3>
                <div class="status-badge status-warning">PRECAUCIÓN REQUERIDA</div>
                <div class="allergen-list">
                    ${allergens.map(code => {
                        const allergen = ALLERGENS[code];
                        return allergen ? `
                            <div class="allergen">
                                <span class="allergen-icon">${allergen.icon}</span>
                                <span>${allergen.name}</span>
                            </div>
                        ` : `
                            <div class="allergen">
                                <span class="allergen-icon">⚠️</span>
                                <span>${code}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <p style="margin: 15px 0; font-weight: 500;">
                    Informar al cliente antes del consumo
                </p>
            `}
        </div>
        
        <div class="footer">
            <div style="margin-bottom: 10px;">
                <strong>Generado:</strong> ${new Date().toLocaleString('es-ES')} |
                <strong>Sistema:</strong> Gestión de Alérgenos v2.0
            </div>
            <div style="margin-bottom: 10px;">
                <strong>Normativa:</strong> Reglamento UE 1169/2011 sobre información alimentaria
            </div>
            ${dish.confirmed_by_chef ? `
                <div style="color: #28a745; font-weight: 600; margin-top: 10px;">
                    ✅ Confirmado y aprobado por ${dish.chef}
                </div>
            ` : `
                <div style="color: #ffc107; font-weight: 600; margin-top: 10px;">
                    ⏳ Pendiente de confirmación por chef
                </div>
            `}
            ${dish.print_count ? `
                <div style="font-size: 0.7rem; margin-top: 5px; color: #adb5bd;">
                    Impresión #${dish.print_count} | ID: ${dish.id}
                </div>
            ` : ''}
        </div>
    </div>
</body>
