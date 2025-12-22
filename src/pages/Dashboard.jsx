import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function Dashboard(){
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [superadminStats, setSuperadminStats] = useState(null)
  const [user, setUser] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [activeContracts, setActiveContracts] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [systemInfo, setSystemInfo] = useState(null)

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

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

  const loadData = async () => {
    if(!user) return
    
    setLoading(true)
    try{
      if(user.role === 'superadmin') {
        // Carica statistiche superadmin
        try {
          const { data } = await api.get('/api/reports/superadmin-stats')
          setSuperadminStats(data)
        } catch (error) {
          console.error('Errore caricamento stats superadmin:', error)
          // Fallback per superadmin
          setSuperadminStats({
            totals: { revenue: 0, closedContracts: 0, activeContracts: 0, totalContracts: 0 },
            locations: []
          })
        }
      } else {
        // Carica summary normale per admin location
        try {
          const { data } = await api.get('/api/reports/summary')
          setSummary(data)
        } catch (error) {
          console.error('Errore caricamento summary:', error)
          // Fallback per admin
          setSummary({ total: 0, count: 0 })
        }
      }
      
      // Carica contratti attivi
      try {
        const contractsResponse = await api.get('/api/contracts', {
          params: { status: 'in-use', limit: 10 }
        })
        setActiveContracts(contractsResponse.data || [])
      } catch (error) {
        console.error('Errore caricamento contratti attivi:', error)
        setActiveContracts([])
      }

      // Carica informazioni di sistema
      try {
        const systemResponse = await api.get('/api/system/info')
        setSystemInfo(systemResponse.data)
      } catch (error) {
        console.error('Errore caricamento info sistema:', error)
        setSystemInfo({
          uptime: 'N/A',
          version: '1.0.0',
          status: 'online'
        })
      }
      
      setLastUpdate(new Date())
      showNotification('✅ Dati aggiornati con successo', 'success')
    }catch(e){
      console.error('Errore generale caricamento dati:', e)
      showNotification('❌ Errore durante il caricamento dei dati', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    if(user) {
      loadData()
    }
  }, [user])

  // Auto-refresh ogni 30 secondi
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(() => {
      loadData()
    }, 30000) // 30 secondi

    return () => clearInterval(interval)
  }, [autoRefresh, user])

  // Gestione tasti di scelta rapida
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Solo se non stiamo scrivendo in un input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
      
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'r':
            event.preventDefault()
            loadData()
            showNotification('🔄 Dati aggiornati manualmente', 'info')
            break
          case '1':
            event.preventDefault()
            navigate('/contracts')
            break
          case '2':
            event.preventDefault()
            navigate('/contract-manager')
            break
          case '3':
            event.preventDefault()
            navigate('/bikes')
            break
          case '4':
            event.preventDefault()
            navigate('/reports')
            break
          default:
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [navigate])

  if(!user) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{color: '#6b7280'}}>Caricamento dashboard...</p>
    </div>
  )

  return (
    <div style={{
      padding: '24px',
      background: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Header */}
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
          <div style={{flex: 1}}>
            <h1 style={{
              margin: 0,
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              📊 Dashboard
              {user.role === 'superadmin' && <span style={{fontSize: '1.5rem'}}>👑</span>}
            </h1>
            <p style={{margin: '4px 0 0 0', color: '#64748b', fontSize: '16px'}}>
              {user.role === 'superadmin' 
                ? 'Panoramica completa di tutti i punti noleggio' 
                : `Benvenuto ${user.username} - Gestisci la tua location`
              }
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
          
          {/* Controlli */}
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
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: autoRefresh ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {autoRefresh ? '🔄 Auto-refresh' : '⏸️ Manuale'}
            </button>
            
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: loading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
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
                <>
                  🔄 Aggiorna Ora
                  <span style={{
                    fontSize: '10px',
                    opacity: '0.7',
                    marginLeft: '8px'
                  }}>
                    Ctrl+R
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Azioni Rapide */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => navigate('/contracts')}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          📝 Nuovo Contratto
          <span style={{
            fontSize: '10px',
            opacity: '0.7',
            marginLeft: '8px'
          }}>
            Ctrl+1
          </span>
        </button>

        <button
          onClick={() => navigate('/contract-manager')}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          ⚙️ Gestisci Contratti
          <span style={{
            fontSize: '10px',
            opacity: '0.7',
            marginLeft: '8px'
          }}>
            Ctrl+2
          </span>
        </button>

        <button
          onClick={() => navigate('/bikes')}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}
        >
          🚲 Gestisci Bici
          <span style={{
            fontSize: '10px',
            opacity: '0.7',
            marginLeft: '8px'
          }}>
            Ctrl+3
          </span>
        </button>

        <button
          onClick={() => navigate('/reports')}
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}
        >
          📈 Report
          <span style={{
            fontSize: '10px',
            opacity: '0.7',
            marginLeft: '8px'
          }}>
            Ctrl+4
          </span>
        </button>
      </div>

      {/* Statistiche Principali */}
      {(summary || superadminStats) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Fatturato */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '4rem',
              opacity: '0.2'
            }}>💰</div>
            <div style={{fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px'}}>
              €{user.role === 'superadmin' 
                ? superadminStats?.totals?.revenue?.toFixed(2) || '0.00'
                : summary?.total?.toFixed(2) || '0.00'
              }
            </div>
            <div style={{fontSize: '16px', opacity: '0.9'}}>Fatturato Totale</div>
            <div style={{fontSize: '12px', opacity: '0.7', marginTop: '4px'}}>
              {user.role === 'superadmin' ? 'Tutti i punti noleggio' : 'Questa location'}
            </div>
          </div>

          {/* Contratti Attivi */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '4rem',
              opacity: '0.2'
            }}>🔄</div>
            <div style={{fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px'}}>
              {user.role === 'superadmin' 
                ? superadminStats?.totals?.activeContracts || '0'
                : activeContracts?.length || '0'
              }
            </div>
            <div style={{fontSize: '16px', opacity: '0.9'}}>Contratti Attivi</div>
            <div style={{fontSize: '12px', opacity: '0.7', marginTop: '4px'}}>
              In corso ora
            </div>
          </div>

          {/* Contratti Chiusi */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '4rem',
              opacity: '0.2'
            }}>✅</div>
            <div style={{fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px'}}>
              {user.role === 'superadmin' 
                ? superadminStats?.totals?.closedContracts || '0'
                : summary?.count || '0'
              }
            </div>
            <div style={{fontSize: '16px', opacity: '0.9'}}>Contratti Chiusi</div>
            <div style={{fontSize: '12px', opacity: '0.7', marginTop: '4px'}}>
              Completati
            </div>
          </div>

          {/* Media per Contratto */}
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '4rem',
              opacity: '0.2'
            }}>📊</div>
            <div style={{fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px'}}>
              €{(() => {
                if (user.role === 'superadmin') {
                  const total = superadminStats?.totals?.revenue || 0;
                  const count = superadminStats?.totals?.closedContracts || 0;
                  return count > 0 ? (total / count).toFixed(2) : '0.00';
                } else {
                  const total = summary?.total || 0;
                  const count = summary?.count || 0;
                  return count > 0 ? (total / count).toFixed(2) : '0.00';
                }
              })()}
            </div>
            <div style={{fontSize: '16px', opacity: '0.9'}}>Media/Contratto</div>
            <div style={{fontSize: '12px', opacity: '0.7', marginTop: '4px'}}>
              Valore medio
            </div>
          </div>
        </div>
      )}

      {/* Contratti Attivi in Tempo Reale */}
      {activeContracts.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🔄 Contratti Attivi in Tempo Reale
            <span style={{
              background: '#f59e0b',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {activeContracts.length}
            </span>
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {activeContracts.slice(0, 6).map(contract => (
              <div 
                key={contract._id} 
                onClick={() => navigate('/contract-manager')}
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                  e.target.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.borderColor = '#e2e8f0'
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
                      fontSize: '16px',
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      👤 {contract.customer?.name || 'N/A'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '8px'
                    }}>
                      📞 {contract.customer?.phone || 'N/A'}
                    </div>
                  </div>
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    €{contract.totalPrice?.toFixed(2) || '0.00'}
                  </div>
                </div>
                
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  🕐 Inizio: {new Date(contract.startAt).toLocaleString('it-IT')}
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#374151'
                  }}>
                    📦 {contract.items?.length || 0} articoli
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#3b82f6',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    👆 Clicca per dettagli
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {activeContracts.length > 6 && (
            <div style={{
              textAlign: 'center',
              marginTop: '16px',
              padding: '12px',
              background: '#f1f5f9',
              borderRadius: '8px',
              color: '#64748b',
              fontSize: '14px'
            }}>
              ... e altri {activeContracts.length - 6} contratti attivi
            </div>
          )}
        </div>
      )}

      {/* Statistiche per Location (Solo Superadmin) */}
      {user.role === 'superadmin' && superadminStats?.locations && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🏢 Statistiche per Punto Noleggio
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {superadminStats.locations.map(locationStat => (
              <div key={locationStat.location._id} style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '2px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <LocationLogo 
                    locationName={locationStat.location.name} 
                    size="small"
                    style={{
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1e293b'
                    }}>
                      {locationStat.location.name}
                    </h3>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Punto Noleggio
                    </p>
                  </div>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  <div style={{textAlign: 'center', padding: '12px', background: 'white', borderRadius: '8px'}}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#10b981',
                      marginBottom: '4px'
                    }}>
                      €{locationStat.revenue.toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      💰 Fatturato
                    </div>
                  </div>
                  
                  <div style={{textAlign: 'center', padding: '12px', background: 'white', borderRadius: '8px'}}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#3b82f6',
                      marginBottom: '4px'
                    }}>
                      {locationStat.closedContracts}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      ✅ Contratti
                    </div>
                  </div>
                  
                  <div style={{textAlign: 'center', padding: '12px', background: 'white', borderRadius: '8px'}}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#f59e0b',
                      marginBottom: '4px'
                    }}>
                      {locationStat.activeContracts}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      🔄 Attivi
                    </div>
                  </div>
                  
                  <div style={{textAlign: 'center', padding: '12px', background: 'white', borderRadius: '8px'}}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#8b5cf6',
                      marginBottom: '4px'
                    }}>
                      €{locationStat.closedContracts > 0 ? (locationStat.revenue / locationStat.closedContracts).toFixed(2) : '0.00'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      📊 Media
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informazioni di Sistema */}
      {systemInfo && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🖥️ Stato del Sistema
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '8px'
              }}>
                {systemInfo.status === 'online' ? '🟢' : '🔴'}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                Stato Server
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                textTransform: 'capitalize'
              }}>
                {systemInfo.status || 'Online'}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '8px'
              }}>
                ⏱️
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                Uptime
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {systemInfo.uptime || 'N/A'}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '8px'
              }}>
                📦
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                Versione
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                v{systemInfo.version || '1.0.0'}
              </div>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '8px'
              }}>
                🔄
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '4px'
              }}>
                Auto-refresh
              </div>
              <div style={{
                fontSize: '12px',
                color: autoRefresh ? '#10b981' : '#6b7280',
                fontWeight: '600'
              }}>
                {autoRefresh ? 'Attivo' : 'Disattivo'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!summary && !superadminStats && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
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
          <p style={{color: '#6b7280', fontSize: '16px'}}>Caricamento statistiche...</p>
        </div>
      )}

      {/* Sistema di Notifiche */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: '8px',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          background: notification.type === 'success' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : notification.type === 'error'
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          animation: 'fadeIn 0.3s ease-out',
          cursor: 'pointer'
        }}
        onClick={() => setNotification(null)}
        >
          {notification.message}
        </div>
      )}
    </div>
  )
}