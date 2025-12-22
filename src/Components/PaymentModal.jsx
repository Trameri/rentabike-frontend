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
      return;
    }

    // Altrimenti calcola con la NUOVA LOGICA TARIFFE
    const duration = calculateDuration();
    const isReservation = contract.status === 'reserved' || contract.isReservation;
    
    let subtotal = 0;
    let insurance = 0;

    contract.items.forEach(item => {
      const priceHourly = parseFloat(item.priceHourly) || 0;
      const priceDaily = parseFloat(item.priceDaily) || 0;
      
      if (isReservation) {
        // LOGICA PRENOTAZIONI: Tariffa sommativa di tutte le tariffe giornaliere (BLOCCATA)
        subtotal += priceDaily * duration.days;
      } else {
        // LOGICA CONTRATTI NUOVI: Inizia oraria, si blocca quando raggiunge giornaliera
        const hourlyTotal = priceHourly * duration.hours;
        const dailyTotal = priceDaily * duration.days;
        
        if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
          // Quando il costo orario raggiunge o supera quello giornaliero, si blocca sulla tariffa giornaliera
          subtotal += dailyTotal;
        } else if (priceHourly > 0) {
          // Continua con tariffa oraria
          subtotal += hourlyTotal;
        } else {
          // Fallback su tariffa giornaliera se non c'è oraria
          subtotal += dailyTotal;
        }
      }

      if (item.insurance && item.insuranceFlat) {
        insurance += parseFloat(item.insuranceFlat);
      }
    });

    // Assicurazione flat del contratto
    if (contract.insuranceFlat) {
      insurance += parseFloat(contract.insuranceFlat);
    }

    const total = subtotal + insurance;

    setPaymentDetails({
      subtotal: Math.round(subtotal * 100) / 100,
      insurance: Math.round(insurance * 100) / 100,
      adjustments: 0,
      total: Math.round(total * 100) / 100
    });

    setFinalAmount(total.toFixed(2));
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
          <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>🚲 Articoli Noleggiati</h3>
          {contract.items.map((item, index) => {
            const isReservation = contract.status === 'reserved' || contract.isReservation;
            const priceHourly = parseFloat(item.priceHourly) || 0;
            const priceDaily = parseFloat(item.priceDaily) || 0;
            const duration = calculateDuration();
            
            let appliedPrice = 0;
            let pricingLogic = '';
            
            if (isReservation) {
              appliedPrice = priceDaily * duration.days;
              pricingLogic = '🔒 Prenotazione - Tariffa giornaliera bloccata';
            } else {
              const hourlyTotal = priceHourly * duration.hours;
              const dailyTotal = priceDaily * duration.days;
              
              if (priceDaily > 0 && hourlyTotal >= dailyTotal) {
                appliedPrice = dailyTotal;
                pricingLogic = '⚡ Bloccato su tariffa giornaliera';
              } else if (priceHourly > 0) {
                appliedPrice = hourlyTotal;
                pricingLogic = '⏰ Tariffa oraria attiva';
              } else {
                appliedPrice = dailyTotal;
                pricingLogic = '📅 Solo tariffa giornaliera';
              }
            }
            
            return (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: index < contract.items.length - 1 ? '1px solid #fde047' : 'none'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600' }}>
                    {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {item.barcode} • €{item.priceHourly}/h • €{item.priceDaily}/g
                    {item.insurance && (
                      <span style={{ color: '#059669', marginLeft: '8px' }}>
                        🛡️ Assicurato (+€{item.insuranceFlat})
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: isReservation ? '#92400e' : '#1e40af',
                    fontWeight: '500',
                    marginTop: '2px'
                  }}>
                    {pricingLogic}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                  <div style={{ fontWeight: '600', color: '#059669' }}>
                    €{appliedPrice.toFixed(2)}
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