// Funzione per calcolare i totali separati di noleggio e assicurazione
// items insurancePaidAdvance è un array di booleani indicante se l'assicurazione è stata pagata in anticipo
export const calculateSeparateTotals = (contract, itemsInsurancePaidAdvance = {}, contractInsurancePaidAdvance = false) => {
  let bikesTotal = 0;
  let insuranceTotal = 0;

  if (contract.items && contract.items.length > 0) {
    contract.items.forEach((item, index) => {
      if (item.returnedAt) return; // Skip item restituiti

      const startDate = new Date(contract.startAt || contract.createdAt);
      const endDate = new Date(contract.endAt || new Date());
      const durationHours = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60)));
      const durationDays = Math.max(1, Math.ceil(durationHours / 24));

      const priceHourly = parseFloat(item.priceHourly) || 0;
      const priceDaily = parseFloat(item.priceDaily) || 0;

      // Calcola il prezzo del noleggio (solo bici/accessorio)
      let itemPrice = 0;
      if (durationHours <= 24) {
        itemPrice = priceHourly * durationHours;
      } else {
        itemPrice = priceDaily * durationDays;
      }

      bikesTotal += itemPrice;

      // Calcola il prezzo dell'assicurazione separatamente
      // Escludi l'assicurazione se è stata pagata in anticipo
      if (item.insurance && !itemsInsurancePaidAdvance[item._id] && !itemsInsurancePaidAdvance[index]) {
        const insuranceFlat = parseFloat(item.insuranceFlat) || 5;
        insuranceTotal += insuranceFlat;
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