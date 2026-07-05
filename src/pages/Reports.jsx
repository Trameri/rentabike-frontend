import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../services/api.js'
import LocationLogo from '../Components/LocationLogo.jsx'
import DataExporter from '../Components/DataExporter.jsx'
import { jwtDecode } from 'jwt-decode'

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0)
const formatDate = (date) => (!date ? 'Mai' : new Date(date).toLocaleDateString('it-IT'))

export default function Reports(){
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState(null)
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

  useEffect(() => {
    if (!autoRefresh || !user) return
    const interval = setInterval(() => load(), 60000)
    return () => clearInterval(interval)
  }, [autoRefresh, user, from, to, filterType])

  useEffect(() => { load() }, [user])

  async function load(){
    setLoading(true)
    try {
      const params = { from, to, type: filterType }
      const { data } = await api.get('/api/reports/summary', { params })
      setSummary(data)
      
      try {
        const detailedResponse = await api.get('/api/reports/detailed-stats', { params: { from, to } })
        setDetailedStats(detailedResponse.data)
      } catch (error) {
        setDetailedStats(null)
      }
      
      try {
        const topBikesResponse = await api.get('/api/reports/top-bikes', { params })
        setTopBikes(topBikesResponse.data || [])
      } catch (error) {
        setTopBikes([])
      }
      
      try {
        const revenueResponse = await api.get('/api/reports/revenue-by-day', { params: { from, to } })
        setRevenueByDay(revenueResponse.data || [])
      } catch (error) {
        setRevenueByDay([])
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Errore caricamento report:', error)
    } finally {
      setLoading(false)
    }
  }

  const setQuickDateRange = (days) => {
    const today = new Date()
    const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
    setFrom(startDate.toISOString().split('T')[0])
    setTo(today.toISOString().split('T')[0])
  }

  const daysDiff = from && to ? Math.ceil(Math.abs(new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) || 1 : 0

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'white', borderRadius: '16px', padding: '24px',
        marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <LocationLogo locationName={user?.location?.name || user?.username} size="header" />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
              📈 Report e Statistiche
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '16px' }}>
              {user?.role === 'superadmin' ? 'Visualizza report di tutte le location' : `Report per ${user?.username}`}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {lastUpdate && (
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
                <div>Ultimo aggiornamento:</div>
                <div style={{fontWeight: '600'}}>{lastUpdate.toLocaleTimeString('it-IT')}</div>
              </div>
            )}
            <button onClick={() => setAutoRefresh(!autoRefresh)} style={{
              padding: '8px 16px',
              background: autoRefresh ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6b7280',
              color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Manuale'}
            </button>
          </div>
        </div>

        {/* Filtri */}
        <div style={{
          display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>Da:</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{
              padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px'
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600', color: '#374151' }}>A:</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{
              padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px'
            }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
            padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white'
          }}>
            <option value="all">📊 Tutti i Ricavi</option>
            <option value="bikes">🚲 Solo Bici</option>
            <option value="accessories">🎒 Solo Accessori</option>
          </select>
          <button onClick={load} disabled={loading} style={{
            padding: '8px 16px',
            background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {loading ? <><div style={{width: '14px', height: '14px', border: '2px solid transparent',
              borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div> Caricamento...</> : '🔄 Aggiorna'}
          </button>
        </div>

        {/* Date rapide */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { days: 0, label: '📅 Oggi', color: '#10b981' },
            { days: 7, label: '📆 7 Giorni', color: '#f59e0b' },
            { days: 30, label: '📅 30 Giorni', color: '#8b5cf6' },
            { days: 90, label: '📊 90 Giorni', color: '#ef4444' }
          ].map((btn, i) => (
            <button key={i} onClick={() => btn.days === 0 ? [setFrom(new Date().toISOString().split('T')[0]), setTo(new Date().toISOString().split('T')[0])] : setQuickDateRange(btn.days)} style={{
              padding: '6px 12px', background: `linear-gradient(135deg, ${btn.color} 0%, ${btn.color}dd 100%)`,
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
            }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Riepilogo Finanziario */}
      {summary && (
        <>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
              💰 Riepilogo Finanziario
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Totale Incassato */}
              <div style={{
                padding: '20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px', color: 'white', textAlign: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                  {formatCurrency(summary.total)}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase' }}>
                  Totale Incassato
                </div>
              </div>
              
              {/* Contratti Chiusi */}
              <div style={{
                padding: '20px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '12px', color: 'white', textAlign: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                  {summary.count}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase' }}>
                  Contratti Chiusi
                </div>
              </div>
              
              {/* Media per Contratto */}
              <div style={{
                padding: '20px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px', color: 'white', textAlign: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                  {formatCurrency(summary.count > 0 ? summary.total / summary.count : 0)}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase' }}>
                  Media/Contratto
                </div>
              </div>
              
              {/* Contratti Attivi */}
              <div style={{
                padding: '20px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '12px', color: 'white', textAlign: 'center',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                  {summary.activeContracts || 0}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase' }}>
                  Contratti Attivi
                </div>
              </div>
              
              {/* Media Giornaliera */}
              {from && to && (
                <div style={{
                  padding: '20px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  borderRadius: '12px', color: 'white', textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                    {formatCurrency(summary.total / daysDiff)}
                  </div>
                  <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase' }}>
                    Media/Giorno
                  </div>
                </div>
              )}
              
              {/* Statistiche Bici */}
              {summary.totalBikes !== undefined && (
                <div style={{
                  padding: '20px', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  borderRadius: '12px', color: 'white', textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>
                    {summary.availableBikes}/{summary.totalBikes}
                  </div>
                  <div style={{ fontSize: '14px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase' }}>
                    Bici Disponibili
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Bici più Noleggiate */}
          {topBikes.length > 0 && (
            <div style={{
              background: 'white', borderRadius: '16px', padding: '24px',
              marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                🏆 Top 5 Bici più Noleggiate
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {topBikes.map((bike, index) => (
                  <div key={`${bike.name}_${bike.barcode}`} style={{
                    background: index === 0 ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' :
                      index === 1 ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' :
                      index === 2 ? 'linear-gradient(135deg, #cd7c2f 0%, #92400e 100%)' :
                      'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                    color: index < 3 ? 'white' : '#374151',
                    borderRadius: '12px', padding: '20px', position: 'relative',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '28px' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', paddingRight: '40px' }}>
                      🚲 {bike.name || `Bici ${bike.barcode}`}
                    </div>
                    <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '8px' }}>
                      📊 {bike.rentals} noleggi
                    </div>
                    <div style={{ fontSize: '14px', opacity: '0.9' }}>
                      💰 {formatCurrency(bike.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistiche Dettagliate */}
          {detailedStats && (
            <div style={{
              background: 'white', borderRadius: '16px', padding: '24px',
              marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                📈 Statistiche Avanzate
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {detailedStats.averageDuration > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏱️</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                      {detailedStats.averageDuration.toFixed(1)}h
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Durata Media</div>
                  </div>
                )}
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {detailedStats.totalItems}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Totale Items</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚲</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {detailedStats.bikeRentals}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Noleggi Bici</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎒</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {detailedStats.accessoryRentals}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Noleggi Accessori</div>
                </div>
                {detailedStats.insuranceRevenue > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛡️</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                      {formatCurrency(detailedStats.insuranceRevenue)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Ricavi Assicurazioni</div>
                  </div>
                )}
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '2px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💎</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {formatCurrency(detailedStats.averageContractValue)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Valore Medio</div>
                </div>
              </div>
            </div>
          )}

          {/* Ricavi per Giorno */}
          {revenueByDay.length > 0 && (
            <div style={{
              background: 'white', borderRadius: '16px', padding: '24px',
              marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                📊 Ricavi Giornalieri
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {revenueByDay.map(day => (
                  <div key={day.date} style={{
                    background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      📅 {formatDate(day.date)}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                      {formatCurrency(day.revenue)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {day.contracts} contratti
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Data */}
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
              📤 Esporta Dati
            </h3>
            <DataExporter data={summary?.contracts || []} filename={`report_${from || 'all'}_${to || 'all'}`} />
          </div>
        </>
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