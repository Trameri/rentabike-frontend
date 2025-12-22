import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import LocationLogo from '../Components/LocationLogo.jsx'
import DataExporter from '../Components/DataExporter.jsx'
import { jwtDecode } from 'jwt-decode'

export default function Reports(){
  const [from,setFrom] = useState('')
  const [to,setTo] = useState('')
  const [sum,setSum] = useState(null)
  const [user, setUser] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detailedStats, setDetailedStats] = useState(null)
  const [topBikes, setTopBikes] = useState([])
  const [revenueByDay, setRevenueByDay] = useState([])
  const [filterType, setFilterType] = useState('all')

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

  async function load(){
    setLoading(true)
    try {
      // Carica summary principale
      const { data } = await api.get('/api/reports/summary', { params: { from, to, type: filterType } })
      setSum(data)
      
      // Carica statistiche dettagliate
      try {
        const detailedResponse = await api.get('/api/reports/detailed-stats', { params: { from, to } })
        setDetailedStats(detailedResponse.data)
      } catch (error) {
        console.error('Errore caricamento statistiche dettagliate:', error)
        setDetailedStats(null)
      }
      
      // Carica top bici
      try {
        const topBikesResponse = await api.get('/api/reports/top-bikes', { params: { from, to, limit: 5 } })
        setTopBikes(topBikesResponse.data || [])
      } catch (error) {
        console.error('Errore caricamento top bici:', error)
        setTopBikes([])
      }
      
      // Carica ricavi per giorno
      try {
        const revenueResponse = await api.get('/api/reports/revenue-by-day', { params: { from, to } })
        setRevenueByDay(revenueResponse.data || [])
      } catch (error) {
        console.error('Errore caricamento ricavi giornalieri:', error)
        setRevenueByDay([])
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Errore caricamento report:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])

  // Auto-refresh ogni 60 secondi per i report (se abilitato)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      load()
    }, 60000) // 60 secondi

    return () => clearInterval(interval)
  }, [autoRefresh, from, to])

  const setQuickDateRange = (days) => {
    const today = new Date()
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
    setFrom(startDate.toISOString().split('T')[0])
    setTo(today.toISOString().split('T')[0])
  }

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header con logo */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
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
          <div style={{ flex: 1 }}>
            <h1 style={{
              margin: 0,
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              📈 Report e Statistiche
            </h1>
            <p style={{margin: '4px 0 0 0', color: '#64748b', fontSize: '16px'}}>
              {user?.role === 'superadmin' ? 'Visualizza report di tutte le location' : `Report e statistiche di ${user?.username}`}
            </p>
            {user?.location?.name && user?.role !== 'superadmin' && (
              <div style={{
                marginTop: '8px',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
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
          
          {/* Controlli Auto-refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
              {lastUpdate && (
                <>
                  <div>Ultimo aggiornamento:</div>
                  <div style={{fontWeight: '600'}}>{lastUpdate.toLocaleTimeString('it-IT')}</div>
                </>
              )}
            </div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                padding: '8px 16px',
                background: autoRefresh ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {autoRefresh ? '🔄 Auto-refresh' : '⏸️ Manuale'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Filtri e controlli */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>Da:</label>
            <input 
              type="date" 
              value={from} 
              onChange={e=>setFrom(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>A:</label>
            <input 
              type="date" 
              value={to} 
              onChange={e=>setTo(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'white'
            }}
          >
            <option value="all">📊 Tutti i Ricavi</option>
            <option value="bikes">🚲 Solo Bici</option>
            <option value="accessories">🎒 Solo Accessori</option>
          </select>
          
          <button 
            onClick={load}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Caricamento...
              </>
            ) : (
              '🔄 Aggiorna Report'
            )}
          </button>
        </div>

        {/* Pulsanti date rapide */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              setFrom(today)
              setTo(today)
            }}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            📅 Oggi
          </button>
          
          <button
            onClick={() => setQuickDateRange(7)}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            📆 Ultima Settimana
          </button>

          <button
            onClick={() => setQuickDateRange(30)}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            📅 Ultimo Mese
          </button>

          <button
            onClick={() => setQuickDateRange(90)}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            📊 Ultimi 3 Mesi
          </button>
        </div>
      </div>

      {/* Riepilogo Finanziario */}
      {sum && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0', 
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px'
          }}>
            💰 Riepilogo Finanziario
          </h3>
          
          <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px'
          }}>
            {/* Totale Incassato */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                fontSize: '60px',
                opacity: 0.2
              }}>💰</div>
              <div style={{
                fontSize: '2rem', 
                fontWeight: '700', 
                marginBottom: '8px',
                position: 'relative',
                zIndex: 2
              }}>
                €{sum.total.toFixed(2)}
              </div>
              <div style={{
                fontSize: '14px', 
                opacity: '0.9',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Totale Incassato
              </div>
            </div>
            
            {/* Contratti Chiusi */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                fontSize: '60px',
                opacity: 0.2
              }}>📋</div>
              <div style={{
                fontSize: '2rem', 
                fontWeight: '700', 
                marginBottom: '8px',
                position: 'relative',
                zIndex: 2
              }}>
                {sum.count}
              </div>
              <div style={{
                fontSize: '14px', 
                opacity: '0.9',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Contratti Chiusi
              </div>
            </div>
            
            {/* Media per Contratto */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                fontSize: '60px',
                opacity: 0.2
              }}>📊</div>
              <div style={{
                fontSize: '2rem', 
                fontWeight: '700', 
                marginBottom: '8px',
                position: 'relative',
                zIndex: 2
              }}>
                €{sum.count > 0 ? (sum.total / sum.count).toFixed(2) : '0.00'}
              </div>
              <div style={{
                fontSize: '14px', 
                opacity: '0.9',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Media/Contratto
              </div>
            </div>
            
            {/* Contratti Attivi */}
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                fontSize: '60px',
                opacity: 0.2
              }}>🔄</div>
              <div style={{
                fontSize: '2rem', 
                fontWeight: '700', 
                marginBottom: '8px',
                position: 'relative',
                zIndex: 2
              }}>
                {sum.activeContracts || 0}
              </div>
              <div style={{
                fontSize: '14px', 
                opacity: '0.9',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Contratti Attivi
              </div>
            </div>

            {/* Media Giornaliera */}
            {from && to && (
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '12px',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '60px',
                  opacity: 0.2
                }}>📅</div>
                <div style={{
                  fontSize: '2rem', 
                  fontWeight: '700', 
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  €{(() => {
                    const fromDate = new Date(from);
                    const toDate = new Date(to);
                    const diffTime = Math.abs(toDate - fromDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                    return (sum.total / diffDays).toFixed(2);
                  })()}
                </div>
                <div style={{
                  fontSize: '14px', 
                  opacity: '0.9',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Media/Giorno
                </div>
              </div>
            )}

            {/* Statistiche Bici */}
            {sum.totalBikes !== undefined && (
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                borderRadius: '12px',
                color: 'white',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '60px',
                  opacity: 0.2
                }}>🚲</div>
                <div style={{
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {sum.availableBikes}/{sum.totalBikes}
                </div>
                <div style={{
                  fontSize: '14px', 
                  opacity: '0.9',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Bici Disponibili
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Bici più Noleggiate */}
      {topBikes.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🏆 Top 5 Bici più Noleggiate
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {topBikes.map((bike, index) => (
              <div key={`${bike.name}_${bike.barcode}`} style={{
                background: `linear-gradient(135deg, ${
                  index === 0 ? '#fbbf24 0%, #f59e0b 100%' :
                  index === 1 ? '#9ca3af 0%, #6b7280 100%' :
                  index === 2 ? '#cd7c2f 0%, #92400e 100%' :
                  '#e5e7eb 0%, #d1d5db 100%'
                })`,
                color: index < 3 ? 'white' : '#374151',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  fontSize: '28px'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                </div>
                
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  marginBottom: '12px',
                  paddingRight: '40px'
                }}>
                  🚲 {bike.name || `Bici ${bike.barcode}`}
                </div>
                
                <div style={{
                  fontSize: '14px',
                  opacity: '0.9',
                  marginBottom: '8px'
                }}>
                  📊 {bike.rentals} noleggi
                </div>
                
                <div style={{
                  fontSize: '14px',
                  opacity: '0.9'
                }}>
                  💰 €{bike.revenue?.toFixed(2) || '0.00'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiche Dettagliate */}
      {detailedStats && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📈 Statistiche Avanzate
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {/* Durata Media */}
            {detailedStats.averageDuration > 0 && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏱️</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '4px'
                }}>
                  {detailedStats.averageDuration.toFixed(1)}h
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Durata Media
                </div>
              </div>
            )}

            {/* Totale Items */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                {detailedStats.totalItems}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Totale Items
              </div>
            </div>

            {/* Noleggi Bici */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚲</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                {detailedStats.bikeRentals}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Noleggi Bici
              </div>
            </div>

            {/* Noleggi Accessori */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎒</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                {detailedStats.accessoryRentals}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Noleggi Accessori
              </div>
            </div>

            {/* Ricavi Assicurazioni */}
            {detailedStats.insuranceRevenue > 0 && (
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛡️</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '4px'
                }}>
                  €{detailedStats.insuranceRevenue.toFixed(2)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Ricavi Assicurazioni
                </div>
              </div>
            )}

            {/* Valore Medio Contratto */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💎</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                €{detailedStats.averageContractValue.toFixed(2)}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Valore Medio
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ricavi per Giorno */}
      {revenueByDay.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📊 Ricavi Giornalieri
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {revenueByDay.map(day => (
              <div key={day.date} style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  📅 {new Date(day.date).toLocaleDateString('it-IT')}
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#10b981',
                  marginBottom: '4px'
                }}>
                  €{day.revenue.toFixed(2)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {day.contracts} contratti
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Data */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          📤 Esporta Dati
        </h3>
        
        <DataExporter 
          data={sum?.contracts || []}
          filename={`report_${from || 'all'}_${to || 'all'}`}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        />
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