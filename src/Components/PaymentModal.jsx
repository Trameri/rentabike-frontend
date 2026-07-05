import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const PaymentModal = ({
  contract,
  onPaymentComplete,
  onClose,
  initialItemInsurancePaidAdvance = {},
  initialContractInsurancePaidAdvance = false,
  onItemInsuranceFlagChange,
  onContractInsuranceFlagChange
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    subtotal: 0,
    insurance: 0,
    adjustments: 0,
    total: 0
  });
  const [itemPrices, setItemPrices] = useState({});
  const [itemInsurances, setItemInsurances] = useState({});

  const getContractInsuranceKey = (contractData) => contractData?._id || contractData?.id || 'default-contract';
  const getItemInsurancePaidAdvanceForContract = (state, contractData) => state?.[getContractInsuranceKey(contractData)] || {};
  const getContractInsurancePaidAdvanceForContract = (state, contractData) => !!state?.[getContractInsuranceKey(contractData)];

  const [itemInsurancePaidAdvance, setItemInsurancePaidAdvance] = useState(() => getItemInsurancePaidAdvanceForContract(initialItemInsurancePaidAdvance, contract));
  const contractInsurancePaidInAdvance = getContractInsurancePaidAdvanceForContract(initialContractInsurancePaidAdvance, contract) || contract?.insurancePaidInAdvance || false;

  useEffect(() => {
    if (contract) {
      setItemInsurancePaidAdvance(getItemInsurancePaidAdvanceForContract(initialItemInsurancePaidAdvance, contract));
      onContractInsuranceFlagChange?.(contract, getContractInsurancePaidAdvanceForContract(initialContractInsurancePaidAdvance, contract));
      calculatePaymentDetails();
    }
  }, [contract, initialItemInsurancePaidAdvance, initialContractInsurancePaidAdvance]);

