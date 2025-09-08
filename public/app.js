// app.js - Sistema de Alérgenos FUNCIONAL COMPLETO

// ====== VARIABLES GLOBALES ======
let currentMode = 'hybrid';
let currentDish = null;
let selectedAllergens = new Set();
let aiSuggestedAllergens = new Set();
let originalAIAllergens = new Set();
let stats = { ai: 0, manual: 0, allergens: 0, hybrid: 0 };

// Lista completa de alérgenos UE
const ALLERGENS = {
    'gluten': { name: 'Cereales con Gluten', icon: '🌾', description: 'Trigo, centeno, cebada, avena' },
    'crustaceos': { name: 'Crustáceos', icon: '🦐', description: 'Gambas, langostinos, cangrejos' },
    'huevos': { name: 'Huevos', icon: '🥚', description: 'Huevos y productos derivados' },
    'pescado': { name: 'Pescado', icon: '🐟', description: 'Pescado y productos derivados' },
    'cacahuetes': { name: 'Cacahuetes', icon: '🥜', description: 'Cacahuetes y productos derivados' },
    'soja': { name: 'Soja', icon: '🌱', description: 'Soja y productos derivados' },
    'lacteos': { name: 'Leche y Lácteos', icon: '🥛', description: 'Leche y productos lácteos' },
    'frutos_secos': { name: 'Frutos de Cáscara', icon: '🌰', description: 'Almendras, nueces, avellanas...' },
    'apio': { name: 'Apio', icon: '🥬', description: 'Apio y productos derivados' },
    'mostaza': { name: 'Mostaza', icon: '🟡', description: 'Mostaza y productos derivados' },
    'sesamo': { name: 'Granos de Sésamo', icon: '🫘', description: 'Sésamo y productos derivados' },
    'sulfitos': { name: 'Sulfitos', icon: '🍷', description: 'Vino, conservas, frutos secos' },
    'altramuces': { name: 'Altramuces', icon: '🫘', description: 'Altramuces y productos derivados' },
    'moluscos': { name: 'Moluscos', icon: '🐚', description: 'Mejillones, almejas, caracoles...' }
};

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Alérgenos v2.0');
    initializeApp();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

function initializeApp() {
    setupEventListeners();
    renderAllergenGrid();
    loadTodaysDishes();
    updateStats();
    setAnalysisMode('hybrid');
    console.log('✅ Sistema inicializado correctamente');
}

function setupEventListeners() {
    // Enter key para analizar
    const dishInput = document.getElementById('dishDescription');
    if (dishInput) {
        dishInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                analyzeDish();
            }
        });
    }
    
    console.log('👂 Event listeners configurados');
}

// ====== GESTIÓN DE MODOS ======

function setAnalysisMode(mode) {
    currentMode = mode;
    console.log(`🎯 Modo de análisis cambiado a: ${mode}`);
    
    // Actualizar UI del selector
    document.querySelectorAll('.toggle-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Limpiar selecciones anteriores si cambia el modo
    if (currentDish) {
        selectedAllergens.clear();
        aiSuggestedAllergens.clear();
        renderAllergenGrid();
        updateSummary();
    }
    
    updatePlaceholderByMode(mode);
}

function updatePlaceholderByMode(mode) {
    const dishInput = document.getElementById('dishDescription');
    if (!dishInput) return;
    
    const placeholders = {
        'ai': 'Describe el plato y la IA detectará automáticamente todos los alérgenos...',
        'manual': 'Describe el plato y selecciona manualmente todos los alérgenos...',
        'hybrid': 'Describe el plato: la IA detectará alérgenos y tú podrás revisar y modificar...'
    };
    
    dishInput.placeholder = placeholders[mode] || placeholders.hybrid;
}

// ====== ANÁLISIS DE PLATOS ======

async function analyzeDish() {
    const description = document.getElementById('dishDescription').value.trim();
    const chef = document.getElementById('chefName').value.trim() || 'Chef Principal';

    if (!description) {
        showError('Por favor, describe el plato antes de analizar');
        return;
    }

    console.log(`🔍 Iniciando análisis en modo: ${currentMode}`);
    console.log(`📝 Plato: ${description}`);
    
    showLoading('Analizando plato...');
    updateLoadingMessage(currentMode);

    try {
        // Llamada al endpoint híbrido
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

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error en el análisis');
        }

        console.log(`✅ Análisis completado:`, data);
        
        // Procesar resultados
        currentDish = data.dish;
        
        // Configurar alérgenos según el modo
        if (currentMode === 'manual') {
            // Modo manual: no sugerencias de IA
            aiSuggestedAllergens.clear();
            selectedAllergens.clear();
        } else {
            // Modo AI o híbrido: usar sugerencias de IA
            const detectedAllergens = data.analysis.allergens || [];
            aiSuggestedAllergens = new Set(detectedAllergens);
            originalAIAllergens = new Set(detectedAllergens);
            
            if (currentMode === 'ai') {
                // Modo IA: aceptar automáticamente sugerencias
                selectedAllergens = new Set(detectedAllergens);
            } else {
                // Modo híbrido: empezar con sugerencias de IA
                selectedAllergens = new Set(detectedAllergens);
            }
        }

        displayResults(data);
        updateStats();

    } catch (error) {
        console.error('❌ Error en análisis:', error);
        showError(`Error analizando el plato: ${error.message}`);
    } finally {
        hideLoading();
    }
}

