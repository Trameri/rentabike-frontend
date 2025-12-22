// Utilità per la gestione delle date
export const dateUtils = {
  // Formatta una data in formato italiano
  formatDate: (date, options = {}) => {
    if (!date) return ''
    
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    }
    
    return new Date(date).toLocaleDateString('it-IT', defaultOptions)
  },

  // Formatta data e ora in formato italiano
  formatDateTime: (date, options = {}) => {
    if (!date) return ''
    
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }
    
    return new Date(date).toLocaleString('it-IT', defaultOptions)
  },

  // Formatta solo l'ora
  formatTime: (date) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  },

  // Calcola la differenza tra due date in giorni
  daysBetween: (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },

  // Calcola la differenza tra due date in ore
  hoursBetween: (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    return Math.ceil(diffTime / (1000 * 60 * 60))
  },

  // Calcola la differenza tra due date in minuti
  minutesBetween: (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    return Math.ceil(diffTime / (1000 * 60))
  },

  // Formatta la durata in modo leggibile
  formatDuration: (startDate, endDate = new Date()) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end - start
    
    if (diffMs < 0) return 'Non iniziato'
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24
      return `${diffDays}g ${remainingHours}h`
    } else if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60
      return `${diffHours}h ${remainingMinutes}m`
    } else {
      return `${diffMinutes}m`
    }
  },

  // Verifica se una data è scaduta (oltre le ore specificate)
  isOverdue: (startDate, thresholdHours = 24) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffHours = (now - start) / (1000 * 60 * 60)
    return diffHours > thresholdHours
  },

  // Ottieni l'inizio del giorno
  startOfDay: (date = new Date()) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  },

  // Ottieni la fine del giorno
  endOfDay: (date = new Date()) => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  },

  // Ottieni l'inizio della settimana (lunedì)
  startOfWeek: (date = new Date()) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lunedì come primo giorno
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  },

  // Ottieni l'inizio del mese
  startOfMonth: (date = new Date()) => {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  },

  // Formatta per input datetime-local
  toInputDateTime: (date = new Date()) => {
    const d = new Date(date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  },

  // Formatta per input date
  toInputDate: (date = new Date()) => {
    const d = new Date(date)
    return d.toISOString().slice(0, 10)
  },

  // Aggiungi giorni a una data
  addDays: (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  // Aggiungi ore a una data
  addHours: (date, hours) => {
    const result = new Date(date)
    result.setHours(result.getHours() + hours)
    return result
  },

  // Verifica se due date sono lo stesso giorno
  isSameDay: (date1, date2) => {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  },

  // Ottieni il nome del giorno della settimana
  getDayName: (date, short = false) => {
    const options = { weekday: short ? 'short' : 'long' }
    return new Date(date).toLocaleDateString('it-IT', options)
  },

  // Ottieni il nome del mese
  getMonthName: (date, short = false) => {
    const options = { month: short ? 'short' : 'long' }
    return new Date(date).toLocaleDateString('it-IT', options)
  },

  // Genera un range di date
  dateRange: (startDate, endDate) => {
    const dates = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    
    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  },

  // Formatta durata relativa (es: "2 ore fa", "3 giorni fa")
  formatRelative: (date) => {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now - past
    
    if (diffMs < 0) return 'Nel futuro'
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) return 'Ora'
    if (diffMinutes < 60) return `${diffMinutes} minuti fa`
    if (diffHours < 24) return `${diffHours} ore fa`
    if (diffDays < 7) return `${diffDays} giorni fa`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`
    return `${Math.floor(diffDays / 365)} anni fa`
  }
}

// Costanti utili
export const DATE_FORMATS = {
  SHORT: { day: '2-digit', month: '2-digit', year: '2-digit' },
  MEDIUM: { day: '2-digit', month: '2-digit', year: 'numeric' },
  LONG: { day: '2-digit', month: 'long', year: 'numeric' },
  TIME_ONLY: { hour: '2-digit', minute: '2-digit' },
  DATETIME: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
}

export default dateUtils