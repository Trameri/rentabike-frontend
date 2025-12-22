import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import BarcodeScanner from './BarcodeScanner.jsx';

const ContractMirror = ({ onContractSelect, onBikeScanned }) => {
  const [activeContracts, setActiveContracts] = useState([]);
  const [scannedItems, setScannedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    loadActiveContracts();
    const interval = setInterval(loadActiveContracts, 30000); // Aggiorna ogni 30 secondi
    return () => clearInterval(interval);
  }, []);

  const loadActiveContracts = async () => {
    try {
      const { data } = await api.get('/api/contracts', {
        params: { status: 'in-use' }
      });
      setActiveContracts(data);
    } catch (error) {
      console.error('Errore caricamento contratti:', error);
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    setLoading(true);
    try {
      // Cerca il contratto attivo per questo barcode
      const { data } = await api.get(`/api/contracts/active-by-barcode/${barcode}`);
      
      const scannedItem = {
        barcode,
        contractId: data._id,
        customer: data.customer,
        item: data.items.find(item => item.barcode === barcode),
        timestamp: new Date()
      };

      setScannedItems(prev => [scannedItem, ...prev.slice(0, 9)]); // Mantieni solo gli ultimi 10
      
      if (onBikeScanned) {
        onBikeScanned(scannedItem);
      }

      // Auto-seleziona il contratto se non ne è già selezionato uno
      if (!selectedContract) {
        setSelectedContract(data);
        if (onContractSelect) {
          onContractSelect(data);
        }
      }

    } catch (error) {
      alert('Barcode non trovato in nessun contratto attivo');
    } finally {
      setLoading(false);
    }
  };

  const selectContract = (contract) => {
    setSelectedContract(contract);
    if (onContractSelect) {
      onContractSelect(contract);
    }
  };

  const calculateElapsedTime = (startAt) => {
    const now = new Date();
    const start = new Date(startAt);
    const diffMs = now - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}g ${remainingHours}h`;
  };

  // Gestione webcam per anteprima
  const startVideoPreview = async () => {
    try {
      console.log('Avvio anteprima video specchietto...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Il browser non supporta l\'accesso alla fotocamera');
      }
      
      let stream;
      try {
        // Prova con configurazione ottimizzata per anteprima
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user' // Fotocamera frontale per specchietto
          } 
        });
      } catch (error) {
        console.log('Configurazione frontale fallita, provo configurazione base...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video specchietto caricato');
          videoRef.current.play().then(() => {
            console.log('Video specchietto avviato');
            setVideoActive(true);
          }).catch(err => {
            console.error('Errore avvio video specchietto:', err);
          });
        };
      }
      
    } catch (error) {
      console.error('Errore anteprima video:', error);
      alert('Errore nell\'avvio dell\'anteprima: ' + error.message);
    }
  };

  const stopVideoPreview = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setVideoActive(false);
    }
  };

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      stopVideoPreview();
    };
  }, []);

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: '0',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔍 Specchietto Contratti
        </h3>
        
        <button
          onClick={() => {
            if (showVideoPreview) {
              setShowVideoPreview(false);
              stopVideoPreview();
            } else {
              setShowVideoPreview(true);
              startVideoPreview();
            }
          }}
          style={{
            padding: '8px 16px',
            background: showVideoPreview ? 
              'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
              'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {showVideoPreview ? '📹 Chiudi Anteprima' : '📹 Anteprima Video'}
        </button>
      </div>

      {/* Anteprima Video */}
      {showVideoPreview && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            📹 Anteprima Video Specchietto
          </h4>
          
          {!videoActive ? (
            <div style={{
              padding: '40px',
              background: '#1f2937',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px'
            }}>
              🔄 Avvio anteprima video...
            </div>
          ) : (
            <div style={{
              position: 'relative',
              display: 'inline-block',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transform: 'scaleX(-1)' // Effetto specchio
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  height: 'auto',
                  display: 'block'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: 'rgba(16, 185, 129, 0.9)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                🔴 LIVE
              </div>
            </div>
          )}
          
          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            💡 Anteprima in tempo reale per controllo visivo
          </div>
        </div>
      )}

      {/* Scanner barcode */}
      <BarcodeScanner
        onScan={handleBarcodeScanned}
        placeholder="Scansiona barcode per trovare contratto"
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {/* Contratti attivi */}
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Contratti Attivi ({activeContracts.length})
          </h4>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            {activeContracts.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                Nessun contratto attivo
              </div>
            ) : (
              activeContracts.map(contract => (
                <div
                  key={contract._id}
                  onClick={() => selectContract(contract)}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: selectedContract?._id === contract._id ? '#f0f9ff' : 'white',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {contract.customer?.name || 'Cliente sconosciuto'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        #{contract._id?.slice(-6)} • {calculateElapsedTime(contract.startAt)}
                      </div>
                    </div>
                    <div style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      ATTIVO
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {contract.items?.length || 0} items • 
                    {contract.items?.filter(item => item.kind === 'bike').length || 0} bici
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Items scansionati di recente */}
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📱 Scansioni Recenti ({scannedItems.length})
          </h4>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            {scannedItems.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#6b7280'
              }}>
                Nessuna scansione recente
              </div>
            ) : (
              scannedItems.map((scan, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    borderBottom: index < scannedItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: index === 0 ? '#f0fdf4' : 'white'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#374151' }}>
                        {scan.item?.kind === 'bike' ? '🚲' : '🎒'} {scan.item?.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {scan.barcode}
                      </div>
                    </div>
                    {index === 0 && (
                      <div style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        NUOVO
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Cliente: {scan.customer?.name} • 
                    {scan.timestamp.toLocaleTimeString('it-IT')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Contratto selezionato */}
      {selectedContract && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📋 Contratto Selezionato
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '14px'
          }}>
            <div><strong>Cliente:</strong> {selectedContract.customer?.name}</div>
            <div><strong>ID:</strong> #{selectedContract._id?.slice(-6)}</div>
            <div><strong>Durata:</strong> {calculateElapsedTime(selectedContract.startAt)}</div>
            <div><strong>Items:</strong> {selectedContract.items?.length || 0}</div>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            <strong>Bici nel contratto:</strong>
            <div style={{ marginTop: '8px' }}>
              {selectedContract.items?.filter(item => item.kind === 'bike').map((bike, index) => (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    background: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    margin: '2px',
                    fontSize: '12px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  🚲 {bike.name} ({bike.barcode})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractMirror;