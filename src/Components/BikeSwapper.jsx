import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import BarcodeScanner from './BarcodeScanner.jsx';

const BikeSwapper = ({ contract, onSwapComplete, onClose }) => {
  const [availableBikes, setAvailableBikes] = useState([]);
  const [selectedBike, setSelectedBike] = useState(null);
  const [bikeToReplace, setBikeToReplace] = useState(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Selezione bici da sostituire, 2: Selezione sostituto, 3: Conferma
  const [searchTerm, setSearchTerm] = useState('');

  // Controlla se il contratto può essere modificato
  const canModify = contract?.status === 'reserved' || contract?.status === 'in-use';
  
  if (!canModify) {
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
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
          <h2 style={{ 
            color: '#dc2626', 
            marginBottom: '16px',
            fontSize: '1.5rem',
            fontWeight: '700'
          }}>
            Sostituzione Non Consentita
          </h2>
          <p style={{ 
            color: '#64748b', 
            marginBottom: '24px',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            Le bici possono essere sostituite solo per contratti <strong>"Prenotati"</strong> o <strong>"In uso"</strong>.
            <br/>
            <span style={{ 
              background: '#fee2e2',
              color: '#991b1b',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              marginTop: '8px',
              display: 'inline-block'
            }}>
              Stato attuale: {contract?.status || 'Sconosciuto'}
            </span>
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            Ho Capito
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadAvailableBikes();
  }, []);

  const loadAvailableBikes = async () => {
    try {
      const { data } = await api.get('/api/bikes', { 
        params: { status: 'available' } 
      });
      setAvailableBikes(data);
    } catch (error) {
      console.error('Errore caricamento bici:', error);
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      setLoading(true);

      if (currentStep === 1) {
        // Cerca se è una bici del contratto (da sostituire)
        const contractBike = contract.items?.find(item => 
          item.kind === 'bike' && item.barcode === barcode
        );
        
        if (contractBike) {
          setBikeToReplace(contractBike);
          setCurrentStep(2);
          return;
        } else {
          alert('❌ Questo barcode non corrisponde a nessuna bici del contratto');
          return;
        }
      }

      if (currentStep === 2) {
        // Cerca se è una bici disponibile (sostituto)
        const availableBike = availableBikes.find(bike => bike.barcode === barcode);
        if (availableBike) {
          setSelectedBike(availableBike);
          setCurrentStep(3);
          return;
        }

        // Se non trovata nella lista, cerca nel database
        try {
          const { data } = await api.get(`/api/bikes/barcode/${barcode}`);
          if (data.status === 'available') {
            setSelectedBike(data);
            setAvailableBikes(prev => [...prev, data]);
            setCurrentStep(3);
          } else {
            alert(`❌ Bici "${data.name}" non disponibile (stato: ${data.status})`);
          }
        } catch (error) {
          alert('❌ Barcode non trovato o bici non disponibile');
        }
      }
    } catch (error) {
      console.error('Errore scansione:', error);
      alert('❌ Errore durante la scansione');
    } finally {
      setLoading(false);
    }
  };

  const performSwap = async () => {
    if (!bikeToReplace || !selectedBike || !reason.trim()) {
      alert('❌ Completa tutti i campi richiesti');
      return;
    }

    setLoading(true);
    try {
      const finalReason = reason === 'Altro' ? customReason : reason;
      
      const swapData = {
        contractId: contract._id,
        oldBikeId: bikeToReplace.refId || bikeToReplace._id, // Usa refId se disponibile
        newBikeId: selectedBike._id,
        reason: finalReason.trim(),
        swapDate: new Date().toISOString()
      };

      await api.post('/api/contracts/swap-bike', swapData);
      
      alert('✅ Sostituzione completata con successo!');
      onSwapComplete && onSwapComplete();
      onClose && onClose();
    } catch (error) {
      console.error('Errore sostituzione:', error);
      alert('❌ Errore durante la sostituzione: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const reasons = [
    'Guasto meccanico',
    'Foratura pneumatico', 
    'Problema freni',
    'Problema cambio',
    'Richiesta cliente',
    'Manutenzione preventiva',
    'Bici danneggiata',
    'Upgrade richiesto',
    'Altro'
  ];

  const contractBikes = contract.items?.filter(item => item.kind === 'bike') || [];
  const filteredBikes = availableBikes.filter(bike => 
    bike.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bike.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bike.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          paddingBottom: '20px',
          borderBottom: '3px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: '800',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🔄 Sostituzione Bici
            </h2>
            <p style={{
              margin: '8px 0 0 0',
              color: '#64748b',
              fontSize: '16px'
            }}>
              Sostituisci una bici del contratto #{contract._id?.slice(-8)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          {[
            { step: 1, label: 'Bici da Sostituire', icon: '❌' },
            { step: 2, label: 'Bici Sostituto', icon: '✅' },
            { step: 3, label: 'Conferma', icon: '🔄' }
          ].map(({ step, label, icon }) => (
            <div key={step} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: currentStep >= step ? 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e5e7eb',
                color: currentStep >= step ? 'white' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                boxShadow: currentStep >= step ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}>
                {currentStep > step ? '✓' : icon}
              </div>
              <span style={{
                fontWeight: '600',
                color: currentStep >= step ? '#10b981' : '#9ca3af',
                marginRight: step < 3 ? '24px' : '0',
                fontSize: '14px'
              }}>
                {label}
              </span>
              {step < 3 && (
                <div style={{
                  width: '40px',
                  height: '3px',
                  background: currentStep > step ? '#10b981' : '#e5e7eb',
                  marginRight: '24px'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Info Contratto */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '2px solid #cbd5e1'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '1.25rem', 
            color: '#1e293b',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Informazioni Contratto
          </h3>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            fontSize: '14px', 
            color: '#64748b' 
          }}>
            <div>
              <strong style={{ color: '#374151' }}>Cliente:</strong> {contract.customer?.name || 'N/A'}
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Telefono:</strong> {contract.customer?.phone || 'N/A'}
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Stato:</strong> 
              <span style={{
                background: '#dcfce7',
                color: '#166534',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                marginLeft: '8px'
              }}>
                {contract.status?.toUpperCase()}
              </span>
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Bici totali:</strong> {contractBikes.length}
            </div>
          </div>
        </div>

        {/* Step 1: Selezione bici da sostituire */}
        {currentStep === 1 && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: '#1e293b',
                fontSize: '1.5rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                ❌ Seleziona Bici da Sostituire
              </h3>

              {/* Scanner */}
              <div style={{ marginBottom: '24px' }}>
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  placeholder="Scansiona barcode della bici da sostituire"
                />
              </div>

              {/* Lista bici del contratto */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {contractBikes.map(bike => (
                  <div
                    key={bike._id}
                    onClick={() => {
                      setBikeToReplace(bike);
                      setCurrentStep(2);
                    }}
                    style={{
                      background: 'white',
                      border: '2px solid #fca5a5',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(252, 165, 165, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 24px rgba(252, 165, 165, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(252, 165, 165, 0.2)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ 
                          fontWeight: '700', 
                          color: '#1e293b',
                          fontSize: '18px',
                          marginBottom: '4px'
                        }}>
                          🚲 {bike.name}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#64748b',
                          marginBottom: '8px'
                        }}>
                          📊 {bike.barcode || 'Nessun barcode'}
                        </div>
                        {bike.model && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#9ca3af'
                          }}>
                            Modello: {bike.model}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '24px',
                        color: '#ef4444'
                      }}>
                        →
                      </div>
                    </div>
                    
                    <div style={{
                      background: '#fee2e2',
                      color: '#991b1b',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      👆 Clicca per Selezionare
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Selezione bici sostituto */}
        {currentStep === 2 && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: '#1e293b',
                fontSize: '1.5rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                ✅ Seleziona Bici Sostituto
              </h3>

              {/* Bici selezionata da sostituire */}
              {bikeToReplace && (
                <div style={{
                  background: 'white',
                  border: '2px solid #fca5a5',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                    Bici da sostituire:
                  </div>
                  <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>
                    ❌ {bikeToReplace.name} - {bikeToReplace.barcode}
                  </div>
                </div>
              )}

              {/* Scanner */}
              <div style={{ marginBottom: '24px' }}>
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  placeholder="Scansiona barcode della bici sostituto"
                />
              </div>

              {/* Barra di ricerca */}
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="🔍 Cerca bici per nome, barcode o modello..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Lista bici disponibili */}
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '2px solid #f1f5f9',
                borderRadius: '12px'
              }}>
                {filteredBikes.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    {searchTerm ? '🔍 Nessuna bici trovata' : '📭 Nessuna bici disponibile'}
                  </div>
                ) : (
                  filteredBikes.map(bike => (
                    <div
                      key={bike._id}
                      onClick={() => {
                        setSelectedBike(bike);
                        setCurrentStep(3);
                      }}
                      style={{
                        padding: '20px',
                        borderBottom: '1px solid #f1f5f9',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ 
                            fontWeight: '700', 
                            color: '#1e293b',
                            fontSize: '18px',
                            marginBottom: '4px'
                          }}>
                            🚲 {bike.name}
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#64748b',
                            marginBottom: '8px'
                          }}>
                            📊 {bike.barcode} {bike.model && `• ${bike.model}`}
                          </div>
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'center'
                          }}>
                            <span style={{
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              💰 €{bike.priceHourly}/h
                            </span>
                            <span style={{
                              background: '#dcfce7',
                              color: '#166534',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              🟢 DISPONIBILE
                            </span>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '24px',
                          color: '#10b981'
                        }}>
                          →
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Conferma sostituzione */}
        {currentStep === 3 && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: '0 0 24px 0',
                color: '#1e293b',
                fontSize: '1.5rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                🔄 Conferma Sostituzione
              </h3>

              {/* Riepilogo sostituzione */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Bici da sostituire */}
                <div style={{
                  background: 'white',
                  border: '3px solid #fca5a5',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <h4 style={{ 
                    margin: '0 0 12px 0', 
                    color: '#dc2626',
                    fontSize: '1.1rem',
                    fontWeight: '700'
                  }}>
                    ❌ Da Sostituire
                  </h4>
                  {bikeToReplace && (
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                        🚲 {bikeToReplace.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        📊 {bikeToReplace.barcode}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bici sostituto */}
                <div style={{
                  background: 'white',
                  border: '3px solid #86efac',
                  borderRadius: '12px',
                  padding: '20px'
                }}>
                  <h4 style={{ 
                    margin: '0 0 12px 0', 
                    color: '#059669',
                    fontSize: '1.1rem',
                    fontWeight: '700'
                  }}>
                    ✅ Sostituto
                  </h4>
                  {selectedBike && (
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                        🚲 {selectedBike.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                        📊 {selectedBike.barcode}
                      </div>
                      <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                        💰 €{selectedBike.priceHourly}/h • €{selectedBike.priceDaily}/g
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo sostituzione */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontWeight: '700',
                  color: '#1e293b',
                  fontSize: '16px'
                }}>
                  📝 Motivo Sostituzione *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Seleziona motivo...</option>
                  {reasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                
                {reason === 'Altro' && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Specifica il motivo della sostituzione..."
                    style={{
                      width: '100%',
                      marginTop: '12px',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '16px',
                      minHeight: '80px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              {/* Avviso importante */}
              <div style={{
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#92400e',
                  fontWeight: '600'
                }}>
                  ⚠️ <strong>Attenzione:</strong>
                </div>
                <div style={{ color: '#92400e', fontSize: '14px', marginTop: '8px' }}>
                  La sostituzione sarà registrata nello storico del contratto e non potrà essere annullata.
                  La bici sostituita tornerà disponibile per altri noleggi.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Azioni */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end',
          paddingTop: '24px',
          borderTop: '2px solid #e5e7eb'
        }}>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '16px'
              }}
            >
              ← Indietro
            </button>
          )}
          
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '16px'
            }}
          >
            ❌ Annulla
          </button>

          {currentStep === 3 && (
            <button
              onClick={performSwap}
              disabled={!bikeToReplace || !selectedBike || !reason.trim() || (reason === 'Altro' && !customReason.trim()) || loading}
              style={{
                background: (!bikeToReplace || !selectedBike || !reason.trim() || (reason === 'Altro' && !customReason.trim()) || loading) ? 
                  '#d1d5db' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '12px',
                cursor: (!bikeToReplace || !selectedBike || !reason.trim() || (reason === 'Altro' && !customReason.trim()) || loading) ? 
                  'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '16px',
                boxShadow: (!bikeToReplace || !selectedBike || !reason.trim() || (reason === 'Altro' && !customReason.trim()) || loading) ? 
                  'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              {loading ? '⏳ Elaborazione...' : '🔄 Conferma Sostituzione'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BikeSwapper;