import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'
import BikeSwapper from '../Components/BikeSwapper.jsx'
import BarcodeScanner from '../Components/BarcodeScanner.jsx'

export default function BikeSwapManager(){
  const [user, setUser] = useState(null)
  const [activeContracts, setActiveContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState(null)
  const [showSwapper, setShowSwapper] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [swapHistory, setSwapHistory] = useState([])

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
    loadActiveContracts()
    loadSwapHistory()
  }, [])

  const loadActiveContracts = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/api/contracts', {
        params: { 
          status: 'in-use,reserved',
          limit: 100
        }
      })
      setActiveContracts(data)
    } catch (error) {
      console.error('Errore caricamento contratti:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSwapHistory = async () => {
    try {
      const { data } = await api.get('/api/contracts/swap-history', {
        params: { limit: 20 }
      })
      setSwapHistory(data)
    } catch (error) {
      console.error('Errore caricamento storico sostituzioni:', error)
    }
  }

  const handleContractSelect = (contract) => {
    setSelectedContract(contract)
    setShowSwapper(true)
  }

  const handleSwapComplete = () => {
    setShowSwapper(false)
    setSelectedContract(null)
    loadActiveContracts()
    loadSwapHistory()
  }

  const handleBarcodeScanned = async (barcode) => {
    try {
      // Cerca il contratto che contiene questa bici
      const { data } = await api.get(`/api/contracts/active-by-barcode/${barcode}`)
      if (data) {
        setSelectedContract(data)
        setShowSwapper(true)
        setShowBarcodeScanner(false)
      } else {
        alert('❌ Nessun contratto attivo trovato per questo barcode')
      }
    } catch (error) {
      console.error('Errore ricerca contratto:', error)
      alert('❌ Errore nella ricerca del contratto')
    }
  }

  const filteredContracts = activeContracts.filter(contract => 
    contract.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.customer?.phone?.includes(searchTerm) ||
    contract._id?.includes(searchTerm) ||
    contract.items?.some(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const getContractBikes = (contract) => {
    return contract.items?.filter(item => item.kind === 'bike') || []
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'in-use': return '#10b981'
      case 'reserved': return '#f59e0b'
      case 'completed': return '#6b7280'
      default: return '#64748b'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in-use': return 'In Uso'
      case 'reserved': return 'Prenotato'
      case 'completed': return 'Completato'
      default: return status
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        ⏳ Caricamento contratti...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
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
              🔄 Gestione Sostituzioni Bici
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Sostituisci bici in qualsiasi contratto attivo
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            placeholder="🔍 Cerca per cliente, telefono, ID contratto o barcode bici..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
        
        <button
          onClick={() => setShowBarcodeScanner(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
        >
          📱 Scansiona Barcode
        </button>

        <button
          onClick={loadActiveContracts}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          🔄 Aggiorna
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>
            {activeContracts.filter(c => c.status === 'in-use').length}
          </div>
          <div style={{ opacity: 0.9 }}>Contratti In Uso</div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>
            {activeContracts.filter(c => c.status === 'reserved').length}
          </div>
          <div style={{ opacity: 0.9 }}>Prenotazioni</div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>
            {activeContracts.reduce((total, contract) => 
              total + getContractBikes(contract).length, 0
            )}
          </div>
          <div style={{ opacity: 0.9 }}>Bici Totali</div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>
            {swapHistory.length}
          </div>
          <div style={{ opacity: 0.9 }}>Sostituzioni Oggi</div>
        </div>
      </div>

      {/* Contracts List */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          📋 Contratti Attivi ({filteredContracts.length})
        </h2>

        {filteredContracts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
            <h3>Nessun contratto trovato</h3>
            <p>Non ci sono contratti attivi che corrispondono ai criteri di ricerca.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            {filteredContracts.map(contract => {
              const bikes = getContractBikes(contract)
              return (
                <div
                  key={contract._id}
                  style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.boxShadow = 'none'
                  }}
                  onClick={() => handleContractSelect(contract)}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#1e293b'
                      }}>
                        👤 {contract.customer?.name || 'Cliente Sconosciuto'}
                      </h3>
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '14px',
                        color: '#64748b'
                      }}>
                        <span>📞 {contract.customer?.phone || 'N/A'}</span>
                        <span>🆔 #{contract._id?.slice(-8)}</span>
                        <span>📅 {new Date(contract.startDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{
                        background: getStatusColor(contract.status),
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {getStatusLabel(contract.status)}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleContractSelect(contract)
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        🔄 Sostituisci
                      </button>
                    </div>
                  </div>

                  {/* Bikes in contract */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <h4 style={{
                      margin: '0 0 12px 0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      🚴 Bici nel Contratto ({bikes.length})
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '12px'
                    }}>
                      {bikes.map((bike, index) => (
                        <div
                          key={index}
                          style={{
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px',
                            fontSize: '14px'
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            {bike.name}
                          </div>
                          <div style={{ color: '#64748b' }}>
                            📊 {bike.barcode}
                          </div>
                          <div style={{ color: '#64748b' }}>
                            💰 €{bike.priceHourly}/h - €{bike.priceDaily}/g
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Swaps History */}
      {swapHistory.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginTop: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{
            margin: '0 0 24px 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            📊 Sostituzioni Recenti
          </h2>
          
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            {swapHistory.slice(0, 5).map((swap, index) => (
              <div
                key={index}
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    🔄 {swap.oldBike?.name} → {swap.newBike?.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>
                    Cliente: {swap.contract?.customer?.name} • Motivo: {swap.reason}
                  </div>
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  {new Date(swap.swapDate).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '24px' }}>📱 Scansiona Barcode Bici</h3>
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              placeholder="Scansiona il barcode di una bici nel contratto"
            />
            <button
              onClick={() => setShowBarcodeScanner(false)}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Bike Swapper Modal */}
      {showSwapper && selectedContract && (
        <BikeSwapper
          contract={selectedContract}
          onSwapComplete={handleSwapComplete}
          onClose={() => {
            setShowSwapper(false)
            setSelectedContract(null)
          }}
        />
      )}
    </div>
  )
}