// ====== ESTAS SON LAS FUNCIONES QUE SÍ FUNCIONABAN ======
// SUSTITUIR EN app.js O AÑADIR AL FINAL DEL HTML

// Variables globales que FUNCIONABAN
let currentDish = null;
let selectedAllergens = new Set();
let currentMode = 'hybrid';

// ====== FUNCIONES QUE FUNCIONABAN - RESTAURAR EXACTAS ======

async function generateLabel() {
    if (!currentDish) {
        alert('⚠️ Genera la etiqueta primero');
        return;
    }

    showLoading('Generando PDF...');

    try {
        // ESTA ERA LA IMPLEMENTACIÓN QUE FUNCIONABA
        const response = await fetch(`/api/generate-beautiful-single/${currentDish.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        // Descargar PDF - ESTO FUNCIONABA
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etiqueta_${currentDish.name.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showSuccessMessage('📄 PDF generado correctamente');

    } catch (error) {
        console.error('Error:', error);
        alert('Error generando PDF: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function printLabel() {
    if (!currentDish) {
        alert('⚠️ Genera la etiqueta primero');
        return;
    }

    showLoading('Enviando a impresora...');

    try {
        // ESTA ERA LA IMPLEMENTACIÓN QUE FUNCIONABA
        const response = await fetch(`/api/print-directly/${currentDish.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const result = await response.json();

        if (result.success) {
            showSuccessMessage('🖨️ ' + result.message);
        } else {
            throw new Error(result.error || 'Error de impresión');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error imprimiendo: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function saveDish() {
    if (!currentDish) {
        alert('⚠️ Genera el plato primero');
        return;
    }

    showLoading('Guardando plato...');
    
    try {
        // ESTA ERA LA IMPLEMENTACIÓN QUE FUNCIONABA
        const dishData = {
            dish_id: currentDish.id,
            manual_allergens: Array.from(selectedAllergens),
            chef_notes: `Análisis en modo ${currentMode}. Alérgenos confirmados por chef.`,
            final_analysis_mode: currentMode
        };

        const response = await fetch('/api/save-manual-allergens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dishData)
        });

        const data = await response.json();

        if (data.success) {
            showSuccessMessage('💾 Plato guardado correctamente');
            loadTodaysDishes();
        } else {
            throw new Error(data.error || 'Error guardando plato');
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error guardando plato: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ====== FUNCIÓN DE ANÁLISIS QUE FUNCIONABA ======

async function analyzeDish() {
    const description = document.getElementById('dishDescription').value.trim();
    const chef = document.getElementById('chefName').value.trim() || 'Chef Principal';

    if (!description) {
        alert('Por favor, describe el plato');
        return;
    }

    showLoading('Analizando plato...');

    try {
        // ESTA ERA LA LLAMADA QUE FUNCIONABA
        const response = await fetch('/api/analyze-dish-hybrid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                chef_name: chef,
                analysis_mode: currentMode
            })
        });

        const data = await response.json();

        if (data.success) {
            // ESTO FUNCIONABA - currentDish se asignaba correctamente
            currentDish = data.dish;
            selectedAllergens = new Set(data.analysis.allergens || []);
            
            // Mostrar resultados
            document.getElementById('resultsPanel').classList.remove('hidden');
            displayResults(data);
            
            showSuccessMessage('✅ Análisis completado');
        } else {
            throw new Error(data.error || 'Error en el análisis');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error analizando el plato: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ====== FUNCIONES DE UI QUE FUNCIONABAN ======

function showLoading(message) {
    const modal = document.getElementById('loadingModal');
    const text = document.getElementById('loadingText');
    
    if (modal) modal.classList.remove('hidden');
    if (text) text.textContent = message || 'Procesando...';
}

function hideLoading() {
    const modal = document.getElementById('loadingModal');
    if (modal) modal.classList.add('hidden');
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function displayResults(data) {
    // Mostrar información del plato
    const dishInfo = document.getElementById('dishInfo');
    if (dishInfo) {
        dishInfo.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="font-bold text-lg">${currentDish.name}</h4>
                    <p class="text-gray-600">${currentDish.description}</p>
                    <div class="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span>👨‍🍳 ${currentDish.chef}</span>
                        <span>🕒 ${new Date(currentDish.timestamp).toLocaleTimeString('es-ES')}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Actualizar resumen de alérgenos
    updateSummary();
}

function updateSummary() {
    const count = selectedAllergens.size;
    
    const confirmedList = document.getElementById('confirmedAllergens');
    const safetyStatus = document.getElementById('safetyStatus');

    if (confirmedList && safetyStatus) {
        if (count === 0) {
            confirmedList.innerHTML = '<span class="text-green-600 font-semibold">✅ Ninguno detectado</span>';
            safetyStatus.innerHTML = '<span class="text-green-600">✅ Seguro para consumo general</span>';
        } else {
            const allergenNames = Array.from(selectedAllergens).join(', ');
            confirmedList.innerHTML = `<span class="text-red-600 font-semibold">${allergenNames}</span>`;
            safetyStatus.innerHTML = `<span class="text-red-600">⚠️ Contiene ${count} alérgeno${count > 1 ? 's' : ''}</span>`;
        }
    }
}

async function loadTodaysDishes() {
    try {
        const response = await fetch('/api/dishes/today');
        const dishes = await response.json();
        
        const container = document.getElementById('todayDishes');
        const counter = document.getElementById('todayCount');
        
        if (counter) counter.textContent = dishes.length;
        
        if (container && dishes.length > 0) {
            container.innerHTML = dishes.map(dish => `
                <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <h4 class="font-semibold text-gray-800">${dish.name}</h4>
                    <div class="flex items-center justify-between text-sm text-gray-600 mt-2">
                        <span>👨‍🍳 ${dish.chef}</span>
                        <span>🕒 ${new Date(dish.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="mt-2 flex gap-2">
                        <button onclick="downloadDishLabel(${dish.id})" 
                                class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors">
                            📄 PDF
                        </button>
                        <button onclick="printDishLabel(${dish.id})" 
                                class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors">
                            🖨️ Print
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando platos:', error);
    }
}

// Funciones para botones de la lista
async function downloadDishLabel(dishId) {
    showLoading('Descargando...');
    try {
        const response = await fetch(`/api/generate-beautiful-single/${dishId}`, {
            method: 'POST'
        });
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etiqueta_${dishId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccessMessage('📄 Descargado');
    } catch (error) {
        alert('Error descargando: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function printDishLabel(dishId) {
    showLoading('Imprimiendo...');
    try {
        const response = await fetch(`/api/print-directly/${dishId}`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('🖨️ Enviado a impresora');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert('Error imprimiendo: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ====== INICIALIZACIÓN QUE FUNCIONABA ======

document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para botones principales
    const analyzeBtn = document.getElementById('analyzeBtn');
    const generateBtn = document.getElementById('generateLabelBtn');
    const printBtn = document.getElementById('printBtn');
    const saveBtn = document.getElementById('saveBtn');
    
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeDish);
    if (generateBtn) generateBtn.addEventListener('click', generateLabel);
    if (printBtn) printBtn.addEventListener('click', printLabel);
    if (saveBtn) saveBtn.addEventListener('click', saveDish);
    
    // Cargar platos del día
    loadTodaysDishes();
    
    console.log('✅ Sistema restaurado - Funciones que funcionaban activadas');
});

// Exponer funciones globalmente
window.analyzeDish = analyzeDish;
window.generateLabel = generateLabel;
window.printLabel = printLabel;
window.saveDish = saveDish;
window.downloadDishLabel = downloadDishLabel;
window.printDishLabel = printDishLabel;

console.log('🔄 FUNCIONES RESTAURADAS - Las que SÍ funcionaban están activas');
