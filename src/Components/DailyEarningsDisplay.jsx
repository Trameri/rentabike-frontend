import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const DailyEarningsDisplay = ({ selectedDate, locationFilter, autoRefresh = true }) => {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchEarnings = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (locationFilter) params.append('location', locationFilter);

      const response = await api.get(`/api/contracts/daily-earnings?${params}`);
      setEarnings(response.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Errore caricamento guadagni:', err);
      setError(err.response?.data?.error || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [selectedDate, locationFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchEarnings, 60000); // Aggiorna ogni minuto
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedDate, locationFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#059669';
      case 'in-use': return '#3b82f6';
      case 'reserved': return '#f59e0b';
      case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-use': return '🔄';
      case 'reserved': return '📅';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading && !earnings) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
        <div style={{ color: '#6b7280' }}>Caricamento guadagni...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          color: '#dc2626',
          textAlign: 'center'
        }}>
          ❌ {error}
          <button
            onClick={fetchEarnings}
            style={{
              marginLeft: '12px',
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (!earnings) return null;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #f3f4f6'
      }}>
        <div>
          <h2 style={{
            margin: '0 0 8px 0',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            💰 Guadagni Giornalieri
          </h2>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>
            {formatDate(earnings.date)}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#059669',
            marginBottom: '4px'
          }}>
            {formatCurrency(earnings.totalEarnings)}
          </div>
          {lastUpdate && (
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Aggiornato: {lastUpdate.toLocaleTimeString('it-IT')}
            </div>
          )}
        </div>
      </div>

      {/* Statistiche contratti */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
            {earnings.contractsCount.completed}
          </div>
          <div style={{ fontSize: '12px', color: '#065f46' }}>Completati</div>
        </div>

        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0369a1' }}>
            {earnings.contractsCount.active}
          </div>
          <div style={{ fontSize: '12px', color: '#0c4a6e' }}>Attivi</div>
        </div>

        <div style={{
          background: '#fefbf2',
          border: '1px solid #fed7aa',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#d97706' }}>
            {earnings.contractsCount.reserved}
          </div>
          <div style={{ fontSize: '12px', color: '#92400e' }}>Prenotati</div>
        </div>

        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#374151' }}>
            {earnings.contractsCount.total}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Totali</div>
        </div>
      </div>

      {/* Lista contratti */}
      {earnings.contracts && earnings.contracts.length > 0 && (
        <div>
          <h3 style={{
            margin: '0 0 16px 0',
            color: '#374151',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Dettaglio Contratti ({earnings.contracts.length})
          </h3>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            {earnings.contracts.map((contract, index) => (
              <div
                key={contract.id}
                style={{
                  padding: '16px',
                  borderBottom: index < earnings.contracts.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: index % 2 === 0 ? '#fafafa' : 'white'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      {getStatusIcon(contract.status)} {contract.customerName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Inizio: {new Date(contract.startAt).toLocaleString('it-IT')}
                      {contract.endAt && (
                        <> • Fine: {new Date(contract.endAt).toLocaleString('it-IT')}</>
                      )}
                    </div>
                    {contract.location && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        📍 {contract.location}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: getStatusColor(contract.status)
                    }}>
                      {formatCurrency(contract.earning)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: getStatusColor(contract.status),
                      textTransform: 'capitalize'
                    }}>
                      {contract.status}
                    </div>
                    {contract.paid && (
                      <div style={{ fontSize: '12px', color: '#059669' }}>
                        ✅ Pagato
                      </div>
                    )}
                  </div>
                </div>

                {/* Items del contratto */}
                <div style={{
                  background: 'rgba(0,0,0,0.02)',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '12px'
                }}>
                  {contract.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: itemIndex < contract.items.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <div>
                        {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                        {item.barcode && (
                          <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                            ({item.barcode})
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#374151' }}>
                        {formatCurrency(item.earning)}
                        <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                          (€{item.priceHourly}/h • €{item.priceDaily}/g)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pulsante refresh manuale */}
      <div style={{
        marginTop: '16px',
        textAlign: 'center'
      }}>
        <button
          onClick={fetchEarnings}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#9ca3af' : '#f3f4f6',
            color: loading ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Aggiornando...
            </>
          ) : (
            <>🔄 Aggiorna</>
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
  );
};

export default DailyEarningsDisplay;