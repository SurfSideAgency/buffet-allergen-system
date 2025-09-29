// app-ingredients.js - Sistema de Alérgenos por Ingredientes

// ====== VARIABLES GLOBALES ======
let allIngredients = {};
let categorizedIngredients = {};
let selectedIngredients = new Set();
let currentDish = null;
let stats = { platos: 0, ingredientes: 0, alergenos: 0 };

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Ingredientes');
    loadIngredients();
    loadTodaysDishes();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// ====== CARGAR INGREDIENTES DESDE EL SERVIDOR ======
async function loadIngredients() {
    try {
        showLoading('Cargando ingredientes...');
        
        const response = await fetch('/api/ingredients');
        const data = await response.json();
        
        if (data.success) {
            allIngredients = data.ingredients;
            categorizedIngredients = data.categorized;
            
            console.log(`✅ ${data.total} ingredientes cargados`);
            renderIngredientsList();
        } else {
            showError('Error cargando ingredientes');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Error conectando con el servidor');
    } finally {
        hideLoading();
    }
}

// ====== RENDERIZAR LISTA DE INGREDIENTES ======
function renderIngredientsList() {
    const container = document.getElementById('ingredientsList');
    
    if (!container) return;
    
    let html = '';
    
    // Renderizar por categorías
    Object.entries(categorizedIngredients).forEach(([category, ingredients]) => {
        html += `
            <div class="category-section">
                <div class="category-title">${category}</div>
                <div class="grid grid-cols-2 gap-2">
                    ${ingredients.map(ingredient => {
                        const isSelected = selectedIngredients.has(ingredient.code);
                        return `
                            <div class="ingredient-card ${isSelected ? 'selected' : ''}" 
                                 onclick="toggleIngredient('${ingredient.code}')"
                                 data-name="${ingredient.name.toLowerCase()}"
                                 data-code="${ingredient.code}">
                                <div class="flex items-center justify-between">
                                    <span class="font-medium text-sm">${ingredient.name}</span>
                                    ${isSelected ? '<span class="text-yellow-600 font-bold">✓</span>' : ''}
                                </div>
                                ${ingredient.allergens.length > 0 ? `
                                    <div class="text-xs text-red-600 mt-1">
                                        ⚠️ ${ingredient.allergens.length} alérgeno(s)
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ====== TOGGLE INGREDIENTE ======
function toggleIngredient(code) {
    const ingredient = allIngredients[code];
    
    if (!ingredient) return;
    
    if (selectedIngredients.has(code)) {
        selectedIngredients.delete(code);
        console.log(`➖ Removido: ${ingredient.name}`);
    } else {
        selectedIngredients.add(code);
        console.log(`➕ Añadido: ${ingredient.name}`);
    }
    
    updateSelectedDisplay();
    renderIngredientsList();
}

// ====== ACTUALIZAR DISPLAY DE SELECCIONADOS ======
function updateSelectedDisplay() {
    const container = document.getElementById('selectedIngredients');
    const emptyMessage = document.getElementById('emptyMessage');
    const countDisplay = document.getElementById('selectedCount');
    
    if (!container) return;
    
    const count = selectedIngredients.size;
    
    if (countDisplay) countDisplay.textContent = count;
    
    if (count === 0) {
        if (emptyMessage) emptyMessage.classList.remove('hidden');
        container.innerHTML = '<p class="text-gray-400 text-sm" id="emptyMessage">Selecciona ingredientes de la lista inferior...</p>';
        return;
    }
    
    if (emptyMessage) emptyMessage.classList.add('hidden');
    
    let html = '';
    
    selectedIngredients.forEach(code => {
        const ingredient = allIngredients[code];
        if (ingredient) {
            html += `
                <span class="selected-ingredient">
                    ${ingredient.name}
                    <span class="remove-btn" onclick="toggleIngredient('${code}')">✕</span>
                </span>
            `;
        }
    });
    
    container.innerHTML = html;
}

// ====== FILTRAR INGREDIENTES ======
function filterIngredients() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    const cards = document.querySelectorAll('.ingredient-card');
    
    cards.forEach(card => {
        const name = card.getAttribute('data-name');
        
        if (name.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ====== CREAR PLATO ======
async function createDish() {
    const dishName = document.getElementById('dishName').value.trim();
    const chefName = document.getElementById('chefName').value.trim();
    
    if (!dishName) {
        showError('Por favor, escribe el nombre del plato');
        return;
    }
    
    if (selectedIngredients.size === 0) {
        showError('Por favor, selecciona al menos un ingrediente');
        return;
    }
    
    console.log(`🍽️ Creando plato: ${dishName}`);
    console.log(`📝 Ingredientes: ${selectedIngredients.size}`);
    
    showLoading('Creando plato y detectando alérgenos...');
    
    try {
        const response = await fetch('/api/analyze-by-ingredients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dish_name: dishName,
                ingredients: Array.from(selectedIngredients),
                chef_name: chefName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentDish = data.dish;
            displayResults(data);
            updateStats();
        } else {
            showError(data.error || 'Error creando el plato');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Error conectando con el servidor');
    } finally {
        hideLoading();
    }
}

// ====== MOSTRAR RESULTADOS ======
function displayResults(data) {
    const resultsPanel = document.getElementById('resultsPanel');
    const dishInfo = document.getElementById('dishInfo');
    const allergensDisplay = document.getElementById('allergensDisplay');
    
    if (!resultsPanel || !dishInfo || !allergensDisplay) return;
    
    // Mostrar panel
    resultsPanel.classList.remove('hidden');
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Info del plato
    dishInfo.innerHTML = `
        <h4 class="font-bold text-xl mb-2">${data.dish.name}</h4>
        <div class="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            <span>👨‍🍳 ${data.dish.chef}</span>
            <span>📅 ${data.dish.date}</span>
            <span>🥘 ${data.dish.ingredients.length} ingredientes</span>
        </div>
        <div class="bg-white rounded p-3">
            <strong class="text-sm">Ingredientes utilizados:</strong>
            <div class="flex flex-wrap gap-1 mt-2">
                ${data.dish.ingredients.map(ing => 
                    `<span class="text-xs px-2 py-1 bg-gray-100 rounded-full">${ing.name}</span>`
                ).join('')}
            </div>
        </div>
    `;
    
    // Alérgenos detectados
    if (data.allergens.length > 0) {
        allergensDisplay.innerHTML = data.allergens_info.map(allergen => `
            <div class="allergen-badge">
                <span class="text-xl">${allergen.icon}</span>
                <div>
                    <div class="font-bold text-sm">${allergen.name}</div>
                    <div class="text-xs opacity-75">Detectado automáticamente</div>
                </div>
            </div>
        `).join('');
        
        stats.alergenos = data.allergens.length;
    } else {
        allergensDisplay.innerHTML = `
            <div class="w-full bg-green-50 border-2 border-green-500 rounded-lg p-4 text-center">
                <div class="text-green-700 font-bold text-lg">✅ Sin Alérgenos Detectados</div>
                <p class="text-green-600 text-sm mt-1">Este plato no contiene ninguno de los 14 alérgenos obligatorios</p>
            </div>
        `;
    }
    
    stats.platos++;
    stats.ingredientes += data.dish.ingredients.length;
    updateStats();
}

// ====== GENERAR ETIQUETA ======
async function generateLabel() {
    if (!currentDish) {
        showError('No hay plato para generar etiqueta');
        return;
    }
    
    console.log('✨ Generando etiqueta...');
    showLoading('Generando etiqueta...');
    
    try {
        const response = await fetch('/api/generate-label-with-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dish: currentDish,
                allergens: currentDish.final_allergens
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Abrir en nueva pestaña
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            newWindow.focus();
            showSuccessMessage('✨ Etiqueta abierta en nueva pestaña');
        } else {
            // Fallback: descargar
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiqueta_${currentDish.name.replace(/\s+/g, '_')}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showSuccessMessage('✨ Etiqueta descargada');
        }
        
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Error generando etiqueta');
    } finally {
        hideLoading();
    }
}

// ====== IMPRIMIR ETIQUETA ======
async function printLabel() {
    if (!currentDish) {
        showError('No hay plato para imprimir');
        return;
    }
    
    showSuccessMessage('🖨️ Abre la etiqueta generada y usa Ctrl+P para imprimir');
}

// ====== GUARDAR PLATO ======
async function saveDish() {
    if (!currentDish) {
        showError('No hay plato para guardar');
        return;
    }
    
    console.log('💾 Guardando plato...');
    showLoading('Guardando plato...');
    
    try {
        const response = await fetch('/api/save-dish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dish_id: currentDish.id
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessMessage('💾 Plato guardado correctamente');
            loadTodaysDishes();
            
            setTimeout(() => {
                if (confirm('¿Quieres crear otro plato?')) {
                    clearForm();
                }
            }, 1500);
        } else {
            showError(data.error || 'Error guardando plato');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Error guardando plato');
    } finally {
        hideLoading();
    }
}

// ====== LIMPIAR FORMULARIO ======
function clearForm() {
    document.getElementById('dishName').value = '';
    document.getElementById('searchInput').value = '';
    selectedIngredients.clear();
    currentDish = null;
    
    updateSelectedDisplay();
    renderIngredientsList();
    
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.classList.add('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====== CARGAR PLATOS DE HOY ======
async function loadTodaysDishes() {
    try {
        const response = await fetch('/api/dishes/today');
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
            const allergens = dish.final_allergens || [];
            
            return `
                <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border-l-4 ${
                    allergens.length > 0 ? 'border-red-400' : 'border-green-400'
                }">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="font-semibold text-gray-800">${dish.name}</h4>
                    </div>
                    
                    <div class="text-sm text-gray-600 mb-2">
                        👨‍🍳 ${dish.chef} | 🥘 ${dish.ingredients?.length || 0} ingredientes
                    </div>
                    
                    ${allergens.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-2">
                            <span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                                ⚠️ ${allergens.length} alérgeno(s)
                            </span>
                        </div>
                    ` : `
                        <div class="text-xs text-green-600 font-medium mt-2">✅ Sin alérgenos</div>
                    `}
                    
                    <div class="mt-3 flex gap-2">
                        <button onclick="downloadDishLabel(${dish.id})" 
                                class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors">
                            📄 Etiqueta
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error cargando platos:', error);
    }
}

// ====== DESCARGAR ETIQUETA DE PLATO GUARDADO ======
async function downloadDishLabel(dishId) {
    showLoading('Generando etiqueta...');
    
    try {
        // Obtener datos del plato
        const dishesResponse = await fetch('/api/dishes/today');
        const dishes = await dishesResponse.json();
        const dish = dishes.find(d => d.id === dishId);
        
        if (!dish) {
            showError('Plato no encontrado');
            return;
        }
        
        const response = await fetch('/api/generate-label-with-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dish: dish,
                allergens: dish.final_allergens || []
            })
        });
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            newWindow.focus();
            showSuccessMessage('📄 Etiqueta abierta');
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiqueta_${dish.name.replace(/\s+/g, '_')}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showSuccessMessage('📄 Etiqueta descargada');
        }
        
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Error generando etiqueta');
    } finally {
        hideLoading();
    }
}

// ====== ACTUALIZAR ESTADÍSTICAS ======
function updateStats() {
    const elements = {
        platos: document.getElementById('statsPlatos'),
        ingredientes: document.getElementById('statsIngredientes'),
        alergenos: document.getElementById('statsAlergenos')
    };
    
    if (elements.platos) elements.platos.textContent = stats.platos;
    if (elements.ingredientes) elements.ingredientes.textContent = stats.ingredientes;
    if (elements.alergenos) elements.alergenos.textContent = stats.alergenos;
}

// ====== ACTUALIZAR FECHA/HORA ======
function updateDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES');
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = `${dateStr} - ${timeStr}`;
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

    setTimeout(() => {
        toast.classList.add('translate-x-0');
    }, 100);

    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ====== DEBUG ======
window.debugSystem = function() {
    console.log('🐛 DEBUG SISTEMA');
    console.log('Ingredientes totales:', Object.keys(allIngredients).length);
    console.log('Ingredientes seleccionados:', Array.from(selectedIngredients));
    console.log('Plato actual:', currentDish);
    console.log('Estadísticas:', stats);
};

console.log('🎉 Sistema de Ingredientes v3.0.0 cargado');
console.log('📋 Funciones disponibles:');
console.log('  - debugSystem() - Ver estado del sistema');
