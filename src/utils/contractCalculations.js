export const hasMeaningfulRevenueForStats = (contract) => {
  if (!contract) return false;

  const hasSavedTotals = Boolean(
    contract?.totals && [contract.totals.bikesTotal, contract.totals.insuranceTotal, contract.totals.extrasTotal, contract.totals.grandTotal]
      .some((value) => Number(value) > 0)
  );

  const hasItemsWithRevenue = Array.isArray(contract?.items) && contract.items.some((item) => {
    const priceHourly = parseFloat(item?.priceHourly) || 0;
    const priceDaily = parseFloat(item?.priceDaily) || 0;
    return (item?.kind === 'bike' || item?.kind === 'accessory') && (priceHourly > 0 || priceDaily > 0);
  });

  const hasExtraCharges = Array.isArray(contract?.extraCharges) && contract.extraCharges.some((charge) => Number(charge?.amount) > 0);
  const hasInsuranceFlat = Number(contract?.insuranceFlat) > 0;

  return hasSavedTotals || hasItemsWithRevenue || hasExtraCharges || hasInsuranceFlat;
};

export const isContractClosedForStats = (contract) => {
  if (!contract) return false;

  const status = String(contract?.status || '').toLowerCase();
  const completedStatuses = ['closed', 'completed', 'returned', 'finished', 'settled'];
  const activeStatuses = ['in-use', 'reserved', 'active', 'pending', 'draft', 'new'];

  if (activeStatuses.includes(status)) return false;

  if (completedStatuses.includes(status)) {
    return hasMeaningfulRevenueForStats(contract);
  }

  const hasCompletionSignal = Boolean(
    contract?.endAt ||
    contract?.returnedAt ||
    contract?.completedAt ||
    contract?.paymentDate ||
    contract?.closedAt
  );

  if (!hasCompletionSignal) return false;

  return hasMeaningfulRevenueForStats(contract);
};

export const getContractStatsReferenceDate = (contract) => {
  const referenceDate = contract?.endAt || contract?.returnedAt || contract?.completedAt || contract?.paymentDate || contract?.closedAt || contract?.startAt || contract?.createdAt;

  if (!referenceDate) return null;

  const parsedDate = new Date(referenceDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const isConcludedContract = (contract) => {
  const status = String(contract?.status || '').toLowerCase();
  return ['closed', 'completed', 'returned', 'finished', 'settled'].includes(status);
};

export const recalculateContractTotals = (contract) => {
  if (!contract || !contract.items || contract.items.length === 0) {
    return {
      bikesTotal: 0,
      insuranceTotal: 0,
      extrasTotal: 0,
      total: 0,
      grandTotal: 0
    };
  }

  const now = new Date();
  let bikesTotal = 0;
  let insuranceTotal = 0;
  let extrasTotal = 0;
  const contractStartDate = new Date(contract.startAt || contract.createdAt);

  if (contract.customFinalPrice && parseFloat(contract.customFinalPrice) > 0) {
    const customTotal = parseFloat(contract.customFinalPrice);
    return {
      bikesTotal: customTotal,
      insuranceTotal: 0,
      extrasTotal: 0,
      total: customTotal,
      grandTotal: customTotal
    };
  }

  contract.items.forEach((item) => {
    if (item.kind !== 'bike' && item.kind !== 'accessory') return;

    const itemStartAt = item.startAt ? new Date(item.startAt) : contractStartDate;
    const itemEndAt = item.returnedAt ? new Date(item.returnedAt) : new Date(contract.endAt || now);
    const durationMs = Math.max(0, itemEndAt - itemStartAt);
    const durationMinutes = durationMs / (1000 * 60);
    const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60));

    const priceHourly = parseFloat(item.priceHourly) || 0;
    const priceDaily = parseFloat(item.priceDaily) || 0;

    const hourlyTotal = oreFatturate * priceHourly;
    const dailyTotal = priceDaily;

    if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
      bikesTotal += dailyTotal;
    } else {
      bikesTotal += hourlyTotal;
    }

    if (item.insurance) {
      insuranceTotal += 5;
    }
  });

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

  const total = bikesTotal + insuranceTotal + extrasTotal;

  return {
    bikesTotal: Math.round(bikesTotal * 100) / 100,
    insuranceTotal: Math.round(insuranceTotal * 100) / 100,
    extrasTotal: Math.round(extrasTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
    grandTotal: Math.round(total * 100) / 100
  };
};

export const calculateSeparateTotals = (contract, itemsInsurancePaidAdvance = {}, contractInsurancePaidAdvance = false) => {
  let bikesTotal = 0;
  let insuranceTotal = 0;
  let extrasTotal = 0;

  if (contract.totals && (contract.totals.bikesTotal !== undefined || contract.totals.insuranceTotal !== undefined || contract.totals.grandTotal !== undefined)) {
    bikesTotal = parseFloat(contract.totals.bikesTotal) || 0;
    insuranceTotal = parseFloat(contract.totals.insuranceTotal) || 0;
    extrasTotal = parseFloat(contract.totals.extrasTotal) || 0;
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

  if (contract.customFinalPrice && parseFloat(contract.customFinalPrice) > 0) {
    const customTotal = parseFloat(contract.customFinalPrice);
    return {
      bikesTotal: customTotal,
      insuranceTotal: 0,
      extrasTotal: 0,
      total: customTotal
    };
  }

  const backendTotal = parseFloat(contract.finalAmount || contract.contractTotal || 0);
  if (backendTotal > 0) {
    return {
      bikesTotal: backendTotal,
      insuranceTotal: 0,
      extrasTotal: 0,
      total: backendTotal
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
