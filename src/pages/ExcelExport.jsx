import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { jwtDecode } from 'jwt-decode';
import { calculateSeparateTotals, isContractClosedForStats } from '../utils/contractCalculations.js';
import * as XLSX from 'xlsx';

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
      const isCompleted = isContractClosedForStats(contract);
      if (!isCompleted) return;

      const contractDate = new Date(contract.startAt || contract.createdAt);
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

   const exportToExcel = () => {
     if (!contracts || contracts.length === 0) {
       alert('Nessun dato da esportare');
       return;
     }

     const workbook = XLSX.utils.book_new();
     const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

      const closedContracts = contracts.filter(contract => isContractClosedForStats(contract));

     // Riepilogo mensile
     const monthlySummary = [];
     for (let m = 0; m < 12; m++) {
       monthlySummary.push({
         'Mese': monthNames[m],
         'Contratti': 0,
         'Ore Totali': 0,
         'Fatturato Noleggio': 0,
         'Fatturato Assicurazioni': 0,
         'Fatturato Extra': 0,
         'Fatturato Totale': 0
       });
     }

      const monthlyDailyData = {};

     closedContracts.forEach(contract => {
       const startDate = new Date(contract.startAt || contract.createdAt);
       if (startDate.getFullYear() !== selectedYear) return;

       const monthIdx = startDate.getMonth();
       const totals = calculateSeparateTotals(contract);
       const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);

       monthlySummary[monthIdx].Contratti += 1;
       monthlySummary[monthIdx]['Ore Totali'] = +(monthlySummary[monthIdx]['Ore Totali'] + hours).toFixed(1);
       monthlySummary[monthIdx]['Fatturato Noleggio'] = +(monthlySummary[monthIdx]['Fatturato Noleggio'] + (totals.bikesTotal || 0)).toFixed(2);
       monthlySummary[monthIdx]['Fatturato Assicurazioni'] = +(monthlySummary[monthIdx]['Fatturato Assicurazioni'] + (totals.insuranceTotal || 0)).toFixed(2);
       monthlySummary[monthIdx]['Fatturato Extra'] = +(monthlySummary[monthIdx]['Fatturato Extra'] + (totals.extrasTotal || 0)).toFixed(2);
       monthlySummary[monthIdx]['Fatturato Totale'] = +(monthlySummary[monthIdx]['Fatturato Totale'] + (totals.total || 0)).toFixed(2);

       const dayKey = startDate.toLocaleDateString('it-IT');
       if (!monthlyDailyData[monthIdx]) monthlyDailyData[monthIdx] = {};
       if (!monthlyDailyData[monthIdx][dayKey]) {
         monthlyDailyData[monthIdx][dayKey] = {
           'Data': dayKey,
           'Contratti': 0,
           'Ore Totali': 0,
           'Fatturato Noleggio': 0,
           'Fatturato Assicurazioni': 0,
           'Fatturato Extra': 0,
           'Fatturato Totale': 0
         };
       }
       monthlyDailyData[monthIdx][dayKey].Contratti += 1;
       monthlyDailyData[monthIdx][dayKey]['Ore Totali'] = +(monthlyDailyData[monthIdx][dayKey]['Ore Totali'] + hours).toFixed(1);
       monthlyDailyData[monthIdx][dayKey]['Fatturato Noleggio'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Noleggio'] + (totals.bikesTotal || 0)).toFixed(2);
       monthlyDailyData[monthIdx][dayKey]['Fatturato Assicurazioni'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Assicurazioni'] + (totals.insuranceTotal || 0)).toFixed(2);
       monthlyDailyData[monthIdx][dayKey]['Fatturato Extra'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Extra'] + (totals.extrasTotal || 0)).toFixed(2);
       monthlyDailyData[monthIdx][dayKey]['Fatturato Totale'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Totale'] + (totals.total || 0)).toFixed(2);
     });

     const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

     monthlySummary.push({
       'Mese': 'TOTALE ANNO',
       'Contratti': sum(monthlySummary, 'Contratti'),
       'Ore Totali': +sum(monthlySummary, 'Ore Totali').toFixed(1),
       'Fatturato Noleggio': +sum(monthlySummary, 'Fatturato Noleggio').toFixed(2),
       'Fatturato Assicurazioni': +sum(monthlySummary, 'Fatturato Assicurazioni').toFixed(2),
       'Fatturato Extra': +sum(monthlySummary, 'Fatturato Extra').toFixed(2),
       'Fatturato Totale': +sum(monthlySummary, 'Fatturato Totale').toFixed(2)
     });

     const wsRiepilogo = XLSX.utils.json_to_sheet(monthlySummary);
     XLSX.utils.book_append_sheet(workbook, wsRiepilogo, 'Riepilogo Annuale');

     for (let m = 0; m < 12; m++) {
       if (!monthlyDailyData[m]) continue;
       const days = Object.keys(monthlyDailyData[m]).sort();
       const rows = days.map(day => monthlyDailyData[m][day]);
       rows.push({
         'Data': 'TOTALE MESE',
         'Contratti': sum(rows, 'Contratti'),
         'Ore Totali': +sum(rows, 'Ore Totali').toFixed(1),
         'Fatturato Noleggio': +sum(rows, 'Fatturato Noleggio').toFixed(2),
         'Fatturato Assicurazioni': +sum(rows, 'Fatturato Assicurazioni').toFixed(2),
         'Fatturato Extra': +sum(rows, 'Fatturato Extra').toFixed(2),
         'Fatturato Totale': +sum(rows, 'Fatturato Totale').toFixed(2)
       });
       const wsMonth = XLSX.utils.json_to_sheet(rows);
       XLSX.utils.book_append_sheet(workbook, wsMonth, `${monthNames[m]} ${selectedYear}`);
     }

     const detailRows = closedContracts
       .filter(c => new Date(c.startAt || c.createdAt).getFullYear() === selectedYear)
       .map(c => {
         const startDate = new Date(c.startAt || c.createdAt);
         const endDate = c.endAt ? new Date(c.endAt) : null;
         const totals = calculateSeparateTotals(c);
         const hours = calculateHours(c.startAt, c.endAt || c.createdAt);
         return {
           'ID': c._id,
           'Cliente': c.customer?.name || '',
           'Telefono': c.customer?.phone || '',
           'Data Inizio': startDate.toLocaleDateString('it-IT'),
           'Ora Inizio': startDate.toLocaleTimeString('it-IT'),
           'Data Fine': endDate ? endDate.toLocaleDateString('it-IT') : 'In corso',
           'Ora Fine': endDate ? endDate.toLocaleTimeString('it-IT') : '-',
           'Durata Ore': +hours.toFixed(1),
           'Stato': c.status === 'closed' || c.status === 'completed' ? 'Chiuso' : c.status,
           'Tipo': (c.status === 'reserved' || c.isReservation) ? 'Prenotazione' : 'Noleggio',
           'Noleggio': +totals.bikesTotal.toFixed(2),
           'Assicurazioni': +totals.insuranceTotal.toFixed(2),
           'Extra': +totals.extrasTotal.toFixed(2),
           'Totale': +totals.total.toFixed(2),
           'Metodo Pagamento': c.paymentMethod || '',
           'Pagato': (c.paymentCompleted || c.paid) ? 'Sì' : 'No',
           'Location': c.location?.name || '',
           'Note': c.notes || ''
         };
       });

     const wsDetail = XLSX.utils.json_to_sheet(detailRows);
     XLSX.utils.book_append_sheet(workbook, wsDetail, 'Dettaglio Contratti');

     const fileName = `Report_Annuale_${selectedYear}.xlsx`;
     XLSX.writeFile(workbook, fileName);
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
         <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>Esporta statistiche dettagliate in CSV o Excel con riepilogo mensile e totali giornalieri</p>
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
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={exportToCSV} disabled={loading} style={{
            padding: '12px 24px', background: '#10b981', color: 'white', border: 'none',
            borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '600'
          }}>📄 Esporta CSV</button>
          <button onClick={exportToExcel} disabled={loading} style={{
            padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '600'
          }}>📊 Esporta Excel</button>
        </div>
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