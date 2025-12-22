import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import ImageUploader from '../Components/ImageUploader.jsx'
import BarcodeScannerSimple from '../Components/BarcodeScannerSimple.jsx'
import { jwtDecode } from 'jwt-decode'

export default function ContractsFinal(){
  const [items, setItems] = useState([])
  const [customer, setCustomer] = useState({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' })
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('in-use')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [insuranceFlat, setIns] = useState(0)
  const [reservationPrepaid, setPrepaid] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

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
        setItems(prev => [...prev, { 
          kind: 'bike', 
          id: bike._id, 
          name: bike.name, 
          barcode: bike.barcode,
          priceHourly: bike.priceHourly,
          priceDaily: bike.priceDaily,
          image: bike.image
        }])
        alert(`✅ Bici aggiunta: ${bike.name}`)
        setLoading(false)
        return
      }
    } catch (error) {
      // Se non è una bici, prova con gli accessori
      try {
        let response = await api.get(`/api/accessories/barcode/${barcode}`)
        if (response.data && response.data.status === 'available') {
          const accessory = response.data
          setItems(prev => [...prev, { 
            kind: 'accessory', 
            id: accessory._id, 
            name: accessory.name, 
            barcode: accessory.barcode,
            priceHourly: accessory.priceHourly,
            priceDaily: accessory.priceDaily,
            image: accessory.image
          }])
          alert(`✅ Accessorio aggiunto: ${accessory.name}`)
          setLoading(false)
          return
        }
      } catch (error2) {
        alert(`❌ Barcode "${barcode}" non trovato o item non disponibile`)
      }
    }
    setLoading(false)
  }

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const createContract = async () => {
    if (!customer.name.trim()) {
      alert('❌ Inserisci il nome del cliente')
      return
    }
    if (items.length === 0) {
      alert('❌ Aggiungi almeno un item al contratto')
      return
    }

    setLoading(true)
    try {
      const payload = {
        customer, 
        items: items.map(it=>({ 
          ...it, 
          insurance: insuranceFlat > 0, 
          insuranceFlat 
        })),
        notes, 
        status, 
        paymentMethod, 
        reservationPrepaid,
        startAt: new Date().toISOString()
      }
      
      const { data } = await api.post('/api/contracts', payload)
      alert(`✅ Contratto creato con successo!\nID: ${data._id}`)
      
      // Reset form
      setItems([])
      setCustomer({ name:'', phone:'', idFrontUrl:'', idBackUrl:'' })
      setNotes('')
      setStatus('in-use')
      setPaymentMethod(null)
      setPrepaid(false)
      setIns(0)
      
    } catch(error) {
      alert(`❌ Errore creazione contratto: ${error.response?.data?.error || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (item.priceHourly || 0)
    }, 0)
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{marginBottom: '32px'}}>
        <h1 style={{
          margin: 0,
          fontSize: '2.5rem',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          📋 Nuovo Contratto
        </h1>
        <p style={{margin: '8px 0 0 0', color: '#64748b', fontSize: '18px'}}>
          Scansiona i barcode per aggiungere bici e accessori
        </p>
      </div>

      {/* Scanner Barcode */}
      <BarcodeScannerSimple
        onScan={handleBarcodeScanned}
        placeholder="Scansiona barcode bici/accessori o digita manualmente"
      />

      {/* Items Selezionati */}
      {items.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          border: '2px solid #10b981'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📦 Items Selezionati ({items.length})
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {items.map((item, index) => (
              <div key={index} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                background: '#f8fafc',
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
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}>
                      {item.kind === 'bike' ? '🚲' : '🎒'}
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      color: '#374151',
                      marginBottom: '4px'
                    }}>
                      {item.name}
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '8px'
                    }}>
                      Barcode: {item.barcode}
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      color: '#059669',
                      fontWeight: '600'
                    }}>
                      €{item.priceHourly}/h • €{item.priceDaily}/giorno
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#f0fdf4',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#059669'
            }}>
              Totale Orario: €{calculateTotal().toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Dati Cliente */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '24px'
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
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Nome e Cognome *
            </label>
            <input 
              type="text"
              value={customer.name} 
              onChange={e=>setCustomer({...customer, name:e.target.value})}
              placeholder="Inserisci nome completo"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
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
              Telefono
            </label>
            <input 
              type="tel"
              value={customer.phone} 
              onChange={e=>setCustomer({...customer, phone:e.target.value})}
              placeholder="Inserisci numero di telefono"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <ImageUploader 
            label="📄 Documento - Fronte"
            onImageUpload={(imageData) => setCustomer({...customer, idFrontUrl: imageData})}
          />
          <ImageUploader 
            label="📄 Documento - Retro"
            onImageUpload={(imageData) => setCustomer({...customer, idBackUrl: imageData})}
          />
        </div>
      </div>

      {/* Dettagli Contratto */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚙️ Dettagli Contratto
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Stato
            </label>
            <select 
              value={status} 
              onChange={e=>setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              <option value="in-use">In uso</option>
              <option value="reserved">Prenotato</option>
            </select>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Metodo Pagamento
            </label>
            <select 
              value={paymentMethod||''} 
              onChange={e=>setPaymentMethod(e.target.value||null)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              <option value="">Seleziona...</option>
              <option value="cash">Contanti</option>
              <option value="card">Carta</option>
              <option value="link">Link Pagamento</option>
            </select>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Assicurazione (€)
            </label>
            <input 
              type="number" 
              value={insuranceFlat} 
              onChange={e=>setIns(Number(e.target.value)||0)}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            color: '#374151'
          }}>
            <input 
              type="checkbox" 
              checked={reservationPrepaid} 
              onChange={e=>setPrepaid(e.target.checked)}
              style={{ transform: 'scale(1.2)' }}
            />
            Prenotazione già pagata
          </label>
        </div>
        
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Note
          </label>
          <textarea 
            value={notes} 
            onChange={e=>setNotes(e.target.value)}
            placeholder="Inserisci eventuali note..."
            rows="3"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Pulsante Crea Contratto */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <button 
          onClick={createContract} 
          disabled={loading || items.length === 0 || !customer.name.trim()}
          style={{
            padding: '16px 32px',
            background: (loading || items.length === 0 || !customer.name.trim()) ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: (loading || items.length === 0 || !customer.name.trim()) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            margin: '0 auto',
            minWidth: '200px'
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff40',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Creazione...
            </>
          ) : (
            <>
              ✅ Crea Contratto
            </>
          )}
        </button>
        
        {(items.length === 0 || !customer.name.trim()) && (
          <p style={{
            margin: '12px 0 0 0',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {items.length === 0 ? 'Aggiungi almeno un item' : 'Inserisci il nome del cliente'}
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}