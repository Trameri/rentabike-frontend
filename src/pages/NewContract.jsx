import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import DocumentCapture from '../components/DocumentCapture.jsx'
import BarcodeScannerSimple from '../components/BarcodeScannerSimple.jsx'
import BarcodeScanner from '../components/BarcodeScanner.jsx'
import PriceCalculator from '../components/PriceCalculator.jsx'
import LocationLogo from '../components/LocationLogo.jsx'
import { jwtDecode } from 'jwt-decode'

export default function NewContract(){
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' })
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('in-use')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [insuranceFlat, setIns] = useState(0)
  const [reservationPrepaid, setPrepaid] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Stati per i componenti
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showDocumentCapture, setShowDocumentCapture] = useState(false)
  const [captureType, setCaptureType] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16))
  const [endDate, setEndDate] = useState('')
  const [calculatedPrice, setCalculatedPrice] = useState(null)
  
  // Campo per inserimento rapido barcode
  const [quickBarcode, setQuickBarcode] = useState('')
  
  // Stati per la sezione pagamenti
  const [paymentLink, setPaymentLink] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isReservation, setIsReservation] = useState(false)

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if(token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
      } catch(e) {
        console.error('Errore decodifica token:', e)
      }
    }
  }, [])

  const handleBarcodeScanned = async (barcode) => {
    setLoading(true)
    try {
      // Cerca prima nelle bici
      let response = await api.get(`/api/bikes/barcode/${barcode}`)
      if (response.data && response.data.status === 'available') {
        const bike = response.data
        
        // Controlla se è già presente
        const exists = items.find(i => i.id === bike._id && i.kind === 'bike');
        if (exists) {
          alert('⚠️ Bici già aggiunta al contratto');
          setLoading(false);
          return;
        }
        
        setItems(prev => [...prev, { 
          kind: 'bike', 
          id: bike._id, 
          name: bike.name, 
          barcode: bike.barcode,
          priceHourly: bike.priceHourly,
          priceDaily: bike.priceDaily,
          photoUrl: bike.photoUrl,
          insurance: false,
          insuranceFlat: 0
        }])
        alert(`✅ Bici aggiunta: ${bike.name}`)
        setLoading(false)
        return
      }
    } catch (error) {
      // Se non trovata nelle bici, cerca negli accessori
      try {
        let response = await api.get(`/api/accessories/barcode/${barcode}`)
        if (response.data && response.data.status === 'available') {
          const accessory = response.data
          
          // Controlla se è già presente
          const exists = items.find(i => i.id === accessory._id && i.kind === 'accessory');
          if (exists) {
            alert('⚠️ Accessorio già aggiunto al contratto');
            setLoading(false);
            return;
          }
          
          setItems(prev => [...prev, { 
            kind: 'accessory', 
            id: accessory._id, 
            name: accessory.name, 
            barcode: accessory.barcode,
            priceHourly: accessory.priceHourly,
            priceDaily: accessory.priceDaily,
            photoUrl: accessory.photoUrl
          }])
          alert(`✅ Accessorio aggiunto: ${accessory.name}`)
        } else {
          alert('❌ Accessorio non trovato o non disponibile')
        }
      } catch (accessoryError) {
        alert('❌ Codice a barre non trovato')
      }
    }
    setLoading(false)
  }

  // Gestione inserimento rapido barcode
  const handleQuickBarcodeSubmit = (e) => {
    e.preventDefault();
    if (quickBarcode.trim()) {
      handleBarcodeScanned(quickBarcode.trim());
      setQuickBarcode('');
    }
  };

  // Funzione per creare contratto
  async function createContract(){
    // Validazione base
    if (!customer.name.trim()) {
      alert('⚠️ Inserisci il nome del cliente');
      return;
    }
    if (!customer.phone.trim()) {
      alert('⚠️ Inserisci il numero di telefono');
      return;
    }
    if (items.length === 0) {
      alert('⚠️ Aggiungi almeno un articolo al contratto');
      return;
    }

    try {
      // Calcola assicurazione totale dalle singole bici
      const totalInsurance = items.reduce((sum, item) => {
        return sum + (item.insurance ? (item.insuranceFlat || 5) : 0);
      }, 0);
      
      const payload = {
        customer, 
        items: items.map(it => ({ 
          ...it, 
          insurance: it.insurance || false, 
          insuranceFlat: it.insurance ? (it.insuranceFlat || 5) : 0 
        })),
        notes, 
        status: isReservation ? 'reserved' : status, 
        paymentMethod, 
        reservationPrepaid,
        startAt: startDate,
        endAt: endDate || null,
        calculatedPrice: calculatedPrice,
        totalInsurance: totalInsurance,
        // Nuovi campi per i pagamenti
        paymentLink: paymentLink || null,
        paymentNotes: paymentNotes || null,
        isReservation: isReservation
      }
      
      console.log('Creazione contratto:', payload);
      const { data } = await api.post('/api/contracts', payload)
      
      const statusMessage = isReservation ? 'prenotato' : 'creato';
      alert(`✅ Contratto ${statusMessage} con successo!\nID: ${data._id}\nAssicurazione totale: €${totalInsurance}`)
      
      // Torna alla dashboard
      navigate('/dashboard')
      
    } catch (error) {
      console.error('Errore creazione contratto:', error);
      alert('❌ Errore nella creazione del contratto: ' + (error.response?.data?.error || error.message));
    }
  }

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleDocumentCapture = (imageData) => {
    if (captureType === 'front') {
      setCustomer(prev => ({ ...prev, idFrontUrl: imageData }));
    } else if (captureType === 'back') {
      setCustomer(prev => ({ ...prev, idBackUrl: imageData }));
    }
    setShowDocumentCapture(false);
    setCaptureType('');
  }

  const openDocumentCapture = (type) => {
    setCaptureType(type);
    setShowDocumentCapture(true);
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              padding: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <LocationLogo 
                locationName={user?.location?.name || user?.username} 
                size="large"
              />
            </div>
            <div>
              <h1 style={{
                margin: '0 0 8px 0',
                fontSize: '2.5rem',
                fontWeight: '800'
              }}>
                📋 Nuovo Contratto
              </h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
                Crea un nuovo contratto di noleggio
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: '600',
              backdropFilter: 'blur(10px)'
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Colonna Sinistra */}
        <div>
          {/* Dati Cliente */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              👤 Dati Cliente
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Nome Completo
              </label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome e cognome del cliente"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
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
                Numero di Telefono
              </label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Numero di telefono"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>
          </div>

          {/* Documenti */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📷 Documenti Identità
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Fronte */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#6b7280' }}>Fronte</h4>
                {customer.idFrontUrl ? (
                  <div>
                    <img
                      src={customer.idFrontUrl}
                      alt="Fronte carta d'identità"
                      style={{
                        width: '100%',
                        maxWidth: '200px',
                        height: 'auto',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '2px solid #10b981'
                      }}
                    />
                    <button
                      onClick={() => openDocumentCapture('front')}
                      style={{
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🔄 Rifai
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openDocumentCapture('front')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📸 Scatta Fronte
                  </button>
                )}
              </div>

              {/* Retro */}
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#6b7280' }}>Retro</h4>
                {customer.idBackUrl ? (
                  <div>
                    <img
                      src={customer.idBackUrl}
                      alt="Retro carta d'identità"
                      style={{
                        width: '100%',
                        maxWidth: '200px',
                        height: 'auto',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '2px solid #10b981'
                      }}
                    />
                    <button
                      onClick={() => openDocumentCapture('back')}
                      style={{
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      🔄 Rifai
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openDocumentCapture('back')}
                    style={{
                      width: '100%',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    📸 Scatta Retro
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scansione Barcode */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔫 Scansione Barcode
            </h3>
            <form onSubmit={handleQuickBarcodeSubmit} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={quickBarcode}
                onChange={(e) => setQuickBarcode(e.target.value)}
                placeholder="Scansiona o digita barcode e premi INVIO"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'monospace'
                }}
                autoFocus
              />
              <button
                type="submit"
                disabled={!quickBarcode.trim() || loading}
                style={{
                  padding: '12px 24px',
                  background: quickBarcode.trim() ? 
                    'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: quickBarcode.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                {loading ? '⏳' : '✅'}
              </button>
            </form>
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => setShowBarcodeScanner(true)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                📱 Apri Scanner Webcam
              </button>
            </div>
          </div>
        </div>

        {/* Colonna Destra */}
        <div>
          {/* Articoli Aggiunti */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🚲 Articoli ({items.length})
            </h3>
            
            {items.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#9ca3af',
                border: '2px dashed #e5e7eb',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚲</div>
                <p>Nessun articolo aggiunto</p>
                <p style={{ fontSize: '14px' }}>Usa lo scanner per aggiungere bici e accessori</p>
              </div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {items.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    {/* Foto dell'articolo */}
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid #e5e7eb',
                      flexShrink: 0
                    }}>
                      {item.photoUrl ? (
                        <img 
                          src={item.photoUrl} 
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            // Mostra immagine ingrandita
                            const modal = document.createElement('div');
                            modal.style.cssText = `
                              position: fixed;
                              top: 0;
                              left: 0;
                              width: 100%;
                              height: 100%;
                              background: rgba(0,0,0,0.8);
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              z-index: 1000;
                              cursor: pointer;
                            `;
                            modal.innerHTML = `
                              <img src="${item.photoUrl}" alt="${item.name}" style="
                                max-width: 90%;
                                max-height: 90%;
                                object-fit: contain;
                                border-radius: 8px;
                                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                              ">
                            `;
                            modal.onclick = () => document.body.removeChild(modal);
                            document.body.appendChild(modal);
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: item.kind === 'bike' ? '#dbeafe' : '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
                        }}>
                          {item.kind === 'bike' ? '🚲' : '🎒'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#374151' }}>{item.name}</div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {item.barcode} • €{item.priceHourly}/h • €{item.priceDaily}/g
                      </div>
                    </div>
                    {item.kind === 'bike' && (
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: '#374151'
                      }}>
                        <input
                          type="checkbox"
                          checked={item.insurance || false}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = {
                              ...newItems[index],
                              insurance: e.target.checked,
                              insuranceFlat: e.target.checked ? 5 : 0
                            };
                            setItems(newItems);
                          }}
                        />
                        Assicurazione €5
                      </label>
                    )}
                    <button
                      onClick={() => removeItem(index)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calcolo Prezzo */}
          {items.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                💰 Calcolo Prezzo
              </h3>
              
              <PriceCalculator
                items={items}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onPriceCalculated={setCalculatedPrice}
              />
            </div>
          )}

          {/* Finalizzazione */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✅ Finalizzazione
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Note (opzionale)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note aggiuntive per il contratto..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Metodo di Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="cash">💵 Contanti</option>
                <option value="card">💳 Carta</option>
                <option value="bank_transfer">🏦 Bonifico</option>
                <option value="paypal">📱 PayPal</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isReservation}
                  onChange={(e) => setIsReservation(e.target.checked)}
                />
                📅 Questo è una prenotazione
              </label>
            </div>

            <button
              onClick={createContract}
              disabled={!customer.name.trim() || !customer.phone.trim() || items.length === 0}
              style={{
                width: '100%',
                padding: '16px',
                background: (!customer.name.trim() || !customer.phone.trim() || items.length === 0) ? 
                  '#d1d5db' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: (!customer.name.trim() || !customer.phone.trim() || items.length === 0) ? 
                  'not-allowed' : 'pointer',
                fontWeight: '700',
                fontSize: '18px'
              }}
            >
              {isReservation ? '📅 Crea Prenotazione' : '✅ Crea Contratto'}
            </button>
          </div>
        </div>
      </div>

      {/* Modali */}
      {showDocumentCapture && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#374151' }}>
                📸 Scatta foto {captureType === 'front' ? 'fronte' : 'retro'} carta d'identità
              </h3>
              <button
                onClick={() => {
                  setShowDocumentCapture(false);
                  setCaptureType('');
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                ✕ Chiudi
              </button>
            </div>
            <DocumentCapture
              onCapture={handleDocumentCapture}
              onCancel={() => {
                setShowDocumentCapture(false);
                setCaptureType('');
              }}
            />
          </div>
        </div>
      )}

      {showBarcodeScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#374151' }}>
                📱 Scanner Barcode
              </h3>
              <button
                onClick={() => setShowBarcodeScanner(false)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                ✕ Chiudi
              </button>
            </div>
            <BarcodeScanner
              onScan={(barcode) => {
                handleBarcodeScanned(barcode);
                setShowBarcodeScanner(false);
              }}
              onClose={() => setShowBarcodeScanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}