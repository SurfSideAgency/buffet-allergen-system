// Añadir al server.js - REEMPLAZAR la sección de base de datos

// Base de datos expandida para ingredientes
let ingredients = [
  // PROTEÍNAS ANIMALES
  { id: 1, code: 'pollo', name: 'Pollo', allergens: [], category: 'proteina', common: true },
  { id: 2, code: 'ternera', name: 'Ternera', allergens: [], category: 'proteina', common: true },
  { id: 3, code: 'cerdo', name: 'Cerdo', allergens: [], category: 'proteina', common: true },
  { id: 4, code: 'cordero', name: 'Cordero', allergens: [], category: 'proteina', common: false },
  
  // PESCADOS Y MARISCOS
  { id: 5, code: 'merluza', name: 'Merluza', allergens: ['pescado'], category: 'pescado', common: true },
  { id: 6, code: 'salmon', name: 'Salmón', allergens: ['pescado'], category: 'pescado', common: true },
  { id: 7, code: 'bacalao', name: 'Bacalao', allergens: ['pescado'], category: 'pescado', common: true },
  { id: 8, code: 'gambas', name: 'Gambas', allergens: ['crustaceos'], category: 'marisco', common: true },
  { id: 9, code: 'langostinos', name: 'Langostinos', allergens: ['crustaceos'], category: 'marisco', common: true },
  { id: 10, code: 'mejillones', name: 'Mejillones', allergens: ['moluscos'], category: 'marisco', common: true },
  { id: 11, code: 'almejas', name: 'Almejas', allergens: ['moluscos'], category: 'marisco', common: false },
  { id: 12, code: 'calamares', name: 'Calamares', allergens: ['moluscos'], category: 'marisco', common: true },
  
  // LÁCTEOS Y HUEVOS
  { id: 13, code: 'leche', name: 'Leche', allergens: ['lacteos'], category: 'lacteo', common: true },
  { id: 14, code: 'mantequilla', name: 'Mantequilla', allergens: ['lacteos'], category: 'lacteo', common: true },
  { id: 15, code: 'nata', name: 'Nata', allergens: ['lacteos'], category: 'lacteo', common: true },
  { id: 16, code: 'queso_manchego', name: 'Queso Manchego', allergens: ['lacteos'], category: 'lacteo', common: true },
  { id: 17, code: 'queso_mozzarella', name: 'Queso Mozzarella', allergens: ['lacteos'], category: 'lacteo', common: true },
  { id: 18, code: 'yogur', name: 'Yogur', allergens: ['lacteos'], category: 'lacteo', common: false },
  { id: 19, code: 'huevos', name: 'Huevos', allergens: ['huevos'], category: 'huevo', common: true },
  
  // CEREALES Y HARINAS
  { id: 20, code: 'harina_trigo', name: 'Harina de Trigo', allergens: ['gluten'], category: 'cereal', common: true },
  { id: 21, code: 'pan_blanco', name: 'Pan Blanco', allergens: ['gluten'], category: 'cereal', common: true },
  { id: 22, code: 'pan_integral', name: 'Pan Integral', allergens: ['gluten'], category: 'cereal', common: false },
  { id: 23, code: 'pasta', name: 'Pasta', allergens: ['gluten'], category: 'cereal', common: true },
  { id: 24, code: 'arroz', name: 'Arroz', allergens: [], category: 'cereal', common: true },
  { id: 25, code: 'cebada', name: 'Cebada', allergens: ['gluten'], category: 'cereal', common: false },
  { id: 26, code: 'avena', name: 'Avena', allergens: ['gluten'], category: 'cereal', common: false },
  
  // VERDURAS Y HORTALIZAS
  { id: 27, code: 'tomate', name: 'Tomate', allergens: [], category: 'verdura', common: true },
  { id: 28, code: 'cebolla', name: 'Cebolla', allergens: [], category: 'verdura', common: true },
  { id: 29, code: 'ajo', name: 'Ajo', allergens: [], category: 'verdura', common: true },
  { id: 30, code: 'pimiento_rojo', name: 'Pimiento Rojo', allergens: [], category: 'verdura', common: true },
  { id: 31, code: 'pimiento_verde', name: 'Pimiento Verde', allergens: [], category: 'verdura', common: true },
  { id: 32, code: 'calabacin', name: 'Calabacín', allergens: [], category: 'verdura', common: true },
  { id: 33, code: 'berenjena', name: 'Berenjena', allergens: [], category: 'verdura', common: true },
  { id: 34, code: 'apio_vegetal', name: 'Apio', allergens: ['apio'], category: 'verdura', common: false },
  { id: 35, code: 'zanahoria', name: 'Zanahoria', allergens: [], category: 'verdura', common: true },
  { id: 36, code: 'patata', name: 'Patata', allergens: [], category: 'verdura', common: true },
  
  // LEGUMBRES
  { id: 37, code: 'garbanzos', name: 'Garbanzos', allergens: [], category: 'legumbre', common: true },
  { id: 38, code: 'lentejas', name: 'Lentejas', allergens: [], category: 'legumbre', common: true },
  { id: 39, code: 'judias_blancas', name: 'Judías Blancas', allergens: [], category: 'legumbre', common: true },
  { id: 40, code: 'judias_verdes', name: 'Judías Verdes', allergens: [], category: 'verdura', common: true },
  { id: 41, code: 'soja_grano', name: 'Soja en Grano', allergens: ['soja'], category: 'legumbre', common: false },
  
  // FRUTOS SECOS Y SEMILLAS
  { id: 42, code: 'almendras', name: 'Almendras', allergens: ['frutos_secos'], category: 'fruto_seco', common: true },
  { id: 43, code: 'nueces', name: 'Nueces', allergens: ['frutos_secos'], category: 'fruto_seco', common: true },
  { id: 44, code: 'avellanas', name: 'Avellanas', allergens: ['frutos_secos'], category: 'fruto_seco', common: false },
  { id: 45, code: 'cacahuetes', name: 'Cacahuetes', allergens: ['cacahuetes'], category: 'fruto_seco', common: true },
  { id: 46, code: 'sesamo', name: 'Semillas de Sésamo', allergens: ['sesamo'], category: 'semilla', common: false },
  { id: 47, code: 'pipas_girasol', name: 'Pipas de Girasol', allergens: [], category: 'semilla', common: false },
  
  // CONDIMENTOS Y ESPECIAS
  { id: 48, code: 'sal', name: 'Sal', allergens: [], category: 'condimento', common: true },
  { id: 49, code: 'pimienta_negra', name: 'Pimienta Negra', allergens: [], category: 'condimento', common: true },
  { id: 50, code: 'pimenton', name: 'Pimentón', allergens: [], category: 'condimento', common: true },
  { id: 51, code: 'azafran', name: 'Azafrán', allergens: [], category: 'condimento', common: true },
  { id: 52, code: 'perejil', name: 'Perejil', allergens: [], category: 'hierba', common: true },
  { id: 53, code: 'mostaza_salsa', name: 'Mostaza', allergens: ['mostaza'], category: 'condimento', common: true },
  { id: 54, code: 'vinagre', name: 'Vinagre', allergens: [], category: 'condimento', common: true },
  
  // ACEITES Y GRASAS
  { id: 55, code: 'aceite_oliva', name: 'Aceite de Oliva', allergens: [], category: 'grasa', common: true },
  { id: 56, code: 'aceite_girasol', name: 'Aceite de Girasol', allergens: [], category: 'grasa', common: true },
  { id: 57, code: 'aceite_sesamo', name: 'Aceite de Sésamo', allergens: ['sesamo'], category: 'grasa', common: false },
  
  // SALSAS Y CONDIMENTOS ELABORADOS
  { id: 58, code: 'salsa_tomate', name: 'Salsa de Tomate', allergens: [], category: 'salsa', common: true },
  { id: 59, code: 'salsa_soja', name: 'Salsa de Soja', allergens: ['soja', 'gluten'], category: 'salsa', common: false },
  { id: 60, code: 'mayonesa', name: 'Mayonesa', allergens: ['huevos'], category: 'salsa', common: true },
  
  // VINO Y ALCOHOL (para cocinar)
  { id: 61, code: 'vino_blanco', name: 'Vino Blanco', allergens: ['sulfitos'], category: 'alcohol', common: true },
  { id: 62, code: 'vino_tinto', name: 'Vino Tinto', allergens: ['sulfitos'], category: 'alcohol', common: true },
  { id: 63, code: 'jerez', name: 'Jerez', allergens: ['sulfitos'], category: 'alcohol', common: false },
  
  // OTROS
  { id: 64, code: 'altramuces', name: 'Altramuces', allergens: ['altramuces'], category: 'legumbre', common: false },
  { id: 65, code: 'agua', name: 'Agua', allergens: [], category: 'liquido', common: true }
];

