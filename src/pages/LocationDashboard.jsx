import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import { calculateSeparateTotals, getContractStatsReferenceDate, isContractClosedForStats } from '../utils/contractCalculations.js'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function LocationDashboard() {
  const { locationId } = useParams()
  const [user, setUser] = useState(null)
  const [locationStat, setLocationStat] = useState(null)
  const [activeContracts, setActiveContracts] = useState([])
  const [closedContracts, setClosedContracts] = useState([])
  const [locationBreakdown, setLocationBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
        if (decoded.role !== 'superadmin') {
          setError('Accesso negato: solo superadmin')
        }
      } catch (e) {
        setError('Token non valido')
      }
    }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'superadmin') return

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [{ data: statsData }, { data: activeData }, { data: closedData }] = await Promise.all([
          api.get('/api/reports/superadmin-stats'),
          api.get('/api/contracts', { params: { location: locationId, status: 'in-use', limit: 50 } }),
          api.get('/api/contracts', { params: { location: locationId, status: 'closed' } })
        ])

        const found = statsData.locations?.find(l => l.location._id === locationId)
        if (!found) {
          setError('Punto noleggio non trovato')
          setLocationStat(null)
        } else {
          setLocationStat(found)
        }
        setActiveContracts(activeData.data || [])
        setClosedContracts(closedData.data || [])

        const lb = {
          annual: { bikes: 0, insurance: 0, extras: 0, total: 0, contracts: 0 },
          daily: { bikes: 0, insurance: 0, extras: 0, total: 0, contracts: 0 }
        }
        ;(closedData.data || []).forEach(contract => {
          const referenceDate = getContractStatsReferenceDate(contract)
          if (!referenceDate || !isContractClosedForStats(contract)) return
          const { bikesTotal, insuranceTotal, extrasTotal, total } = calculateSeparateTotals(contract)
          const contractDate = new Date(referenceDate)
          const currentYear = new Date().getFullYear()
          const isAnnual = contractDate.getFullYear() === currentYear
          const isDaily = contractDate.toDateString() === new Date().toDateString()
          if (isAnnual) {
            lb.annual.bikes += bikesTotal
            lb.annual.insurance += insuranceTotal
            lb.annual.extras += extrasTotal
            lb.annual.total += total
            lb.annual.contracts++
          }
          if (isDaily) {
            lb.daily.bikes += bikesTotal
            lb.daily.insurance += insuranceTotal
            lb.daily.extras += extrasTotal
            lb.daily.total += total
            lb.daily.contracts++
          }
        })
        ;['annual', 'daily'].forEach(period => {
          lb[period].bikes = Math.round(lb[period].bikes * 100) / 100
          lb[period].insurance = Math.round(lb[period].insurance * 100) / 100
          lb[period].extras = Math.round(lb[period].extras * 100) / 100
          lb[period].total = Math.round(lb[period].total * 100) / 100
        })
        setLocationBreakdown(lb)
      } catch (err) {
        console.error('Errore caricamento dati location:', err)
        setError('Errore nel caricamento dei dati')
      } finally {
        setLoading(false)
      }
    }

    if (locationId) loadData()
  }, [user, locationId])

  if (!user || user.role !== 'superadmin') {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2>❌ Accesso negato</h2>
        <p>Solo i superadmin possono visualizzare questa pagina</p>
        <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Torna alla Dashboard</Link>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2>⚠️ {error}</h2>
        <Link to="/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Torna alla Dashboard</Link>
      </div>
    )
  }

  if (loading || !locationStat) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2>Caricamento...</h2>
      </div>
    )
  }

  const avgTicket = locationStat.closedContracts > 0
    ? (locationStat.revenue / locationStat.closedContracts).toFixed(2)
    : '0.00'

  const revenueBikes = closedContracts.reduce((sum, c) => sum + (calculateSeparateTotals(c).bikesTotal || 0), 0)
  const revenueInsurance = closedContracts.reduce((sum, c) => sum + (calculateSeparateTotals(c).insuranceTotal || 0), 0)
  const revenueExtras = closedContracts.reduce((sum, c) => sum + (calculateSeparateTotals(c).extrasTotal || 0), 0)

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Link
        to="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          background: '#f1f5f9',
          color: '#334155',
          borderRadius: '10px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '24px'
        }}
      >
        ← Torna alle Statistiche per Punto Noleggio
      </Link>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
          <LocationLogo locationName={locationStat.location.name} size="large" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>
              {locationStat.location.name}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏢 Dashboard Punto Noleggio
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>€{locationStat.revenue.toFixed(2)}</div>
            <div style={{ fontSize: '13px', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>💰 Fatturato Totale</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>{locationStat.closedContracts}</div>
            <div style={{ fontSize: '13px', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>✅ Contratti Chiusi</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#d97706', marginBottom: '4px' }}>{locationStat.activeContracts}</div>
            <div style={{ fontSize: '13px', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>🔄 Contratti Attivi</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', background: '#faf5ff', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#9333ea', marginBottom: '4px' }}>€{avgTicket}</div>
            <div style={{ fontSize: '13px', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>📊 Scontrino Medio</div>
          </div>
        </div>

        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#1e293b' }}>📋 Contratti Attivi</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cliente</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Telefono</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Totale</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Inizio</th>
              </tr>
            </thead>
            <tbody>
              {activeContracts.map(contract => {
                const { total } = calculateSeparateTotals(contract)
                return (
                  <tr key={contract._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{contract.customer?.name || 'N/A'}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{contract.customer?.email || 'N/A'}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{contract.customer?.phone || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>€{total.toFixed(2)}</td>
                    <td style={{ padding: '12px', color: '#64748b' }}>{new Date(contract.startAt).toLocaleString('it-IT')}</td>
                  </tr>
                )
              })}
              {activeContracts.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Nessun contratto attivo per questo punto noleggio</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#1e293b' }}>📊 Breakdown Ricavi</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Quota Base (Bici)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#334155' }}>€{revenueBikes.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Assicurazione</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#334155' }}>€{revenueInsurance.toFixed(2)}</div>
          </div>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Extra</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#334155' }}>€{revenueExtras.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
