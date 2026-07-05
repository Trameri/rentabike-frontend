import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { jwtDecode } from 'jwt-decode';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
const formatDate = (date) => (!date ? 'Mai' : new Date(date).toLocaleDateString('it-IT'));

const getTypeLabel = (type) => ({
  'ebike-full': 'E-bike Full', 'ebike-front': 'E-bike Front',
  'ebike-other': 'E-bike Altre', 'muscolare': 'Muscolare', 'altro': 'Altro'
}[type] || type);

const ExcelExport = () => {
  const [contracts, setContracts] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState({});
  const [bikeStats, setBikeStats] = useState([]);
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
  }, [user, selectedYear]);

  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contractsRes, bikesRes] = await Promise.all([
        api.get('/api/contracts'),
        api.get('/api/bikes')
      ]);
      setContracts(contractsRes.data);
      setBikes(bikesRes.data);
      calculateStats(contractsRes.data, bikesRes.data);
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
    let contractTotal = contract.finalAmount ?? contract.totals?.grandTotal ?? 0;
    
    if (contract.items && contract.items.length > 1) {
      const totalItemsValue = contract.items.reduce((sum, contractItem) => {
        const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
        const itemValue = hours <= 24 ? (contractItem.priceHourly || 0) * hours : (contractItem.priceDaily || 0) * Math.ceil(hours / 24);
        return sum + (itemValue + (contractItem.insurance ? 5 : 0));
      }, 0);
      
      if (totalItemsValue > 0) {
        const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
        const itemValue = hours <= 24 ? (item.priceHourly || 0) * hours : (item.priceDaily || 0) * Math.ceil(hours / 24);
        return (contractTotal * itemValue) / totalItemsValue;
      }
    }
    return contractTotal;
  };

  const calculateStats = (contractsData, bikesData) => {
    const monthlyData = {};
    const bikeUsageStats = {};
    
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = { revenue: 0, contracts: 0, hours: 0 };
    }

    bikesData.forEach(bike => {
      bikeUsageStats[bike._id] = { ...bike, totalRentals: 0, totalRevenue: 0, totalHours: 0 };
    });

    contractsData.forEach(contract => {
      const isCompleted = contract.status === 'completed' || (contract.status === 'returned' && contract.paymentCompleted);
      if (!isCompleted) return;

      const contractDate = new Date(contract.endAt || contract.createdAt);
      if (contractDate.getFullYear() !== selectedYear) return;

      const month = contractDate.getMonth() + 1;
      let contractRevenue = 0, contractHours = 0;

      contract.items?.forEach(item => {
        const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
        const itemRevenue = calculateItemRevenue(contract, item);
        contractRevenue += itemRevenue;
        contractHours += hours;

        if (item.kind === 'bike' && bikeUsageStats[item.refId]) {
          const bike = bikeUsageStats[item.refId];
          bike.totalRentals += 1;
          bike.totalRevenue += itemRevenue;
          bike.totalHours += hours;
        }
      });

      monthlyData[month].revenue += contractRevenue;
      monthlyData[month].contracts += 1;
      monthlyData[month].hours += contractHours;
    });

    setMonthlyStats(monthlyData);
    setBikeStats(Object.values(bikeUsageStats).sort((a, b) => b.totalRentals - a.totalRentals));
  };

  const exportToCSV = () => {
    const csvData = [];
    
    csvData.push(['STATISTICHE NOLEGGIO BICI', selectedYear]);
    csvData.push([]);
    csvData.push(['FATTURATO MENSILE']);
    csvData.push(['Mese', 'Fatturato €', 'Contratti', 'Ore Totali']);

    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

    let totalRevenue = 0, totalContracts = 0, totalHours = 0;
    for (let month = 1; month <= 12; month++) {
      const data = monthlyStats[month] || { revenue: 0, contracts: 0, hours: 0 };
      csvData.push([monthNames[month - 1], data.revenue.toFixed(2), data.contracts, data.hours.toFixed(1)]);
      totalRevenue += data.revenue;
      totalContracts += data.contracts;
      totalHours += data.hours;
    }

    csvData.push([]);
    csvData.push(['TOTALE ANNO', totalRevenue.toFixed(2), totalContracts, totalHours.toFixed(1)]);
    csvData.push([]);
    csvData.push(['BICI PIÙ USATE']);
    csvData.push(['Nome Bici', 'Tipo', 'Noleggi', 'Fatturato €', 'Ore Totali']);
    
    bikeStats.slice(0, 20).forEach(bike => {
      csvData.push([bike.name, getTypeLabel(bike.type), bike.totalRentals, bike.totalRevenue.toFixed(2), bike.totalHours.toFixed(1)]);
    });

    csvData.push([]);
    csvData.push(['STATISTICHE PER TIPO BICI']);
    csvData.push(['Tipo', 'Noleggi Totali', 'Fatturato €']);
    
    const typeStats = {};
    bikeStats.forEach(bike => {
      if (!typeStats[bike.type]) typeStats[bike.type] = { count: 0, revenue: 0 };
      typeStats[bike.type].count += bike.totalRentals;
      typeStats[bike.type].revenue += bike.totalRevenue;
    });
    
    Object.keys(typeStats).forEach(type => {
      if (typeStats[type].count > 0) csvData.push([getTypeLabel(type), typeStats[type].count, typeStats[type].revenue.toFixed(2)]);
    });

    const csvContent = csvData.map(row => row.map(cell => `"${String(cell).includes(',') || String(cell).includes('"') ? `"${String(cell).replace(/"/g, '""')}"` : cell}`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `statistiche_noleggio_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAvailableYears = () => {
    const years = new Set();
    contracts.forEach(contract => years.add(new Date(contract.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>⏳ Caricamento dati...</div>
      </div>
    );
  }

  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const totalYearRevenue = Object.values(monthlyStats).reduce((sum, month) => sum + month.revenue, 0);
  const totalYearContracts = Object.values(monthlyStats).reduce((sum, month) => sum + month.contracts, 0);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '2rem', fontWeight: '700' }}>📊 Esportazione Statistiche Excel</h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>Esporta statistiche dettagliate in formato CSV per Excel</p>
      </div>

      {/* Controlli */}
      <div style={{
        display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
        marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Anno</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{
            padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', fontSize: '16px'
          }}>
            {getAvailableYears().map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Auto-refresh</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Aggiorna ogni 60s</span>
          </div>
          {lastUpdate && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}</div>}
        </div>
        <button onClick={exportToCSV} disabled={loading} style={{
          padding: '12px 24px', background: '#10b981', color: 'white', border: 'none',
          borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '600'
        }}>📥 Esporta CSV per Excel</button>
      </div>

      {/* Statistiche mensili */}
      <div style={{
        background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px'
      }}>
        <div style={{ padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Fatturato Mensile {selectedYear}</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Mese</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Fatturato</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Contratti</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Ore</th>
              </tr>
            </thead>
            <tbody>
              {monthNames.map((monthName, index) => {
                const monthData = monthlyStats[index + 1] || { revenue: 0, contracts: 0, hours: 0 };
                return (
                  <tr key={index} style={{ background: index % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{monthName}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>{formatCurrency(monthData.revenue)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{monthData.contracts}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{monthData.hours.toFixed(0)}h</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f3f4f6', fontWeight: '700' }}>
                <td style={{ padding: '12px', borderTop: '2px solid #d1d5db' }}>TOTALE</td>
                <td style={{ padding: '12px', textAlign: 'right', borderTop: '2px solid #d1d5db', color: '#059669' }}>{formatCurrency(totalYearRevenue)}</td>
                <td style={{ padding: '12px', textAlign: 'center', borderTop: '2px solid #d1d5db' }}>{totalYearContracts}</td>
                <td style={{ padding: '12px', textAlign: 'center', borderTop: '2px solid #d1d5db' }}>{Object.values(monthlyStats).reduce((sum, m) => sum + m.hours, 0).toFixed(0)}h</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top 10 bici più usate */}
      <div style={{
        background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Top 10 Bici Più Usate ({selectedYear})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Bici</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Noleggi</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Fatturato</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Ore</th>
              </tr>
            </thead>
            <tbody>
              {bikeStats.slice(0, 10).map((bike, index) => (
                <tr key={bike._id} style={{ background: index % 2 === 0 ? 'white' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600' }}>{bike.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{bike.barcode}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                      background: bike.type.includes('ebike') ? '#dbeafe' : '#f3f4f6',
                      color: bike.type.includes('ebike') ? '#1e40af' : '#374151'
                    }}>
                      {getTypeLabel(bike.type)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>{bike.totalRentals}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>{formatCurrency(bike.totalRevenue)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{bike.totalHours.toFixed(0)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExcelExport;