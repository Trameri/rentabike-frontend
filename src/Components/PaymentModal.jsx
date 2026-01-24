import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const PaymentModal = ({ contract, onPaymentComplete, onClose }) => {
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

  useEffect(() => {
    if (contract) {
      calculatePaymentDetails();
    }
  }, [contract]);

  const calculatePaymentDetails = () => {
    if (!contract) return;

    // Se c'è un finalAmount già calcolato, usalo direttamente
    if (contract.finalAmount && contract.finalAmount > 0) {
      const total = parseFloat(contract.finalAmount);
      setPaymentDetails({
        subtotal: total,
        insurance: 0,
        adjustments: 0,
        total: total
      });
      setFinalAmount(total.toFixed(2));
      // Inizializza itemPrices con il totale distribuito
      const prices = {};
      contract.items.forEach((item, index) => {
        prices[index] = (total / contract.items.length).toFixed(2);
      });
      setItemPrices(prices);
      return;
    }

    // Altrimenti calcola con la NUOVA LOGICA TARIFFE
    const duration = calculateDuration();
    const isReservation = contract.status === 'reserved' || contract.isReservation;

    let subtotal = 0;
    let insurance = 0;
    const prices = {};

    contract.items.forEach((item, index) => {
      const priceHourly = parseFloat(item.priceHourly) || 0;
      const priceDaily = parseFloat(item.priceDaily) || 0;

      let itemPrice = 0;
      if (isReservation) {
        // LOGICA PRENOTAZIONI: Tariffa sommativa di tutte le tariffe giornaliere (BLOCCATA)
        itemPrice = priceDaily * duration.days;
      } else {
        // LOGICA CONTRATTI NUOVI: Inizia oraria, si blocca quando raggiunge giornaliera
        const hourlyTotal = priceHourly * duration.hours;
        const dailyTotal = priceDaily * duration.days;

        if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
          // Quando il costo orario raggiunge o supera quello giornaliero, si blocca sulla tariffa giornaliera
          itemPrice = dailyTotal;
        } else if (priceHourly > 0) {
          // Continua con tariffa oraria
          itemPrice = hourlyTotal;
        } else {
          // Fallback su tariffa giornaliera se non c'è oraria
          itemPrice = dailyTotal;
        }
      }

      prices[index] = itemPrice.toFixed(2);
      subtotal += itemPrice;

      if (item.insurance && item.insuranceFlat) {
        insurance += parseFloat(item.insuranceFlat);
      }
    });

    // Assicurazione flat del contratto
    if (contract.insuranceFlat) {
      insurance += parseFloat(contract.insuranceFlat);
    }

    const total = subtotal + insurance;

    setItemPrices(prices);
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

    // Ricalcola totale
    let newSubtotal = 0;
    Object.values(updatedPrices).forEach(price => {
      newSubtotal += parseFloat(price) || 0;
    });

    const insurance = paymentDetails.insurance;
    const newTotal = newSubtotal + insurance;

    setPaymentDetails(prev => ({
      ...prev,
      subtotal: Math.round(newSubtotal * 100) / 100,
      total: Math.round(newTotal * 100) / 100
    }));

    setFinalAmount(newTotal.toFixed(2));
  };

  const calculateDuration = () => {
    if (!contract.startAt || !contract.endAt) {
      return { hours: 1, days: 1 };
    }

    const start = new Date(contract.startAt);
    const end = new Date(contract.endAt);
    const durationMs = end - start;
    const hours = Math.ceil(durationMs / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);

    return { hours, days };
  };

  const handlePayment = async () => {
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      alert('❌ Inserisci un importo valido');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/contracts/${contract._id}/complete-payment`, {
        paymentMethod,
        paymentNotes,
        finalAmount: parseFloat(finalAmount)
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
              {duration.hours}h ({duration.days} giorni)
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
          {(() => {
            const isReservation = contract.status === 'reserved' || contract.isReservation;
            return (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px 12px', 
                background: isReservation ? '#fef3c7' : '#dbeafe',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: isReservation ? '#92400e' : '#1e40af'
              }}>
                🎯 {isReservation ? 'PRENOTAZIONE: Tariffa giornaliera bloccata' : 'CONTRATTO NUOVO: Tariffa flessibile (oraria → giornaliera)'}
              </div>
            );
          })()}
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
            const duration = calculateDuration();

            let pricingLogic = '';
            let timeDetail = '';

            if (isReservation) {
              pricingLogic = '🔒 Prenotazione - Tariffa giornaliera bloccata';
              timeDetail = `${duration.days} giorni`;
            } else {
              const hourlyTotal = priceHourly * duration.hours;
              const dailyTotal = priceDaily * duration.days;

              if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
                pricingLogic = '⚡ Bloccato su tariffa giornaliera';
                timeDetail = `${duration.days} giorni`;
              } else if (priceHourly > 0) {
                pricingLogic = '⏰ Tariffa oraria attiva';
                timeDetail = `${duration.hours} ore`;
              } else {
                pricingLogic = '📅 Solo tariffa giornaliera';
                timeDetail = `${duration.days} giorni`;
              }
            }

            return (
              <div key={index} style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid #fde047'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px' }}>
                      {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      {pricingLogic} • {timeDetail}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Tariffa: €{priceHourly > 0 ? `${priceHourly}/h` : ''} {priceHourly > 0 && priceDaily > 0 ? '•' : ''} €{priceDaily > 0 ? `${priceDaily}/g` : ''}
                    </div>
                    {item.barcode && (
                      <div style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
                        Barcode: {item.barcode}
                      </div>
                    )}
                    {item.insurance && (
                      <div style={{ fontSize: '12px', color: '#059669' }}>
                        🛡️ Assicurato (+€{item.insuranceFlat})
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      Prezzo (€):
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
                        textAlign: 'right'
                      }}
                    />
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

        {/* Metodo Pagamento */}
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
            <option value="card">💳 Carta di Credito/Debito</option>
            <option value="bank">🏦 Bonifico Bancario</option>
            <option value="paypal">🅿️ PayPal</option>
            <option value="other">🔄 Altro</option>
          </select>
        </div>

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