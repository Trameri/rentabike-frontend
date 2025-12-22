import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import BarcodeScanner from './BarcodeScanner.jsx';

const BikeReturn = ({ selectedContract: preselectedContract, onReturnComplete, onClose }) => {
  const [activeContracts, setActiveContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState(preselectedContract || null);
  const [returnedItems, setReturnedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Selezione, 2: Scansione, 3: Conferma
  const [returnMode, setReturnMode] = useState('scan'); // 'scan' o 'manual'

  useEffect(() => {
    loadActiveContracts();
    // Se c'è un contratto preselezionato, vai direttamente al passo 2
    if (preselectedContract) {
      setCurrentStep(2);
    }
  }, [preselectedContract]);

  const loadActiveContracts = async () => {
    try {
      const { data } = await api.get('/api/contracts', {
        params: { status: 'in-use' }
      });
      setActiveContracts(data);
    } catch (error) {
      console.error('Errore caricamento contratti attivi:', error);
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      setLoading(true);
      
      // Cerca il contratto attivo per questo barcode
      const { data } = await api.get(`/api/contracts/active-by-barcode/${barcode}`);
      
      if (!data) {
        alert('❌ Barcode non trovato in nessun contratto attivo');
        return;
      }

      // Trova l'item specifico
      const item = data.items.find(item => item.barcode === barcode);
      if (!item) {
        alert('❌ Item non trovato nel contratto');
        return;
      }

      // Controlla se è già stato restituito
      if (item.returnedAt) {
        alert('⚠️ Questo item è già stato restituito il ' + new Date(item.returnedAt).toLocaleString('it-IT'));
        return;
      }

      setSelectedContract(data);
      
      // Aggiungi alla lista dei rientri
      const returnItem = {
        contractId: data._id,
        itemId: item._id,
        barcode: barcode,
        name: item.name,
        kind: item.kind,
        returnedAt: new Date(),
        customer: data.customer,
        condition: 'good' // Default condition
      };

      setReturnedItems(prev => {
        const exists = prev.find(r => r.barcode === barcode);
        if (exists) {
          alert('⚠️ Item già nella lista rientri');
          return prev;
        }
        return [returnItem, ...prev];
      });

      // Passa automaticamente al step di conferma se è il primo item
      if (returnedItems.length === 0) {
        setCurrentStep(3);
      }

    } catch (error) {
      console.error('Errore scansione rientro:', error);
      alert('❌ Errore: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const selectContractForReturn = (contract) => {
    setSelectedContract(contract);
    setCurrentStep(2);
  };

  const addItemManually = (contract, item) => {
    if (item.returnedAt) {
      alert('⚠️ Questo item è già stato restituito');
      return;
    }

    const returnItem = {
      contractId: contract._id,
      itemId: item._id,
      barcode: item.barcode,
      name: item.name,
      kind: item.kind,
      returnedAt: new Date(),
      customer: contract.customer,
      condition: 'good'
    };

    setReturnedItems(prev => {
      const exists = prev.find(r => r.itemId === item._id);
      if (exists) {
        alert('⚠️ Item già nella lista rientri');
        return prev;
      }
      return [returnItem, ...prev];
    });

    setCurrentStep(3);
  };

  const updateItemCondition = (itemId, condition) => {
    setReturnedItems(prev => 
      prev.map(item => 
        item.itemId === itemId ? { ...item, condition } : item
      )
    );
  };

  const processReturns = async () => {
    if (returnedItems.length === 0) {
      alert('❌ Nessun item da restituire');
      return;
    }

    try {
      setLoading(true);

      // Processa ogni rientro
      for (const item of returnedItems) {
        await api.post(`/api/contracts/${item.contractId}/return-item`, {
          itemId: item.itemId,
          returnedAt: item.returnedAt,
          notes: notes,
          condition: item.condition
        });
      }

      alert(`✅ Rientro completato per ${returnedItems.length} item(s)`);
      
      // Verifica se il contratto è completamente restituito
      const contractId = returnedItems[0]?.contractId;
      if (contractId) {
        // Ricarica il contratto aggiornato
        const { data: updatedContract } = await api.get(`/api/contracts/${contractId}`);
        
        // Reset
        setReturnedItems([]);
        setSelectedContract(null);
        setNotes('');
        setCurrentStep(1);
        
        // Ricarica contratti
        await loadActiveContracts();
        
        if (onReturnComplete) {
          onReturnComplete(updatedContract);
        }
      } else {
        // Reset
        setReturnedItems([]);
        setSelectedContract(null);
        setNotes('');
        setCurrentStep(1);
        
        // Ricarica contratti
        await loadActiveContracts();
        
        if (onReturnComplete) {
          onReturnComplete();
        }
      }

    } catch (error) {
      console.error('Errore processamento rientri:', error);
      alert('❌ Errore nel rientro: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const removeFromReturns = (itemId) => {
    setReturnedItems(prev => prev.filter(item => item.itemId !== itemId));
  };

  const filteredContracts = activeContracts.filter(contract => 
    contract.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract._id.includes(searchTerm) ||
    contract.customer?.phone?.includes(searchTerm)
  );

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent': return '#10b981';
      case 'good': return '#059669';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      case 'damaged': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getConditionLabel = (condition) => {
    switch (condition) {
      case 'excellent': return '🌟 Eccellente';
      case 'good': return '✅ Buono';
      case 'fair': return '⚠️ Discreto';
      case 'poor': return '❌ Scarso';
      case 'damaged': return '🔧 Danneggiato';
      default: return '❓ Non specificato';
    }
  };

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
        maxWidth: '1000px',
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
              📥 Gestione Rientri
            </h2>
            <p style={{
              margin: '8px 0 0 0',
              color: '#64748b',
              fontSize: '16px'
            }}>
              Gestisci il rientro di bici e accessori
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
            { step: 1, label: 'Selezione', icon: '🎯' },
            { step: 2, label: 'Scansione', icon: '📱' },
            { step: 3, label: 'Conferma', icon: '✅' }
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
                marginRight: step < 3 ? '24px' : '0'
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

        {/* Step 1: Selezione Contratto */}
        {currentStep === 1 && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
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
                🎯 Seleziona Modalità di Rientro
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <button
                  onClick={() => {
                    setReturnMode('scan');
                    setCurrentStep(2);
                  }}
                  style={{
                    background: 'white',
                    border: '3px solid #10b981',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📱</div>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '4px' }}>
                    Scansione Barcode
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    Scansiona il barcode degli articoli da restituire
                  </div>
                </button>

                <button
                  onClick={() => setReturnMode('manual')}
                  style={{
                    background: 'white',
                    border: '3px solid #3b82f6',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                  <div style={{ fontWeight: '700', fontSize: '18px', color: '#1e293b', marginBottom: '4px' }}>
                    Selezione Manuale
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    Seleziona manualmente gli articoli da un contratto
                  </div>
                </button>
              </div>
            </div>

            {/* Selezione manuale - Lista contratti */}
            {returnMode === 'manual' && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                border: '2px solid #e5e7eb'
              }}>
                <h4 style={{
                  margin: '0 0 16px 0',
                  color: '#1e293b',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  📋 Contratti Attivi ({filteredContracts.length})
                </h4>

                {/* Barra di ricerca */}
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Cerca per nome cliente, telefono o ID contratto..."
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

                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px'
                }}>
                  {filteredContracts.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#64748b'
                    }}>
                      {searchTerm ? '🔍 Nessun contratto trovato' : '📭 Nessun contratto attivo'}
                    </div>
                  ) : (
                    filteredContracts.map(contract => (
                      <div
                        key={contract._id}
                        onClick={() => selectContractForReturn(contract)}
                        style={{
                          padding: '20px',
                          borderBottom: '1px solid #f1f5f9',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          ':hover': { background: '#f8fafc' }
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
                              👤 {contract.customer?.name || 'Cliente sconosciuto'}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#64748b',
                              marginBottom: '8px'
                            }}>
                              📞 {contract.customer?.phone || 'N/A'} • 
                              🆔 #{contract._id?.slice(-8)}
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
                                📦 {contract.items?.length || 0} articoli
                              </span>
                              <span style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                🟢 ATTIVO
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
            )}
          </div>
        )}

        {/* Step 2: Scansione/Selezione Items */}
        {currentStep === 2 && (
          <div>
            {returnMode === 'scan' ? (
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
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
                  📱 Scansiona Barcode
                </h3>
                <BarcodeScanner
                  onScan={handleBarcodeScanned}
                  placeholder="Scansiona barcode bici/accessorio da restituire"
                />
              </div>
            ) : (
              selectedContract && (
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#1e293b',
                      fontSize: '1.5rem',
                      fontWeight: '700'
                    }}>
                      📦 Articoli di {selectedContract.customer?.name}
                    </h3>
                    <button
                      onClick={() => setCurrentStep(1)}
                      style={{
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      ← Indietro
                    </button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '16px'
                  }}>
                    {selectedContract.items?.map((item, index) => (
                      <div key={index} style={{
                        background: item.returnedAt ? '#f3f4f6' : '#f8fafc',
                        border: `2px solid ${item.returnedAt ? '#d1d5db' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        opacity: item.returnedAt ? 0.6 : 1
                      }}>
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
                              {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#64748b',
                              marginBottom: '8px'
                            }}>
                              📊 {item.barcode || 'Nessun barcode'}
                            </div>
                            {item.insurance && (
                              <div style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                display: 'inline-block',
                                marginBottom: '8px'
                              }}>
                                🛡️ Assicurato
                              </div>
                            )}
                          </div>
                        </div>

                        {item.returnedAt ? (
                          <div style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}>
                            ✅ Già restituito il {new Date(item.returnedAt).toLocaleDateString('it-IT')}
                          </div>
                        ) : (
                          <button
                            onClick={() => addItemManually(selectedContract, item)}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '16px',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            📥 Aggiungi al Rientro
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Step 3: Conferma Rientro */}
        {currentStep === 3 && (
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
                ✅ Conferma Rientro ({returnedItems.length} articoli)
              </h3>

              {/* Items in rientro con condizioni */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {returnedItems.map((item, index) => (
                  <div key={index} style={{
                    background: 'white',
                    border: '2px solid #d1fae5',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{ 
                          fontWeight: '700', 
                          color: '#1e293b',
                          fontSize: '18px',
                          marginBottom: '4px'
                        }}>
                          {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#64748b',
                          marginBottom: '4px'
                        }}>
                          📊 {item.barcode}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#64748b'
                        }}>
                          👤 {item.customer?.name}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromReturns(item.itemId)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Selezione condizione */}
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>
                        🔍 Condizione dell'articolo:
                      </label>
                      <select
                        value={item.condition}
                        onChange={(e) => updateItemCondition(item.itemId, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: getConditionColor(item.condition),
                          background: 'white'
                        }}
                      >
                        <option value="excellent">🌟 Eccellente</option>
                        <option value="good">✅ Buono</option>
                        <option value="fair">⚠️ Discreto</option>
                        <option value="poor">❌ Scarso</option>
                        <option value="damaged">🔧 Danneggiato</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note rientro */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontWeight: '700',
                  color: '#1e293b',
                  fontSize: '16px'
                }}>
                  📝 Note Rientro (opzionale)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condizioni generali, danni rilevati, note particolari..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '16px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
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
              onClick={processReturns}
              disabled={returnedItems.length === 0 || loading}
              style={{
                background: returnedItems.length > 0 ? 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#d1d5db',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '12px',
                cursor: returnedItems.length > 0 ? 'pointer' : 'not-allowed',
                fontWeight: '700',
                fontSize: '16px',
                boxShadow: returnedItems.length > 0 ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              {loading ? '⏳ Elaborazione...' : `🎉 Conferma Rientro (${returnedItems.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BikeReturn;