let ingredientId = 66; // Contador para nuevos ingredientes

// CATEGORÍAS con colores y iconos
const INGREDIENT_CATEGORIES = {
  'proteina': { name: 'Proteínas', icon: '🥩', color: '#ef4444' },
  'pescado': { name: 'Pescados', icon: '🐟', color: '#3b82f6' },
  'marisco': { name: 'Mariscos', icon: '🦐', color: '#06b6d4' },
  'lacteo': { name: 'Lácteos', icon: '🥛', color: '#8b5cf6' },
  'huevo': { name: 'Huevos', icon: '🥚', color: '#f59e0b' },
  'cereal': { name: 'Cereales', icon: '🌾', color: '#d97706' },
  'verdura': { name: 'Verduras', icon: '🥬', color: '#10b981' },
  'legumbre': { name: 'Legumbres', icon: '🫘', color: '#84cc16' },
  'fruto_seco': { name: 'Frutos Secos', icon: '🌰', color: '#92400e' },
  'semilla': { name: 'Semillas', icon: '🫘', color: '#78716c' },
  'condimento': { name: 'Condimentos', icon: '🧂', color: '#6b7280' },
  'hierba': { name: 'Hierbas', icon: '🌿', color: '#22c55e' },
  'grasa': { name: 'Aceites', icon: '🫒', color: '#fbbf24' },
  'salsa': { name: 'Salsas', icon: '🥫', color: '#f97316' },
  'alcohol': { name: 'Vinos', icon: '🍷', color: '#7c3aed' },
  'liquido': { name: 'Líquidos', icon: '💧', color: '#0ea5e9' }
};

