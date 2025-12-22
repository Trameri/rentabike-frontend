import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import DocumentCapture from '../Components/DocumentCapture.jsx'
import BarcodeToItemScanner from '../Components/BarcodeToItemScanner.jsx'
import PriceCalculatorOptimized from '../Components/PriceCalculatorOptimized.jsx'
import LocationLogo from '../Components/LocationLogo.jsx'
import { jwtDecode } from 'jwt-decode'

export default function ContractsOptimized(){
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' })
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('in-use')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Stati per gestione contratto
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16))
  const [endDate, setEndDate] = useState('')
  const [calculatedPrice, setCalculatedPrice] = useState(null)
  const [isReservation, setIsReservation] = useState(false)
  const [paymentLink, setPaymentLink] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

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

  const handleItemScanned = (item) => {
    // Controlla se è già presente
    const exists = items.find(i => i.id === item.id && i.kind === item.kind);
    if (exists) {
      showErrorNotification(`⚠️ ${item.kind === 'bike' ? 'Bici' : 'Accessorio'} già aggiunto al contratto`);
      return;
    }
    
    setItems(prev => [...prev, item])
    showSuccessNotification(`✅ ${item.kind === 'bike' ? 'Bici' : 'Accessorio'} aggiunto: ${item.name}`)
  }

  const showSuccessNotification = (message) => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  const showErrorNotification = (message) => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  // Funzione per creare contratto
  async function createContract(){
    if (!customer.name || !customer.phone) {
      showErrorNotification('❌ Inserisci nome e telefono del cliente')
      return
    }

    if (items.length === 0) {
      showErrorNotification('❌ Aggiungi almeno un articolo al contratto')
      return
    }

    setLoading(true)
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
        startAt: startDate,
        endAt: endDate || null,
        calculatedPrice: calculatedPrice,
        totalInsurance: totalInsurance,
        paymentLink: paymentLink || null,
        paymentNotes: paymentNotes || null,
        isReservation: isReservation,
        // Salva le foto dei documenti nel contratto
        documentPhotos: {
          idFront: customer.idFrontUrl,
          idBack: customer.idBackUrl
        }
      }
      
      console.log('Creazione contratto:', payload);
      const { data } = await api.post('/api/contracts', payload)
      
      const statusMessage = isReservation ? 'prenotato' : 'creato';
      showSuccessNotification(`✅ Contratto ${statusMessage} con successo! ID: ${data._id}`)
      
      // Reset form
      setItems([]); 
      setCustomer({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' }); 
      setNotes(''); 
      setStatus('in-use'); 
      setPaymentMethod(null); 
      setStartDate(new Date().toISOString().slice(0, 16)); 
      setEndDate(''); 
      setCalculatedPrice(null);
      setCurrentStep(1);
      setPaymentLink('');
      setPaymentNotes('');
      setIsReservation(false);
      
    } catch (error) {
      console.error('Errore creazione contratto:', error);
      showErrorNotification('❌ Errore nella creazione del contratto: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false)
    }
  }

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleDocumentCapture = (imageData, type) => {
    setCustomer(prev => ({
      ...prev,
      [type === 'front' ? 'idFrontUrl' : 'idBackUrl']: imageData
    }))
  }

  const steps = [
    { number: 1, title: 'Dati Cliente', icon: '👤' },
    { number: 2, title: 'Documenti', icon: '📷' },
    { number: 3, title: 'Articoli', icon: '🚲' },
    { number: 4, title: 'Finalizza', icon: '✅' }
  ]

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
          gap: '24px',
          position: 'relative',
          zIndex: 2
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
              📋 Contratto Ottimizzato
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Creazione rapida con scanner automatico
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {steps.map((step, index) => (
            <div key={step.number} style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: currentStep >= step.number ? 
                    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#e5e7eb',
                  color: currentStep >= step.number ? 'white' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: currentStep >= step.number ? '#3b82f6' : '#9ca3af',
                  textAlign: 'center'
                }}>
                  {step.title}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: currentStep > step.number ? '#3b82f6' : '#e5e7eb',
                  margin: '0 16px',
                  transition: 'background 0.3s ease'
                }}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Scanner Barcode - Sempre visibile per efficienza */}
      <BarcodeToItemScanner 
        onItemScanned={handleItemScanned}
        loading={loading}
      />

      {/* Step 1: Dati Cliente */}
      {currentStep >= 1 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👤 Dati Cliente
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Nome Completo *
              </label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome e cognome del cliente"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Telefono *
              </label>
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Numero di telefono"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!customer.name || !customer.phone}
              style={{
                padding: '12px 24px',
                background: customer.name && customer.phone ? 
                  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: customer.name && customer.phone ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Continua →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Documenti */}
      {currentStep >= 2 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📷 Documenti Cliente
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            <DocumentCapture
              onCapture={(imageData) => handleDocumentCapture(imageData, 'front')}
              label="Documento Fronte"
              type="front"
            />
            
            <DocumentCapture
              onCapture={(imageData) => handleDocumentCapture(imageData, 'back')}
              label="Documento Retro"
              type="back"
            />
          </div>
          
          <div style={{ 
            marginTop: '16px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setCurrentStep(1)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              ← Indietro
            </button>
            
            <button
              onClick={() => setCurrentStep(3)}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Continua →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Articoli */}
      {currentStep >= 3 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🚲 Articoli Selezionati ({items.length})
          </h3>
          
          {items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
              <p style={{ fontSize: '18px' }}>
                Usa lo scanner sopra per aggiungere bici e accessori
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {items.map((item, index) => (
                <div key={index} style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '16px',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => removeItem(index)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '8px',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '50px',
                        height: '50px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        {item.kind === 'bike' ? '🚲' : '🎒'}
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        {item.name}
                      </h4>
                      <p style={{
                        margin: '0',
                        fontSize: '12px',
                        color: '#6b7280',
                        fontFamily: 'monospace'
                      }}>
                        {item.barcode}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    textAlign: 'center'
                  }}>
                    💰 €{item.priceHourly}/h - €{item.priceDaily}/g
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ 
            marginTop: '16px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setCurrentStep(2)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              ← Indietro
            </button>
            
            <button
              onClick={() => setCurrentStep(4)}
              disabled={items.length === 0}
              style={{
                padding: '12px 24px',
                background: items.length > 0 ? 
                  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: items.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Continua →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Finalizza */}
      {currentStep >= 4 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ✅ Finalizza Contratto
          </h3>
          
          {/* Calcolatore Prezzo Ottimizzato */}
          <div style={{ marginBottom: '24px' }}>
            <PriceCalculatorOptimized
              items={items}
              startDate={startDate}
              endDate={endDate}
              onPriceCalculated={setCalculatedPrice}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              isReservation={isReservation}
            />
          </div>
          
          {/* Note Aggiuntive */}
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Note Aggiuntive
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note opzionali per il contratto..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
          
          {/* Toggle Prenotazione vs Contratto */}
          <div style={{
            background: '#f8fafc',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151'
            }}>
              🎯 Tipo di Contratto
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: !isReservation ? '#f0fdf4' : 'white',
                border: `2px solid ${!isReservation ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="radio"
                  name="contractType"
                  checked={!isReservation}
                  onChange={() => setIsReservation(false)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    ⚡ Contratto Attivo
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Tariffa oraria dall'attivazione
                  </div>
                </div>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: isReservation ? '#eff6ff' : 'white',
                border: `2px solid ${isReservation ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="radio"
                  name="contractType"
                  checked={isReservation}
                  onChange={() => setIsReservation(true)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    📅 Prenotazione
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Tariffa giornaliera fissa
                  </div>
                </div>
              </label>
            </div>
            
            {/* Spiegazione della differenza */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: isReservation ? '#eff6ff' : '#f0fdf4',
              border: `1px solid ${isReservation ? '#bfdbfe' : '#bbf7d0'}`,
              borderRadius: '8px',
              fontSize: '13px',
              color: isReservation ? '#1e40af' : '#059669'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                💡 {isReservation ? 'Prenotazione Selezionata' : 'Contratto Attivo Selezionato'}:
              </div>
              {isReservation ? (
                <div>
                  La prenotazione applica sempre la tariffa giornaliera per garantire la disponibilità degli articoli nelle date selezionate.
                </div>
              ) : (
                <div>
                  Il contratto attivo parte con tariffa oraria dall'attivazione e si blocca automaticamente alla tariffa giornaliera quando più conveniente.
                </div>
              )}
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setCurrentStep(3)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#6b7280',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              ← Indietro
            </button>
            
            <button
              onClick={createContract}
              disabled={loading}
              style={{
                padding: '16px 32px',
                background: loading ? 
                  'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : 
                  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
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
                  Creazione...
                </>
              ) : (
                <>
                  ✅ {isReservation ? 'Crea Prenotazione' : 'Crea Contratto'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}