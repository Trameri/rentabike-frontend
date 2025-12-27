// Configurazione ambiente per il frontend
export const config = {
  // URL del backend
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://rentabike-backend-1.onrender.com',
  BACKEND_APP_URL: import.meta.env.VITE_BACKEND_APP_URL || 'https://rentabike-backend-1.onrender.com',
  
  // Configurazione upload
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  },
  
  // Configurazione UI
  UI: {
    ITEMS_PER_PAGE: 20,
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 4000,
    AUTO_REFRESH_INTERVAL: 120000 // 2 minuti
  },
  
  // Configurazione contratti
  CONTRACTS: {
    DEFAULT_HOURLY_PRICE: 5,
    DEFAULT_DAILY_PRICE: 30,
    OVERDUE_THRESHOLD_HOURS: 24,
    MAX_CONTRACT_DURATION_DAYS: 30
  },
  
  // Configurazione bici
  BIKES: {
    DEFAULT_TYPES: [
      { value: 'bici', label: '🚴 Bici' },
      { value: 'bike-front', label: '⚡ Bike Front' },
      { value: 'bike-full', label: '🔋 Bike Full' },
      { value: 'muscolari', label: '💪 Muscolari' },
      { value: 'ebike-generale', label: '🔋 E-bike Generale' }
    ],
    STATUS_OPTIONS: [
      { value: 'available', label: '✅ Disponibile', color: '#10b981' },
      { value: 'in-use', label: '🔄 In uso', color: '#3b82f6' },
      { value: 'maintenance', label: '🔧 Manutenzione', color: '#f59e0b' },
      { value: 'reserved', label: '📅 Riservata', color: '#8b5cf6' }
    ]
  },
  
  // Configurazione accessori
  ACCESSORIES: {
    DEFAULT_HOURLY_PRICE: 2,
    DEFAULT_DAILY_PRICE: 10
  },
  
  // Feature flags
  FEATURES: {
    ENABLE_BARCODE_SCANNER: true,
    ENABLE_DOCUMENT_CAPTURE: true,
    ENABLE_REAL_TIME_UPDATES: true,
    ENABLE_ADVANCED_REPORTING: true,
    ENABLE_BULK_OPERATIONS: true
  },
  
  // Configurazione sviluppo
  DEV: {
    ENABLE_CONSOLE_LOGS: import.meta.env.DEV,
    ENABLE_ERROR_BOUNDARY_DETAILS: import.meta.env.DEV,
    MOCK_API_CALLS: false
  }
}

// Utility per ottenere configurazioni specifiche
export const getApiUrl = (endpoint = '') => {
  const base = config.API_BASE_URL.replace(/\/$/, '')
  const ep = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
  return `${base}${ep}`
}

export const getBackendAppUrl = (path = '') => {
  const base = config.BACKEND_APP_URL
  if (!path) return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export const isFeatureEnabled = (feature) => {
  return config.FEATURES[feature] || false
}

export const getBikeTypeLabel = (type) => {
  const bikeType = config.BIKES.DEFAULT_TYPES.find(t => t.value === type)
  return bikeType ? bikeType.label : type
}

export const getBikeStatusConfig = (status) => {
  return config.BIKES.STATUS_OPTIONS.find(s => s.value === status) || {
    value: status,
    label: status,
    color: '#6b7280'
  }
}

export default config