// NUEVOS ENDPOINTS para gestión de ingredientes

// Obtener todos los ingredientes
app.get('/api/ingredients', (req, res) => {
  const { category, search, common } = req.query;
  
  let filteredIngredients = ingredients;
  
  // Filtrar por categoría
  if (category && category !== 'all') {
    filteredIngredients = filteredIngredients.filter(ing => ing.category === category);
  }
  
  // Filtrar por búsqueda
  if (search) {
    const searchLower = search.toLowerCase();
    filteredIngredients = filteredIngredients.filter(ing => 
      ing.name.toLowerCase().includes(searchLower) ||
      ing.code.toLowerCase().includes(searchLower)
    );
  }
  
  // Filtrar por comunes
  if (common === 'true') {
    filteredIngredients = filteredIngredients.filter(ing => ing.common);
  }
  
  res.json({
    success: true,
    ingredients: filteredIngredients,
    categories: INGREDIENT_CATEGORIES,
    total: filteredIngredients.length
  });
});

// Obtener categorías
app.get('/api/ingredients/categories', (req, res) => {
  res.json({
    success: true,
    categories: INGREDIENT_CATEGORIES
  });
});

// Añadir nuevo ingrediente
app.post('/api/ingredients', (req, res) => {
  try {
    const { name, code, allergens = [], category, common = false } = req.body;
    
    if (!name || !code || !category) {
      return res.status(400).json({ 
        error: 'Nombre, código y categoría son requeridos' 
      });
    }
    
    // Verificar si el código ya existe
    if (ingredients.find(ing => ing.code === code)) {
      return res.status(400).json({ 
        error: 'Ya existe un ingrediente con ese código' 
      });
    }
    
    const newIngredient = {
      id: ingredientId++,
      name,
      code,
      allergens: allergens.filter(a => ALLERGENS[a]), // Solo alérgenos válidos
      category,
      common
    };
    
    ingredients.push(newIngredient);
    
    res.json({
      success: true,
      ingredient: newIngredient,
      message: 'Ingrediente añadido correctamente'
    });
    
  } catch (error) {
    console.error('Error adding ingredient:', error);
    res.status(500).json({ error: 'Error añadiendo ingrediente' });
  }
});

// Actualizar ingrediente
app.put('/api/ingredients/:id', (req, res) => {
  try {
    const ingredientId = parseInt(req.params.id);
    const { name, allergens, category, common } = req.body;
    
    const ingredientIndex = ingredients.findIndex(ing => ing.id === ingredientId);
    
    if (ingredientIndex === -1) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    
    // Actualizar ingrediente
    ingredients[ingredientIndex] = {
      ...ingredients[ingredientIndex],
      name: name || ingredients[ingredientIndex].name,
      allergens: allergens !== undefined ? allergens.filter(a => ALLERGENS[a]) : ingredients[ingredientIndex].allergens,
      category: category || ingredients[ingredientIndex].category,
      common: common !== undefined ? common : ingredients[ingredientIndex].common
    };
    
    res.json({
      success: true,
      ingredient: ingredients[ingredientIndex],
      message: 'Ingrediente actualizado correctamente'
    });
    
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: 'Error actualiz
