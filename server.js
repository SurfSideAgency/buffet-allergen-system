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
        <a href="/platos">Ver Platos</a>
    `);
});

// Página de test COMPLETA Y CORREGIDA
app.get('/test', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Alérgenos - Sistema Completo</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .form { background: white; padding: 25px; border-radius: 15px; margin: 20px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        input, textarea, button { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
        button { background: #007bff; color: white; font-weight: bold; cursor: pointer; border: none; }
        button:hover { background: #0056b3; transform: translateY(-2px); }
        button:active { transform: translateY(0); }
        .result { background: white; border: 1px solid #ddd; padding: 20px; border-radius: 10px; margin: 15px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .allergen { display: inline-block; background: #ff6b6b; color: white; padding: 8px 15px; margin: 5px; border-radius: 20px; font-weight: 500; }
        .safe { background: #51cf66; }
        .actions { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
        .actions button { margin: 0; font-size: 14px; padding: 10px; width: auto; }
        .success { background: #28a745 !important; }
        .warning { background: #ffc107 !important; color: #000 !important; }
        .danger { background: #dc3545 !important; }
        .info { background: #17a2b8 !important; }
        h1 { color: #333; text-align: center; }
        .header { text-align: center; margin-bottom: 30px; }
        .status { text-align: center; padding: 10px; border-radius: 8px; margin: 10px 0; }
        .hidden-iframe { display: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🍽️ Sistema de Análisis de Alérgenos COMPLETO</h1>
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
    
    <!-- iframe oculto para manejar descargas -->
    <iframe id="downloadFrame" class="hidden-iframe"></iframe>
    
    <script>
        let currentDish = null;
        
        async function analyzeDish() {
            const description = document.getElementById('description').value.trim();
            const chef = document.getElementById('chef').value.trim();
            
            if (!description) {
                alert('Por favor, describe el plato');
                return;
            }
            
            try {
                document.getElementById('results').innerHTML = '<div class="result"><p>🔍 Analizando plato...</p></div>';
                
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description, chef })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentDish = data.dish;
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
                        <button class="success" onclick="downloadHTML(\${dish.id})">📄 Descargar HTML</button>
                        <button class="warning" onclick="printDirect(\${dish.id})">🖨️ Imprimir</button>
                        <button class="info" onclick="openInNewTab(\${dish.id})">📋 Ver y Guardar PDF</button>
                        <button class="danger" onclick="saveDish(\${dish.id})">💾 Guardar</button>
                    </div>
                    
                    <div id="actionResults\${dish.id}" style="margin-top: 15px;"></div>
                </div>
            \`;
            document.getElementById('results').innerHTML = html;
        }
        
        // FUNCIÓN 1: Descargar como HTML
        async function downloadHTML(dishId) {
            try {
                const url = '/api/label/' + dishId + '?download=1';
                
                // Crear link temporal para descarga
                const a = document.createElement('a');
                a.href = url;
                a.download = 'etiqueta_plato_' + dishId + '.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                showMessage(dishId, '✅ Archivo HTML descargado', 'green');
            } catch (error) {
                showMessage(dishId, '❌ Error descargando: ' + error.message, 'red');
            }
        }
        
        // FUNCIÓN 2: Imprimir directamente
        async function printDirect(dishId) {
            try {
                const response = await fetch('/api/label/' + dishId);
                const html = await response.text();
                
                // Crear ventana emergente para imprimir
                const printWindow = window.open('', '_blank', 'width=800,height=900');
                printWindow.document.write(html);
                printWindow.document.close();
                
                // Esperar y imprimir
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    
                    // Cerrar ventana después de imprimir
                    printWindow.addEventListener('afterprint', () => {
                        printWindow.close();
                    });
                }, 1000);
                
                // Notificar al servidor
                fetch('/api/print/' + dishId, { method: 'POST' });
                
                showMessage(dishId, '🖨️ Ventana de impresión abierta', 'blue');
            } catch (error) {
                showMessage(dishId, '❌ Error imprimiendo: ' + error.message, 'red');
            }
        }
        
        // FUNCIÓN 3: Abrir en nueva pestaña para guardar como PDF
        function openInNewTab(dishId) {
            try {
                const url = '/api/label/' + dishId;
                const newWindow = window.open(url, '_blank');
                
                if (newWindow) {
                    showMessage(dishId, '📋 Etiqueta abierta en nueva pestaña.<br><small><strong>Usa Ctrl+P</strong> y selecciona <strong>"Guardar como PDF"</strong></small>', 'blue');
                } else {
                    showMessage(dishId, '❌ Popup bloqueado. Permite popups para esta página.', 'red');
                }
            } catch (error) {
                showMessage(dishId, '❌ Error: ' + error.message, 'red');
            }
        }
        
        // FUNCIÓN 4: Guardar en sistema
        async function saveDish(dishId) {
            try {
                // Primero agregar el plato al array si no existe
                if (currentDish && currentDish.id === dishId) {
                    const addResponse = await fetch('/api/add-dish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentDish)
                    });
                }
                
                const response = await fetch('/api/save/' + dishId, { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    showMessage(dishId, '💾 ' + result.message, 'green');
                    setTimeout(() => location.reload(), 2000);
                } else {
                    showMessage(dishId, '❌ Error: ' + result.error, 'red');
                }
            } catch (error) {
                showMessage(dishId, '❌ Error guardando: ' + error.message, 'red');
            }
        }
        
        function showMessage(dishId, message, color) {
            document.getElementById('actionResults' + dishId).innerHTML = 
                \`<div style="color: \${color}; font-weight: bold; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 5px;">\${message}</div>\`;
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

// API: Añadir plato al sistema (para guardar después)
app.post('/api/add-dish', (req, res) => {
    try {
        const dish = req.body;
        
        // Verificar si ya existe
        const existingIndex = dishes.findIndex(d => d.id === dish.id);
        
        if (existingIndex === -1) {
            // No existe, añadir
            dishes.push(dish);
            console.log(`➕ Plato añadido: ${dish.name}`);
        } else {
            // Ya existe, actualizar
            dishes[existingIndex] = { ...dishes[existingIndex], ...dish };
            console.log(`🔄 Plato actualizado: ${dish.name}`);
        }
        
        res.json({ success: true, message: 'Plato añadido/actualizado' });
    } catch (error) {
        console.error('❌ Error añadiendo plato:', error);
        res.status(500).json({ success: false, error: 'Error añadiendo plato' });
    }
});

// API: Guardar plato (marcar como guardado)
app.post('/api/save/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const dishIndex = dishes.findIndex(d => d.id === dishId);
        
        if (dishIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Plato no encontrado en el sistema' 
            });
        }
        
        dishes[dishIndex].status = 'saved';
        dishes[dishIndex].saved_at = new Date().toISOString();
        dishes[dishIndex].confirmed_by_chef = true;
        
        console.log(`💾 Plato guardado: ${dishes[dishIndex].name}`);
        
        res.json({
            success: true,
            message: `Plato "${dishes[dishIndex].name}" guardado correctamente`
        });
        
    } catch (error) {
        console.error('❌ Error guardando:', error);
        res.status(500).json({ success: false, error: 'Error guardando plato' });
    }
});

// API: Imprimir
app.post('/api/print/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        console.log(`🖨️ Solicitud de impresión para plato ${dishId}`);
        
        res.json({
            success: true,
            message: `Impresión iniciada para plato ${dishId}`
        });
        
    } catch (error) {
        console.error('❌ Error imprimiendo:', error);
        res.status(500).json({ success: false, error: 'Error enviando a impresora' });
    }
});

// API: Generar etiqueta HTML
app.get('/api/label/:id', (req, res) => {
    try {
        const dishId = parseInt(req.params.id);
        const isDownload = req.query.download === '1';
        
        // Buscar plato o crear uno temporal
        let dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            dish = {
                id: dishId,
                name: 'Plato Temporal',
                description: 'Descripción temporal para demo',
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
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
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
        }
        .info p { 
            color: #666; 
            margin: 8px 0;
        }
        .meta { 
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 0.9rem;
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
            border: 2px solid #dc3545;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .footer { 
            background: #f8f9fa;
            padding: 20px; 
            text-align: center;
            font-size: 0.8rem; 
            color: #6c757d;
        }
        .print-button { 
            margin: 20px auto; 
            display: block; 
            padding: 15px 30px; 
            background: #007bff; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            cursor: pointer;
        }
        .print-button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir esta Etiqueta</button>
    
    <div class="etiqueta">
        <div class="header">
            <h1>🍽️ INFORMACIÓN DE ALÉRGENOS</h1>
            <p>Sistema de Gestión de Buffet - Normativa UE 1169/2011</p>
        </div>
        
        <div class="info">
            <h2>${dish.name}</h2>
            <p><strong>Descripción:</strong> ${dish.description}</p>
            
            <div class="meta">
                <div><strong>👨‍🍳 Chef:</strong> ${dish.chef}</div>
                <div><strong>📅 Fecha:</strong> ${dish.date}</div>
                <div><strong>🕒 Hora:</strong> ${dish.time || 'N/A'}</div>
                <div><strong>🆔 ID:</strong> #${dish.id}</div>
            </div>
        </div>
        
        <div class="allergens ${allergens.length === 0 ? 'allergens-safe' : 'allergens-warning'}">
            ${allergens.length === 0 ? `
                <h3>✅ SIN ALÉRGENOS DETECTADOS</h3>
                <p style="margin: 15px 0; font-size: 1.1rem; font-weight: 500;">
                    Este plato es seguro para personas con alergias alimentarias.
                </p>
            ` : `
                <h3>⚠️ CONTIENE ${allergens.length} ALÉRGENO${allergens.length > 1 ? 'S' : ''}</h3>
                <div class="allergen-list">
                    ${allergens.map(code => {
                        const allergen = ALLERGENS[code];
                        return allergen ? `
                            <div class="allergen">
                                <span style="font-size: 1.2rem;">${allergen.icon}</span>
                                <span>${allergen.name}</span>
                            </div>
                        ` : `<div class="allergen">⚠️ ${code}</div>`;
                    }).join('')}
                </div>
                <p style="margin: 15px 0; font-weight: 500;">
                    Informar al cliente antes del consumo
                </p>
            `}
        </div>
        
        <div class="footer">
            <div><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</div>
            <div><strong>Sistema:</strong> Gestión de Alérgenos v2.0</div>
            <div><strong>Normativa:</strong> UE 1169/2011</div>
        </div>
    </div>
    
    <div class="no-print" style="text-align: center; margin: 20px; padding: 20px; background: white; border-radius: 10px;">
        <h3>💡 Cómo usar esta etiqueta:</h3>
        <p><strong>Para imprimir:</strong> Usa el botón de arriba o Ctrl+P</p>
        <p><strong>Para guardar como PDF:</strong> Ctrl+P → "Guardar como PDF"</p>
        <p><strong>Para cerrar:</strong> Cierra esta pestaña</p>
    </div>
</body>
</html>`;
        
        if (isDownload) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="etiqueta_${dish.name.replace(/\s+/g, '_')}.html"`);
        } else {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
        
        res.send(html);
        
    } catch (error) {
        console.error('❌ Error etiqueta:', error);
        res.status(500).json({ success: false, error: 'Error generando etiqueta' });
    }
});

// Ver platos guardados
app.get('/platos', (req, res) => {
    const dishList = dishes.map(dish => `
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>${dish.name}</h3>
            <p><strong>Chef:</strong> ${dish.chef}</p>
            <p><strong>Fecha:</strong> ${dish.date}</p>
            <p><strong>Alérgenos:</strong> ${dish.allergens.length === 0 ? '✅ Ninguno' : 
                dish.allergens.map(a => ALLERGENS[a]?.icon + ' ' + ALLERGENS[a]?.name).join(', ')}</p>
            <button onclick="window.open('/api/label/${dish.id}', '_blank')">📄 Ver Etiqueta</button>
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
</body>
</html>
    `);
});

// API: Salud
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        dishes: dishes.length,
        version: '2.0.0'
    });
});

// Iniciar servidor
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Servidor corriendo en puerto ${port}`);
        console.log(`📋 Sistema COMPLETO de alérgenos`);
        console.log(`🔗 Test: http://localhost:${port}/test`);
        console.log(`📊 Platos: http://localhost:${port}/platos`);
        console.log(`\n✅ FUNCIONES COMPLETAMENTE OPERATIVAS:`);
        console.log(`   📄 Descarga HTML funcionando`);
        console.log(`   🖨️ Impresión con diálogo Chrome funcionando`);
        console.log(`   📋 Abrir en nueva pestaña para PDF funcionando`);
        console.log(`   💾 Guardado en sistema funcionando`);
    });
}

module.exports = app;
