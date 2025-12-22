import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import ContractPriceDisplay from '../Components/ContractPriceDisplay.jsx';
import ContractPricingManager from '../Components/ContractPricingManager.jsx';
import DailyEarningsDisplay from '../Components/DailyEarningsDisplay.jsx';

export default function PricingManagement() {
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPricingManager, setShowPricingManager] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchActiveContracts = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/contracts?status=in-use');
      setContracts(response.data);
    } catch (err) {
      console.error('Errore caricamento contratti:', err);
      setError(err.response?.data?.error || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveContracts();
  }, []);

  const handlePricingUpdate = (contract) => {
    setSelectedContract(contract);
    setShowPricingManager(true);
  };

  const handleContractUpdate = (updatedContract) => {
    // Aggiorna il contratto nella lista
    setContracts(prev => 
      prev.map(c => c._id === updatedContract._id ? updatedContract : c)
    );
    
    // Aggiorna il contratto selezionato se è lo stesso
    if (selectedContract && selectedContract._id === updatedContract._id) {
      setSelectedContract(updatedContract);
    }
  };

  const handleClosePricingManager = () => {
    setShowPricingManager(false);
    setSelectedContract(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 16px 0',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            💰 Gestione Prezzi e Guadagni
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Modifica i prezzi dei contratti attivi e monitora i guadagni giornalieri in tempo reale
          </p>
        </div>

        {/* Controlli data */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                📅 Data per guadagni:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <button
              onClick={fetchActiveContracts}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                marginTop: '24px'
              }}
            >
              {loading ? 'Caricando...' : '🔄 Aggiorna Contratti'}
            </button>
          </div>
        </div>

        {/* Guadagni giornalieri */}
        <DailyEarningsDisplay 
          selectedDate={selectedDate}
          autoRefresh={true}
        />

        {/* Contratti attivi */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🔄 Contratti Attivi ({contracts.length})
          </h2>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#dc2626'
            }}>
              ❌ {error}
            </div>
          )}

          {loading && contracts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f4f6',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              Caricamento contratti...
            </div>
          ) : contracts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              📋 Nessun contratto attivo al momento
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {contracts.map((contract) => (
                <div key={contract._id} style={{
                  border: '2px solid #f3f4f6',
                  borderRadius: '12px',
                  padding: '20px',
                  background: '#fafafa'
                }}>
                  <div style={{
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{
                      margin: '0 0 8px 0',
                      color: '#374151'
                    }}>
                      👤 {contract.customer?.name || 'Cliente sconosciuto'}
                    </h3>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <span>📅 Inizio: {new Date(contract.startAt).toLocaleString('it-IT')}</span>
                      <span>📍 {contract.location?.name}</span>
                      <span>🚲 {contract.items?.length} items</span>
                    </div>
                  </div>
                  
                  <ContractPriceDisplay
                    contract={contract}
                    realTimeUpdate={true}
                    showPricingButton={true}
                    onPricingUpdate={() => handlePricingUpdate(contract)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal gestione prezzi */}
        {showPricingManager && selectedContract && (
          <ContractPricingManager
            contract={selectedContract}
            onUpdate={handleContractUpdate}
            onClose={handleClosePricingManager}
          />
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}