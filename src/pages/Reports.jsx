import React, { useEffect, useState, useMemo } from 'react'
import { api } from '../services/api.js'
import LocationLogo from '../Components/LocationLogo.jsx'
import * as XLSX from 'xlsx'
import { jwtDecode } from 'jwt-decode'
import { calculateSeparateTotals } from '../utils/contractCalculations.js'

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0)
const formatDate = (date) => (!date ? 'Mai' : new Date(date).toLocaleDateString('it-IT'))

export default function Reports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [period, setPeriod] = useState('custom')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const [contracts, setContracts] = useState([])
  const [bikes, setBikes] = useState([])
  const [accessories, setAccessories] = useState([])
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBikesRevenue: 0,
    totalInsuranceRevenue: 0,
    totalExtrasRevenue: 0,
    closedContracts: 0,
    activeContracts: 0,
    totalContracts: 0
  })
  const [dailyStats, setDailyStats] = useState([])
  const [bikeStats, setBikeStats] = useState([])
  const [accessoryStats, setAccessoryStats] = useState([])

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
  }, [])

  useEffect(() => {
    if (user) loadAllData()
  }, [user, from, to])

  useEffect(() => {
    if (period === 'today') {
      setQuickDateRange(0, 'today')
    } else if (period === 'week') {
      setQuickDateRange(7, 'week')
    } else if (period === 'month') {
      setQuickDateRange(30, 'month')
    } else if (period === 'quarter') {
      setQuickDateRange(90, 'quarter')
    }
  }, [period])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const params = { from, to }
      const [contractsRes, bikesRes, accessoriesRes] = await Promise.all([
        api.get('/api/contracts/history', { params }).catch(() => ({ data: [] })),
        api.get('/api/bikes').catch(() => ({ data: [] })),
        api.get('/api/accessories').catch(() => ({ data: [] }))
      ])
      
      const contractsData = contractsRes.data || []
      const bikesData = bikesRes.data || []
      const accessoriesData = accessoriesRes.data || []
      
      setContracts(contractsData)
      setBikes(bikesData)
      setAccessories(accessoriesData)
      calculateStats(contractsData, bikesData, accessoriesData)
    } catch (error) {
      console.error('Errore caricamento report:', error)
    } finally {
      setLoading(false)
    }
  }

  const setQuickDateRange = (days, label) => {
    const today = new Date()
    const startDate = days > 0 ? new Date(today.getTime() - days * 24 * 60 * 60 * 1000) : today
    setFrom(startDate.toISOString().split('T')[0])
    setTo(today.toISOString().split('T')[0])
    setPeriod(label)
  }

  const calculateStats = (contractsData, bikesData, accessoriesData) => {
    let totalRevenue = 0
    let totalBikesRevenue = 0
    let totalInsuranceRevenue = 0
    let totalExtrasRevenue = 0
    let closedContracts = 0
    let activeContracts = 0
    
    const dailyMap = {}
    const bikeMap = {}
    const accessoryMap = {}
    
    contractsData.forEach(contract => {
      const totals = calculateSeparateTotals(contract)
      
      totalRevenue += totals.total
      totalBikesRevenue += totals.bikesTotal
      totalInsuranceRevenue += totals.insuranceTotal
      totalExtrasRevenue += totals.extrasTotal
      
      if (contract.status === 'closed' || contract.status === 'completed') {
        closedContracts++
      } else {
        activeContracts++
      }
      
      const date = formatDate(contract.startAt || contract.createdAt)
      if (!dailyMap[date]) {
        dailyMap[date] = { date, contracts: 0, revenue: 0, bikeRevenue: 0, insuranceRevenue: 0 }
      }
      dailyMap[date].contracts++
      dailyMap[date].revenue += totals.total
      dailyMap[date].bikeRevenue += totals.bikesTotal
      dailyMap[date].insuranceRevenue += totals.insuranceTotal
      
      contract.items?.forEach(item => {
        if (item.kind === 'bike') {
          const refId = item.refId || item.bike
          const bike = bikesData.find(b => b._id === refId)
          if (bike) {
            const key = bike._id
            if (!bikeMap[key]) {
              bikeMap[key] = { 
                id: bike._id,
                name: bike.name, 
                type: bike.type, 
                barcode: bike.barcode,
                rentals: 0, 
                revenue: 0,
                insurance: 0
              }
            }
            bikeMap[key].rentals++
            const itemRevenue = calculateItemRevenueFromContract(contract, item)
            bikeMap[key].revenue += itemRevenue
            if (item.insurance) bikeMap[key].insurance += 5
          }
        } else if (item.kind === 'accessory') {
          const refId = item.refId || item._id || item.name
          const accessory = accessoriesData.find(a => a._id === refId)
          const key = accessory ? accessory._id : refId
          if (!accessoryMap[key]) {
            accessoryMap[key] = { 
              id: accessory ? accessory._id : key,
              name: accessory ? accessory.name : (item.name || 'Accessorio'), 
              rentals: 0, 
              revenue: 0 
            }
          }
          accessoryMap[key].rentals++
          const itemRevenue = calculateItemRevenueFromContract(contract, item)
          accessoryMap[key].revenue += itemRevenue
        }
      })
    })
    
    setSummary({
      totalRevenue,
      totalBikesRevenue,
      totalInsuranceRevenue,
      totalExtrasRevenue,
      closedContracts,
      activeContracts,
      totalContracts: contractsData.length
    })
    
    setDailyStats(Object.values(dailyMap).sort((a, b) => new Date(b.date) - new Date(a.date)))
    setBikeStats(Object.values(bikeMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10))
    setAccessoryStats(Object.values(accessoryMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10))
  }

  const calculateItemRevenueFromContract = (contract, item) => {
    const startAt = new Date(item.startAt || contract.startAt || contract.createdAt)
    const endAt = new Date(item.returnedAt || contract.endAt || new Date())
    const durationMs = Math.max(0, endAt - startAt)
    const durationMinutes = durationMs / (1000 * 60)
    const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60))
    
    const priceHourly = parseFloat(item.priceHourly) || 0
    const priceDaily = parseFloat(item.priceDaily) || 0
    
    const isReservation = contract.status === 'reserved' || contract.isReservation
    if (isReservation) {
      const durationDays = Math.max(1, Math.ceil(oreFatturate / 24))
      return priceDaily * durationDays
    }
    
    const hourlyTotal = oreFatturate * priceHourly
    const dailyTotal = priceDaily
    return priceDaily > 0 && hourlyTotal >= dailyTotal ? dailyTotal : hourlyTotal
  }

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()
    
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    }
    
    const summaryData = [
      { Indicatore: 'PERIODO', Valore: from && to ? `${from} - ${to}` : 'Tutto' },
      { Indicatore: 'Data di Esportazione', Valore: new Date().toLocaleDateString('it-IT') },
      { Indicatore: '', Valore: '' },
      { Indicatore: 'Ricavo Totale', Valore: summary.totalRevenue },
      { Indicatore: 'Ricavo Noleggio Bici', Valore: summary.totalBikesRevenue },
      { Indicatore: 'Ricavo Assicurazioni', Valore: summary.totalInsuranceRevenue },
      { Indicatore: 'Ricavo Extra', Valore: summary.totalExtrasRevenue },
      { Indicatore: '', Valore: '' },
      { Indicatore: 'Contratti Chiusi', Valore: summary.closedContracts },
      { Indicatore: 'Contratti Attivi', Valore: summary.activeContracts },
      { Indicatore: 'Totale Contratti', Valore: summary.totalContracts }
    ]
    
    const ws1 = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Riepilogo Generale')
    
    const dailyData = dailyStats.map(d => ({
      Data: d.date,
      Contratti: d.contracts,
      'Ricavo Totale': d.revenue,
      'Ricavo Noleggio': d.bikeRevenue,
      'Ricavo Assicurazioni': d.insuranceRevenue,
      'Media per Contratto': d.contracts > 0 ? d.revenue / d.contracts : 0
    }))
    
    const ws2 = XLSX.utils.json_to_sheet(dailyData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Contratti Giornalieri')
    
    const bikeData = bikeStats.map((b, i) => ({
      Posizione: i + 1,
      'Nome Bici': b.name,
      Tipo: b.type === 'electric' ? 'Elettrica' : 'Muscolare',
      Barcode: b.barcode,
      Noleggi: b.rentals,
      'Ricavo Totale': b.revenue,
      'Ricavo Medio': b.rentals > 0 ? b.revenue / b.rentals : 0
    }))
    
    const ws3 = XLSX.utils.json_to_sheet(bikeData)
    XLSX.utils.book_append_sheet(wb, ws3, 'Top Bici')
    
    const contractDetails = contracts.map(contract => {
      const totals = calculateSeparateTotals(contract)
      const startDate = new Date(contract.startAt || contract.createdAt)
      const endDate = contract.endAt ? new Date(contract.endAt) : new Date()
      const durationMs = Math.max(1, endDate - startDate)
      const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)))
      const durationDays = Math.max(1, Math.ceil(durationHours / 24))
      
      return {
        'ID Contratto': contract._id.slice(-8),
        Data: formatDate(contract.startAt || contract.createdAt),
        'Ora Inizio': startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        Cliente: contract.customer?.name || '',
        Telefono: contract.customer?.phone || '',
        'Durata (ore)': durationHours,
        'Durata (giorni)': durationDays,
        Tipo: contract.status === 'reserved' || contract.isReservation ? 'Prenotazione' : 'Noleggio',
        Stato: contract.status === 'closed' || contract.status === 'completed' ? 'Chiuso' : 
              contract.status === 'active' ? 'Attivo' : 'Altro',
        'Noleggio Bici': totals.bikesTotal,
        Assicurazioni: totals.insuranceTotal,
        Extra: totals.extrasTotal,
        Totale: totals.total,
        Pagamento: contract.paymentMethod || '',
        Pagato: (contract.paymentCompleted || contract.paid) ? 'Sì' : 'No',
        Completato: contract.paymentCompleted ? 'Sì' : 'No',
        'Note Compilazione': contract.notes || '',
        'Note Chiusura/Pagamento': contract.paymentNotes || '',
        Location: contract.location?.name || '',
        Operatore: contract.createdBy || ''
      }
    })
    
    const ws4 = XLSX.utils.json_to_sheet(contractDetails)
    XLSX.utils.book_append_sheet(wb, ws4, 'Dettaglio Contratti')
    
    const fileName = `Report_Contabilita_${from || 'tutto'}_${to || new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const StatCard = ({ label, value, color, icon }) => {
    const displayValue = typeof value === 'number' && label.includes('Ricavo') ? formatCurrency(value) : value
    return (
      <div style={{
        background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
        border: `2px solid ${color}`,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
          {displayValue}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
          {label}
        </div>
      </div>
    )
  }

  const daysDiff = useMemo(() => {
    if (!from || !to) return 1
    return Math.max(1, Math.ceil(Math.abs(new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)))
  }, [from, to])

  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1)

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <LocationLogo locationName={user?.location?.name || user?.username} size="header" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700', color: '#1e293b' }}>
              📊 Report Amministrativo e Contabilità
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              {user?.role === 'superadmin' ? 'Visualizza report di tutte le location' : `Report per ${user?.username}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'white'
          }}>
            <option value="custom">Seleziona periodo...</option>
            <option value="today">📅 Oggi</option>
            <option value="week">📆 Ultimi 7 giorni</option>
            <option value="month">📅 Ultimi 30 giorni</option>
            <option value="quarter">📊 Ultimi 90 giorni</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Da:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>A:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }} />
          </div>

          <button onClick={loadAllData} disabled={loading} style={{
            padding: '8px 16px',
            background: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {loading ? '⏳ Caricamento...' : '🔄 Aggiorna'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: '600', color: '#1e293b' }}>
          📈 Statistiche Principali
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard label="Ricavo Totale" value={summary.totalRevenue} color="#10b981" icon="💰" />
          <StatCard label="Ricavo Noleggio" value={summary.totalBikesRevenue} color="#3b82f6" icon="🚲" />
          <StatCard label="Ricavo Assicurazioni" value={summary.totalInsuranceRevenue} color="#f59e0b" icon="🛡️" />
          <StatCard label="Ricavo Extra" value={summary.totalExtrasRevenue} color="#8b5cf6" icon="➕" />
          <StatCard label="Contratti Chiusi" value={summary.closedContracts} color="#10b981" icon="✅" />
          <StatCard label="Contratti Attivi" value={summary.activeContracts} color="#ef4444" icon="🔄" />
          <StatCard label="Totale Contratti" value={summary.totalContracts} color="#6366f1" icon="📋" />
          <StatCard label="Media Giornaliera" value={summary.totalRevenue / daysDiff} color="#06b6d4" icon="📊" />
        </div>
      </div>

      {dailyStats.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', fontWeight: '600', color: '#1e293b' }}>
            📊 Andamento Giornaliero
          </h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {dailyStats.slice(0, 30).map(day => {
              const percentage = Math.min(100, (day.revenue / maxRevenue) * 100)
              return (
                <div key={day.date} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 0',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ width: '120px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    {day.date}
                  </div>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '32px', overflow: 'hidden' }}>
                    <div style={{
                      width: percentage + '%',
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ width: '120px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                    {formatCurrency(day.revenue)}
                  </div>
                  <div style={{ width: '60px', textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>
                    {day.contracts} contratti
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {bikeStats.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: '600', color: '#1e293b' }}>
              🏆 Top Bici per Ricavo
            </h2>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {bikeStats.map((bike, index) => (
                <div key={bike.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: index < 3 ? '#fef3c7' : '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#cd7c2f' : '#e2e8f0',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{bike.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {bike.type === 'electric' ? '⚡ Elettrica' : '🚲 Muscolare'} • {bike.rentals} noleggi
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>
                    {formatCurrency(bike.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {accessoryStats.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: '600', color: '#1e293b' }}>
              🎒 Top Accessori per Ricavo
            </h2>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {accessoryStats.map((acc, index) => (
                <div key={acc.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: index < 3 ? '#fef3c7' : '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : index === 2 ? '#cd7c2f' : '#e2e8f0',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {index < 3 ? ['🥇','🥈','🥉'][index] : index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{acc.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {acc.rentals} noleggi
                    </div>
                  </div>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>
                    {formatCurrency(acc.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {contracts.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: '600', color: '#1e293b' }}>
            📋 Dettaglio Contratti
          </h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Data</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Cliente</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Articoli</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Noleggio</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Assic.</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Totale</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e2e8f0' }}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => {
                  const totals = calculateSeparateTotals(contract)
                  return (
                    <tr key={contract._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#374151' }}>
                        {formatDate(contract.startAt || contract.createdAt)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#374151' }}>
                        {contract.customer?.name || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#6b7280' }}>
                        {contract.items?.length || 0} items
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '500', color: '#10b981', textAlign: 'right' }}>
                        {formatCurrency(totals.bikesTotal)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#f59e0b', textAlign: 'right' }}>
                        {formatCurrency(totals.insuranceTotal)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: '#1e293b', textAlign: 'right' }}>
                        {formatCurrency(totals.total)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: contract.status === 'closed' || contract.status === 'completed' ? '#d1fae5' : '#fee2e2',
                          color: contract.status === 'closed' || contract.status === 'completed' ? '#065f46' : '#991b1b'
                        }}>
                          {contract.status === 'closed' || contract.status === 'completed' ? 'Chiuso' : 'Attivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', fontWeight: '600', color: '#1e293b' }}>
          📤 Esporta Report Contabilità
        </h2>
        <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px' }}>
          Genera un file Excel professionale con:
          • Foglio 1: Riepilogo generale con totali
          • Foglio 2: Contratti giornalieri
          • Foglio 3: Top bici per ricavo
          • Foglio 4: Dettaglio completo contratti
        </p>
        <button onClick={exportToExcel} style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
        }}>
          📊 Esporta in Excel
        </button>
      </div>
    </div>
  )
}