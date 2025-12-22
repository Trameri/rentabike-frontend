import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'
import ImageUpload from '../Components/ImageUpload.jsx'

export default function Accessories(){
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name:'', priceHourly:2, priceDaily:10, photoUrl:'', barcode:'', location:'' })
  const [q, setQ] = useState('')
  const [user, setUser] = useState(null)
  const [locations, setLocations] = useState([])

  useEffect(()=>{
    // Decodifica il token per ottenere info utente
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

  useEffect(()=>{
    if(user && user.role === 'superadmin') {
      // Carica le location per il superadmin
      (async()=>{
        try {
          const { data } = await api.get('/api/locations')
          setLocations(data)
        } catch(e) {
          console.error('Errore caricamento location:', e)
        }
      })()
    }
  }, [user])

  async function load(){
    const { data } = await api.get('/api/accessories', { params: { q } })
    setRows(data)
  }
  useEffect(()=>{ load() }, [])

  async function add(e){
    e.preventDefault()
    await api.post('/api/accessories', form)
    setForm({ name:'', priceHourly:2, priceDaily:10, photoUrl:'', barcode:'', location:'' })
    await load()
  }

  async function changeStatus(accessoryId, newStatus) {
    try {
      await api.patch(`/api/accessories/${accessoryId}`, { status: newStatus })
      await load() // Ricarica la lista
    } catch (e) {
      alert('Errore nel cambio stato: ' + (e.response?.data?.error || e.message))
    }
  }

  async function viewActiveContract(barcode) {
    try {
      const { data } = await api.get(`/api/contracts/active-by-barcode/${barcode}`)
      alert(`Contratto attivo:\nCliente: ${data.customer?.name}\nTelefono: ${data.customer?.phone}\nInizio: ${new Date(data.startAt).toLocaleString()}`)
    } catch (e) {
      alert('Nessun contratto attivo trovato per questo accessorio')
    }
  }

  async function deleteAccessory(accessoryId, accessoryName) {
    if (!confirm(`Sei sicuro di voler cancellare l'accessorio "${accessoryName}"?\n\nQuesta azione è irreversibile!`)) {
      return
    }
    
    try {
      await api.delete(`/api/accessories/${accessoryId}`)
      alert('Accessorio cancellato con successo!')
      await load() // Ricarica la lista
    } catch (e) {
      alert('Errore nella cancellazione: ' + (e.response?.data?.error || e.message))
    }
  }

  return (
    <div>
      {/* Header con logo */}
      <div style={{marginBottom: '32px'}}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '16px'
        }}>
          <LocationLogo 
            locationName={user?.location?.name || user?.username} 
            size="header"
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              border: '3px solid white'
            }}
          />
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🎒 Gestione Accessori
            </h1>
            <p style={{margin: '4px 0 0 0', color: '#64748b'}}>
              {user?.role === 'superadmin' ? 'Gestisci tutti gli accessori del sistema' : `Gestisci gli accessori di ${user?.username}`}
            </p>
            {user?.location?.name && user?.role !== 'superadmin' && (
              <div style={{
                marginTop: '8px',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                📍 {user.location.name}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Form per aggiungere accessori */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ➕ Aggiungi Nuovo Accessorio
        </h3>
        
        <form onSubmit={add}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: user?.role === 'superadmin' ? 'repeat(2, 1fr)' : '1fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Colonna sinistra - Info base */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Nome Accessorio *
                </label>
                <input
                  placeholder="es. Casco, Lucchetto, Borsa..."
                  value={form.name}
                  onChange={e=>setForm({...form, name:e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Prezzo Orario (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2.00"
                    value={form.priceHourly}
                    onChange={e=>setForm({...form, priceHourly:Number(e.target.value)})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Prezzo Giornaliero (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10.00"
                    value={form.priceDaily}
                    onChange={e=>setForm({...form, priceDaily:Number(e.target.value)})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Barcode (opzionale)
                </label>
                <input
                  placeholder="Lascia vuoto per generazione automatica"
                  value={form.barcode}
                  onChange={e=>setForm({...form, barcode:e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {user?.role === 'superadmin' && (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Location *
                  </label>
                  <select
                    value={form.location || ''}
                    onChange={e=>setForm({...form, location:e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">Seleziona Location</option>
                    {locations.map(loc => (
                      <option key={loc._id} value={loc._id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Colonna destra - Upload immagine */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Foto Accessorio
              </label>
              <ImageUpload
                value={form.photoUrl}
                onChange={(imageData) => setForm({...form, photoUrl: imageData})}
                placeholder="Carica foto dell'accessorio"
                maxSize={3 * 1024 * 1024} // 3MB
                showPreview={true}
                previewSize={120}
              />
            </div>
          </div>

          {/* Pulsante submit */}
          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <button
              type="submit"
              style={{
                padding: '12px 32px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#059669';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#10b981';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              ➕ Aggiungi Accessorio
            </button>
          </div>
        </form>
      </div>

      <div style={{
        display: 'flex', 
        gap: '12px', 
        alignItems: 'center', 
        marginBottom: '16px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <input 
          placeholder="Cerca accessori per nome o barcode" 
          value={q} 
          onChange={e=>setQ(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        />
        <button 
          onClick={load}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          🔍 Cerca
        </button>
      </div>

      <div style={{overflowX: 'auto'}}>
        <table width="100%" cellPadding="8" style={{
          borderCollapse:'collapse',
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{background: '#f8fafc'}}>
              <th style={{textAlign: 'center', fontWeight: '600', color: '#374151', width: '60px'}}>Foto</th>
              <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Nome</th>
              <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>€/h</th>
              <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>€/g</th>
              <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Barcode</th>
              <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Stato</th>
              {user?.role === 'superadmin' && <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Location</th>}
              <th style={{textAlign: 'center', fontWeight: '600', color: '#374151'}}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=> {
              const getStatusColor = (status) => {
                switch(status) {
                  case 'available': return '#10b981';
                  case 'in-use': return '#f59e0b';
                  case 'maintenance': return '#ef4444';
                  case 'loan': return '#8b5cf6';
                  case 'reserved': return '#3b82f6';
                  default: return '#6b7280';
                }
              };

              const getStatusText = (status) => {
                switch(status) {
                  case 'available': return '✅ Disponibile';
                  case 'in-use': return '🔄 In uso';
                  case 'maintenance': return '🔧 Manutenzione';
                  case 'loan': return '🤝 In prestito';
                  case 'reserved': return '📅 Riservato';
                  default: return status;
                }
              };

              return (
                <tr key={r._id} style={{borderTop:'1px solid #e5e7eb'}}>
                  <td style={{textAlign: 'center', padding: '8px'}}>
                    {r.photoUrl ? (
                      <img
                        src={r.photoUrl}
                        alt={r.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '2px solid #e5e7eb',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          // Mostra immagine in grande
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
                            <img src="${r.photoUrl}" alt="${r.name}" style="
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
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        color: '#9ca3af',
                        border: '2px solid #e5e7eb'
                      }}>
                        🎒
                      </div>
                    )}
                  </td>
                  <td style={{fontWeight: '600'}}>{r.name}</td>
                  <td>€{r.priceHourly}</td>
                  <td>€{r.priceDaily}</td>
                  <td style={{fontFamily: 'monospace', fontSize: '14px'}}>{r.barcode}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: getStatusColor(r.status) + '20',
                      color: getStatusColor(r.status)
                    }}>
                      {getStatusText(r.status)}
                    </span>
                  </td>
                  {user?.role === 'superadmin' && <td>{r.location?.name || 'N/A'}</td>}
                  <td style={{textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap'}}>
                      {r.status === 'in-use' && (
                        <button
                          onClick={() => viewActiveContract(r.barcode)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          👁️ Contratto
                        </button>
                      )}
                      
                      <select
                        value={r.status}
                        onChange={(e) => changeStatus(r._id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="available">✅ Disponibile</option>
                        <option value="in-use">🔄 In uso</option>
                        <option value="maintenance">🔧 Manutenzione</option>
                        <option value="loan">🤝 In prestito</option>
                        <option value="reserved">📅 Riservato</option>
                      </select>

                      <button
                        onClick={() => deleteAccessory(r._id, r.name)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginTop: '2px'
                        }}
                        title={`Cancella ${r.name}`}
                      >
                        🗑️ Cancella
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
