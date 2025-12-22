import React, { useState } from 'react';
import { api } from '../services/api.js';

const ItemPriceEditor = ({ contract, item, onUpdate, onClose }) => {
  const [priceHourly, setPriceHourly] = useState(item.priceHourly || 0);
  const [priceDaily, setPriceDaily] = useState(item.priceDaily || 0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('❌ Inserisci il motivo della modifica');
      return;
    }

    if (priceHourly < 0 || priceDaily < 0) {
      alert('❌ I prezzi non possono essere negativi');
      return;
    }

    setLoading(true);

    try {
      console.log('Aggiornamento prezzi:', {
        contractId: contract._id,
        itemId: item._id,
        priceHourly,
        priceDaily,
        reason
      });

      const response = await api.put(`/api/contracts/${contract._id}/item-prices`, {
        itemId: item._id,
        priceHourly: parseFloat(priceHourly),
        priceDaily: parseFloat(priceDaily),
        reason: reason.trim()
      });

      alert('✅ Prezzi aggiornati con successo!');
      
      if (onUpdate) {
        onUpdate(response.data);
      }
      
      onClose();

    } catch (error) {
      console.error('Errore aggiornamento prezzi:', error);
      const errorMessage = error.response?.data?.error || error.message;
      alert('❌ Errore nell\'aggiornamento: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937'
          }}>
            💰 Modifica Prezzi Item
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#6b7280',
              opacity: loading ? 0.5 : 1
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            <div>
              <strong>Barcode:</strong> {item.barcode}
            </div>
            <div>
              <strong>Tipo:</strong> {item.kind === 'bike' ? 'Bici' : 'Accessorio'}
            </div>
            <div>
              <strong>Prezzo Attuale/h:</strong> {formatCurrency(item.priceHourly)}
            </div>
            <div>
              <strong>Prezzo Attuale/giorno:</strong> {formatCurrency(item.priceDaily)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                💰 Nuovo Prezzo Orario (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceHourly}
                onChange={(e) => setPriceHourly(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  opacity: loading ? 0.5 : 1
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                📅 Nuovo Prezzo Giornaliero (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceDaily}
                onChange={(e) => setPriceDaily(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  opacity: loading ? 0.5 : 1
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              📝 Motivo della Modifica *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Inserisci il motivo della modifica dei prezzi..."
              disabled={loading}
              required
              style={{
                width: '100%',
                height: '80px',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                opacity: loading ? 0.5 : 1
              }}
            />
          </div>

          {/* Anteprima modifiche */}
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#92400e'
            }}>
              📊 Anteprima Modifiche
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '12px',
              color: '#92400e'
            }}>
              <div>
                <strong>Prezzo Orario:</strong><br />
                {formatCurrency(item.priceHourly)} → {formatCurrency(parseFloat(priceHourly) || 0)}
                {parseFloat(priceHourly) !== item.priceHourly && (
                  <span style={{ 
                    color: parseFloat(priceHourly) > item.priceHourly ? '#dc2626' : '#059669',
                    fontWeight: 'bold'
                  }}>
                    {' '}({parseFloat(priceHourly) > item.priceHourly ? '+' : ''}{(parseFloat(priceHourly) - item.priceHourly).toFixed(2)}€)
                  </span>
                )}
              </div>
              <div>
                <strong>Prezzo Giornaliero:</strong><br />
                {formatCurrency(item.priceDaily)} → {formatCurrency(parseFloat(priceDaily) || 0)}
                {parseFloat(priceDaily) !== item.priceDaily && (
                  <span style={{ 
                    color: parseFloat(priceDaily) > item.priceDaily ? '#dc2626' : '#059669',
                    fontWeight: 'bold'
                  }}>
                    {' '}({parseFloat(priceDaily) > item.priceDaily ? '+' : ''}{(parseFloat(priceDaily) - item.priceDaily).toFixed(2)}€)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 20px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.5 : 1
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              style={{
                padding: '12px 20px',
                backgroundColor: loading || !reason.trim() ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading || !reason.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? '⏳ Aggiornamento...' : '💰 Aggiorna Prezzi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemPriceEditor;