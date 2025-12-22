import React, { useState } from 'react';
import { api } from '../services/api.js';

const ContractPricingManager = ({ contract, onUpdate, onClose }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [newPriceHourly, setNewPriceHourly] = useState('');
  const [newPriceDaily, setNewPriceDaily] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setNewPriceHourly(item.priceHourly?.toString() || '');
    setNewPriceDaily(item.priceDaily?.toString() || '');
    setError('');
    setSuccess('');
  };

  const handleUpdatePricing = async () => {
    if (!selectedItem) {
      setError('Seleziona un item da modificare');
      return;
    }

    if (!newPriceHourly && !newPriceDaily) {
      setError('Inserisci almeno un prezzo');
      return;
    }

    if (newPriceHourly && (isNaN(newPriceHourly) || parseFloat(newPriceHourly) < 0)) {
      setError('Prezzo orario non valido');
      return;
    }

    if (newPriceDaily && (isNaN(newPriceDaily) || parseFloat(newPriceDaily) < 0)) {
      setError('Prezzo giornaliero non valido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData = {
        itemId: selectedItem._id,
        reason: reason || 'Modifica prezzi durante contratto'
      };

      if (newPriceHourly) updateData.newPriceHourly = parseFloat(newPriceHourly);
      if (newPriceDaily) updateData.newPriceDaily = parseFloat(newPriceDaily);

      const response = await api.put(`/api/contracts/${contract._id}/item-pricing`, updateData);
      
      setSuccess('Prezzi aggiornati con successo!');
      setSelectedItem(null);
      setNewPriceHourly('');
      setNewPriceDaily('');
      setReason('');
      
      if (onUpdate) {
        onUpdate(response.data.contract);
      }
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (err) {
      console.error('Errore aggiornamento prezzi:', err);
      setError(err.response?.data?.error || 'Errore durante l\'aggiornamento');
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentPrice = (item) => {
    if (!contract.startAt) return { current: 0, type: 'N/A' };
    
    const startTime = new Date(contract.startAt);
    const currentTime = new Date();
    const diffMs = currentTime - startTime;
    const elapsedHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (contract.status === 'reserved') {
      return { current: item.priceDaily || 0, type: 'Giornaliera (Prenotazione)' };
    }
    
    const hourlyTotal = (item.priceHourly || 0) * elapsedHours;
    const dailyTotal = (item.priceDaily || 0) * Math.ceil(elapsedHours / 24);
    
    if (hourlyTotal <= dailyTotal) {
      return { current: hourlyTotal, type: 'Oraria' };
    } else {
      return { current: dailyTotal, type: 'Giornaliera' };
    }
  };

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
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #f3f4f6'
        }}>
          <h2 style={{
            margin: 0,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            💰 Gestione Prezzi Contratto
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Info contratto */}
        <div style={{
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#374151' }}>
            📋 Contratto: {contract.customer?.name}
          </h3>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            <div>Status: <strong>{contract.status}</strong></div>
            <div>Inizio: <strong>{new Date(contract.startAt).toLocaleString('it-IT')}</strong></div>
            {contract.endAt && (
              <div>Fine: <strong>{new Date(contract.endAt).toLocaleString('it-IT')}</strong></div>
            )}
          </div>
        </div>

        {/* Lista items */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
            🚲 Seleziona Item da Modificare:
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {contract.items?.map((item, index) => {
              const pricing = calculateCurrentPrice(item);
              const isSelected = selectedItem?._id === item._id;
              
              return (
                <div
                  key={item._id || index}
                  onClick={() => handleItemSelect(item)}
                  style={{
                    padding: '16px',
                    border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? '#f0f9ff' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {item.barcode} • €{item.priceHourly}/h • €{item.priceDaily}/g
                      </div>
                      {item.returnedAt && (
                        <div style={{
                          fontSize: '12px',
                          color: '#059669',
                          marginTop: '4px'
                        }}>
                          ✅ Restituito il {new Date(item.returnedAt).toLocaleString('it-IT')}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        €{pricing.current.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {pricing.type}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form modifica prezzi */}
        {selectedItem && (
          <div style={{
            background: '#f0f9ff',
            border: '2px solid #bae6fd',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✏️ Modifica Prezzi: {selectedItem.name}
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  💰 Prezzo Orario (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPriceHourly}
                  onChange={(e) => setNewPriceHourly(e.target.value)}
                  placeholder="Es: 5.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  📅 Prezzo Giornaliero (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPriceDaily}
                  onChange={(e) => setNewPriceDaily(e.target.value)}
                  placeholder="Es: 25.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                📝 Motivo della modifica
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Es: Sconto cliente, Promozione, Correzione prezzo..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              color: '#92400e',
              marginBottom: '16px'
            }}>
              <strong>⚠️ Attenzione:</strong> La modifica dei prezzi influenzerà il calcolo del costo totale del contratto.
              {contract.status === 'completed' && ' I totali del contratto completato verranno ricalcolati automaticamente.'}
            </div>
          </div>
        )}

        {/* Messaggi */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#dc2626',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#059669',
            fontSize: '14px'
          }}>
            ✅ {success}
          </div>
        )}

        {/* Pulsanti */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
          
          <button
            onClick={handleUpdatePricing}
            disabled={loading || !selectedItem}
            style={{
              padding: '12px 24px',
              background: loading || !selectedItem ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !selectedItem ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Aggiornando...
              </>
            ) : (
              <>💾 Aggiorna Prezzi</>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ContractPricingManager;