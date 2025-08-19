// Global variables
let isRecording = false;
let recognition = null;
let currentDish = null;
let stats = {
  analyzed: 0,
  labels: 0,
  allergens: 0
};

// DOM Elements
const recordBtn = document.getElementById('recordBtn');
const recordIcon = document.getElementById('recordIcon');
const recordText = document.getElementById('recordText');
const recordingStatus = document.getElementById('recordingStatus');
const dishInput = document.getElementById('dishInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const chefName = document.getElementById('chefName');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const dishResult = document.getElementById('dishResult');
const allergensList = document.getElementById('allergensList');
const todayDishes = document.getElementById('todayDishes');
const dishCount = document.getElementById('dishCount');

// Action buttons
const pdfSimpleBtn = document.getElementById('pdfSimpleBtn');
const printBtn = document.getElementById('printBtn');
const newDishBtn = document.getElementById('newDishBtn');

// Stats elements
const statsAnalyzed = document.getElementById('statsAnalyzed');
const statsLabels = document.getElementById('statsLabels');
const statsAllergens = document.getElementById('statsAllergens');
const activeChef = document.getElementById('activeChef');

// Printer config elements
const printerName = document.getElementById('printerName');
const paperSize = document.getElementById('paperSize');
const printDensity = document.getElementById('printDensity');
const autoPrint = document.getElementById('autoPrint');
const savePrinterConfig = document.getElementById('savePrinterConfig');
const printerStatus = document.getElementById('printerStatus');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initSpeechRecognition();
  updateCurrentDate();
  loadTodayDishes();
  setupEventListeners();
  updateStats();
});

// Setup event listeners
function setupEventListeners() {
  recordBtn.addEventListener('mousedown', startRecording);
  recordBtn.addEventListener('mouseup', stopRecording);
  recordBtn.addEventListener('mouseleave', stopRecording);
  
  // Touch events for mobile
  recordBtn.addEventListener('touchstart', startRecording);
  recordBtn.addEventListener('touchend', stopRecording);
  
  analyzeBtn.addEventListener('click', () => {
    const description = dishInput.value.trim();
    if (description) {
      processDish(description);
    } else {
      showError('Por favor, describe el plato que has preparado.');
    }
  });
  
  clearBtn.addEventListener('click', clearForm);
  
  chefName.addEventListener('change', () => {
    activeChef.textContent = chefName.value;
  });
  
  savePrinterConfig.addEventListener('click', savePrinterConfiguration);
  
  newDishBtn.addEventListener('click', clearForm);
  
  // Enter key to analyze
  dishInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeBtn.click();
    }
  });
}

// Update current date
function updateCurrentDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES');
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('currentDate').textContent = `${dateStr} - ${timeStr}`;
}

// Initialize Speech Recognition
function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onstart = function() {
      console.log('Speech recognition started');
      setRecordingState(true);
    };

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);
      dishInput.value = transcript;
      setRecordingState(false);
      processDish(transcript);
    };

    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      setRecordingState(false);
      showError(`Error de reconocimiento de voz: ${event.error}`);
    };

    recognition.onend = function() {
      console.log('Speech recognition ended');
      setRecordingState(false);
    };
  } else {
    console.warn('Speech recognition not supported');
    recordBtn.style.display = 'none';
    showError('Tu navegador no soporta reconocimiento de voz. Usa el campo de texto.');
  }
}

// Recording functions
function startRecording(e) {
  e.preventDefault();
  if (recognition && !isRecording) {
    recognition.start();
  }
}

function stopRecording(e) {
  e.preventDefault();
  if (recognition && isRecording) {
    recognition.stop();
  }
}

function setRecordingState(recording) {
  isRecording = recording;
  if (recording) {
    recordIcon.textContent = '⏹️';
    recordText.textContent = 'Grabando... Suelta para procesar';
    recordBtn.classList.add('recording');
    recordingStatus.classList.remove('hidden');
  } else {
    recordIcon.textContent = '🎤';
    recordText.textContent = 'Mantener para Grabar';
    recordBtn.classList.remove('recording');
    recordingStatus.classList.add('hidden');
  }
}

// Clear form
function clearForm() {
  dishInput.value = '';
  hideError();
  hideResults();
  currentDish = null;
}

// Show/hide functions
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  results.classList.add('hidden');
  loading.classList.add('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function showLoading() {
  hideError();
  results.classList.add('hidden');
  loading.classList.remove('hidden');
}

function hideResults() {
  results.classList.add('hidden');
}

function showResults() {
  loading.classList.add('hidden');
  results.classList.remove('hidden');
}

// Process dish with AI
async function processDish(description) {
  if (!description.trim()) {
    showError('Por favor, describe el plato que has preparado.');
    return;
  }

  showLoading();

  try {
    const response = await fetch('/api/analyze-dish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description.trim(),
        chef_name: chefName.value.trim()
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
    } else {
      throw new Error('Error procesando el plato');
    }

  } catch (error) {
    console.error('Error processing dish:', error);
    showError(`Error: ${error.message}`);
  }
}

// Display results
function displayResults(dish, allergensInfo) {
  // Dish info
  dishResult.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="text-lg font-bold text-blue-800 mb-2">${dish.name}</h4>
        <p class="text-gray-700 mb-3">${dish.description}</p>
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
            <span>Confianza: ${Math.round(dish.confidence * 100)}%</span>
          </div>
        </div>
      </div>
      <div class="flex-shrink-0 ml-4">
        <div class="text-3xl">🍽️</div>
      </div>
    </div>
    ${dish.analysis ? `
      <div class="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
        <p class="text-sm text-blue-800">
          <strong>Análisis de IA:</strong> ${dish.analysis}
        </p>
      </div>
    ` : ''}
  `;

  // Allergens
  if (allergensInfo && allergensInfo.length > 0) {
    allergensList.innerHTML = allergensInfo.map(allergen => `
      <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center hover:bg-red-100 transition-colors">
        <div class="text-xl mb-1">${allergen.icon}</div>
        <div class="text-xs font-bold text-red-800">${allergen.name}</div>
      </div>
    `).join('');
  } else {
    allergensList.innerHTML = `
      <div class="col-span-full bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div class="text-3xl mb-2">✅</div>
        <div class="text-lg font-bold text-green-800">Sin alérgenos detectados</div>
        <div class="text-sm text-green-600 mt-1">Este plato es seguro para la mayoría de personas</div>
      </div>
    `;
  }

  // Setup action buttons
  setupActionButtons();
  showResults();
}

// Setup action buttons
function setupActionButtons() {
  if (!currentDish) return;

  pdfSimpleBtn.onclick = () => generateSimpleLabel();
  printBtn.onclick = () => printDirectly();
  newDishBtn.onclick = () => clearForm();
  beautifulLabelBtn.onclick = () => generateBeautifulLabel();
  
  // Update button states
  pdfSimpleBtn.disabled = false;
  printBtn.disabled = false;
}

// Generate simple label
async function generateSimpleLabel() {
  if (!currentDish) return;

  try {
    const response = await fetch(`/api/generate-label-simple/${currentDish.id}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Error generando etiqueta');
    }

    // Download PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta_${currentDish.name.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccessMessage('✅ Etiqueta descargada correctamente');
    stats.labels++;
    updateStats();

  } catch (error) {
    console.error('Error generating label:', error);
    showError('Error generando la etiqueta PDF');
  }
}

