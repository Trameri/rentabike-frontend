import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function ContractHistory(){
  const [contracts, setContracts] = useState([])
  const [filters, setFilters] = useState({
    customer: '',
    barcode: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    location: ''
  })
  const [user, setUser] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)

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

  async function loadContracts() {
    setLoading(true)
    try {
      const params = {}
      if (filters.customer) params.customer = filters.customer
      if (filters.barcode) params.barcode = filters.barcode
      if (filters.dateFrom) params.dateFrom = filters.dateFrom
      if (filters.dateTo) params.dateTo = filters.dateTo
      if (filters.status) params.status = filters.status
      if (filters.location) params.location = filters.location

      const { data } = await api.get('/api/contracts/history', { params })
      setContracts(data)
    } catch (e) {
      console.error('Errore caricamento contratti:', e)
      alert('Errore nel caricamento dei contratti')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContracts()
  }, [])

  const getStatusColor = (status) => {
    switch(status) {
      case 'in-use': return '#f59e0b';
      case 'closed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'reserved': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'in-use': return '🔄 In uso';
      case 'closed': return '✅ Chiuso';
      case 'cancelled': return '❌ Annullato';
      case 'reserved': return '📅 Riservato';
      default: return status;
    }
  };

  // Funzioni per gestire le azioni sui contratti
  const viewContract = async (contractId) => {
    try {
      const { data } = await api.get(`/api/contracts/${contractId}`)
      alert(`Contratto ID: ${contractId}\nCliente: ${data.customer?.name}\nStato: ${data.status}\nTotale: €${data.totals?.grandTotal?.toFixed(2) || '0.00'}`)
    } catch (e) {
      console.error('Errore visualizzazione contratto:', e)
      alert('Errore nel caricamento del contratto')
    }
  }

  const closeContract = async (contractId) => {
    if (!confirm('Sei sicuro di voler chiudere questo contratto?')) return
    
    try {
      await api.put(`/api/contracts/${contractId}/close`, {
        endAt: new Date(),
        markPaid: true
      })
      alert('Contratto chiuso con successo!')
      loadContracts() // Ricarica la lista
    } catch (e) {
      console.error('Errore chiusura contratto:', e)
      alert('Errore nella chiusura del contratto')
    }
  }

  const printContract = (contractId) => {
    // Apri la pagina di stampa del contratto in una nuova finestra
    window.open(`/print-contract/${contractId}`, '_blank')
  }

  const deleteContract = async (contractId) => {
    if (!confirm('ATTENZIONE: Sei sicuro di voler eliminare definitivamente questo contratto?\nQuesta azione non può essere annullata!')) return
    
    try {
      await api.delete(`/api/contracts/${contractId}`)
      alert('Contratto eliminato con successo!')
      loadContracts() // Ricarica la lista
    } catch (e) {
      console.error('Errore eliminazione contratto:', e)
      alert('Errore nell\'eliminazione del contratto')
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
              📚 Storico Contratti
            </h1>
            <p style={{margin: '4px 0 0 0', color: '#64748b'}}>
              {user?.role === 'superadmin' ? 'Visualizza tutti i contratti del sistema' : `Storico contratti di ${user?.username}`}
            </p>
            {user?.location?.name && user?.role !== 'superadmin' && (
              <div style={{
                marginTop: '8px',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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

      {/* Filtri di ricerca */}
      <div style={{
        background: '#f8fafc',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{margin: '0 0 16px 0', color: '#374151'}}>🔍 Filtri di Ricerca</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <input
            placeholder="Nome cliente"
            value={filters.customer}
            onChange={e => setFilters({...filters, customer: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          
          <input
            placeholder="Barcode bici/accessorio"
            value={filters.barcode}
            onChange={e => setFilters({...filters, barcode: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          
          <input
            type="date"
            placeholder="Data da"
            value={filters.dateFrom}
            onChange={e => setFilters({...filters, dateFrom: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          
          <input
            type="date"
            placeholder="Data a"
            value={filters.dateTo}
            onChange={e => setFilters({...filters, dateTo: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
          
          <select
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          >
            <option value="">Tutti gli stati</option>
            <option value="in-use">🔄 In uso</option>
            <option value="closed">✅ Chiuso</option>
            <option value="cancelled">❌ Annullato</option>
            <option value="reserved">📅 Riservato</option>
          </select>
          
          {user?.role === 'superadmin' && (
            <select
              value={filters.location}
              onChange={e => setFilters({...filters, location: e.target.value})}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            >
              <option value="">Tutte le location</option>
              {locations.map(loc => (
                <option key={loc._id} value={loc._id}>{loc.name}</option>
              ))}
            </select>
          )}
        </div>
        
        <div style={{display: 'flex', gap: '12px'}}>
          <button
            onClick={loadContracts}
            disabled={loading}
            style={{
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {loading ? '🔄 Caricamento...' : '🔍 Cerca Contratti'}
          </button>
          
          <button
            onClick={() => {
              setFilters({
                customer: '',
                barcode: '',
                dateFrom: '',
                dateTo: '',
                status: '',
                location: ''
              })
              setTimeout(loadContracts, 100)
            }}
            style={{
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🗑️ Pulisci Filtri
          </button>
        </div>
      </div>

      {/* Risultati */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '16px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{margin: 0, color: '#374151'}}>
            📋 Contratti Trovati ({contracts.length})
          </h3>
        </div>

        {contracts.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            {loading ? '🔄 Caricamento contratti...' : '📭 Nessun contratto trovato con i filtri selezionati'}
          </div>
        ) : (
          <div style={{overflowX: 'auto'}}>
            <table width="100%" cellPadding="12" style={{borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background: '#f9fafb'}}>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Cliente</th>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Telefono</th>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Articoli</th>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Data Inizio</th>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Data Fine</th>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Stato</th>
                  <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Totale</th>
                  {user?.role === 'superadmin' && <th style={{textAlign: 'left', fontWeight: '600', color: '#374151'}}>Location</th>}
                  <th style={{textAlign: 'center', fontWeight: '600', color: '#374151'}}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => (
                  <tr key={contract._id} style={{borderTop:'1px solid #e5e7eb'}}>
                    <td style={{fontWeight: '600'}}>{contract.customer?.name || 'N/A'}</td>
                    <td>{contract.customer?.phone || 'N/A'}</td>
                    <td>
                      <div style={{fontSize: '12px'}}>
                        {contract.items?.map((item, idx) => (
                          <div key={idx} style={{marginBottom: '2px'}}>
                            {item.kind === 'bike' ? '🚴' : '🎒'} {item.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>{new Date(contract.startAt).toLocaleDateString()}</td>
                    <td>{contract.endAt ? new Date(contract.endAt).toLocaleDateString() : '-'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: getStatusColor(contract.status) + '20',
                        color: getStatusColor(contract.status)
                      }}>
                        {getStatusText(contract.status)}
                      </span>
                    </td>
                    <td style={{fontWeight: '600', color: '#059669'}}>
                      €{contract.totals?.grandTotal?.toFixed(2) || '0.00'}
                    </td>
                    {user?.role === 'superadmin' && <td>{contract.location?.name || 'N/A'}</td>}
                    <td style={{textAlign: 'center'}}>
                      <div style={{display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap'}}>
                        {/* Visualizza contratto */}
                        <button
                          onClick={() => viewContract(contract._id)}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          title="Visualizza dettagli contratto"
                        >
                          👁️ Vedi
                        </button>
                        
                        {/* Chiudi contratto (solo se in-use o reserved) */}
                        {(contract.status === 'in-use' || contract.status === 'reserved') && (
                          <button
                            onClick={() => closeContract(contract._id)}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                            title="Chiudi contratto"
                          >
                            ✅ Chiudi
                          </button>
                        )}
                        
                        {/* Stampa contratto */}
                        <button
                          onClick={() => printContract(contract._id)}
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          title="Stampa contratto"
                        >
                          🖨️ Stampa
                        </button>
                        
                        {/* Elimina contratto (solo superadmin) */}
                        {user?.role === 'superadmin' && (
                          <button
                            onClick={() => deleteContract(contract._id)}
                            style={{
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                            title="Elimina contratto"
                          >
                            🗑️ Elimina
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}