// REEMPLAZA la función app.get('/test') en tu server.js con esta versión:

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
        .actions { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-top: 15px; }
        .actions button { margin: 0; font-size: 14px; padding: 10px; }
        .success { background: #28a745; }
        .warning { background: #ffc107; color: #000; }
        .danger { background: #dc3545; }
        .info { background: #17a2b8; }
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
                        <button class="success" onclick="generateLabel(\${dish.id})">📄 Descargar HTML</button>
                        <button class="warning" onclick="printLabel(\${dish.id})">🖨️ Imprimir</button>
                        <button class="info" onclick="openLabelInNewTab(\${dish.id})">📋 Abrir Etiqueta</button>
                        <button class="danger" onclick="saveDish(\${dish.id})">💾 Guardar</button>
                    </div>
                    
                    <div id="actionResults\${dish.id}" style="margin-top: 15px;"></div>
                </div>
            \`;
            document.getElementById('results').innerHTML = html;
        }
        
        // FUNCIÓN CORREGIDA PARA DESCARGAR HTML
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
                        '<div style="color: green; font-weight: bold;">✅ Etiqueta descargada como HTML<br><small>Abre el archivo y usa Ctrl+P para imprimir o "Guardar como PDF"</small></div>';
                } else {
                    throw new Error('Error generando etiqueta');
                }
            } catch (error) {
                document.getElementById('actionResults' + dishId).innerHTML = 
                    '<div style="color: red; font-weight: bold;">❌ Error generando etiqueta: ' + error.message + '</div>';
            }
        }
        
        // FUNCIÓN CORREGIDA PARA IMPRIMIR - Abre diálogo de Chrome
        async function printLabel(dishId) {
            try {
                // Obtener la etiqueta HTML
                const response = await fetch(\`/api/label/\${dishId}\`);
                
                if (response.ok) {
                    const html = await response.text();
                    
                    // Crear nueva ventana para imprimir
                    const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
                    
                    // Escribir el HTML en la nueva ventana
                    printWindow.document.write(html);
                    printWindow.document.close();
                    
                    // Esperar a que cargue completamente
                    printWindow.onload = function() {
                        // Enfocar la ventana y abrir diálogo de impresión
                        printWindow.focus();
                        
                        // Pequeña pausa para asegurar que todo esté cargado
                        setTimeout(() => {
                            printWindow.print();
                            
                            // Opcional: cerrar ventana después de imprimir/cancelar
                            printWindow.onafterprint = function() {
                                printWindow.close();
                            };
                        }, 500);
                    };
                    
                    // Notificar al servidor que se imprimió
                    fetch('/api/print/' + dishId, { method: 'POST' });
                    
                    // Mostrar confirmación en la página
                    document.getElementById('actionResults' + dishId).innerHTML = 
                        '<div style="color: blue; font-weight: bold;">🖨️ Abriendo diálogo de impresión de Chrome...</div>';
                        
                } else {
                    throw new Error('Error obteniendo etiqueta');
                }
                
            } catch (error) {
                document.getElementById('actionResults' + dishId).innerHTML = 
                    '<div style="color: red; font-weight: bold;">❌ Error imprimiendo: ' + error.message + '</div>';
            }
        }
        
        // FUNCIÓN PARA ABRIR ETIQUETA EN NUEVA PESTAÑA
        async function openLabelInNewTab(dishId) {
            try {
                // Abrir la etiqueta directamente en nueva pestaña
                const url = \`/api/label/\${dishId}\`;
                const newTab = window.open(url, '_blank');
                
                if (newTab) {
                    // Mostrar instrucciones
                    document.getElementById('actionResults' + dishId).innerHTML = 
                        '<div style="color: blue; font-weight: bold;">📄 Etiqueta abierta en nueva pestaña<br><small>Usa <strong>Ctrl+P</strong> para imprimir o <strong>"Guardar como PDF"</strong> en el menú de impresión</small></div>';
                } else {
                    throw new Error('Popup bloqueado. Permite popups para esta página.');
                }
                
            } catch (error) {
                document.getElementById('actionResults' + dishId).innerHTML = 
                    '<div style="color: red; font-weight: bold;">❌ Error: ' + error.message + '</div>';
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
