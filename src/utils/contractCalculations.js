export const calculateSeparateTotals = (contract, itemsInsurancePaidAdvance = {}, contractInsurancePaidAdvance = false) => {
  let bikesTotal = 0;
  let insuranceTotal = 0;
  let extrasTotal = 0;

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

        if (item.insurance && !itemsInsurancePaidAdvance[item._id]) {
          insuranceTotal += 5;
        }
      }
    });
  }

  if (contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0 && !contractInsurancePaidAdvance) {
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

  const originalTotal = bikesTotal + insuranceTotal + extrasTotal;

  if (contract.finalAmount && contract.finalAmount > 0 && originalTotal > 0) {
    const total = parseFloat(contract.finalAmount);
    const ratio = total / originalTotal;
    bikesTotal = bikesTotal * ratio;
    insuranceTotal = insuranceTotal * ratio;
    extrasTotal = extrasTotal * ratio;
  } else if (contract.finalAmount && contract.finalAmount > 0 && originalTotal === 0) {
    const total = parseFloat(contract.finalAmount);
    bikesTotal = total;
    insuranceTotal = 0;
    extrasTotal = 0;
  }

  return {
    bikesTotal: Math.round(bikesTotal * 100) / 100,
    insuranceTotal: Math.round(insuranceTotal * 100) / 100,
    extrasTotal: Math.round(extrasTotal * 100) / 100,
    total: Math.round((bikesTotal + insuranceTotal + extrasTotal) * 100) / 100
  };
};
