export const isContractClosedForStats = (contract) => {
  const status = String(contract?.status || '').toLowerCase();
  const completedStatuses = ['closed', 'completed', 'returned', 'finished', 'settled'];

  if (completedStatuses.includes(status)) return true;

  const hasCompletionSignal = Boolean(
    contract?.endAt ||
    contract?.returnedAt ||
    contract?.completedAt ||
    contract?.paymentDate ||
    contract?.closedAt
  );

  if (!hasCompletionSignal) return false;

  return Boolean(contract?.paymentCompleted || contract?.paid || contract?.finalAmount || contract?.totals?.grandTotal);
};

export const getContractStatsReferenceDate = (contract) => {
  const referenceDate = contract?.endAt || contract?.returnedAt || contract?.completedAt || contract?.paymentDate || contract?.closedAt || contract?.startAt || contract?.createdAt;

  if (!referenceDate) return null;

  const parsedDate = new Date(referenceDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const calculateSeparateTotals = (contract, itemsInsurancePaidAdvance = {}, contractInsurancePaidAdvance = false) => {
  let bikesTotal = 0;
  let insuranceTotal = 0;
  let extrasTotal = 0;

  // Se il contratto è completato e ha totali salvati, usali
  if (contract.totals && (contract.totals.bikesTotal !== undefined || contract.totals.insuranceTotal !== undefined || contract.totals.grandTotal !== undefined)) {
    bikesTotal = parseFloat(contract.totals.bikesTotal) || 0;
    insuranceTotal = parseFloat(contract.totals.insuranceTotal) || 0;
    extrasTotal = parseFloat(contract.totals.extrasTotal) || 0;
    
    // Per i ricavi, mostriamo sempre il totale completo
    const grandTotal = contract.totals.grandTotal && contract.totals.grandTotal > 0 
      ? parseFloat(contract.totals.grandTotal) 
      : bikesTotal + insuranceTotal + extrasTotal;
    
    return {
      bikesTotal: Math.round(bikesTotal * 100) / 100,
      insuranceTotal: Math.round(insuranceTotal * 100) / 100,
      extrasTotal: Math.round(extrasTotal * 100) / 100,
      total: Math.round(grandTotal * 100) / 100
    };
  }

  if (contract.items && contract.items.length > 0) {
    contract.items.forEach((item) => {
      const startDate = new Date(contract.startAt || contract.createdAt);
      const endDate = item.returnedAt ? new Date(item.returnedAt) : new Date(contract.endAt || new Date());

      const durationMs = Math.max(0, endDate - startDate);
      const durationMinutes = durationMs / (1000 * 60);
      const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60));

      const priceHourly = parseFloat(item.priceHourly) || 0;
      const priceDaily = parseFloat(item.priceDaily) || 0;

      if (item.kind === 'bike' || item.kind === 'accessory') {
        const hourlyTotal = oreFatturate * priceHourly;
        const dailyTotal = priceDaily;

        if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
          bikesTotal += dailyTotal;
        } else {
          bikesTotal += hourlyTotal;
        }

        // Per i ricavi, conteggiamo sempre l'assicurazione se presente
        if (item.insurance) {
          insuranceTotal += 5;
        }
      }
    });
  }

  if (contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0) {
    insuranceTotal += parseFloat(contract.insuranceFlat);
  }

  if (contract.extraCharges && Array.isArray(contract.extraCharges)) {
    contract.extraCharges.forEach(charge => {
      const chargeAmount = parseFloat(charge.amount) || 0;
      if (chargeAmount !== 0) {
        extrasTotal += chargeAmount;
      }
    });
  }

  const calculatedTotal = bikesTotal + insuranceTotal + extrasTotal;

  // Per i ricavi mostriamo sempre il totale completo (bici + assicurazioni + extra)
  // Non usiamo finalAmount come totale perché potrebbe escludere assicurazioni pagate in anticipo
  const finalTotal = calculatedTotal;

  return {
    bikesTotal: Math.round(bikesTotal * 100) / 100,
    insuranceTotal: Math.round(insuranceTotal * 100) / 100,
    extrasTotal: Math.round(extrasTotal * 100) / 100,
    total: Math.round(finalTotal * 100) / 100
  };
};
