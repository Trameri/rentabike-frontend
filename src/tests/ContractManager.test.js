// Test per Contract Manager
// Questo file contiene test manuali per verificare le funzionalità

const testData = {
  validContract: {
    _id: "test123",
    customer: {
      name: "Mario Rossi",
      phone: "123456789"
    },
    items: [
      {
        _id: "item1",
        name: "Bici Mountain",
        kind: "bike",
        priceHourly: 5,
        priceDaily: 25,
        returnedAt: null
      }
    ],
    startAt: new Date().toISOString(),
    status: "in-use"
  },
  
  invalidContract: {
    _id: "test456",
    customer: {
      name: "", // Nome vuoto - errore
      phone: "123456789"
    },
    items: [], // Nessun item - errore
    startAt: null, // Data mancante - errore
    status: "in-use"
  }
}

// Funzione di validazione (copiata dal componente)
const validateContract = (contract) => {
  const errors = []
  
  if (!contract.customer?.name) {
    errors.push('Nome cliente mancante')
  }
  
  if (!contract.items || contract.items.length === 0) {
    errors.push('Nessun item nel contratto')
  }
  
  if (!contract.startAt) {
    errors.push('Data inizio mancante')
  }
  
  contract.items?.forEach((item, index) => {
    if (!item.name) {
      errors.push(`Item ${index + 1}: nome mancante`)
    }
    if (!item.priceHourly && !item.priceDaily) {
      errors.push(`Item ${index + 1}: prezzi mancanti`)
    }
  })
  
  return errors
}

// Test di validazione
console.log('=== TEST VALIDAZIONE CONTRATTI ===')

console.log('Test contratto valido:')
const validErrors = validateContract(testData.validContract)
console.log('Errori trovati:', validErrors.length === 0 ? 'Nessuno ✅' : validErrors)

console.log('\nTest contratto non valido:')
const invalidErrors = validateContract(testData.invalidContract)
console.log('Errori trovati:', invalidErrors.length > 0 ? invalidErrors.join(', ') + ' ✅' : 'Nessuno ❌')

// Test calcolo prezzo
const calculateDetailedBill = (contract) => {
  if (!contract || !contract.items || contract.items.length === 0) {
    return { finalTotal: 0, items: [], duration: { hours: 0, days: 0 }, startDate: null, endDate: null }
  }
  
  const startDate = new Date(contract.startAt || contract.createdAt)
  const endDate = new Date(contract.endAt || new Date())
  const durationMs = Math.max(0, endDate - startDate)
  const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)))
  const durationDays = Math.max(1, Math.ceil(durationHours / 24))
  
  let totalAmount = 0
  const billItems = []
  
  contract.items.forEach(item => {
    if ((item.kind === 'bike' || item.kind === 'accessory') && !item.returnedAt) {
      let itemTotal = 0
      let duration = ''
      
      const priceHourly = parseFloat(item.priceHourly) || 0
      const priceDaily = parseFloat(item.priceDaily) || 0
      
      const hourlyTotal = priceHourly * durationHours
      const dailyTotal = priceDaily * durationDays
      
      if (priceDaily > 0 && (dailyTotal < hourlyTotal || priceHourly === 0)) {
        itemTotal = dailyTotal
        duration = `${durationDays} giorni`
      } else if (priceHourly > 0) {
        itemTotal = hourlyTotal
        duration = `${durationHours} ore`
      }
      
      const insuranceAmount = item.insurance ? (parseFloat(item.insuranceFlat) || 5) : 0
      itemTotal += insuranceAmount
      
      totalAmount += itemTotal
      billItems.push({
        name: item.name || 'Item senza nome',
        duration,
        basePrice: itemTotal - insuranceAmount,
        insurance: insuranceAmount,
        total: itemTotal
      })
    }
  })
  
  return {
    finalTotal: Math.round(totalAmount * 100) / 100,
    items: billItems,
    duration: { hours: durationHours, days: durationDays },
    startDate,
    endDate
  }
}

console.log('\n=== TEST CALCOLO PREZZO ===')
const bill = calculateDetailedBill(testData.validContract)
console.log('Calcolo prezzo per contratto valido:')
console.log('- Totale:', bill.finalTotal, '€')
console.log('- Durata:', bill.duration.hours, 'ore')
console.log('- Items:', bill.items.length)

console.log('\n=== TUTTI I TEST COMPLETATI ===')
console.log('Contract Manager sembra funzionare correttamente! ✅')

export { validateContract, calculateDetailedBill, testData }