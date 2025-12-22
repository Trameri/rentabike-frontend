import { config } from '../config/environment.js'

// Validazioni per i form
export const validators = {
  // Validazione email
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return 'Email richiesta'
    if (!emailRegex.test(email)) return 'Email non valida'
    return null
  },

  // Validazione telefono
  phone: (phone) => {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/
    if (!phone) return 'Telefono richiesto'
    if (!phoneRegex.test(phone)) return 'Numero di telefono non valido'
    return null
  },

  // Validazione nome
  name: (name, minLength = 2) => {
    if (!name) return 'Nome richiesto'
    if (name.length < minLength) return `Nome deve essere di almeno ${minLength} caratteri`
    if (name.length > 100) return 'Nome troppo lungo'
    return null
  },

  // Validazione prezzo
  price: (price, min = 0) => {
    if (price === null || price === undefined || price === '') return 'Prezzo richiesto'
    const numPrice = Number(price)
    if (isNaN(numPrice)) return 'Prezzo deve essere un numero'
    if (numPrice < min) return `Prezzo deve essere almeno €${min}`
    if (numPrice > 10000) return 'Prezzo troppo alto'
    return null
  },

  // Validazione barcode
  barcode: (barcode) => {
    if (!barcode) return null // Barcode opzionale
    if (barcode.length < 3) return 'Barcode troppo corto'
    if (barcode.length > 50) return 'Barcode troppo lungo'
    if (!/^[A-Za-z0-9\-_]+$/.test(barcode)) return 'Barcode può contenere solo lettere, numeri, - e _'
    return null
  },

  // Validazione URL
  url: (url) => {
    if (!url) return null // URL opzionale
    try {
      new URL(url)
      return null
    } catch {
      return 'URL non valido'
    }
  },

  // Validazione file immagine
  imageFile: (file) => {
    if (!file) return null // File opzionale
    
    if (!config.UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `Tipo file non supportato. Usa: ${config.UPLOAD.ALLOWED_IMAGE_TYPES.join(', ')}`
    }
    
    if (file.size > config.UPLOAD.MAX_FILE_SIZE) {
      return `File troppo grande. Massimo ${Math.round(config.UPLOAD.MAX_FILE_SIZE / 1024 / 1024)}MB`
    }
    
    return null
  },

  // Validazione data
  date: (date, required = false) => {
    if (!date && required) return 'Data richiesta'
    if (!date) return null
    
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'Data non valida'
    
    return null
  },

  // Validazione range date
  dateRange: (startDate, endDate) => {
    if (!startDate || !endDate) return null
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Date non valide'
    }
    
    if (start >= end) {
      return 'La data di fine deve essere successiva alla data di inizio'
    }
    
    const diffDays = (end - start) / (1000 * 60 * 60 * 24)
    if (diffDays > config.CONTRACTS.MAX_CONTRACT_DURATION_DAYS) {
      return `Durata massima contratto: ${config.CONTRACTS.MAX_CONTRACT_DURATION_DAYS} giorni`
    }
    
    return null
  },

  // Validazione password
  password: (password, minLength = 6) => {
    if (!password) return 'Password richiesta'
    if (password.length < minLength) return `Password deve essere di almeno ${minLength} caratteri`
    if (password.length > 100) return 'Password troppo lunga'
    return null
  },

  // Validazione conferma password
  confirmPassword: (password, confirmPassword) => {
    if (!confirmPassword) return 'Conferma password richiesta'
    if (password !== confirmPassword) return 'Le password non coincidono'
    return null
  }
}

// Funzione per validare un oggetto con più campi
export const validateForm = (data, rules) => {
  const errors = {}
  let isValid = true

  for (const [field, validator] of Object.entries(rules)) {
    const error = validator(data[field])
    if (error) {
      errors[field] = error
      isValid = false
    }
  }

  return { isValid, errors }
}

// Validazioni specifiche per entità
export const contractValidation = {
  customer: (customer) => validateForm(customer, {
    name: validators.name,
    phone: validators.phone
  }),
  
  items: (items) => {
    if (!items || items.length === 0) {
      return { isValid: false, errors: { items: 'Almeno un articolo richiesto' } }
    }
    return { isValid: true, errors: {} }
  },
  
  pricing: (pricing) => validateForm(pricing, {
    total: (total) => validators.price(total, 0.01)
  })
}

export const bikeValidation = {
  basic: (bike) => validateForm(bike, {
    name: validators.name,
    type: (type) => !type ? 'Tipo bici richiesto' : null,
    priceHourly: (price) => validators.price(price, 0.01),
    priceDaily: (price) => validators.price(price, 0.01),
    barcode: validators.barcode,
    photoUrl: validators.url
  })
}

export const accessoryValidation = {
  basic: (accessory) => validateForm(accessory, {
    name: validators.name,
    priceHourly: (price) => validators.price(price, 0.01),
    priceDaily: (price) => validators.price(price, 0.01),
    barcode: validators.barcode,
    photoUrl: validators.url
  })
}

// Utility per mostrare errori in modo user-friendly
export const formatValidationError = (error) => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return 'Errore di validazione'
}

export const getFirstError = (errors) => {
  const firstKey = Object.keys(errors)[0]
  return firstKey ? errors[firstKey] : null
}

export default validators