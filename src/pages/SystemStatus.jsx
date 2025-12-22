import React, { useState, useEffect } from 'react'
import { api } from '../services/api.js'
import LocationLogo from '../Components/LocationLogo.jsx'
import { jwtDecode } from 'jwt-decode'

const SystemStatus = () => {
  const [user, setUser] = useState(null)
  const [systemInfo, setSystemInfo] = useState({
    bikes: { total: 0, available: 0, inUse: 0, maintenance: 0 },
    accessories: { total: 0, available: 0, inUse: 0, maintenance: 0 },
    contracts: { active: 0, completed: 0, reserved: 0 },
    lastUpdate: new Date().toISOString()
  })

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
    loadSystemInfo()
  }, [])

  const loadSystemInfo = async () => {
    try {
      // Carica statistiche bici
      const bikesResponse = await api.get('/api/bikes')
      const bikes = bikesResponse.data || []
      
      // Carica statistiche accessori
      const accessoriesResponse = await api.get('/api/accessories')
      const accessories = accessoriesResponse.data || []
      
      // Carica statistiche contratti
      const contractsResponse = await api.get('/api/contracts')
      const contracts = contractsResponse.data || []

      setSystemInfo({
        bikes: {
          total: bikes.length,
          available: bikes.filter(b => b.status === 'available').length,
          inUse: bikes.filter(b => b.status === 'in-use').length,
          maintenance: bikes.filter(b => b.status === 'maintenance').length
        },
        accessories: {
          total: accessories.length,
          available: accessories.filter(a => a.status === 'available').length,
          inUse: accessories.filter(a => a.status === 'in-use').length,
          maintenance: accessories.filter(a => a.status === 'maintenance').length
        },
        contracts: {
          active: contracts.filter(c => c.status === 'in-use').length,
          completed: contracts.filter(c => c.status === 'completed').length,
          reserved: contracts.filter(c => c.status === 'reserved').length
        },
        lastUpdate: new Date().toISOString()
      })
    } catch (error) {
      console.error('Errore caricamento statistiche:', error)
    }
  }

  const improvements = [
    {
      title: '🔫 Scanner Barcode Automatico',
      description: 'Gestione automatica dell\'asterisco (*) delle pistole barcode',
      status: 'completed',
      details: [
        'Riconoscimento automatico del carattere terminatore',
        'Inserimento immediato senza premere invio',
        'Feedback visivo e sonoro per conferma',
        'Compatibile con tutte le pistole barcode standard'
      ]
    },
    {
      title: '📷 Webcam Ottimizzata',
      description: 'Layout fisso e migliorato per cattura documenti',
      status: 'completed',
      details: [
        'Spazio fisso per evitare spostamenti del layout',
        'Anteprima live con overlay guida per documenti',
        'Pulsanti migliorati con effetti hover',
        'Supporto sia webcam che upload file'
      ]
    },
    {
      title: '💰 Calcolatore Prezzi Intelligente',
      description: 'Sistema automatico di calcolo prezzi ottimizzato',
      status: 'completed',
      details: [
        'Scelta automatica della tariffa più conveniente',
        'Assicurazione per singolo articolo',
        'Visualizzazione chiara di subtotale e totale',
        'Integrazione date nel calcolatore'
      ]
    },
    {
      title: '📋 Contratti Ottimizzati',
      description: 'Processo step-by-step per creazione contratti',
      status: 'completed',
      details: [
        'Wizard a 4 step con progress indicator',
        'Scanner sempre visibile per efficienza',
        'Salvataggio foto documenti nel contratto',
        'Validazione intelligente dei dati'
      ]
    },
    {
      title: '🚲 Gestione Bici Avanzata',
      description: 'Dashboard ottimizzata per gestione biciclette',
      status: 'completed',
      details: [
        'Statistiche in tempo reale',
        'Filtri avanzati per stato e ricerca',
        'Azioni rapide per cambio stato',
        'Layout responsive e moderno'
      ]
    },
    {
      title: '🏢 Logo Location Dinamico',
      description: 'Sistema di loghi personalizzati per location',
      status: 'completed',
      details: [
        'Logo Campo Sportivo aggiornato',
        'Fallback automatico con emoji',
        'Dimensioni responsive',
        'Supporto per nuove location'
      ]
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'in-progress': return '#f59e0b'
      case 'planned': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return '✅ Completato'
      case 'in-progress': return '🔄 In Corso'
      case 'planned': return '📋 Pianificato'
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
              📊 Stato Sistema
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Panoramica completa del sistema e miglioramenti implementati
            </p>
          </div>
        </div>
      </div>

      {/* Statistiche Sistema */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          📈 Statistiche in Tempo Reale
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {/* Bici */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚲</div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {systemInfo.bikes.total}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Biciclette Totali</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
              {systemInfo.bikes.available} disponibili • {systemInfo.bikes.inUse} in uso
            </div>
          </div>

          {/* Accessori */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎒</div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {systemInfo.accessories.total}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Accessori Totali</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
              {systemInfo.accessories.available} disponibili • {systemInfo.accessories.inUse} in uso
            </div>
          </div>

          {/* Contratti */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              {systemInfo.contracts.active}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Contratti Attivi</div>
            <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.8 }}>
              {systemInfo.contracts.reserved} prenotazioni • {systemInfo.contracts.completed} completati
            </div>
          </div>

          {/* Ultimo Aggiornamento */}
          <div style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Aggiornato
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {new Date(systemInfo.lastUpdate).toLocaleTimeString('it-IT')}
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
              {new Date(systemInfo.lastUpdate).toLocaleDateString('it-IT')}
            </div>
          </div>
        </div>
      </div>

      {/* Miglioramenti Implementati */}
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
          🚀 Miglioramenti Implementati
        </h3>
        
        <div style={{
          display: 'grid',
          gap: '20px'
        }}>
          {improvements.map((improvement, index) => (
            <div key={index} style={{
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = getStatusColor(improvement.status)
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = `0 8px 25px ${getStatusColor(improvement.status)}20`
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e5e7eb'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = 'none'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    {improvement.title}
                  </h4>
                  <p style={{
                    margin: '0',
                    fontSize: '14px',
                    color: '#6b7280',
                    lineHeight: '1.5'
                  }}>
                    {improvement.description}
                  </p>
                </div>
                
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: `${getStatusColor(improvement.status)}20`,
                  color: getStatusColor(improvement.status),
                  fontSize: '12px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  marginLeft: '16px'
                }}>
                  {getStatusText(improvement.status)}
                </div>
              </div>
              
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h5 style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  📋 Dettagli Implementazione:
                </h5>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: '#6b7280'
                }}>
                  {improvement.details.map((detail, detailIndex) => (
                    <li key={detailIndex} style={{
                      fontSize: '13px',
                      lineHeight: '1.5',
                      marginBottom: '4px'
                    }}>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Azioni Rapide */}
      <div style={{
        marginTop: '32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <button
          onClick={loadSystemInfo}
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          🔄 Aggiorna Statistiche
        </button>
        
        <button
          onClick={() => window.location.href = '/bikes-optimized'}
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          🚲 Gestione Bici
        </button>
        
        <button
          onClick={() => window.location.href = '/contracts-optimized'}
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}
        >
          📋 Nuovi Contratti
        </button>
        
        <button
          onClick={() => window.location.href = '/pricing-test'}
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}
        >
          🧮 Test Pricing
        </button>
      </div>
    </div>
  )
}

export default SystemStatus