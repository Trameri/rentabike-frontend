import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const ContractClosure = ({ contract, onClose, onComplete }) => {
  const [paymentMethod, setPaymentMethod] = useState(contract?.paymentMethod || '');
  const [finalPrice, setFinalPrice] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [contractDetails, setContractDetails] = useState(null);

  useEffect(() => {
    if (contract) {
      loadContractDetails();
    }
  }, [contract]);

  const loadContractDetails = async () => {
    try {
      const { data } = await api.get(`/api/contracts/${contract._id}`);
      setContractDetails(data);
      
      // Calcola prezzo finale basato su durata effettiva
      const now = new Date();
      const start = new Date(data.startAt);
      const durationMs = now - start;
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
      const durationDays = Math.ceil(durationHours / 24);

      let calculatedPrice = 0;
      let insuranceTotal = 0;

      // Calcola prezzo per ogni item ancora attivo
      data.items?.forEach(item => {
        if (!item.returnedAt) { // Solo item non ancora restituiti
          const hourlyPrice = item.priceHourly || 0;
          const dailyPrice = item.priceDaily || 0;
          
          // Usa tariffa giornaliera se conviene
          const hourlyTotal = hourlyPrice * durationHours;
          const dailyTotal = dailyPrice * durationDays;
          
          calculatedPrice += Math.min(hourlyTotal, dailyTotal);
          
          // Aggiungi assicurazione se presente
          if (item.insurance) {
            insuranceTotal += item.insuranceFlat || 5;
          }
        }
      });

      setFinalPrice(calculatedPrice + insuranceTotal);
      
    } catch (error) {
      console.error('Errore caricamento dettagli contratto:', error);
    }
  };

  const closeContract = async () => {
    if (!isPaid && !paymentMethod) {
      alert('❌ Seleziona il metodo di pagamento o marca come non pagato');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        status: 'completed',
        endAt: new Date(),
        finalPrice: finalPrice,
        paymentMethod: isPaid ? paymentMethod : null,
        isPaid: isPaid,
        closureNotes: notes
      };

      await api.put(`/api/contracts/${contract._id}/close`, payload);

      alert(`✅ Contratto chiuso con successo!\n\nPrezzo finale: €${finalPrice.toFixed(2)}\nPagamento: ${isPaid ? paymentMethod : 'Non pagato'}`);

      if (onComplete) {
        onComplete();
      }
      onClose();

    } catch (error) {
      console.error('Errore chiusura contratto:', error);
      alert('❌ Errore nella chiusura: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = () => {
    if (!contractDetails) return '';
    
    const now = new Date();
    const start = new Date(contractDetails.startAt);
    const diffMs = now - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} minuti`;
    if (hours < 24) return `${hours}h ${minutes}m`;
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} giorni ${remainingHours}h`;
  };

  const getActiveItems = () => {
    if (!contractDetails) return [];
    return contractDetails.items?.filter(item => !item.returnedAt) || [];
  };

  const getReturnedItems = () => {
    if (!contractDetails) return [];
    return contractDetails.items?.filter(item => item.returnedAt) || [];
  };

  if (!contract) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: 0,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💰 Chiusura Contratto
          </h3>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ✕ Chiudi
          </button>
        </div>

        {/* Dettagli contratto */}
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>
            📋 Dettagli Contratto
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '14px'
          }}>
            <div><strong>Cliente:</strong> {contract.customer?.name}</div>
            <div><strong>ID:</strong> #{contract._id?.slice(-6)}</div>
            <div><strong>Durata:</strong> {calculateDuration()}</div>
            <div><strong>Inizio:</strong> {new Date(contract.startAt).toLocaleString('it-IT')}</div>
          </div>
        </div>

        {/* Items attivi */}
        {getActiveItems().length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#92400e' }}>
              ⚠️ Items Ancora Attivi ({getActiveItems().length})
            </h4>
            <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '12px' }}>
              Questi items non sono ancora stati restituiti e verranno inclusi nel prezzo finale:
            </div>
            {getActiveItems().map((item, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{item.kind === 'bike' ? '🚲' : '🎒'} {item.name}</strong>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {item.barcode} • €{item.priceHourly}/h • €{item.priceDaily}/giorno
                    {item.insurance && ' • 🛡️ Assicurato'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Items restituiti */}
        {getReturnedItems().length > 0 && (
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#059669' }}>
              ✅ Items Restituiti ({getReturnedItems().length})
            </h4>
            {getReturnedItems().map((item, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{item.kind === 'bike' ? '🚲' : '🎒'} {item.name}</strong>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Restituito: {new Date(item.returnedAt).toLocaleString('it-IT')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prezzo finale */}
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f0f9ff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#1d4ed8' }}>
            💰 Prezzo Finale
          </h4>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1d4ed8',
            marginBottom: '8px'
          }}>
            €{finalPrice.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Calcolato su durata effettiva • Include assicurazioni
          </div>
        </div>

        {/* Pagamento */}
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>
            💳 Gestione Pagamento
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
              />
              <strong>Contratto pagato</strong>
            </label>
          </div>

          {isPaid && (
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Metodo di pagamento:
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="">Seleziona metodo...</option>
                <option value="cash">💵 Contanti</option>
                <option value="card">💳 Carta</option>
                <option value="link">🔗 Link di pagamento</option>
                <option value="bank">🏦 Bonifico</option>
              </select>
            </div>
          )}
        </div>

        {/* Note chiusura */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            📝 Note Chiusura (opzionale)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condizioni finali, danni, note particolari..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Azioni */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Annulla
          </button>
          <button
            onClick={closeContract}
            disabled={loading}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {loading ? '⏳ Chiusura...' : '💰 Chiudi Contratto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractClosure;