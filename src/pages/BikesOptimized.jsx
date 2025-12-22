import React, { useState, useEffect } from 'react'
import { api } from '../services/api.js'
import BarcodeToItemScanner from '../Components/BarcodeToItemScanner.jsx'
import LocationLogo from '../Components/LocationLogo.jsx'
import { jwtDecode } from 'jwt-decode'

export default function BikesOptimized() {
  const [bikes, setBikes] = useState([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
      } catch (e) {
        console.error('Errore decodifica token:', e)
      }
    }
    loadBikes()
  }, [])

  const loadBikes = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/bikes')
      setBikes(response.data || [])
    } catch (error) {
      console.error('Errore caricamento bici:', error)
      alert('❌ Errore nel caricamento delle bici')
    } finally {
      setLoading(false)
    }
  }

  const handleItemScanned = (item) => {
    // Aggiorna lo stato della bici se è stata scansionata
    if (item.kind === 'bike') {
      setBikes(prev => prev.map(bike => 
        bike._id === item.id 
          ? { ...bike, lastScanned: new Date().toISOString() }
          : bike
      ))
      
      // Mostra notifica di successo
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
          🚲 Bici scansionata: ${item.name}
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
  }

  const updateBikeStatus = async (bikeId, newStatus) => {
    try {
      await api.put(`/api/bikes/${bikeId}`, { status: newStatus })
      setBikes(prev => prev.map(bike => 
        bike._id === bikeId ? { ...bike, status: newStatus } : bike
      ))
      alert(`✅ Stato bici aggiornato a: ${newStatus}`)
    } catch (error) {
      console.error('Errore aggiornamento stato:', error)
      alert('❌ Errore nell\'aggiornamento dello stato')
    }
  }

  const filteredBikes = bikes.filter(bike => {
    const matchesSearch = bike.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bike.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || bike.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981'
      case 'in-use': return '#f59e0b'
      case 'maintenance': return '#ef4444'
      case 'reserved': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return '✅ Disponibile'
      case 'in-use': return '🚴 In Uso'
      case 'maintenance': return '🔧 Manutenzione'
      case 'reserved': return '📅 Prenotata'
      default: return '❓ Sconosciuto'
    }
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
              🚲 Gestione Bici Ottimizzata
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Scanner rapido e gestione avanzata delle biciclette
            </p>
          </div>
        </div>
      </div>

      {/* Scanner Barcode */}
      <BarcodeToItemScanner 
        onItemScanned={handleItemScanned}
        loading={loading}
      />

      {/* Filtri e Ricerca */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="🔍 Cerca per nome o barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">🔍 Tutti gli stati</option>
            <option value="available">✅ Disponibili</option>
            <option value="in-use">🚴 In Uso</option>
            <option value="maintenance">🔧 Manutenzione</option>
            <option value="reserved">📅 Prenotate</option>
          </select>
        </div>
      </div>

      {/* Statistiche Rapide */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Totale', count: bikes.length, color: '#6b7280', icon: '🚲' },
          { label: 'Disponibili', count: bikes.filter(b => b.status === 'available').length, color: '#10b981', icon: '✅' },
          { label: 'In Uso', count: bikes.filter(b => b.status === 'in-use').length, color: '#f59e0b', icon: '🚴' },
          { label: 'Manutenzione', count: bikes.filter(b => b.status === 'maintenance').length, color: '#ef4444', icon: '🔧' }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: `2px solid ${stat.color}20`
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: stat.color, marginBottom: '4px' }}>
              {stat.count}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Lista Bici */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          📋 Elenco Bici ({filteredBikes.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#6b7280' }}>Caricamento bici...</p>
          </div>
        ) : filteredBikes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>🚲</div>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>
              {searchTerm || statusFilter !== 'all' ? 'Nessuna bici trovata con i filtri attuali' : 'Nessuna bici disponibile'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {filteredBikes.map((bike) => (
              <div key={bike._id} style={{
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = getStatusColor(bike.status)
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = `0 8px 25px ${getStatusColor(bike.status)}20`
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  {bike.image ? (
                    <img
                      src={bike.image}
                      alt={bike.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        objectFit: 'cover'
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
                      🚲
                    </div>
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      {bike.name}
                    </h4>
                    <p style={{
                      margin: '0',
                      fontSize: '14px',
                      color: '#6b7280',
                      fontFamily: 'monospace'
                    }}>
                      📊 {bike.barcode}
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: `${getStatusColor(bike.status)}20`,
                    color: getStatusColor(bike.status),
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {getStatusText(bike.status)}
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    💰 €{bike.priceHourly}/h - €{bike.priceDaily}/g
                  </div>
                </div>

                {/* Azioni rapide */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {bike.status !== 'available' && (
                    <button
                      onClick={() => updateBikeStatus(bike._id, 'available')}
                      style={{
                        padding: '6px 12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      ✅ Rendi Disponibile
                    </button>
                  )}
                  
                  {bike.status !== 'maintenance' && (
                    <button
                      onClick={() => updateBikeStatus(bike._id, 'maintenance')}
                      style={{
                        padding: '6px 12px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      🔧 Manutenzione
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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