// Print directly
async function printDirectly() {
  if (!currentDish) return;

  try {
    showSuccessMessage('🖨️ Preparando para imprimir...');

    // Generar PDF bonito (no el simple)
    const response = await fetch(`/api/generate-beautiful-single/${currentDish.id}`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Error generando etiqueta para impresión');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // NUEVO: Abrir PDF en ventana nueva optimizada para impresión
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Crear contenido HTML optimizado para impresión
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Imprimir Etiqueta - ${currentDish.name}</title>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .print-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .print-info {
            margin-bottom: 20px;
            color: #666;
          }
          .print-buttons {
            margin: 20px 0;
          }
          .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            margin: 0 10px;
            font-size: 16px;
          }
          .btn:hover {
            background: #1d4ed8;
          }
          .btn-secondary {
            background: #6b7280;
          }
          .btn-secondary:hover {
            background: #4b5563;
          }
          iframe {
            width: 100%;
            height: 600px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          @media print {
            body { background: white; margin: 0; padding: 0; }
            .print-container { box-shadow: none; padding: 0; }
            .print-info, .print-buttons { display: none; }
            iframe { height: auto; border: none; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-info">
            <h2>🏷️ Etiqueta Lista para Imprimir</h2>
            <p><strong>Plato:</strong> ${currentDish.name}</p>
            <p><strong>Alérgenos:</strong> ${currentDish.allergens.length > 0 ? currentDish.allergens.length + ' detectados' : 'Ninguno'}</p>
          </div>
          
          <div class="print-buttons">
            <button class="btn" onclick="window.print()">🖨️ Imprimir Ahora</button>
            <button class="btn btn-secondary" onclick="window.close()">❌ Cerrar</button>
          </div>
          
          <iframe src="${url}" title="Etiqueta PDF"></iframe>
        </div>
        
        <script>
          // Auto-abrir diálogo de impresión después de cargar
          window.onload = function() {
            setTimeout(function() {
              // Preguntar si quiere imprimir automáticamente
              if (confirm('¿Imprimir etiqueta ahora?')) {
                window.print();
              }
            }, 1500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();

    showSuccessMessage('✅ Ventana de impresión abierta');
    stats.labels++;
    updateStats();

  } catch (error) {
    console.error('Error printing:', error);
    showError(`Error preparando impresión: ${error.message}`);
  }
}

// NUEVA FUNCIÓN: Impresión silenciosa (sin confirmación)
async function printSilently() {
  if (!currentDish) return;

  try {
    const response = await fetch(`/api/generate-beautiful-single/${currentDish.id}`, {
      method: 'POST'
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Crear iframe oculto para impresión
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    iframe.onload = function() {
      // Intentar imprimir directamente (puede requerir permisos del navegador)
      try {
        iframe.contentWindow.print();
        showSuccessMessage('🖨️ Enviado a impresora');
      } catch (e) {
        // Si falla, abrir en ventana nueva
        window.open(url, '_blank').print();
        showSuccessMessage('🖨️ Abriendo ventana de impresión');
      }
      
      // Limpiar después de 5 segundos
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 5000);
    };

  } catch (error) {
    console.error('Error in silent print:', error);
    showError('Error en impresión silenciosa');
  }
}

// OPCIONAL: Añadir botón de impresión rápida
// Si quieres un botón adicional para impresión sin confirmación
function addQuickPrintButton() {
  // Este código se añadiría al HTML si quieres un botón extra
  return `
    <button id="quickPrintBtn" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center">
      <span class="mr-2">⚡</span>
      Impresión Rápida
    </button>
  `;
}

// Update statistics
function updateStats() {
  statsAnalyzed.textContent = stats.analyzed;
  statsLabels.textContent = stats.labels;
  statsAllergens.textContent = stats.allergens;
}

// Load today's dishes
async function loadTodayDishes() {
  try {
    const response = await fetch('/api/dishes/today');
    const dishes = await response.json();

    dishCount.textContent = `${dishes.length} platos`;
    stats.analyzed = dishes.length;
    stats.allergens = dishes.reduce((total, dish) => total + dish.allergens.length, 0);

    if (dishes.length === 0) {
      todayDishes.innerHTML = '<p class="text-gray-500 text-center py-8">No hay platos registrados hoy</p>';
      return;
    }

    todayDishes.innerHTML = dishes.map(dish => `
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

    updateStats();

  } catch (error) {
    console.error('Error loading today dishes:', error);
  }
}

// Helper function to get allergen info
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

// Download dish label (from today's list)
async function downloadDishLabel(dishId) {
  try {
    const response = await fetch(`/api/generate-label-simple/${dishId}`, {
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
    console.error('Error downloading label:', error);
    showError('Error descargando etiqueta');
  }
}

// Print dish label (from today's list)
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
    console.error('Error printing label:', error);
    showError('Error imprimiendo etiqueta');
  }
}

// Save printer configuration
async function savePrinterConfiguration() {
  try {
    const config = {
      printer_name: printerName.value,
      paper_size: paperSize.value,
      auto_print: autoPrint.checked
    };

    const response = await fetch('/api/configure-printer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config)
    });

    const result = await response.json();

    if (result.success) {
      printerStatus.textContent = `Estado: ${result.message} - ${config.printer_name}`;
      showSuccessMessage('⚙️ Configuración de impresora guardada');
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error saving printer config:', error);
    showError('Error guardando configuración de impresora');
  }
}

// Show success message
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
// Generar etiqueta bonita individual
async function generateBeautifulLabel() {
  if (!currentDish) return;

  try {
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

    showSuccessMessage('✨ Etiqueta bonita A4 descargada');
    stats.labels++;
    updateStats();

  } catch (error) {
    console.error('Error generating beautiful label:', error);
    showError('Error generando etiqueta bonita');
  }
}
