import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.js';
import { jwtDecode } from 'jwt-decode';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
const formatDate = (date) => (!date ? 'Mai' : new Date(date).toLocaleDateString('it-IT'));

const getTypeLabel = (type) => ({
  'ebike-full': 'E-bike Full', 'ebike-front': 'E-bike Front',
  'ebike-other': 'E-bike Altre', 'muscolare': 'Muscolare', 'altro': 'Altro'
}[type] || type);

const BikeROIStats = () => {
  const [bikes, setBikes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState('totalRevenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try { setUser(jwtDecode(token)); } catch (e) { console.error('Errore decodifica token:', e); }
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) loadData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bikesRes, contractsRes] = await Promise.all([
        api.get('/api/bikes'), api.get('/api/contracts')
      ]);
      setBikes(bikesRes.data);
      setContracts(contractsRes.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (startAt, endAt) => {
    if (!startAt || !endAt) return 0;
    return Math.max(0, (new Date(endAt) - new Date(startAt)) / (1000 * 60 * 60));
  };

  const calculateItemRevenue = (contract, item) => {
    const lockedRental = parseFloat(item.rentalPrice || 0)
    if (lockedRental > 0) return lockedRental

    const explicitBase = parseFloat(item.basePrice || 0)
    if (explicitBase > 0) return explicitBase

    const explicitTotal = parseFloat(item.totalPrice || 0)
    if (explicitTotal > 0) return explicitTotal

    if (contract.lockedItemPrices && Array.isArray(contract.lockedItemPrices) && contract.lockedItemPrices.length > 0) {
      const found = contract.lockedItemPrices.find(lp => lp.itemId === item._id || lp.itemId === item.id || lp.itemId === item.name)
      const lockedPrice = parseFloat(found?.basePrice || 0)
      if (lockedPrice > 0) return lockedPrice
    }

    return 0
  }

  const bikeStats = useMemo(() => {
    if (!bikes.length || !contracts.length) return [];
    
    const stats = {};
    bikes.forEach(bike => {
      stats[bike._id] = { ...bike, totalRevenue: 0, totalRentals: 0, totalHours: 0, isRepaid: false, remainingAmount: bike.purchasePrice || 0, roiPercentage: 0, avgRevenuePerRental: 0, avgHoursPerRental: 0, lastRentalDate: null };
    });

    contracts.forEach(contract => {
      if (!['completed', 'returned', 'closed'].includes(contract.status)) return
      if (!contract.items) return
      contract.items.forEach(item => {
        if (item.kind === 'bike') {
          let bikeId = item.refId
          let bike = stats[bikeId]
          if (!bike && item.barcode) {
            bikeId = Object.keys(stats).find(id => stats[id].barcode === item.barcode)
            bike = stats[bikeId]
          }
          if (bike) {
            const itemStart = item.startAt || contract.startAt || contract.createdAt
            const itemEnd = item.returnedAt || contract.endAt || contract.createdAt
            const itemHours = calculateHours(itemStart, itemEnd)
            const itemRevenue = calculateItemRevenue(contract, item)
            bike.totalRevenue += itemRevenue
            bike.totalRentals += 1
            bike.totalHours += itemHours
            const itemEndDate = new Date(itemEnd)
            if (!bike.lastRentalDate || itemEndDate > bike.lastRentalDate) bike.lastRentalDate = itemEndDate
          }
        }
      })
    })
    Object.keys(stats).forEach(bikeId => {
      const s = stats[bikeId]
      if (s.totalRevenue > 0 || s.purchasePrice > 0) {
        console.log('[BikeROIStats]', bikeId, { revenue: Math.round(s.totalRevenue * 100) / 100, rentals: s.totalRentals, hours: Math.round(s.totalHours * 100) / 100 })
      }
    });

    Object.keys(stats).forEach(bikeId => {
      const stat = stats[bikeId];
      if (stat.purchasePrice > 0) {
        stat.remainingAmount = Math.max(0, stat.purchasePrice - stat.totalRevenue);
        stat.isRepaid = stat.totalRevenue >= stat.purchasePrice;
        stat.roiPercentage = (stat.totalRevenue / stat.purchasePrice) * 100;
      }
      if (stat.totalRentals > 0) {
        stat.avgRevenuePerRental = stat.totalRevenue / stat.totalRentals;
        stat.avgHoursPerRental = stat.totalHours / stat.totalRentals;
      }
    });

    return Object.values(stats);
  }, [bikes, contracts]);

  const typeStats = useMemo(() => {
    const stats = {
      'ebike-full': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'ebike-front': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'ebike-other': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'muscolare': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'altro': { count: 0, revenue: 0, hours: 0, repaidCount: 0 }
    };
    bikeStats.forEach(stat => {
      if (stats[stat.type]) {
        stats[stat.type].count += stat.totalRentals;
        stats[stat.type].revenue += stat.totalRevenue;
        stats[stat.type].hours += stat.totalHours;
        if (stat.isRepaid) stats[stat.type].repaidCount += 1;
      }
    });
    return stats;
  }, [bikeStats]);

  const filteredStats = useMemo(() => {
    let filtered = bikeStats;
    if (filterType !== 'all') filtered = filtered.filter(stat => stat.type === filterType);
    if (filterStatus === 'repaid') filtered = filtered.filter(stat => stat.isRepaid);
    else if (filterStatus === 'not-repaid') filtered = filtered.filter(stat => !stat.isRepaid && stat.purchasePrice > 0);
    else if (filterStatus === 'no-purchase-data') filtered = filtered.filter(stat => !stat.purchasePrice || stat.purchasePrice === 0);
    filtered.sort((a, b) => (sortOrder === 'desc' ? (b[sortBy] || 0) - (a[sortBy] || 0) : (a[sortBy] || 0) - (b[sortBy] || 0)));
    const maxRevenue = filtered.length > 0 ? Math.max(...filtered.map(f => f.totalRevenue || 0)) : 0;
    return { list: filtered, maxRevenue };
  }, [bikeStats, filterType, filterStatus, sortBy, sortOrder]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>⏳ Caricamento statistiche...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
          📊 Statistiche ROI Bici
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
          Analisi dettagliata del ritorno sull'investimento per ogni bici
        </p>
      </div>

      {/* Statistiche per tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {Object.keys(typeStats).map(type => (
          <div key={type} style={{
            padding: '16px', background: 'white', borderRadius: '12px',
            border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>{getTypeLabel(type)}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
              {formatCurrency(typeStats[type].revenue)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {typeStats[type].count} noleggi • {typeStats[type].hours.toFixed(0)}h
            </div>
          </div>
        ))}
      </div>

      {/* Filtri e controlli */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', marginBottom: '24px', padding: '16px', background: '#f8fafc',
        borderRadius: '12px', border: '1px solid #e2e8f0'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Tipo Bici</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{
            width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white'
          }}>
            <option value="all">Tutti i tipi</option>
            <option value="ebike-full">E-bike Full</option>
            <option value="ebike-front">E-bike Front</option>
            <option value="ebike-other">E-bike Altre</option>
            <option value="muscolare">Muscolare</option>
            <option value="altro">Altro</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Stato Ripagamento</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{
            width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white'
          }}>
            <option value="all">Tutte</option>
            <option value="repaid">Ripagata</option>
            <option value="not-repaid">Non ripagata</option>
            <option value="no-purchase-data">Senza dati acquisto</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Ordina per</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
            width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white'
          }}>
            <option value="totalRevenue">Ricavi Totali</option>
            <option value="roiPercentage">ROI %</option>
            <option value="totalRentals">Numero Noleggi</option>
            <option value="totalHours">Ore Totali</option>
            <option value="avgRevenuePerRental">Ricavo Medio</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Ordine</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{
            width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white'
          }}>
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Aggiornamento</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={loadData} disabled={loading} style={{
              padding: '8px 12px', background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'
            }}>
              {loading ? '🔄' : '🔄'} {loading ? 'Caricando...' : 'Aggiorna Ora'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Auto-refresh (30s)</span>
            </div>
            {lastUpdate && <div style={{ fontSize: '12px', color: '#9ca3af' }}>📅 {lastUpdate.toLocaleString()}</div>}
          </div>
        </div>
      </div>

      {/* Tabella statistiche */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Dettaglio Bici ({filteredStats.list.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Bici</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Prezzo Acquisto</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Ricavi Totali</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>ROI %</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Mancante</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Noleggi</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Ore</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Ultimo Noleggio</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.list.map((stat, index) => (
                <tr key={stat._id} style={{ background: index % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {stat.name}
                        {stat.totalRevenue > 0 && stat.totalRevenue === filteredStats.maxRevenue && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>🏆 TOP</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{stat.barcode}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                      background: stat.type.includes('ebike') ? '#dbeafe' : '#f3f4f6',
                      color: stat.type.includes('ebike') ? '#1e40af' : '#374151'
                    }}>
                      {getTypeLabel(stat.type)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{stat.purchasePrice > 0 ? formatCurrency(stat.purchasePrice) : '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: stat.totalRevenue > 0 && stat.totalRevenue === filteredStats.maxRevenue ? '#047857' : '#059669' }}>
                    {formatCurrency(stat.totalRevenue)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {stat.purchasePrice > 0 ? (
                      <span style={{ color: stat.roiPercentage >= 100 ? '#059669' : '#dc2626', fontWeight: '600' }}>
                        {stat.roiPercentage.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {stat.purchasePrice > 0 ? (
                      <span style={{ color: stat.remainingAmount > 0 ? '#dc2626' : '#059669', fontWeight: '600' }}>
                        {stat.remainingAmount > 0 ? formatCurrency(stat.remainingAmount) : '✅ Ripagata'}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600' }}>{stat.totalRentals}</div>
                    {stat.totalRentals > 0 && <div style={{ fontSize: '12px', color: '#6b7280' }}>{formatCurrency(stat.avgRevenuePerRental)}/noleggio</div>}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600' }}>{stat.totalHours.toFixed(0)}h</div>
                    {stat.totalRentals > 0 && <div style={{ fontSize: '12px', color: '#6b7280' }}>{stat.avgHoursPerRental.toFixed(1)}h/noleggio</div>}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>{formatDate(stat.lastRentalDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStats.list.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Nessuna bici trovata con i filtri selezionati</div>
        )}
      </div>
    </div>
  );
};

export default BikeROIStats;