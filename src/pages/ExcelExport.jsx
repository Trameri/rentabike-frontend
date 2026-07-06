import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { jwtDecode } from 'jwt-decode';
import { isContractClosedForStats, hasMeaningfulRevenueForStats } from '../utils/contractCalculations.js';
import * as XLSX from 'xlsx';

const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
const formatDate = (date) => (!date ? 'Mai' : new Date(date).toLocaleDateString('it-IT'));

const ExcelExport = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try { setUser(jwtDecode(token)); } catch (e) { console.error('Errore decodifica token:', e); }
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      (async () => {
        try {
          const { data } = await api.get('/api/locations');
          setLocations(data || []);
        } catch (e) {
          console.error('Errore caricamento location:', e);
        }
      })();
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, selectedYear]);

  useEffect(() => {
    if (!autoRefresh || !user) return;
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, user, selectedYear]);

  useEffect(() => {
    if (!contracts.length || !user) return;
    calculateStats(contracts);
  }, [contracts, selectedYear, selectedLocation, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const contractsRes = await api.get('/api/contracts');
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

  const calculateStats = (contractsData) => {
    const monthlyData = {};
    for (let month = 1; month <= 12; month++) {
      monthlyData[month] = { revenue: 0, contracts: 0, hours: 0 };
    }

    let filtered = contractsData;
    if (user?.role === 'superadmin' && selectedLocation) {
      filtered = contractsData.filter(c => c.location?._id === selectedLocation);
    }

    filtered.forEach(contract => {
      const isCompleted = isContractClosedForStats(contract);
      if (!isCompleted) return;

      const contractDate = new Date(contract.startAt || contract.createdAt);
      if (contractDate.getFullYear() !== selectedYear) return;

      const month = contractDate.getMonth() + 1;
      const contractHours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
      let contractBikeRevenue = 0;

      contract.items?.forEach(item => {
        if (item.kind !== 'bike' && item.kind !== 'accessory') return;

        const itemStartAt = item.startAt ? new Date(item.startAt) : new Date(contract.startAt || contract.createdAt);
        const itemEndAt = item.returnedAt ? new Date(item.returnedAt) : new Date(contract.endAt || new Date());
        const durationMs = Math.max(0, itemEndAt - itemStartAt);
        const durationMinutes = durationMs / (1000 * 60);
        const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60));

        const priceHourly = parseFloat(item.priceHourly) || 0;
        const priceDaily = parseFloat(item.priceDaily) || 0;
        const hourlyTotal = oreFatturate * priceHourly;
        const dailyTotal = priceDaily;
        const bikeRevenue = priceDaily > 0 && hourlyTotal >= dailyTotal ? dailyTotal : hourlyTotal;

        contractBikeRevenue += bikeRevenue;
      });

      monthlyData[month].revenue += contractBikeRevenue;
      monthlyData[month].contracts += 1;
      monthlyData[month].hours += contractHours;
    });

    setMonthlyStats(monthlyData);
  };

   const exportToExcel = () => {
     if (!contracts || contracts.length === 0) {
       alert('Nessun dato da esportare');
       return;
     }

     const workbook = XLSX.utils.book_new();
     const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

      const baseClosed = contracts.filter(contract => {
        const status = String(contract.status || '').toLowerCase();
        if (status === 'closed' || status === 'completed') return hasMeaningfulRevenueForStats(contract);
        if (status === 'returned') return contract.paymentCompleted && hasMeaningfulRevenueForStats(contract);
        return false;
      });

      let exportContracts = baseClosed;
      if (user?.role === 'superadmin' && selectedLocation) {
        exportContracts = baseClosed.filter(c => c.location?._id === selectedLocation);
      }

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

       exportContracts.forEach(contract => {
        const startDate = new Date(contract.startAt || contract.createdAt);
        if (startDate.getFullYear() !== selectedYear) return;

        const monthIdx = startDate.getMonth();

        let bikesTotal = 0;
        let insuranceTotal = 0;
        let extrasTotal = 0;

        contract.items?.forEach(item => {
          const priceHourly = parseFloat(item.priceHourly) || 0;
          const priceDaily = parseFloat(item.priceDaily) || 0;

          const itemStartAt = item.startAt ? new Date(item.startAt) : new Date(contract.startAt || contract.createdAt);
          const itemEndAt = item.returnedAt ? new Date(item.returnedAt) : new Date(contract.endAt || new Date());
          const durationMs = Math.max(0, itemEndAt - itemStartAt);
          const durationMinutes = durationMs / (1000 * 60);
          const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60));

          if (item.kind === 'bike' || item.kind === 'accessory') {
            const hourlyTotal = oreFatturate * priceHourly;
            const dailyTotal = priceDaily;
            const bikeRevenue = priceDaily > 0 && hourlyTotal >= dailyTotal ? dailyTotal : hourlyTotal;
            bikesTotal += bikeRevenue;
          }

          if (item.insurance) insuranceTotal += 5;
        });

        if (contract.insuranceFlat && parseFloat(contract.insuranceFlat) > 0) {
          insuranceTotal += parseFloat(contract.insuranceFlat);
        }

        if (contract.extraCharges && Array.isArray(contract.extraCharges)) {
          contract.extraCharges.forEach(charge => {
            const chargeAmount = parseFloat(charge.amount) || 0;
            if (chargeAmount !== 0) extrasTotal += chargeAmount;
          });
        }

        const total = bikesTotal + insuranceTotal + extrasTotal;
        const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);

        monthlySummary[monthIdx].Contratti += 1;
        monthlySummary[monthIdx]['Ore Totali'] = +(monthlySummary[monthIdx]['Ore Totali'] + hours).toFixed(1);
        monthlySummary[monthIdx]['Fatturato Noleggio'] = +(monthlySummary[monthIdx]['Fatturato Noleggio'] + bikesTotal).toFixed(2);
        monthlySummary[monthIdx]['Fatturato Assicurazioni'] = +(monthlySummary[monthIdx]['Fatturato Assicurazioni'] + insuranceTotal).toFixed(2);
        monthlySummary[monthIdx]['Fatturato Extra'] = +(monthlySummary[monthIdx]['Fatturato Extra'] + extrasTotal).toFixed(2);
        monthlySummary[monthIdx]['Fatturato Totale'] = +(monthlySummary[monthIdx]['Fatturato Totale'] + total).toFixed(2);

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
        monthlyDailyData[monthIdx][dayKey]['Fatturato Noleggio'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Noleggio'] + bikesTotal).toFixed(2);
        monthlyDailyData[monthIdx][dayKey]['Fatturato Assicurazioni'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Assicurazioni'] + insuranceTotal).toFixed(2);
        monthlyDailyData[monthIdx][dayKey]['Fatturato Extra'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Extra'] + extrasTotal).toFixed(2);
        monthlyDailyData[monthIdx][dayKey]['Fatturato Totale'] = +(monthlyDailyData[monthIdx][dayKey]['Fatturato Totale'] + total).toFixed(2);
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

      const detailRows = exportContracts
        .filter(c => new Date(c.startAt || c.createdAt).getFullYear() === selectedYear)
        .map(c => {
          const startDate = new Date(c.startAt || c.createdAt);
          const endDate = c.endAt ? new Date(c.endAt) : null;

          let bikesTotal = 0;
          let insuranceTotal = 0;
          let extrasTotal = 0;

          c.items?.forEach(item => {
            const priceHourly = parseFloat(item.priceHourly) || 0;
            const priceDaily = parseFloat(item.priceDaily) || 0;

            const itemStartAt = item.startAt ? new Date(item.startAt) : new Date(c.startAt || c.createdAt);
            const itemEndAt = item.returnedAt ? new Date(item.returnedAt) : new Date(c.endAt || new Date());
            const durationMs = Math.max(0, itemEndAt - itemStartAt);
            const durationMinutes = durationMs / (1000 * 60);
            const oreFatturate = Math.max(1, Math.ceil(durationMinutes / 60));

            if (item.kind === 'bike' || item.kind === 'accessory') {
              const hourlyTotal = oreFatturate * priceHourly;
              const dailyTotal = priceDaily;
              const bikeRevenue = priceDaily > 0 && hourlyTotal >= dailyTotal ? dailyTotal : hourlyTotal;
              bikesTotal += bikeRevenue;
            }

            if (item.insurance) insuranceTotal += 5;
          });

          if (c.insuranceFlat && parseFloat(c.insuranceFlat) > 0) {
            insuranceTotal += parseFloat(c.insuranceFlat);
          }

          if (c.extraCharges && Array.isArray(c.extraCharges)) {
            c.extraCharges.forEach(charge => {
              const chargeAmount = parseFloat(charge.amount) || 0;
              if (chargeAmount !== 0) extrasTotal += chargeAmount;
            });
          }

          const hours = calculateHours(c.startAt, c.endAt || c.createdAt);
          const total = bikesTotal + insuranceTotal + extrasTotal;
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
            'Noleggio': +bikesTotal.toFixed(2),
            'Assicurazioni': +insuranceTotal.toFixed(2),
            'Extra': +extrasTotal.toFixed(2),
            'Totale': +total.toFixed(2),
            'Metodo Pagamento': c.paymentMethod || '',
            'Pagato': (c.paymentCompleted || c.paid) ? 'Sì' : 'No',
            'Location': c.location?.name || '',
            'Note': c.notes || ''
          };
        });

     const wsDetail = XLSX.utils.json_to_sheet(detailRows);
     XLSX.utils.book_append_sheet(workbook, wsDetail, 'Dettaglio Contratti');

      const locationLabel = selectedLocation ? (locations.find(l => l._id === selectedLocation)?.name || 'Tutte') : 'Tutte';
      const fileName = `Report_Annuale_${locationLabel.replace(/[^A-Za-z0-9]/g, '_')}_${selectedYear}.xlsx`;
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
          <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>Esporta statistiche dettagliate in Excel con riepilogo mensile, totali giornalieri e dettaglio contratti</p>
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
        {user?.role === 'superadmin' && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Location</label>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={{
              padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', fontSize: '16px'
            }}>
              <option value="">Tutte le location</option>
              {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>Auto-refresh</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Aggiorna ogni 60s</span>
          </div>
          {lastUpdate && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}</div>}
        </div>
          <button onClick={exportToExcel} disabled={loading} style={{
            padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none',
            borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: '600'
          }}>📊 Esporta Excel</button>
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
     </div>
   );
 };

export default ExcelExport;