// app-enhanced.js - JavaScript mejorado con gestión de ingredientes

// Variables globales
let currentDish = null;
let selectedIngredients = [];
let availableIngredients = [];
let categories = {};
let currentEditingIngredient = null;
let stats = {
  analyzed: 0,
  labels: 0,
  allergens: 0
};

// Elementos DOM principales
const elements = {
  // Navegación por pestañas
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Pestaña de platos
  dishNameInput: document.getElementById('dishNameInput'),
  ingredientSearch: document.getElementById('ingredientSearch'),
  categoryFilters: document.getElementById('categoryFilters'),
  ingredientsGrid: document.getElementById('ingredientsGrid'),
  selectedIngredients: document.getElementById('selectedIngredients'),
  emptySelectedMessage: document.getElementById('emptySelectedMessage'),
  chefName: document.getElementById('chefName'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  clearBtn: document.getElementById('clearBtn'),
  
  // Resultados
  loading: document.getElementById('loading'),
  results: document.getElementById('results'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  dishResult: document.getElementById('dishResult'),
  allergensList: document.getElementById('allergensList'),
  
  // Botones de acción
  beautifulLabelBtn: document.getElementById('beautifulLabelBtn'),
  printBtn: document.getElementById('printBtn'),
  newDishBtn: document.getElementById('newDishBtn'),
  
  // Lista de platos de hoy
  todayDishes: document.getElementById('todayDishes'),
  dishCount: document.getElementById('dishCount'),
  
  // Estadísticas
  statsAnalyzed: document.getElementById('statsAnalyzed'),
  statsLabels: document.getElementById('statsLabels'),
  statsAllergens: document.getElementById('statsAllergens'),
  activeChef: document.getElementById('activeChef'),
  
  // Pestaña de ingredientes
  addIngredientBtn: document.getElementById('addIngredientBtn'),
  searchIngredients: document.getElementById('searchIngredients'),
  filterCategory: document.getElementById('filterCategory'),
  filterCommon: document.getElementById('filterCommon'),
  ingredientsTable: document.getElementById('ingredientsTable'),
  ingredientsCount: document.getElementById('ingredientsCount'),
  
  // Modal de ingredientes
  ingredientModal: document.getElementById('ingredientModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModal: document.getElementById('closeModal'),
  ingredientForm: document.getElementById('ingredientForm'),
  modalIngredientName: document.getElementById('modalIngredientName'),
  modalIngredientCode: document.getElementById('modalIngredientCode'),
  modalIngredientCategory: document.getElementById('modalIngredientCategory'),
  modalAllergensCheckboxes: document.getElementById('modalAllergensCheckboxes'),
  modalIngredientCommon: document.getElementById('modalIngredientCommon'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  saveIngredientBtn: document.getElementById('saveIngredientBtn'),
  
  // Pestaña de sanidad
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  filterChef: document.getElementById('filterChef'),
  filterDish: document.getElementById('filterDish'),
  applySanitaryFilters: document.getElementById('applySanitaryFilters'),
  exportSanitaryBtn: document.getElementById('exportSanitaryBtn'),
  refreshSanitaryBtn: document.getElementById('refreshSanitaryBtn'),
  sanitaryRecordsList: document.getElementById('sanitaryRecordsList'),
  totalDishesCount: document.getElementById('totalDishesCount'),
  totalAllergensCount: document.getElementById('totalAllergensCount'),
  uniqueChefsCount: document.getElementById('uniqueChefsCount'),
  dateRangeSpan: document.getElementById('dateRangeSpan'),
  recordsCount: document.getElementById('recordsCount'),
  
  // Configuración
  printerName: document.getElementById('printerName'),
  paperSize: document.getElementById('paperSize'),
  printDensity: document.getElementById('printDensity'),
  autoPrint: document.getElementById('autoPrint'),
  savePrinterConfig: document.getElementById('savePrinterConfig'),
  printerStatus: document.getElementById('printerStatus'),
  systemLanguage: document.getElementById('systemLanguage'),
  colorTheme: document.getElementById('colorTheme'),
  showIngredientIcons: document.getElementById('showIngredientIcons'),
  enableSoundNotifications: document.getElementById('enableSoundNotifications'),
  saveGeneralConfig: document.getElementById('saveGeneralConfig'),
  dbIngredientsCount: document.getElementById('dbIngredientsCount'),
  dbDishesCount: document.getElementById('dbDishesCount'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  resetDataBtn: document.getElementById('resetDataBtn')
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

async function initializeApp() {
  console.log('🚀 Inicializando aplicación mejorada...');
  
  // Configurar navegación por pestañas
  setupTabNavigation();
  
  // Cargar datos iniciales
  await Promise.all([
    loadIngredients(),
    loadTodayDishes(),
    loadSanitaryRecord()
  ]);
  
  // Configurar event listeners
  setupEventListeners();
  
  // Actualizar fecha y estadísticas
  updateCurrentDate();
  updateStats();
  
  console.log('✅ Aplicación inicializada correctamente');
}

// === NAVEGACIÓN POR PESTAÑAS ===

function setupTabNavigation() {
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  // Actualizar botones
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  // Actualizar contenido
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
  
  // Acciones específicas por pestaña
  switch(tabId) {
    case 'ingredients':
      loadIngredientsManagement();
      break;
    case 'sanitary':
      loadSanitaryRecord();
      break;
    case 'config':
      loadConfigurationData();
      break;
  }
}

// === GESTIÓN DE INGREDIENTES ===

async function loadIngredients() {
  try {
    const response = await fetch('/api/ingredients');
    const data = await response.json();
    
    if (data.success) {
      availableIngredients = data.ingredients;
      categories = data.categories;
      
      // Actualizar UI
      renderCategoryFilters();
      renderIngredientsGrid();
      
      console.log(`✅ Cargados ${data.total} ingredientes`);
    }
  } catch (error) {
    console.error('❌ Error cargando ingredientes:', error);
    showError('Error cargando la lista de ingredientes');
  }
}

function renderCategoryFilters() {
  if (!elements.categoryFilters) return;
  
  let filtersHTML = `
    <button class="category-filter active" data-category="all">Todos</button>
    <button class="category-filter" data-category="common">Comunes</button>
  `;
  
  Object.entries(categories).forEach(([code, category]) => {
    filtersHTML += `
      <button class="category-filter" data-category="${code}" style="border-color: ${category.color}">
        <span>${category.icon}</span>
        <span>${category.name}</span>
      </button>
    `;
  });
  
  elements.categoryFilters.innerHTML = filtersHTML;
  
  // Event listeners para filtros
  elements.categoryFilters.addEventListener('click', (e) => {
    if (e.target.closest('.category-filter')) {
      const button = e.target.closest('.category-filter');
      const category = button.dataset.category;
      
      // Actualizar botones activos
      elements.categoryFilters.querySelectorAll('.category-filter').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Filtrar ingredientes
      filterIngredients(category);
    }
  });
}

function renderIngredientsGrid(ingredientsToShow = availableIngredients) {
  if (!elements.ingredientsGrid) return;
  
  if (ingredientsToShow.length === 0) {
    elements.ingredientsGrid.innerHTML = `
      <div class="col-span-full text-center py-8 text-gray-500">
        No se encontraron ingredientes
      </div>
    `;
    return;
  }
  
  const ingredientsHTML = ingredientsToShow.map(ingredient => `
    <div class="ingredient-item ${selectedIngredients.includes(ingredient.id) ? 'selected' : ''}" 
         data-ingredient-id="${ingredient.id}">
      <div class="ingredient-icon">${getIngredientIcon(ingredient)}</div>
      <div class="ingredient-info">
        <div class="ingredient-name">${ingredient.name}</div>
        <div class="ingredient-category">${categories[ingredient.category]?.name || ingredient.category}</div>
        ${ingredient.allergens.length > 0 ? 
          `<div class="text-xs text-red-600">⚠️ ${ingredient.allergens.length} alérgeno(s)</div>` : 
          ''
        }
      </div>
    </div>
  `).join('');
  
  elements.ingredientsGrid.innerHTML = ingredientsHTML;
  
  // Event listeners para selección de ingredientes
  elements.ingredientsGrid.addEventListener('click', (e) => {
    const ingredientItem = e.target.closest('.ingredient-item');
    if (ingredientItem) {
      const ingredientId = parseInt(ingredientItem.dataset.ingredientId);
      toggleIngredientSelection(ingredientId);
    }
  });
}

function getIngredientIcon(ingredient) {
  if (categories[ingredient.category]) {
    return categories[ingredient.category].icon;
  }
  return '🥄'; // Icono por defecto
}

function filterIngredients(category, searchTerm = '') {
  let filteredIngredients = availableIngredients;
  
  // Filtrar por categoría
  if (category === 'common') {
    filteredIngredients = filteredIngredients.filter(ing => ing.common);
  } else if (category !== 'all') {
    filteredIngredients = filteredIngredients.filter(ing => ing.category === category);
  }
  
  // Filtrar por término de búsqueda
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredIngredients = filteredIngredients.filter(ing => 
      ing.name.toLowerCase().includes(searchLower) ||
      ing.code.toLowerCase().includes(searchLower)
    );
  }
  
  renderIngredientsGrid(filteredIngredients);
}

function toggleIngredientSelection(ingredientId) {
  const index = selectedIngredients.indexOf(ingredientId);
  
  if (index === -1) {
    // Añadir ingrediente
    selectedIngredients.push(ingredientId);
  } else {
    // Quitar ingrediente
    selectedIngredients.splice(index, 1);
  }
  
  updateSelectedIngredientsUI();
  renderIngredientsGrid(); // Re-renderizar para actualizar estados
}

function updateSelectedIngredientsUI() {
  if (!elements.selectedIngredients) return;
  
  if (selectedIngredients.length === 0) {
    elements.selectedIngredients.innerHTML = `
      <p class="text-gray-500 text-sm text-center" id="emptySelectedMessage">
        Selecciona ingredientes de la lista superior
      </p>
    `;
    return;
  }
  
  const selectedIngredientsData = availableIngredients
    .filter(ing => selectedIngredients.includes(ing.id));
  
  const selectedHTML = selectedIngredientsData.map(ingredient => `
    <div class="selected-ingredient">
      <span>${getIngredientIcon(ingredient)}</span>
      <span>${ingredient.name}</span>
      <span class="remove-ingredient" onclick="toggleIngredientSelection(${ingredient.id})">✕</span>
    </div>
  `).join('');
  
  elements.selectedIngredients.innerHTML = selectedHTML;
}

// === PROCESAMIENTO DE PLATOS ===

async function processDish() {
  const dishName = elements.dishNameInput?.value.trim();
  const chefName = elements.chefName?.value.trim() || 'Chef Principal';
  
  if (!dishName) {
    showError('Por favor, ingresa el nombre del plato');
    return;
  }
  
  if (selectedIngredients.length === 0) {
    showError('Por favor, selecciona al menos un ingrediente');
    return;
  }
  
  showLoading();
  
  try {
    const response = await fetch('/api/analyze-dish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: dishName,
        chef_name: chefName,
        selected_ingredients: selectedIngredients
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error del servidor');
    }
    
    if (data.success) {
      currentDish = data.dish;
      displayResults(data.dish, data.allergens_info);
      updateStats();
      loadTodayDishes();
      
      showSuccessMessage('✅ Plato registrado correctamente');
    } else {
      throw new Error('Error procesando el plato');
    }
    
  } catch (error) {
    console.error('❌ Error procesando plato:', error);
    showError(`Error: ${error.message}`);
  }
}

function displayResults(dish, allergensInfo) {
  // Información del plato
  elements.dishResult.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="text-lg font-bold text-blue-800 mb-2">${dish.name}</h4>
        <p class="text-gray-700 mb-3">${dish.description}</p>
        
        ${dish.ingredients && dish.ingredients.length > 0 ? `
          <div class="mb-3">
            <strong class="text-sm text-gray-700">Ingredientes utilizados:</strong>
            <div class="flex flex-wrap gap-1 mt-1">
              ${dish.ingredients.map(ing => `
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  ${ing.name}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="flex items-center space-x-4 text-sm text-gray-600">
          <div class="flex items-center space-x-1">
            <span>👨‍🍳</span>
            <span>${dish.chef}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span>📅</span>
            <span>${dish.date}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span>🎯</span>
            <span>Método: ${dish.method === 'manual' ? 'Manual' : 'IA'}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span>✅</span>
            <span>Confianza: ${Math.round(dish.confidence * 100)}%</span>
          </div>
        </div>
      </div>
      <div class="flex-shrink-0 ml-4">
        <div class="text-3xl">🍽️</div>
      </div>
    </div>
  `;

  // Alérgenos
  if (allergensInfo && allergensInfo.length > 0) {
    elements.allergensList.innerHTML = allergensInfo.map(allergen => `
      <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center hover:bg-red-100 transition-colors">
        <div class="text-xl mb-1">${allergen.icon}</div>
        <div class="text-xs font-bold text-red-800">${allergen.name}</div>
      </div>
    `).join('');
  } else {
    elements.allergensList.innerHTML = `
      <div class="col-span-full bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div class="text-3xl mb-2">✅</div>
        <div class="text-lg font-bold text-green-800">Sin alérgenos detectados</div>
        <div class="text-sm text-green-600 mt-1">Este plato es seguro para la mayoría de personas</div>
      </div>
    `;
  }

  setupActionButtons();
  showResults();
}

function setupActionButtons() {
  if (!currentDish) return;

  if (elements.beautifulLabelBtn) {
    elements.beautifulLabelBtn.onclick = () => generateBeautifulLabel();
  }
  
  if (elements.printBtn) {
    elements.printBtn.onclick = () => printDirectly();
  }
  
  if (elements.newDishBtn) {
    elements.newDishBtn.onclick = () => clearForm();
  }
}

// === GESTIÓN DE INGREDIENTES (PESTAÑA ADMIN) ===

async function loadIngredientsManagement() {
  try {
    await loadIngredients(); // Recargar ingredientes
    renderIngredientsManagementTable();
    updateIngredientsFilters();
    
    if (elements.dbIngredientsCount) {
      elements.dbIngredientsCount.textContent = availableIngredients.length;
    }
    
  } catch (error) {
    console.error('❌ Error cargando gestión de ingredientes:', error);
  }
}

function updateIngredientsFilters() {
  if (!elements.filterCategory) return;
  
  // Limpiar y añadir categorías
  elements.filterCategory.innerHTML = '<option value="all">Todas las categorías</option>';
  
  Object.entries(categories).forEach(([code, category]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${category.icon} ${category.name}`;
    elements.filterCategory.appendChild(option);
  });
}

function renderIngredientsManagementTable() {
  if (!elements.ingredientsTable) return;
  
  const ingredientsHTML = availableIngredients.map(ingredient => `
    <div class="ingredient-row bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="text-2xl">${getIngredientIcon(ingredient)}</div>
          <div>
            <h4 class="font-bold text-gray-800">${ingredient.name}</h4>
            <p class="text-sm text-gray-600">Código: ${ingredient.code}</p>
            <p class="text-sm text-gray-600">
              Categoría: ${categories[ingredient.category]?.name || ingredient.category}
              ${ingredient.common ? ' • <span class="text-green-600 font-medium">Común</span>' : ''}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          ${ingredient.allergens.length > 0 ? `
            <div class="flex flex-wrap gap-1">
              ${ingredient.allergens.map(allergen => `
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                  ⚠️ ${allergen}
                </span>
              `).join('')}
            </div>
          ` : `
            <span class="text-green-600 text-sm font-medium">✅ Sin alérgenos</span>
          `}
          
          <div class="flex space-x-1 ml-4">
            <button onclick="editIngredient(${ingredient.id})" 
                    class="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors">
              ✏️ Editar
            </button>
            <button onclick="deleteIngredient(${ingredient.id})" 
                    class="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded transition-colors">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  elements.ingredientsTable.innerHTML = ingredientsHTML;
  
  if (elements.ingredientsCount) {
    elements.ingredientsCount.textContent = availableIngredients.length;
  }
}

// Modal de ingredientes
function showIngredientModal(ingredient = null) {
  if (!elements.ingredientModal) return;
  
  currentEditingIngredient = ingredient;
  
  // Título del modal
  elements.modalTitle.textContent = ingredient ? 'Editar Ingrediente' : 'Añadir Ingrediente';
  
  // Llenar formulario
  if (ingredient) {
    elements.modalIngredientName.value = ingredient.name;
    elements.modalIngredientCode.value = ingredient.code;
    elements.modalIngredientCategory.value = ingredient.category;
    elements.modalIngredientCommon.checked = ingredient.common;
  } else {
    elements.ingredientForm.reset();
  }
  
  // Cargar categorías en select
  elements.modalIngredientCategory.innerHTML = '';
  Object.entries(categories).forEach(([code, category]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${category.icon} ${category.name}`;
    elements.modalIngredientCategory.appendChild(option);
  });
  
  // Cargar checkboxes de alérgenos
  renderAllergensCheckboxes(ingredient?.allergens || []);
  
  // Mostrar modal
  elements.ingredientModal.classList.remove('hidden');
}

function renderAllergensCheckboxes(selectedAllergens = []) {
  if (!elements.modalAllergensCheckboxes) return;
  
  // Lista de alérgenos disponibles (desde el servidor)
  const allergensList = [
    'gluten', 'crustaceos', 'huevos', 'pescado', 'cacahuetes', 'soja', 
    'lacteos', 'frutos_secos', 'apio', 'mostaza', 'sesamo', 'sulfitos', 
    'altramuces', 'moluscos'
  ];
  
  const checkboxesHTML = allergensList.map(allergen => `
    <div class="allergen-checkbox">
      <input type="checkbox" id="allergen_${allergen}" value="${allergen}"
             ${selectedAllergens.includes(allergen) ? 'checked' : ''}>
      <label for="allergen_${allergen}" class="text-sm">
        <span class="font-medium">${allergen.charAt(0).toUpperCase() + allergen.slice(1)}</span>
      </label>
    </div>
  `).join('');
  
  elements.modalAllergensCheckboxes.innerHTML = checkboxesHTML;
}

function hideIngredientModal() {
  if (elements.ingredientModal) {
    elements.ingredientModal.classList.add('hidden');
  }
  currentEditingIngredient = null;
}

async function saveIngredient() {
  const formData = new FormData(elements.ingredientForm);
  
  const ingredientData = {
    name: elements.modalIngredientName.value.trim(),
    code: elements.modalIngredientCode.value.trim().toLowerCase(),
    category: elements.modalIngredientCategory.value,
    common: elements.modalIngredientCommon.checked,
    allergens: Array.from(elements.modalAllergensCheckboxes.querySelectorAll('input:checked'))
                    .map(cb => cb.value)
  };
  
  // Validaciones
  if (!ingredientData.name || !ingredientData.code || !ingredientData.category) {
    showError('Por favor, completa todos los campos requeridos');
    return;
  }
  
  try {
    const url = currentEditingIngredient 
      ? `/api/ingredients/${currentEditingIngredient.id}` 
      : '/api/ingredients';
    
    const method = currentEditingIngredient ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ingredientData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al guardar el ingrediente');
    }
    
    if (data.success) {
      showSuccessMessage(`✅ ${currentEditingIngredient ? 'Ingrediente actualizado' : 'Ingrediente añadido'} correctamente`);
      hideIngredientModal();
      await loadIngredientsManagement(); // Recargar tabla
    }
    
  } catch (error) {
    console.error('❌ Error guardando ingrediente:', error);
    showError(`Error: ${error.message}`);
  }
}

async function deleteIngredient(ingredientId) {
  const ingredient = availableIngredients.find(ing => ing.id === ingredientId);
  
  if (!confirm(`¿Estás seguro de que quieres eliminar "${ingredient?.name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/ingredients/${ingredientId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error eliminando ingrediente');
    }
    
    if (data.success) {
      showSuccessMessage('✅ Ingrediente eliminado correctamente');
      await loadIngredientsManagement(); // Recargar tabla
    }
    
  } catch (error) {
    console.error('❌ Error eliminando ingrediente:', error);
    showError(`Error: ${error.message}`);
  }
}

function editIngredient(ingredientId) {
  const ingredient = availableIngredients.find(ing => ing.id === ingredientId);
  if (ingredient) {
    showIngredientModal(ingredient);
  }
}

// === REGISTRO SANITARIO ===

async function loadSanitaryRecord(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.chef) params.append('chef', filters.chef);
    if (filters.dish_name) params.append('dish_name', filters.dish_name);
    
    const response = await fetch(`/api/sanitary-record?${params}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error cargando registro sanitario');
    }
    
    if (data.success) {
      renderSanitaryRecord(data.dishes, data.statistics);
    }
    
  } catch (error) {
    console.error('❌ Error cargando registro sanitario:', error);
    showError('Error cargando el registro sanitario');
  }
}

function renderSanitaryRecord(dishes, statistics) {
  // Actualizar estadísticas
  if (elements.totalDishesCount) elements.totalDishesCount.textContent = statistics.total_dishes;
  if (elements.totalAllergensCount) elements.totalAllergensCount.textContent = statistics.total_allergens;
  if (elements.uniqueChefsCount) elements.uniqueChefsCount.textContent = statistics.unique_chefs;
  if (elements.recordsCount) elements.recordsCount.textContent = dishes.length;
  
  // Calcular días de rango
  if (statistics.date_range.start && statistics.date_range.end) {
    const daysDiff = Math.ceil((statistics.date_range.end - statistics.date_range.start) / (1000 * 60 * 60 * 24));
    if (elements.dateRangeSpan) elements.dateRangeSpan.textContent = daysDiff + 1;
  }
  
  // Renderizar lista de platos
  if (!elements.sanitaryRecordsList) return;
  
  if (dishes.length === 0) {
    elements.sanitaryRecordsList.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-4">📋</div>
        <p>No se encontraron registros con los filtros aplicados</p>
      </div>
    `;
    return;
  }
  
  const dishesHTML = dishes.map(dish => `
    <div class="sanitary-record-item bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-bold text-gray-800 mb-2">${dish.name}</h4>
          <p class="text-sm text-gray-600 mb-2">${dish.description}</p>
          
          ${dish.ingredients && dish.ingredients.length > 0 ? `
            <div class="mb-2">
              <strong class="text-sm text-gray-700">Ingredientes:</strong>
              <div class="flex flex-wrap gap-1 mt-1">
                ${dish.ingredients.map(ing => `
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    ${ing.name}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="flex items-center space-x-4 text-xs text-gray-500">
            <span>👨‍🍳 ${dish.chef}</span>
            <span>📅 ${dish.date}</span>
            <span>🕐 ${new Date(dish.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>🎯 ${dish.method === 'manual' ? 'Manual' : 'IA'} (${Math.round(dish.confidence * 100)}%)</span>
          </div>
        </div>
        
        <div class="ml-4">
          ${dish.allergens.length > 0 ? `
            <div class="text-right">
              <div class="text-sm font-bold text-red-600 mb-1">⚠️ ${dish.allergens.length} Alérgeno(s)</div>
              <div class="flex flex-wrap gap-1 justify-end">
                ${dish.allergens.map(allergen => `
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                    ${allergen}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : `
            <div class="text-green-600 text-sm font-bold">✅ Sin alérgenos</div>
          `}
        </div>
      </div>
    </div>
  `).join('');
  
  elements.sanitaryRecordsList.innerHTML = dishesHTML;
}

async function exportSanitaryRecord() {
  try {
    const filters = {
      start_date: elements.startDate?.value || '',
      end_date: elements.endDate?.value || '',
      chef: elements.filterChef?.value || '',
      dish_name: elements.filterDish?.value || ''
    };
    
    const response = await fetch('/api/sanitary-record/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
    
    if (!response.ok) {
      throw new Error('Error exportando registro sanitario');
    }
    
    // Descargar PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_sanitario_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccessMessage('✅ Registro sanitario exportado correctamente');
    
  } catch (error) {
    console.error('❌ Error exportando registro:', error);
    showError('Error exportando el registro sanitario');
  }
}

// === CONFIGURACIÓN ===

function loadConfigurationData() {
  // Cargar contadores de base de datos
  if (elements.dbIngredientsCount) {
    elements.dbIngredientsCount.textContent = availableIngredients.length;
  }
  
  if (elements.dbDishesCount) {
    // Este valor se actualizará desde loadTodayDishes
    elements.dbDishesCount.textContent = stats.analyzed;
  }
}

// === EVENT LISTENERS ===

function setupEventListeners() {
  // Búsqueda de ingredientes en tiempo real
  if (elements.ingredientSearch) {
    elements.ingredientSearch.addEventListener('input', (e) => {
      const activeCategory = elements.categoryFilters?.querySelector('.category-filter.active')?.dataset.category || 'all';
      filterIngredients(activeCategory, e.target.value);
    });
  }
  
  // Botones principales
  if (elements.analyzeBtn) {
    elements.analyzeBtn.addEventListener('click', processDish);
  }
  
  if (elements.clearBtn) {
    elements.clearBtn.addEventListener('click', clearForm);
  }
  
  // Chef name update
  if (elements.chefName) {
    elements.chefName.addEventListener('change', () => {
      if (elements.activeChef) {
        elements.activeChef.textContent = elements.chefName.value;
      }
    });
  }
  
  // Enter key para procesar
  if (elements.dishNameInput) {
    elements.dishNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        processDish();
      }
    });
  }
  
  // Gestión de ingredientes
  if (elements.addIngredientBtn) {
    elements.addIngredientBtn.addEventListener('click', () => showIngredientModal());
  }
  
  if (elements.searchIngredients) {
    elements.searchIngredients.addEventListener('input', filterIngredientsManagement);
  }
  
  if (elements.filterCategory) {
    elements.filterCategory.addEventListener('change', filterIngredientsManagement);
  }
  
  if (elements.filterCommon) {
    elements.filterCommon.addEventListener('change', filterIngredientsManagement);
  }
  
  // Modal de ingredientes
  if (elements.closeModal) {
    elements.closeModal.addEventListener('click', hideIngredientModal);
  }
  
  if (elements.cancelModalBtn) {
    elements.cancelModalBtn.addEventListener('click', hideIngredientModal);
  }
  
  if (elements.ingredientForm) {
    elements.ingredientForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveIngredient();
    });
  }
  
  // Registro sanitario
  if (elements.applySanitaryFilters) {
    elements.applySanitaryFilters.addEventListener('click', () => {
      const filters = {
        start_date: elements.startDate?.value,
        end_date: elements.endDate?.value,
        chef: elements.filterChef?.value,
        dish_name: elements.filterDish?.value
      };
      loadSanitaryRecord(filters);
    });
  }
  
  if (elements.exportSanitaryBtn) {
    elements.exportSanitaryBtn.addEventListener('click', exportSanitaryRecord);
  }
  
  if (elements.refreshSanitaryBtn) {
    elements.refreshSanitaryBtn.addEventListener('click', () => loadSanitaryRecord());
  }
  
  // Configuración
  if (elements.savePrinterConfig) {
    elements.savePrinterConfig.addEventListener('click', savePrinterConfiguration);
  }
  
  if (elements.saveGeneralConfig) {
    elements.saveGeneralConfig.addEventListener('click', saveGeneralConfiguration);
  }
  
  // Click fuera del modal para cerrar
  if (elements.ingredientModal) {
    elements.ingredientModal.addEventListener('click', (e) => {
      if (e.target === elements.ingredientModal) {
        hideIngredientModal();
      }
    });
  }
}

function filterIngredientsManagement() {
  // Implementar filtrado en la pestaña de gestión
  // Esto es diferente al filtrado en la pestaña de platos
  // TODO: Implementar si es necesario
}

// === UTILIDADES ===

async function loadTodayDishes() {
  try {
    const response = await fetch('/api/dishes/today');
    const dishes = await response.json();

    if (elements.dishCount) {
      elements.dishCount.textContent = `${dishes.length} platos`;
    }
    
    stats.analyzed = dishes.length;
    stats.allergens = dishes.reduce((total, dish) => total + dish.allergens.length, 0);

    if (dishes.length === 0) {
      if (elements.todayDishes) {
        elements.todayDishes.innerHTML = '<p class="text-gray-500 text-center py-8">No hay platos registrados hoy</p>';
      }
      return;
    }

    const dishesHTML = dishes.map(dish => `
      <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h4 class="font-bold text-gray-800">${dish.name}</h4>
            <p class="text-sm text-gray-600 mb-2">${dish.description}</p>
            <div class="flex items-center space-x-4 text-xs text-gray-500">
              <span>👨‍🍳 ${dish.chef}</span>
              <span>🕐 ${new Date(dish.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>🚨 ${dish.allergens.length > 0 ? `${dish.allergens.length} alérgenos` : 'Sin alérgenos'}</span>
              <span>🎯 ${Math.round(dish.confidence * 100)}%</span>
            </div>
          </div>
          <div class="flex-shrink-0 ml-4 flex space-x-2">
            <button onclick="downloadDishLabel(${dish.id})" class="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded transition-colors">
              📄 PDF
            </button>
            <button onclick="printDishLabel(${dish.id})" class="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded transition-colors">
              🖨️ Print
            </button>
          </div>
        </div>
        ${dish.allergens.length > 0 ? `
          <div class="mt-2 flex flex-wrap gap-1">
            ${dish.allergens.map(code => `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                ${getAllergenInfo(code).icon} ${getAllergenInfo(code).name}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    if (elements.todayDishes) {
      elements.todayDishes.innerHTML = dishesHTML;
    }
    
    updateStats();

  } catch (error) {
    console.error('❌ Error loading today dishes:', error);
  }
}

function updateStats() {
  if (elements.statsAnalyzed) elements.statsAnalyzed.textContent = stats.analyzed;
  if (elements.statsLabels) elements.statsLabels.textContent = stats.labels;
  if (elements.statsAllergens) elements.statsAllergens.textContent = stats.allergens;
}

function updateCurrentDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES');
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const currentDateTime = document.getElementById('currentDateTime');
  if (currentDateTime) {
    currentDateTime.textContent = `${dateStr} - ${timeStr}`;
  }
}

function clearForm() {
  if (elements.dishNameInput) elements.dishNameInput.value = '';
  if (elements.ingredientSearch) elements.ingredientSearch.value = '';
  
  selectedIngredients = [];
  updateSelectedIngredientsUI();
  renderIngredientsGrid();
  
  hideError();
  hideResults();
  currentDish = null;
  
  // Resetear filtros
  const activeFilter = elements.categoryFilters?.querySelector('.category-filter.active');
  if (activeFilter && activeFilter.dataset.category !== 'all') {
    elements.categoryFilters?.querySelectorAll('.category-filter').forEach(btn => {
      btn.classList.remove('active');
    });
    elements.categoryFilters?.querySelector('[data-category="all"]')?.classList.add('active');
    filterIngredients('all');
  }
}

function showError(message) {
  if (elements.errorText) elements.errorText.textContent = message;
  if (elements.errorMessage) elements.errorMessage.classList.remove('hidden');
  if (elements.results) elements.results.classList.add('hidden');
  if (elements.loading) elements.loading.classList.add('hidden');
}

function hideError() {
  if (elements.errorMessage) elements.errorMessage.classList.add('hidden');
}

function showLoading() {
  hideError();
  if (elements.results) elements.results.classList.add('hidden');
  if (elements.loading) elements.loading.classList.remove('hidden');
}

function showResults() {
  if (elements.loading) elements.loading.classList.add('hidden');
  if (elements.results) elements.results.classList.remove('hidden');
}

function hideResults() {
  if (elements.results) elements.results.classList.add('hidden');
}

function showSuccessMessage(message) {
  const successMessage = document.createElement('div');
  successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300';
  successMessage.textContent = message;
  document.body.appendChild(successMessage);

  setTimeout(() => {
    successMessage.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (document.body.contains(successMessage)) {
        document.body.removeChild(successMessage);
      }
    }, 300);
  }, 3000);
}

function getAllergenInfo(code) {
  const allergens = {
    'gluten': { name: 'Gluten', icon: '🌾' },
    'crustaceos': { name: 'Crustáceos', icon: '🦐' },
    'huevos': { name: 'Huevos', icon: '🥚' },
    'pescado': { name: 'Pescado', icon: '🐟' },
    'cacahuetes': { name: 'Cacahuetes', icon: '🥜' },
    'soja': { name: 'Soja', icon: '🌱' },
    'lacteos': { name: 'Lácteos', icon: '🥛' },
    'frutos_secos': { name: 'Frutos secos', icon: '🌰' },
    'apio': { name: 'Apio', icon: '🥬' },
    'mostaza': { name: 'Mostaza', icon: '🟡' },
    'sesamo': { name: 'Sésamo', icon: '🫘' },
    'sulfitos': { name: 'Sulfitos', icon: '🍷' },
    'altramuces': { name: 'Altramuces', icon: '🫘' },
    'moluscos': { name: 'Moluscos', icon: '🦪' }
  };
  return allergens[code] || { name: code, icon: '⚠️' };
}

// === FUNCIONES GLOBALES (llamadas desde HTML) ===

// Generar etiqueta bonita
async function generateBeautifulLabel() {
  if (!currentDish) return;

  try {
    showSuccessMessage('✨ Generando etiqueta bonita...');

    const response = await fetch(`/api/generate-beautiful-single/${currentDish.id}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Error generando etiqueta bonita');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta_bonita_${currentDish.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccessMessage('✨ Etiqueta bonita descargada correctamente');
    stats.labels++;
    updateStats();

  } catch (error) {
    console.error('❌ Error generating beautiful label:', error);
    showError('Error generando etiqueta bonita');
  }
}

// Imprimir directamente
async function printDirectly() {
  if (!currentDish) return;

  try {
    showSuccessMessage('🖨️ Preparando etiqueta para impresión...');

    // Crear ventana de impresión con HTML limpio
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${currentDish.name}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 2cm; }
          
          body { 
            margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif;
            background: white; color: black; display: flex; justify-content: center;
            align-items: center; min-height: 80vh; line-height: 1.4;
          }
          
          .etiqueta {
            width: 400px; height: 280px; border: 4px solid #2563eb;
            border-radius: 20px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            position: relative; overflow: hidden; font-family: Arial, Helvetica, sans-serif;
          }
          
          .header {
            background: #2563eb; color: white; padding: 15px; text-align: center;
            font-size: 20px; font-weight: bold; margin: 4px 4px 0 4px;
            border-radius: 16px 16px 0 0;
          }
          
          .plato-nombre {
            text-align: center; font-size: 26px; font-weight: bold; color: #1f2937;
            margin: 25px 20px; padding: 15px 0; border-bottom: 3px solid #e5e7eb;
            text-transform: uppercase;
          }
          
          .alergenos-container { margin: 20px; padding: 20px; border-radius: 12px; min-height: 80px; }
          
          .con-alergenos { background: #fef2f2; border: 3px solid #ef4444; }
          
          .sin-alergenos {
            background: #f0fdf4; border: 3px solid #22c55e; text-align: center;
            display: flex; flex-direction: column; justify-content: center;
          }
          
          .alergenos-titulo {
            font-size: 16px; font-weight: bold; color: #dc2626; text-align: center;
            margin-bottom: 15px; text-transform: uppercase;
          }
          
          .alergenos-lista {
            display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
            font-size: 14px; color: #991b1b; font-weight: bold;
          }
          
          .alergen-item { display: flex; align-items: center; padding: 2px 0; }
          
          .sin-alergenos-texto {
            font-size: 20px; font-weight: bold; color: #15803d; margin-bottom: 8px;
          }
          
          .sin-alergenos-desc { font-size: 14px; color: #16a34a; }
          
          .footer {
            position: absolute; bottom: 15px; left: 20px; right: 20px;
            text-align: center; font-size: 11px; color: #6b7280;
            border-top: 2px solid #e5e7eb; padding-top: 10px;
          }
          
          .footer-fecha {
            font-weight: bold; color: #374151; font-size: 13px; margin-bottom: 5px;
          }
          
          .footer-chef { font-size: 10px; color: #9ca3af; }
          
          @media print {
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            .etiqueta { box-shadow: none !important; border: 3px solid #2563eb !important; }
          }
        </style>
      </head>
      <body>
        <div class="etiqueta">
          <div class="header">BUFFET SELECTION</div>
          
          <div class="plato-nombre">${currentDish.name}</div>
          
          <div class="alergenos-container ${currentDish.allergens.length > 0 ? 'con-alergenos' : 'sin-alergenos'}">
            ${currentDish.allergens.length > 0 ? `
              <div class="alergenos-titulo">CONTIENE ALERGENOS</div>
              <div class="alergenos-lista">
                ${currentDish.allergens.map(allergenCode => {
                  const allergen = getAllergenInfo(allergenCode);
                  return `<div class="alergen-item">• ${allergen.name}</div>`;
                }).join('')}
              </div>
            ` : `
              <div class="sin-alergenos-texto">✓ SIN ALERGENOS DETECTADOS</div>
              <div class="sin-alergenos-desc">
                Este plato es seguro para personas con alergias alimentarias
              </div>
            `}
          </div>
          
          <div class="footer">
            <div class="footer-fecha">
              ${currentDish.date} - ${new Date(currentDish.timestamp).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div class="footer-chef">
              Preparado por: ${currentDish.chef} | Confianza: ${Math.round(currentDish.confidence * 100)}%
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 1500);
          };
          window.onafterprint = function() {
            setTimeout(function() { window.close(); }, 1000);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();

    showSuccessMessage('✅ Etiqueta enviada a impresora');
    stats.labels++;
    updateStats();

  } catch (error) {
    console.error('❌ Error printing:', error);
    showError(`Error preparando impresión: ${error.message}`);
  }
}

// Descargar etiqueta de plato (desde lista de hoy)
async function downloadDishLabel(dishId) {
  try {
    const response = await fetch(`/api/generate-beautiful-single/${dishId}`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Error generando etiqueta');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta_${dishId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccessMessage('✅ Etiqueta descargada');

  } catch (error) {
    console.error('❌ Error downloading label:', error);
    showError('Error descargando etiqueta');
  }
}

// Imprimir etiqueta de plato (desde lista de hoy)
async function printDishLabel(dishId) {
  try {
    const response = await fetch(`/api/print-directly/${dishId}`, {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      showSuccessMessage(`🖨️ Etiqueta enviada a impresora`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Error printing label:', error);
    showError('Error imprimiendo etiqueta');
  }
}

// Configuración de impresora
async function savePrinterConfiguration() {
  try {
    const config = {
      printer_name: elements.printerName?.value || 'default',
      paper_size: elements.paperSize?.value || 'A4',
      auto_print: elements.autoPrint?.checked || false
    };

    const response = await fetch('/api/configure-printer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await response.json();

    if (result.success) {
      if (elements.printerStatus) {
        elements.printerStatus.textContent = `Estado: ${result.message} - ${config.printer_name}`;
      }
      showSuccessMessage('⚙️ Configuración de impresora guardada');
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Error saving printer config:', error);
    showError('Error guardando configuración de impresora');
  }
}

// Configuración general
async function saveGeneralConfiguration() {
  try {
    showSuccessMessage('⚙️ Configuración general guardada');
  } catch (error) {
    console.error('❌ Error saving general config:', error);
    showError('Error guardando configuración general');
  }
}

// === INICIALIZACIÓN FINAL ===

// Actualizar fecha cada minuto
setInterval(updateCurrentDate, 60000);

console.log('🎉 JavaScript mejorado cargado correctamente');