const calculatePaymentDetails = () => {
    if (!contract) return;

    // Inizializza gli stati delle assicurazioni pagate in anticipo
    const initialItemInsurancePaid = {};

    // Se c'è un finalAmount già calcolato, usa i prezzi individuali salvati o calcola individualmente
    if (contract.finalAmount && contract.finalAmount > 0) {
      const prices = {};
      const insurances = {};
      
      // Usa i prezzi già salvati se presenti
      if (contract.lockedItemPrices && Array.isArray(contract.lockedItemPrices) && contract.lockedItemPrices.length > 0) {
        let subtotalFromLocked = 0;
        
        contract.items.forEach((item, index) => {
          const lockedPrice = contract.lockedItemPrices.find(lp => 
            lp.itemId === item._id || lp.itemId === index || lp.itemId === item.id
          );
          
          if (lockedPrice) {
            prices[index] = (lockedPrice.basePrice || 0).toFixed(2);
            insurances[index] = (lockedPrice.insurance || 0).toFixed(2);
            subtotalFromLocked += parseFloat(prices[index]);
          } else {
            // Fallback: calcola per questa bici con scatto orario
            let itemBasePrice = 0;
            const priceHourly = parseFloat(item.priceHourly) || 0;
            const priceDaily = parseFloat(item.priceDaily) || 0;
            
            const itemEndTime = item.returnedAt ? new Date(item.returnedAt) : (contract.endAt ? new Date(contract.endAt) : new Date());
            const itemStartTime = new Date(contract.startAt || contract.createdAt);
            const itemDurationMs = Math.max(0, itemEndTime - itemStartTime);
            const itemDurationMinutes = itemDurationMs / (1000 * 60);
            const oreFatturate = Math.max(1, Math.ceil(itemDurationMinutes / 60));
            
            const hourlyTotal = priceHourly * oreFatturate;
            itemBasePrice = Math.min(hourlyTotal, priceDaily);
            
            prices[index] = itemBasePrice.toFixed(2);
            insurances[index] = item.insurance ? '5.00' : '0.00';
            subtotalFromLocked += itemBasePrice;
          }
        });
        
        const total = parseFloat(contract.finalAmount);
        const contractInsurance = contract.insuranceFlat && !contractInsurancePaidInAdvance ? parseFloat(contract.insuranceFlat) || 0 : 0;
        const totalInsurances = Object.values(insurances).reduce((sum, ins) => sum + parseFloat(ins), 0) + contractInsurance;
        
        setPaymentDetails({
          subtotal: Math.round((total - totalInsurances) * 100) / 100,
          insurance: Math.round(totalInsurances * 100) / 100,
          adjustments: 0,
          total: Math.round(total * 100) / 100
        });
      } else {
        // Nessun lockedItemPrices salvato: calcola i prezzi individualmente per TUTTE le bici
        let totalBaseAmount = 0;
        let totalInsurances = 0;

        contract.items.forEach((item, index) => {
          const priceHourly = parseFloat(item.priceHourly) || 0;
          const priceDaily = parseFloat(item.priceDaily) || 0;
          
          let itemEndTime = new Date();
          let itemStartTime = new Date(contract.startAt || contract.createdAt);
          if (item.returnedAt) {
            itemEndTime = new Date(item.returnedAt);
          } else if (contract.endAt) {
            itemEndTime = new Date(contract.endAt);
          }
          
          const itemDurationMs = Math.max(0, itemEndTime - itemStartTime);
          const itemDurationMinutes = itemDurationMs / (1000 * 60);
          const oreFatturate = Math.max(1, Math.ceil(itemDurationMinutes / 60));
          
          const hourlyTotal = priceHourly * oreFatturate;
          const itemBasePrice = Math.min(hourlyTotal, priceDaily);

          prices[index] = itemBasePrice.toFixed(2);
          totalBaseAmount += itemBasePrice;

          const itemInsurance = item.insurance ? 5 : 0;
          insurances[index] = itemInsurance.toFixed(2);
          totalInsurances += itemInsurance;
        });
        
        const total = parseFloat(contract.finalAmount);
        const contractInsurance = contract.insuranceFlat && !contractInsurancePaidInAdvance ? parseFloat(contract.insuranceFlat) || 0 : 0;
        const totalInsurancesWithContract = totalInsurances + contractInsurance;
        const baseTotal = total - totalInsurancesWithContract;
        
        // Applica il fattore di scala in base al totale base calcolato
        const scaleFactor = totalBaseAmount > 0 ? baseTotal / totalBaseAmount : 0;
        
        Object.keys(prices).forEach(index => {
          prices[index] = (parseFloat(prices[index]) * scaleFactor).toFixed(2);
        });
        
        setPaymentDetails({
          subtotal: Math.round(baseTotal * 100) / 100,
          insurance: Math.round(totalInsurancesWithContract * 100) / 100,
          adjustments: 0,
          total: Math.round(total * 100) / 100
        });
      }
      
      setFinalAmount(parseFloat(contract.finalAmount).toFixed(2));
      setItemPrices(prices);
      setItemInsurances(insurances);
      return;
    }

    // Altrimenti calcola con la NUOVA LOGICA TARIFFE - SCATTO ORARIO
    let subtotal = 0;
    let insurance = 0;
    const prices = {};
    const insurances = {};

    contract.items.forEach((item, index) => {
      const priceHourly = parseFloat(item.priceHourly) || 0;
      const priceDaily = parseFloat(item.priceDaily) || 0;

      // Durata individuale per item: da startAt a returnedAt se restituito, altrimenti a endAt contratto
      let itemEndTime = new Date();
      let itemStartTime = new Date(contract.startAt || contract.createdAt);
      if (item.returnedAt) {
        itemEndTime = new Date(item.returnedAt);
      } else if (contract.endAt) {
        itemEndTime = new Date(contract.endAt);
      }
      
      const itemDurationMs = Math.max(0, itemEndTime - itemStartTime);
      const itemDurationMinutes = itemDurationMs / (1000 * 60);
      const oreFatturate = Math.max(1, Math.ceil(itemDurationMinutes / 60));

      // Scatto orario: ore fatturate * prezzo orario, bloccata su prezzo giornaliero
      const hourlyTotal = priceHourly * oreFatturate;
      const itemBasePrice = Math.min(hourlyTotal, priceDaily);

      prices[index] = itemBasePrice.toFixed(2);
      subtotal += itemBasePrice;

      const itemInsurance = item.insurance ? 5 : 0;
      insurances[index] = itemInsurance.toFixed(2);
      insurance += itemInsurance;
    });

    // Assicurazione flat del contratto
    if (contract.insuranceFlat && !contractInsurancePaidInAdvance) {
      insurance += parseFloat(contract.insuranceFlat);
    }

    const total = subtotal + insurance;

    setItemPrices(prices);
    setItemInsurances(insurances);
    setPaymentDetails({
      subtotal: Math.round(subtotal * 100) / 100,
      insurance: Math.round(insurance * 100) / 100,
      adjustments: 0,
      total: Math.round(total * 100) / 100
    });

    setFinalAmount(total.toFixed(2));
  };

  const updateItemPrice = (index, newPrice) => {
    const updatedPrices = { ...itemPrices, [index]: newPrice };
    setItemPrices(updatedPrices);

    // Ricalcola totale con prezzi base + assicurazioni (escludendo quelle pagate in anticipo)
    let newSubtotal = 0;
    let totalInsurance = 0;
    Object.keys(updatedPrices).forEach(idx => {
      newSubtotal += parseFloat(updatedPrices[idx]) || 0;
      const insuranceVal = parseFloat(itemInsurances[idx]) || 0;
      if (!itemInsurancePaidAdvance[idx]) {
        totalInsurance += insuranceVal;
      }
    });
    if (!contractInsurancePaidInAdvance && contract.insuranceFlat) {
      totalInsurance += parseFloat(contract.insuranceFlat) || 0;
    }

    const newTotal = newSubtotal + totalInsurance;

    setPaymentDetails(prev => ({
      ...prev,
      subtotal: Math.round(newSubtotal * 100) / 100,
      insurance: Math.round(totalInsurance * 100) / 100,
      total: Math.round(newTotal * 100) / 100
    }));

    setFinalAmount(newTotal.toFixed(2));
  };

  const calculateDuration = () => {
    if (!contract.startAt || !contract.endAt) {
      return { hours: 1, minutes: 0, seconds: 0, days: 1 };
    }

    const start = new Date(contract.startAt);
    const end = new Date(contract.endAt);
    const durationMs = end - start;
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const days = Math.floor(hours / 24);

    return { hours, minutes, seconds, days };
  };

  const calculateItemPreciseDuration = (item, contract) => {
    const itemStartTime = item.startAt ? new Date(item.startAt) : new Date(contract.startAt || contract.createdAt);
    const itemEndTime = item.returnedAt ? new Date(item.returnedAt) : (contract.endAt ? new Date(contract.endAt) : new Date());
    const durationMs = Math.max(0, itemEndTime - itemStartTime);
    const totalSeconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  };

  const toggleItemInsurancePaidAdvance = (index) => {
    setItemInsurancePaidAdvance(prev => {
      const nextValue = !prev[index];
      const newState = { ...prev, [index]: nextValue };
      onItemInsuranceFlagChange?.(contract, index, nextValue);
      recalculateTotals(newState);
      return newState;
    });
  };

  const recalculateTotals = (itemInsuranceStates) => {
    let newSubtotal = 0;
    let newInsurance = 0;
    Object.keys(itemPrices).forEach(idx => {
      newSubtotal += parseFloat(itemPrices[idx]) || 0;
      const insuranceVal = parseFloat(itemInsurances[idx]) || 0;
      if (!itemInsuranceStates[idx]) {
        newInsurance += insuranceVal;
      }
    });
    if (!contractInsurancePaidInAdvance && contract.insuranceFlat) {
      newInsurance += parseFloat(contract.insuranceFlat);
    }
    const newTotal = newSubtotal + newInsurance;
    setPaymentDetails({
      subtotal: Math.round(newSubtotal * 100) / 100,
      insurance: Math.round(newInsurance * 100) / 100,
      adjustments: 0,
      total: Math.round(newTotal * 100) / 100
    });
    setFinalAmount(newTotal.toFixed(2));
  };

  const handlePayment = async () => {
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      alert('❌ Inserisci un importo valido');
      return;
    }

    setLoading(true);
    try {
      // Prepara i dati delle assicurazioni pagate in anticipo
      const itemInsurancePaidAdvanceData = {};
      contract.items.forEach((item, index) => {
        if (itemInsurancePaidAdvance[index]) {
          itemInsurancePaidAdvanceData[item._id || index] = true;
        }
      });

      // Calcola l'importo totale completo (con assicurazione) per i ricavi giornalieri
      const totalWithInsurance = paymentDetails.subtotal + paymentDetails.insurance;

      // Prepara i prezzi finali per ogni item
      const itemPricesPayload = contract.items.map((item, index) => ({
        itemId: item._id || index,
        price: Math.round((parseFloat(itemPrices[index] || item.basePrice || 0) || 0) * 100) / 100
      }))

      await api.post(`/api/contracts/${contract._id}/complete-payment`, {
        paymentMethod,
        paymentNotes,
        finalAmount: parseFloat(finalAmount),
        totalWithInsurance: Math.round(totalWithInsurance * 100) / 100,
        itemInsurancePaidAdvance: itemInsurancePaidAdvanceData,
        contractInsurancePaidAdvance: contractInsurancePaidInAdvance,
        totals: {
          bikesTotal: paymentDetails.subtotal,
          insuranceTotal: paymentDetails.insurance,
          extrasTotal: paymentDetails.adjustments,
          grandTotal: totalWithInsurance
        },
        itemPrices: itemPricesPayload
      });

      alert('✅ Pagamento completato con successo!');
      onPaymentComplete && onPaymentComplete();
      onClose && onClose();
    } catch (error) {
      console.error('Errore pagamento:', error);
      alert('❌ Errore: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('it-IT');
  };

  const duration = calculateDuration();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            color: '#1f2937',
            fontSize: '1.5rem',
            fontWeight: '700'
          }}>
            💳 Completa Pagamento
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Informazioni Cliente */}
        <div style={{
          background: '#f9fafb',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>👤 Cliente</h3>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            {contract.customer.name}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            📞 {contract.customer.phone}
          </div>
          {contract.notes && (
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              📝 <strong>Note:</strong> {contract.notes}
            </div>
          )}
        </div>

        {/* Dettagli Noleggio */}
        <div style={{
          background: '#f0f9ff',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>📅 Dettagli Noleggio</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <strong>Inizio:</strong><br />
              {formatDate(contract.startAt)}
            </div>
            <div>
              <strong>Fine:</strong><br />
              {formatDate(contract.endAt)}
            </div>
            <div>
              <strong>Durata:</strong><br />
              {duration.hours}h {duration.minutes}m {duration.seconds}s ({duration.days} giorni)
            </div>
            <div>
              <strong>Stato:</strong><br />
              <span style={{
                color: contract.status === 'returned' ? '#059669' : '#f59e0b',
                fontWeight: '600'
              }}>
                {contract.status === 'returned' ? '✅ Restituito' : '🔄 In corso'}
              </span>
            </div>
          </div>
           
          {/* Indicatore logica pricing */}
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            background: '#dbeafe',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#1e40af'
          }}>
              🎯 SCATTO ORARIO: ore fatturate = ceil(minuti/60)
              </div>
            </div>

          {/* Items */}
        <div style={{
          background: '#fefce8',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>🚲 Dettagli Articoli Noleggiati</h3>
          {contract.items.map((item, index) => {
            const isReservation = contract.status === 'reserved' || contract.isReservation;
            const priceHourly = parseFloat(item.priceHourly) || 0;
            const priceDaily = parseFloat(item.priceDaily) || 0;
            // Durata individuale per item: da startAt a returnedAt se restituito, altrimenti a endAt contratto
            const itemEndTime = item.returnedAt ? new Date(item.returnedAt) : (contract.endAt ? new Date(contract.endAt) : new Date());
            const itemStartTime = new Date(contract.startAt || contract.createdAt);
            const itemDurationMs = Math.max(0, itemEndTime - itemStartTime);
            const itemDurationMinutes = itemDurationMs / (1000 * 60);
            const oreFatturate = Math.max(1, Math.ceil(itemDurationMinutes / 60));
            const itemHoursExact = Math.floor(itemDurationMinutes / 60);
            const itemMinutesExact = Math.floor(itemDurationMinutes % 60);
            const itemDays = Math.floor(oreFatturate / 24);
            const hourlyTotal = priceHourly * oreFatturate;

            let pricingLogic = '';
            let timeDetail = '';

            if (priceDaily > 0 && hourlyTotal >= priceDaily) {
              pricingLogic = '⚡ Scatto orario: bloccato su tariffa giornaliera';
              timeDetail = `${oreFatturate} ore fatturate (${itemDays}g ${oreFatturate % 24}h)`;
            } else if (priceHourly > 0) {
              pricingLogic = '⏰ Tariffa oraria (scatto orario)';
              timeDetail = `${oreFatturate} ore fatturate`;
            } else {
              pricingLogic = '📅 Solo tariffa giornaliera';
              timeDetail = `${itemDays} giorni`;
            }

            return (
              <div key={index} style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #fde047'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px' }}>
                    {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {pricingLogic} • Durata: {timeDetail}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Tariffa: €{priceHourly > 0 ? `${priceHourly}/h` : ''} {priceHourly > 0 && priceDaily > 0 ? '•' : ''} €{priceDaily > 0 ? `${priceDaily}/g` : ''}
                  </div>
                  {item.barcode && (
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
                      Barcode: {item.barcode}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '500', marginTop: '4px' }}>
                    ⏱️ Durata precisa: {(() => {
                      const d = calculateItemPreciseDuration(item, contract);
                      return `${d.hours} h ${d.minutes} min ${d.seconds} sec`;
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                            Prezzo Base (€):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemPrices[index] || '0.00'}
                            onChange={(e) => updateItemPrice(index, e.target.value)}
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '14px',
                              textAlign: 'right',
                              marginLeft: '4px'
                            }}
                          />
                        </div>
                        {itemInsurances[index] && parseFloat(itemInsurances[index]) > 0 && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#059669' }}>
                              🛡️ Assicurazione: €{itemInsurances[index]}
                            </span>
                          </div>
                        )}
                      </div>
                      {itemInsurances[index] && parseFloat(itemInsurances[index]) > 0 && (
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          padding: '6px 10px',
                          background: itemInsurancePaidAdvance[index] ? '#fef3c7' : '#f0fdf4',
                          borderRadius: '6px',
                          border: '1px solid #fde047',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}>
                          <input
                            type="checkbox"
                            checked={!!itemInsurancePaidAdvance[index]}
                            onChange={() => toggleItemInsurancePaidAdvance(index)}
                          />
                          <span style={{ color: '#92400e', fontWeight: '500' }}>
                            Assicurazione già pagata in anticipo
                          </span>
                        </label>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Totale Item:</div>
                      <div style={{ fontWeight: '600', color: itemInsurancePaidAdvance[index] ? '#6b7280' : '#059669' }}>
                        €{(parseFloat(itemPrices[index] || 0) + (itemInsurancePaidAdvance[index] ? 0 : parseFloat(itemInsurances[index] || 0))).toFixed(2)}
                      </div>
                      {itemInsurancePaidAdvance[index] && (
                        <div style={{ fontSize: '10px', color: '#92400e', fontStyle: 'italic' }}>
                          (Assicurazione scontata)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Riepilogo Costi */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '2px solid #10b981'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#065f46' }}>💰 Riepilogo Costi</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Subtotale noleggio:</span>
            <span style={{ fontWeight: '600' }}>€{paymentDetails.subtotal.toFixed(2)}</span>
          </div>
          
          {paymentDetails.insurance > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>🛡️ Assicurazioni:</span>
              <span style={{ fontWeight: '600' }}>€{paymentDetails.insurance.toFixed(2)}</span>
            </div>
          )}
          
          <hr style={{ margin: '12px 0', border: 'none', borderTop: '2px solid #10b981' }} />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '18px',
            fontWeight: '700',
            color: '#065f46'
          }}>
            <span>TOTALE:</span>
            <span>€{paymentDetails.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Metodo Pagamento - nascosto per prenotazioni già pagate */}
        {contract.status !== 'reserved' && !contract.wasReserved && !contract.isReservation && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              💳 Metodo di Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                background: 'white'
              }}
            >
              <option value="cash">💵 Contanti</option>
              <option value="card">💳 Bancomat</option>
            </select>
          </div>
        )}

        {/* Importo Finale */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            💰 Importo Finale
          </label>
          <input
            type="number"
            step="0.01"
            value={finalAmount}
            onChange={(e) => setFinalAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #10b981',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              textAlign: 'center',
              background: '#f0fdf4'
            }}
          />
        </div>

        {/* Note */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            📝 Note Pagamento (opzionale)
          </label>
          <textarea
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="Aggiungi note sul pagamento..."
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Pulsanti */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            ❌ Annulla
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || !finalAmount}
            style={{
              padding: '12px 24px',
              background: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !finalAmount ? 'not-allowed' : 'pointer',
              opacity: loading || !finalAmount ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Elaborazione...' : '✅ Conferma Pagamento'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;