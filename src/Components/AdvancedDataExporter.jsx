import React, { useState } from 'react';
import { api } from '../services/api.js';
import * as XLSX from 'xlsx';

const AdvancedDataExporter = ({ user }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('contracts');
  const [exportFormat, setExportFormat] = useState('excel');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  // Funzione per generare statistiche mensili per anno
  const generateMonthlyStats = (contracts) => {
    const stats = {};
    const currentYear = new Date().getFullYear();
    
    // Inizializza tutti i mesi per l'anno corrente
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      stats[year] = {};
      for (let month = 1; month <= 12; month++) {
        const monthKey = month.toString().padStart(2, '0');
        stats[year][monthKey] = {
          totalRevenue: 0,
          bikeRevenue: 0,
          insuranceRevenue: 0,
          contractsCount: 0
        };
      }
    }

    // Processa i contratti
    contracts.forEach(contract => {
      if (contract.paymentCompleted && contract.finalAmount > 0) {
        const date = new Date(contract.endAt || contract.createdAt);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        if (stats[year] && stats[year][month]) {
          stats[year][month].totalRevenue += contract.finalAmount;
          stats[year][month].bikeRevenue += (contract.totals?.subtotal || 0);
          // Non accumulare assicurazione nelle statistiche esportate
          stats[year][month].contractsCount += 1;
        }
      }
    });

    return stats;
  };

  // Funzione per generare statistiche bici
  const generateBikeStats = (contracts, bikes) => {
    const bikeStats = {};
    const bikeTypeStats = {
      'ebike-full': { count: 0, revenue: 0, hours: 0 },
      'ebike-front': { count: 0, revenue: 0, hours: 0 },
      'ebike-other': { count: 0, revenue: 0, hours: 0 },
      'muscolare': { count: 0, revenue: 0, hours: 0 },
      'altro': { count: 0, revenue: 0, hours: 0 }
    };

    // Crea mappa delle bici per ID
    const bikeMap = {};
    bikes.forEach(bike => {
      bikeMap[bike._id] = bike;
      bikeStats[bike._id] = {
        name: bike.name,
        barcode: bike.barcode,
        type: bike.type,
        model: bike.model || '',
        purchasePrice: bike.purchasePrice || 0,
        totalRevenue: 0,
        totalRentals: 0,
        totalHours: 0,
        isRepaid: false,
        remainingAmount: bike.purchasePrice || 0
      };
    });

    // Processa i contratti per calcolare statistiche
    contracts.forEach(contract => {
      if (contract.paymentCompleted && contract.items) {
        contract.items.forEach(item => {
          if (item.kind === 'bike' && bikeStats[item.refId]) {
            const bike = bikeMap[item.refId];
            const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
            const itemRevenue = calculateItemRevenue(contract, item);

            bikeStats[item.refId].totalRevenue += itemRevenue;
            bikeStats[item.refId].totalRentals += 1;
            bikeStats[item.refId].totalHours += hours;

            // Calcola se è ripagata
            if (bike && bike.purchasePrice > 0) {
              bikeStats[item.refId].remainingAmount = Math.max(0, bike.purchasePrice - bikeStats[item.refId].totalRevenue);
              bikeStats[item.refId].isRepaid = bikeStats[item.refId].totalRevenue >= bike.purchasePrice;
            }

            // Statistiche per tipo
            if (bike && bikeTypeStats[bike.type]) {
              bikeTypeStats[bike.type].count += 1;
              bikeTypeStats[bike.type].revenue += itemRevenue;
              bikeTypeStats[bike.type].hours += hours;
            }
          }
        });
      }
    });

    return { bikeStats, bikeTypeStats };
  };

  const calculateHours = (startAt, endAt) => {
    if (!startAt || !endAt) return 0;
    const start = new Date(startAt);
    const end = new Date(endAt);
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const calculateItemRevenue = (contract, item) => {
    const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
    if (hours <= 24) {
      return (item.priceHourly || 0) * hours;
    } else {
      const days = Math.ceil(hours / 24);
      return (item.priceDaily || 0) * days;
    }
  };

  const exportToExcel = async (data, filename) => {
    try {
      setIsExporting(true);

      // Carica dati aggiuntivi se necessario
      const [contractsRes, bikesRes] = await Promise.all([
        api.get('/api/contracts'),
        api.get('/api/bikes')
      ]);

      const contracts = contractsRes.data;
      const bikes = bikesRes.data;

      // Genera statistiche
      const monthlyStats = generateMonthlyStats(contracts);
      const { bikeStats, bikeTypeStats } = generateBikeStats(contracts, bikes);

      // Crea workbook Excel
      const wb = XLSX.utils.book_new();

      // Sheet 1: Dati originali (contratti)
      if (data && data.length > 0) {
        const ws1 = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws1, 'Contratti');
      }

      // Sheet 2: Statistiche mensili
      const monthlyData = [];
      Object.keys(monthlyStats).forEach(year => {
        const yearData = { Anno: year };
        Object.keys(monthlyStats[year]).forEach(month => {
          const monthName = new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'short' });
          yearData[`${monthName}_Totale`] = monthlyStats[year][month].totalRevenue.toFixed(2);
          yearData[`${monthName}_Bici`] = monthlyStats[year][month].bikeRevenue.toFixed(2);
          // Assicurazione rimossa dall'esportazione su richiesta
          yearData[`${monthName}_Contratti`] = monthlyStats[year][month].contractsCount;
        });
        monthlyData.push(yearData);
      });
      
      if (monthlyData.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Fatturato Mensile');
      }

      // Sheet 3: Statistiche bici individuali
      const bikeStatsArray = Object.values(bikeStats).map(stat => ({
        Nome: stat.name,
        Barcode: stat.barcode,
        Tipo: stat.type,
        Modello: stat.model,
        'Prezzo Acquisto': stat.purchasePrice.toFixed(2),
        'Ricavi Totali': stat.totalRevenue.toFixed(2),
        'Noleggi Totali': stat.totalRentals,
        'Ore Totali': stat.totalHours.toFixed(1),
        'È Ripagata': stat.isRepaid ? 'SÌ' : 'NO',
        'Importo Mancante': stat.remainingAmount.toFixed(2)
      })).sort((a, b) => b['Ricavi Totali'] - a['Ricavi Totali']);

      if (bikeStatsArray.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(bikeStatsArray);
        XLSX.utils.book_append_sheet(wb, ws3, 'Statistiche Bici');
      }

      // Sheet 4: Statistiche per tipo bici
      const typeStatsArray = Object.keys(bikeTypeStats).map(type => ({
        Tipo: type,
        'Noleggi Totali': bikeTypeStats[type].count,
        'Ricavi Totali': bikeTypeStats[type].revenue.toFixed(2),
        'Ore Totali': bikeTypeStats[type].hours.toFixed(1),
        'Ricavo Medio': bikeTypeStats[type].count > 0 ? (bikeTypeStats[type].revenue / bikeTypeStats[type].count).toFixed(2) : '0.00'
      }));

      if (typeStatsArray.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(typeStatsArray);
        XLSX.utils.book_append_sheet(wb, ws4, 'Statistiche per Tipo');
      }

      // Scarica il file
      XLSX.writeFile(wb, filename);

    } catch (error) {
      console.error('Errore esportazione Excel:', error);
      alert('Errore durante l\'esportazione: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('Nessun dato da esportare');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      let endpoint = '/api/contracts';
      let params = {};

      // Applica filtri data se specificati
      if (dateRange.from) params.dateFrom = dateRange.from;
      if (dateRange.to) params.dateTo = dateRange.to;

      // Determina endpoint in base al tipo
      switch (exportType) {
        case 'contracts':
          endpoint = '/api/contracts';
          break;
        case 'bikes':
          endpoint = '/api/bikes';
          break;
        case 'accessories':
          endpoint = '/api/accessories';
          break;
        default:
          endpoint = '/api/contracts';
      }

      const response = await api.get(endpoint, { params });
      let data = response.data;

      // Processa i dati per l'esportazione
      if (exportType === 'contracts') {
        data = data.map(contract => ({
          ID: contract._id,
          Cliente: contract.customer?.name || '',
          Telefono: contract.customer?.phone || '',
          'Data Inizio': new Date(contract.startAt).toLocaleDateString('it-IT'),
          'Data Fine': contract.endAt ? new Date(contract.endAt).toLocaleDateString('it-IT') : '',
          Stato: contract.status,
          'Metodo Pagamento': contract.paymentMethod || '',
          'Importo Finale': contract.finalAmount || 0,
          'Pagamento Completato': contract.paymentCompleted ? 'Sì' : 'No',
          'Numero Items': contract.items?.length || 0,
          Note: contract.notes || ''
        }));
      }

      // Genera nome file
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${exportType}_${timestamp}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;

      // Esporta
      if (exportFormat === 'excel') {
        await exportToExcel(data, filename);
      } else {
        exportToCSV(data, filename);
      }

    } catch (error) {
      console.error('Errore esportazione:', error);
      alert('Errore durante l\'esportazione: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      marginBottom: '20px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
        📊 Esportazione Dati Avanzata
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Tipo Dati
          </label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="contracts">📋 Contratti</option>
            <option value="bikes">🚲 Bici</option>
            <option value="accessories">🎒 Accessori</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Formato
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="excel">📊 Excel (con statistiche)</option>
            <option value="csv">📄 CSV</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Data Inizio
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Data Fine
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px'
            }}
          />
        </div>
      </div>

      {exportFormat === 'excel' && (
        <div style={{
          padding: '12px',
          background: '#dbeafe',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#1e40af'
        }}>
          <strong>📊 Excel Include:</strong>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Dati originali</li>
            <li>Fatturato mensile per anno</li>
            <li>Statistiche bici individuali (ROI, ore utilizzo)</li>
            <li>Statistiche per tipo bici (muscolare vs elettrica)</li>
            <li>Separazione ricavi bici/assicurazione</li>
          </ul>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          padding: '12px 24px',
          background: isExporting ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {isExporting ? '⏳ Esportando...' : `📥 Esporta ${exportFormat.toUpperCase()}`}
      </button>
    </div>
  );
};

export default AdvancedDataExporter;