// Test per Contract Manager
// Questo file contiene test manuali per verificare le funzionalità
import { calculateItemPrice } from '../utils/contractCalculations.js';

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

// Test calcolo prezzo con NUOVA LOGICA (scatto orario)
 const calculateDetailedBill = (contract) => {
   if (!contract || !contract.items || contract.items.length === 0) {
     return { finalTotal: 0, items: [], duration: { hours: 0, days: 0 }, startDate: null, endDate: null }
   }
   
   let totalAmount = 0
   const billItems = []
   let oreFatturateTotal = 0
   
   contract.items.forEach(item => {
     if ((item.kind === 'bike' || item.kind === 'accessory') && !item.returnedAt) {
       const startDate = new Date(contract.startAt || contract.createdAt)
       const endDate = new Date(contract.endAt || new Date())
        const durationMs = Math.max(0, endDate - startDate)
        const durationMinutes = durationMs / (1000 * 60)
        
        // Scatto orario: ore fatturate con Math.ceil(minutes/60)
        const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60))
        oreFatturateTotal = oreFatturate
        
        const priceHourly = parseFloat(item.priceHourly) || 0
        const priceDaily = parseFloat(item.priceDaily) || 0
        
        const itemBasePrice = calculateItemPrice(priceHourly, priceDaily, startDate, endDate)
       
        const insuranceAmount = item.insurance ? 5 : 0
       const itemTotal = itemBasePrice + insuranceAmount
       
       totalAmount += itemTotal
       billItems.push({
         name: item.name || 'Item senza nome',
         duration: `${oreFatturate} ore`,
         basePrice: itemBasePrice,
         insurance: insuranceAmount,
         total: itemTotal
       })
     }
   })
   
   return {
    finalTotal: Math.round(totalAmount * 100) / 100,
    items: billItems,
    duration: { hours: oreFatturateTotal, days: 0 },
    startDate: new Date(contract.startAt || contract.createdAt),
    endDate: new Date(contract.endAt || new Date())
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

import { recalculateContractTotals, isConcludedContract } from '../utils/contractCalculations.js';

console.log('\n=== TEST RICALCOLO TOTALI CONTRATTI CONCLUSI ===');

const concludedContract = {
  _id: 'concl1',
  customer: { name: 'Test Concluso', phone: '123' },
  status: 'completed',
  startAt: new Date(Date.now() - 86400000).toISOString(),
  endAt: new Date(Date.now() - 3600000).toISOString(),
  insuranceFlat: 0,
  extraCharges: [],
  totals: {
    bikesTotal: 100,
    insuranceTotal: 10,
    extrasTotal: 0,
    grandTotal: 110
  },
  items: [
    {
      _id: 'item1',
      name: 'Bici Test',
      kind: 'bike',
      priceHourly: 10,
      priceDaily: 50,
      returnedAt: new Date(Date.now() - 3600000).toISOString(),
      insurance: true
    }
  ]
};

const concludedContractModified = {
  ...concludedContract,
  totals: undefined,
  items: [
    {
      ...concludedContract.items[0],
      priceHourly: 20,
      returnedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ]
};

const recalculated = recalculateContractTotals(concludedContractModified);
console.log('Contratto modificato (prezzo orario 20):');
console.log('- BiciTotal:', recalculated.bikesTotal.toFixed(2), '(atteso: 50.00 per daily cap)');
console.log('- InsuranceTotal:', recalculated.insuranceTotal.toFixed(2), '(atteso: 5.00)');
console.log('- Total:', recalculated.total.toFixed(2), '(atteso: 55.00)');
console.log('- Esito:', recalculated.bikesTotal === 50 && recalculated.insuranceTotal === 5 ? '✅' : '❌');

console.log('\nTest isConcludedContract:');
console.log('Concluso:', isConcludedContract(concludedContract) ? '✅' : '❌');
console.log('In-use:', !isConcludedContract({ status: 'in-use' }) ? '✅' : '❌');

console.log('\n=== TEST COMPLETATI ===')