// Funzione per calcolare i totali separati di noleggio e assicurazione
// items insurancePaidAdvance è un array di booleani indicante se l'assicurazione è stata pagata in anticipo
export const calculateSeparateTotals = (contract, itemsInsurancePaidAdvance = {}, contractInsurancePaidAdvance = false) => {
  let bikesTotal = 0;
  let insuranceTotal = 0;

  if (contract.items && contract.items.length > 0) {
    contract.items.forEach((item) => {
      // Calcola durata per ogni singolo item
      const startDate = new Date(contract.startAt || contract.createdAt);
      const endDate = item.returnedAt ? new Date(item.returnedAt) : new Date(contract.endAt || new Date());
      
      // Durata in minuti, arrotondata per eccesso via Math.ceil su ore complete
      const durationMs = Math.max(0, endDate - startDate);
      const durationMinutes = durationMs / (1000 * 60);
      const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60));
      
      const priceHourly = parseFloat(item.priceHourly) || 0;
      const priceDaily = parseFloat(item.priceDaily) || 0;

      // Calcola il prezzo del noleggio (solo bici/accessorio)
      let itemPrice = 0;
      
      if (item.kind === 'bike' || item.kind === 'accessory') {
        // Scatto orario: moltiplica ore fatturate per prezzo orario
        // Poi blocca su prezzo giornaliero se supera
        const hourlyTotal = oreFatturate * priceHourly;
        const dailyTotal = priceDaily;
        
        if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
          // Quando il costo orario raggiunge o supera quello giornaliero, si blocca su giornaliera
          itemPrice = dailyTotal;
        } else {
          itemPrice = hourlyTotal;
        }
        
        bikesTotal += itemPrice;

        // Calcola il prezzo dell'assicurazione separatamente
        // Escludi l'assicurazione se è stata pagata in anticipo
        if (item.insurance && !itemsInsurancePaidAdvance[item._id]) {
          const insuranceFlat = parseFloat(item.insuranceFlat) || 5;
          insuranceTotal += insuranceFlat;
        }
      }
    });
  }

  // Se c'è un prezzo finale personalizzato, usa quello
  if (contract.finalAmount && contract.finalAmount > 0) {
    const total = contract.finalAmount;
    // Mantieni la proporzione tra noleggio e assicurazione
    const originalTotal = bikesTotal + insuranceTotal;
    if (originalTotal > 0) {
      const ratio = total / originalTotal;
      bikesTotal = bikesTotal * ratio;
      insuranceTotal = insuranceTotal * ratio;
    } else {
      bikesTotal = total;
      insuranceTotal = 0;
    }
  }

  return {
    bikesTotal: Math.round(bikesTotal * 100) / 100,
    insuranceTotal: Math.round(insuranceTotal * 100) / 100,
    total: Math.round((bikesTotal + insuranceTotal) * 100) / 100
  };
};