function updateLoadingMessage(mode) {
    const messages = {
        'ai': 'La IA está analizando automáticamente...',
        'manual': 'Preparando interfaz manual...',
        'hybrid': 'IA analizando + preparando revisión manual...'
    };
    
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = messages[mode] || messages.hybrid;
    }
}

// ====== MOSTRAR RESULTADOS ======

function displayResults(data) {
    console.log('📋 Mostrando resultados del análisis');
    
    // Mostrar panel de resultados
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) {
        resultsPanel.classList.remove('hidden');
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Información del plato
    displayDishInfo(data.dish);
    
    // Mostrar sugerencias de IA si aplica
    displayAISuggestions(data);
    
    // Renderizar grid de alérgenos
    renderAllergenGrid();
    
    // Actualizar resumen
    updateSummary();
    
    console.log('✅ Resultados mostrados correctamente');
}

function displayDishInfo(dish) {
    const dishInfo = document.getElementById('dishInfo');
    if (!dishInfo) return;
    
    const analysisMode = dish.analysis_mode || 'hybrid';
    const modeText = {
        'ai': '🤖 Solo IA',
        'manual': '👨‍🍳 Solo Manual',
        'hybrid': '🤖➕👨‍🍳 Híbrido'
    }[analysisMode] || '🤖➕👨‍🍳 Híbrido';

    dishInfo.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <h4 class="font-bold text-lg text-gray-800 mb-1">${dish.name}</h4>
                <p class="text-gray-600 mb-3">${dish.description}</p>
                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span class="flex items-center">
                        <span class="mr-1">👨‍🍳</span>
                        <span>${dish.chef}</span>
                    </span>
                    <span class="flex items-center">
                        <span class="mr-1">📅</span>
                        <span>${dish.date}</span>
                    </span>
                    <span class="flex items-center">
                        <span class="mr-1">🕒</span>
                        <span>${new Date(dish.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    <span class="flex items-center">
                        <span class="mr-1">⚙️</span>
                        <span>${modeText}</span>
                    </span>
                </div>
            </div>
            <div class="text-4xl ml-4">🍽️</div>
        </div>
    `;
}

function displayAISuggestions(data) {
    const aiSuggestions = document.getElementById('aiSuggestions');
    if (!aiSuggestions) return;
    
    const analysis = data.analysis;
    const hasAIDetections = analysis.allergens && analysis.allergens.length > 0;
    
    if (currentMode === 'hybrid' && hasAIDetections) {
        aiSuggestions.classList.remove('hidden');
        
        const confidence = analysis.confidence || {};
        const avgConfidence = Object.keys(confidence).length > 0 
            ? Object.values(confidence).reduce((a, b) => a + b, 0) / Object.keys(confidence).length 
            : 0;
        
        const aiList = document.getElementById('aiDetectedList');
        if (aiList) {
            aiList.innerHTML = analysis.allergens.map(code => {
                const allergen = ALLERGENS[code];
                if (!allergen) return '';
                const conf = confidence[code] || 0;
                return `
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer"
                          onclick="toggleAllergen('${code}')">
                        ${allergen.icon} ${allergen.name}
                        <span class="ml-1 text-xs">(${Math.round(conf * 100)}%)</span>
                    </span>
                `;
            }).join('');
        }
        
        const aiConfidence = document.getElementById('aiConfidence');
        if (aiConfidence) {
            aiConfidence.textContent = Math.round(avgConfidence * 100) + '%';
        }
    } else {
        aiSuggestions.classList.add('hidden');
    }
}

// ====== GRID DE ALÉRGENOS ======

function renderAllergenGrid() {
    const grid = document.getElementById('allergenGrid');
    if (!grid) return;
    
    console.log('🎨 Renderizando grid de alérgenos');
    
    grid.innerHTML = Object.entries(ALLERGENS).map(([code, allergen]) => {
        const isSelected = selectedAllergens.has(code);
        const isAISuggested = aiSuggestedAllergens.has(code);
        const wasOriginallyAI = originalAIAllergens.has(code);
        
        let cardClass = 'allergen-card';
        let statusClass = '';
        let statusIcon = '';
        
        // Determinar estado visual
        if (isSelected && wasOriginallyAI) {
            if (currentMode === 'hybrid') {
                cardClass += ' ai-detected selected';
                statusClass = 'status-hybrid';
                statusIcon = '🤖✓';
            } else {
                cardClass += ' selected';
                statusClass = 'status-ai';
                statusIcon = '🤖';
            }
        } else if (isSelected && !wasOriginallyAI) {
            cardClass += ' selected';
            statusClass = 'status-manual';
            statusIcon = '👨‍🍳';
        } else if (isAISuggested && !isSelected) {
            cardClass += ' ai-detected';
            statusClass = 'status-ai';
            statusIcon = '🤖❌';
        }

        return `
            <div class="${cardClass}" onclick="toggleAllergen('${code}')" title="Click para ${isSelected ? 'deseleccionar' : 'seleccionar'}">
                <div class="allergen-header">
                    <div class="flex items-center flex-1">
                        <span class="allergen-icon">${allergen.icon}</span>
                        <div class="flex-1">
                            <div class="allergen-name">${allergen.name}</div>
                            <div class="text-xs text-gray-500 mt-1">${allergen.description}</div>
                        </div>
                    </div>
                </div>
                
                ${isSelected ? '<div class="absolute bottom-2 right-2 text-red-600 font-bold text-lg">✓</div>' : ''}
                
                ${currentMode === 'hybrid' && wasOriginallyAI && !isSelected ? 
                    '<div class="absolute top-2 left-2 text-blue-600 text-xs bg-blue-100 px-1 rounded">IA</div>' : ''}
            </div>
        `;
    }).join('');
    
    console.log(`✅ Grid renderizado: ${selectedAllergens.size} alérgenos seleccionados`);
}

// ====== TOGGLE DE ALÉRGENOS ======

function toggleAllergen(code) {
    console.log(`🔄 Toggle alérgeno: ${code} (${ALLERGENS[code].name})`);
    
    // En modo AI puro, no permitir cambios manuales
    if (currentMode === 'ai') {
        showWarning('En modo IA automático no se pueden hacer cambios manuales. Cambia a modo Híbrido para revisar.');
        return;
    }
    
    const wasSelected = selectedAllergens.has(code);
    
    if (wasSelected) {
        selectedAllergens.delete(code);
        console.log(`➖ Alérgeno ${code} removido`);
        
        // Si era originalmente detectado por IA, mostrar advertencia
        if (originalAIAllergens.has(code)) {
            showWarning(`⚠️ Has removido "${ALLERGENS[code].name}" que fue detectado por IA. Asegúrate de que es correcto.`);
        }
    } else {
        selectedAllergens.add(code);
        console.log(`➕ Alérgeno ${code} añadido`);
        
        // Si no fue detectado por IA, mostrar confirmación
        if (!originalAIAllergens.has(code)) {
            showInfo(`✅ Has añadido "${ALLERGENS[code].name}" manualmente.`);
        }
    }
    
    // Actualizar estadísticas
    if (!wasSelected) {
        stats.manual++;
    }
    
    renderAllergenGrid();
    updateSummary();
    updateStats();
}

// ====== ACTUALIZAR RESUMEN ======

function updateSummary() {
    const count = selectedAllergens.size;
    
    // Actualizar contador
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) {
        selectedCount.textContent = count;
    }

    // Actualizar lista de alérgenos confirmados
    const confirmedList = document.getElementById('confirmedAllergens');
    const safetyStatus = document.getElementById('safetyStatus');
    
    if (!confirmedList || !safetyStatus) return;

    if (count === 0) {
        confirmedList.innerHTML = '<span class="text-green-600 font-semibold">✅ Ninguno detectado</span>';
        safetyStatus.innerHTML = '<span class="text-green-600">✅ Seguro para consumo general</span>';
    } else {
        const allergenItems = Array.from(selectedAllergens)
            .map(code => {
                const allergen = ALLERGENS[code];
                if (!allergen) return '';
                const wasAI = originalAIAllergens.has(code);
                const source = wasAI ? '🤖' : '👨‍🍳';
                return `
                    <div class="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200 mb-2">
                        <span class="flex items-center">
                            ${allergen.icon} ${allergen.name}
                        </span>
                        <span class="text-xs text-red-600" title="${wasAI ? 'Detectado por IA' : 'Añadido manualmente'}">${source}</span>
                    </div>
                `;
            })
            .join('');
            
        confirmedList.innerHTML = allergenItems;
        safetyStatus.innerHTML = `<span class="text-red-600 font-bold">⚠️ Contiene ${count} alérgeno${count > 1 ? 's' : ''}</span>`;
    }

    // Actualizar estadísticas globales
    stats.allergens = count;
    updateStats();
}

// ====== ESTADÍSTICAS ======

function updateStats() {
    const elements = {
        ai: document.getElementById('statsAI'),
        manual: document.getElementById('statsManual'), 
        allergens: document.getElementById('statsAllergens')
    };
    
    if (elements.ai) elements.ai.textContent = stats.ai;
    if (elements.manual) elements.manual.textContent = stats.manual;
    if (elements.allergens) elements.allergens.textContent = stats.allergens;
}

// ====== ACCIONES DE GUARDADO ======

async function generateLabel() {
    if (!currentDish) {
        showError('No hay plato para generar etiqueta');
        return;
    }

    console.log('✨ Generando etiqueta...');
    showLoading('Generando etiqueta...');

    try {
        // Actualizar alérgenos finales del plato antes de generar
        currentDish.final_allergens = Array.from(selectedAllergens);
        
        const response = await fetch(`/api/generate-beautiful-single/${currentDish.id}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        // Abrir etiqueta en nueva ventana
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Abrir en nueva pestaña
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            newWindow.focus();
            showSuccessMessage('✨ Etiqueta abierta en nueva pestaña');
        } else {
            // Fallback: descargar archivo
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiqueta_${currentDish.name.replace(/\s+/g, '_')}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showSuccessMessage('✨ Etiqueta descargada correctamente');
        }
        
        window.URL.revokeObjectURL(url);

        stats.ai++; // Incrementar contador
        updateStats();

    } catch (error) {
        console.error('❌ Error generando etiqueta:', error);
        showError('Error generando etiqueta: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function printLabel() {
    if (!currentDish) {
        showError('No hay plato para imprimir');
        return;
    }

    console.log('🖨️ Preparando impresión...');
    showLoading('Preparando impresión...');

    try {
        const response = await fetch(`/api/print-directly/${currentDish.id}`, {
            method: 'POST'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error en preparación de impresión');
        }

        showSuccessMessage('🖨️ ' + data.message);

    } catch (error) {
        console.error('❌ Error preparando impresión:', error);
        showError('Error preparando impresión: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function saveDish() {
    if (!currentDish) {
        showError('No hay plato para guardar');
        return;
    }

    console.log('💾 Guardando plato...');
    showLoading('Guardando plato en el sistema...');

    try {
        // Preparar datos para guardar
        const dishData = {
            dish_id: currentDish.id,
            manual_allergens: Array.from(selectedAllergens),
            chef_notes: `Análisis en modo ${currentMode}. Alérgenos confirmados por chef.`,
            final_analysis_mode: currentMode,
            ai_suggestions: Array.from(originalAIAllergens),
            manual_overrides: !setsEqual(selectedAllergens, originalAIAllergens)
        };

        const response = await fetch('/api/save-manual-allergens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dishData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error guardando plato');
        }

        showSuccessMessage('💾 Plato guardado correctamente');
        
        // Actualizar estadísticas
        stats.hybrid++;
        updateStats();
        
        // Recargar lista de platos del día
        loadTodaysDishes();
        
        // Preguntar si quiere crear otro plato
        setTimeout(() => {
            if (confirm('¿Quieres crear otro plato?')) {
                clearForm();
            }
        }, 1500);

    } catch (error) {
        console.error('❌ Error guardando plato:', error);
        showError('Error guardando plato: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ====== UTILIDADES ======

function setsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (let item of set1) {
        if (!set2.has(item)) return false;
    }
    return true;
}

function clearForm() {
    console.log('🧹 Limpiando formulario');
    
    const dishDescription = document.getElementById('dishDescription');
    if (dishDescription) dishDescription.value = '';
    
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    
    currentDish = null;
    selectedAllergens.clear();
    aiSuggestedAllergens.clear();
    originalAIAllergens.clear();
    
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES');
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = `${dateStr} - ${timeStr}`;
    }
}

// ====== CARGAR PLATOS DEL DÍA ======

async function loadTodaysDishes() {
    console.log('📋 Cargando platos de hoy...');
    
    try {
        const response = await fetch('/api/dishes/today');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const dishes = await response.json();
        
        const container = document.getElementById('todayDishes');
        const counter = document.getElementById('todayCount');
        
        if (!container) return;
        
        if (counter) counter.textContent = dishes.length;

        if (dishes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">🍽️</div>
                    <p>No hay platos registrados hoy</p>
                </div>
            `;
            return;
        }

        container.innerHTML = dishes.map(dish => {
            const allergens = dish.final_allergens || dish.allergens || [];
            const modeIcon = {
                'ai': '🤖',
                'manual': '👨‍🍳',
                'hybrid': '🤖👨‍🍳'
            }[dish.analysis_mode] || '🤖👨‍🍳';
            
            const modeClass = {
                'ai': 'bg-blue-100 text-blue-800',
                'manual': 'bg-yellow-100 text-yellow-800', 
                'hybrid': 'bg-purple-100 text-purple-800'
            }[dish.analysis_mode] || 'bg-purple-100 text-purple-800';

            return `
                <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border-l-4 ${
                    allergens.length > 0 ? 'border-red-400' : 'border-green-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-gray-800">${dish.name}</h4>
                        <span class="text-xs px-2 py-1 rounded-full ${modeClass}">
                            ${modeIcon}
                        </span>
                    </div>
                    
                    <p class="text-sm text-gray-600 mb-2 line-clamp-2">${dish.description}</p>
                    
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span class="flex items-center">
                            <span class="mr-1">👨‍🍳</span>
                            <span>${dish.chef}</span>
                        </span>
                        <span class="flex items-center">
                            <span class="mr-1">🕒</span>
                            <span>${new Date(dish.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                    </div>
                    
                    ${allergens.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${allergens.slice(0, 3).map(code => `
                                <span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                    ${ALLERGENS[code]?.icon || '⚠️'} ${ALLERGENS[code]?.name || code}
                                </span>
                            `).join('')}
                            ${allergens.length > 3 ? `
                                <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                    +${allergens.length - 3} más
                                </span>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="text-xs text-green-600 font-medium mt-2">✅ Sin alérgenos</div>
                    `}
                    
                    <div class="mt-3 flex gap-2">
                        <button onclick="downloadDishLabel(${dish.id})" 
                                class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors">
                            📄 Etiqueta
                        </button>
                        <button onclick="printDishLabel(${dish.id})" 
                                class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition-colors">
                            🖨️ Imprimir
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log(`✅ ${dishes.length} platos cargados`);

    } catch (error) {
        console.error('❌ Error cargando platos de hoy:', error);
        showError('Error cargando platos del día');
    }
}

// ====== FUNCIONES GLOBALES PARA BOTONES ======

async function downloadDishLabel(dishId) {
    try {
        showLoading('Generando etiqueta...');
        
        const response = await fetch(`/api/generate-beautiful-single/${dishId}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Abrir en nueva pestaña
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            newWindow.focus();
            showSuccessMessage('📄 Etiqueta abierta en nueva pestaña');
        } else {
            // Fallback: descargar
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiqueta_${dishId}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showSuccessMessage('📄 Etiqueta descargada');
        }
        
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error('❌ Error descargando etiqueta:', error);
        showError('Error generando etiqueta');
    } finally {
        hideLoading();
    }
}

async function printDishLabel(dishId) {
    try {
        showLoading('Preparando impresión...');
        
        const response = await fetch(`/api/print-directly/${dishId}`, {
            method: 'POST'
        });

        const result = await response.json();

        if (result.success) {
            showSuccessMessage('🖨️ ' + result.message);
        } else {
            throw new Error(result.error || 'Error de impresión');
        }
    } catch (error) {
        console.error('❌ Error preparando impresión:', error);
        showError('Error preparando impresión');
    } finally {
        hideLoading();
    }
}

// ====== FUNCIONES DE UI ======

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

function showError(message) {
    showToast(message, 'error');
    console.error('🚫 Error:', message);
}

function showWarning(message) {
    showToast(message, 'warning');
    console.warn('⚠️ Advertencia:', message);
}

function showInfo(message) {
    showToast(message, 'info');
    console.info('ℹ️ Info:', message);
}

function showSuccessMessage(message) {
    showToast(message, 'success');
    console.log('✅ Éxito:', message);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 max-w-sm`;
    toast.textContent = message;
    
    document.body.appendChild(toast);

    // Animar entrada
    setTimeout(() => {
        toast.classList.add('translate-x-0');
    }, 100);

    // Remover después de 4 segundos
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ====== DEBUG Y TESTING ======

// Función de debug para testing
window.debugSystem = function() {
    console.log('🐛 DEBUG SISTEMA DE ALÉRGENOS');
    console.log('================================');
    console.log('currentMode:', currentMode);
    console.log('currentDish:', currentDish);
    console.log('selectedAllergens:', Array.from(selectedAllergens));
    console.log('aiSuggestedAllergens:', Array.from(aiSuggestedAllergens));
    console.log('originalAIAllergens:', Array.from(originalAIAllergens));
    console.log('stats:', stats);
    console.log('ALLERGENS:', Object.keys(ALLERGENS));
    
    // Test de conectividad
    console.log('\n🔌 TEST DE CONECTIVIDAD:');
    fetch('/api/system-status')
        .then(response => response.json())
        .then(data => {
            console.log('✅ Sistema conectado:', data);
        })
        .catch(error => {
            console.error('❌ Error de conectividad:', error);
        });
};

// Función para test rápido
window.testAnalysis = function(description = 'Paella con gambas y mejillones') {
    console.log('🧪 TEST RÁPIDO DE ANÁLISIS');
    document.getElementById('dishDescription').value = description;
    analyzeDish();
};

// ====== INICIALIZACIÓN FINAL ======

console.log('🎉 Sistema de Alérgenos v2.0 cargado correctamente');
console.log('📋 Funciones disponibles:');
console.log('  - debugSystem() - Debug completo del sistema');
console.log('  - testAnalysis() - Test rápido de análisis');
console.log('  - setAnalysisMode(mode) - Cambiar modo de análisis');

// Auto-test de conectividad al cargar
setTimeout(() => {
    fetch('/api/system-status')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Conectividad confirmada con el servidor');
                console.log(`📊 Estado: ${data.status} | OpenAI: ${data.openai_available ? 'Disponible' : 'No disponible'}`);
            }
        })
        .catch(error => {
            console.warn('⚠️ No se pudo conectar con el servidor:', error.message);
        });
}, 1000);
