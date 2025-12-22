import React, { useState } from 'react';
import { api } from '../services/api.js';
import * as XLSX from 'xlsx';

const DataExporter = ({ user }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState('contracts');
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('Nessun dato da esportare');
      return;
    }

    // Converte i dati in formato CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Gestisce valori con virgole o caratteri speciali
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    // Crea e scarica il file
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

  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) {
      alert('Nessun dato da esportare');
      return;
    }

    // Crea un nuovo workbook
    const wb = XLSX.utils.book_new();
    
    // Converte i dati in un worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Aggiunge il worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Dati');
    
    // Salva il file
    const excelFilename = filename.replace('.csv', '.xlsx');
    XLSX.writeFile(wb, excelFilename);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data = [];
      let filename = '';

      switch (exportType) {
        case 'contracts':
          const contractsResponse = await api.get('/api/contracts/history', {
            params: {
              dateFrom: dateRange.from,
              dateTo: dateRange.to
            }
          });
          data = contractsResponse.data.map(contract => {
            // Calcola SOLO i ricavi delle bici (SENZA assicurazione) per CSV export
            const calculateBikeOnlyRevenue = (contract) => {
              // Se c'è finalAmount, sottrai l'assicurazione per ottenere i ricavi bici
              if (contract.finalAmount && contract.finalAmount > 0) {
                let totalInsurance = 0;
                
                // Calcola assicurazione items
                contract.items?.forEach(item => {
                  if (item.insurance) {
                    totalInsurance += parseFloat(item.insuranceFlat) || 5;
                  }
                });
                
                // Aggiungi assicurazione contratto
                if (contract.insuranceFlat) {
                  totalInsurance += parseFloat(contract.insuranceFlat);
                }
                
                const bikeRevenue = contract.finalAmount - totalInsurance;
                return Math.max(0, bikeRevenue);
              }
              
              // Fallback: calcolo dinamico
              const startDate = new Date(contract.startAt || contract.createdAt);
              const endDate = new Date(contract.endAt || new Date());
              const durationMs = Math.max(0, endDate - startDate);
              const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
              const durationDays = Math.max(1, Math.ceil(durationHours / 24));
              
              const isReservation = contract.status === 'reserved' || contract.isReservation;
              let bikeRevenue = 0;
              
              contract.items?.forEach(item => {
                const priceHourly = parseFloat(item.priceHourly) || 0;
                const priceDaily = parseFloat(item.priceDaily) || 0;
                
                let itemRevenue = 0;
                if (isReservation) {
                  itemRevenue = priceDaily * durationDays;
                } else {
                  const hourlyTotal = priceHourly * durationHours;
                  const dailyTotal = priceDaily * durationDays;
                  itemRevenue = (priceDaily > 0 && hourlyTotal >= dailyTotal) ? dailyTotal : hourlyTotal;
                }
                
                bikeRevenue += itemRevenue;
              });
              
              return bikeRevenue;
            };
            
            const bikeOnlyRevenue = calculateBikeOnlyRevenue(contract);
            const startDate = new Date(contract.startAt || contract.createdAt);
            const endDate = new Date(contract.endAt || new Date());
            const durationHours = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60)));
            const durationDays = Math.max(1, Math.ceil(durationHours / 24));
            
            // Calcola separatamente il subtotale noleggio e l'assicurazione
            const isReservation = contract.status === 'reserved' || contract.isReservation;
            let subtotalNoleggio = 0;
            let assicurazioneItems = 0;
            
            contract.items?.forEach(item => {
              // Conta TUTTI gli item (anche restituiti) per calcolare i ricavi generati
              const priceHourly = parseFloat(item.priceHourly) || 0;
              const priceDaily = parseFloat(item.priceDaily) || 0;
              
              let itemTotal = 0;
              if (isReservation) {
                itemTotal = priceDaily * durationDays;
              } else {
                const hourlyTotal = priceHourly * durationHours;
                const dailyTotal = priceDaily * durationDays;
                itemTotal = (priceDaily > 0 && hourlyTotal >= dailyTotal) ? dailyTotal : hourlyTotal;
              }
              
              subtotalNoleggio += itemTotal;
              
              if (item.insurance) {
                assicurazioneItems += parseFloat(item.insuranceFlat) || 5;
              }
            });
            
            const assicurazioneContratto = contract.insuranceFlat ? parseFloat(contract.insuranceFlat) : 0;
            const assicurazioneTotale = assicurazioneItems + assicurazioneContratto;
            
            return {
              'ID Contratto': contract._id,
              'Cliente': contract.customer?.name || '',
              'Telefono': contract.customer?.phone || '',
              'Data Inizio': startDate.toLocaleDateString('it-IT') + ' ' + startDate.toLocaleTimeString('it-IT'),
              'Data Fine': contract.endAt ? (endDate.toLocaleDateString('it-IT') + ' ' + endDate.toLocaleTimeString('it-IT')) : 'In corso',
              'Durata Ore': durationHours,
              'Durata Giorni': durationDays,
              'Stato': contract.status,
              'Tipo Contratto': (contract.status === 'reserved' || contract.isReservation) ? 'Prenotazione' : 'Contratto Nuovo',
              'Numero Articoli': contract.items?.length || 0,
              'Articoli Dettaglio': contract.items?.map(item => {
                const priceHourly = parseFloat(item.priceHourly) || 0;
                const priceDaily = parseFloat(item.priceDaily) || 0;
                return `${item.name} (${item.kind}) - €${priceHourly}/h €${priceDaily}/g${item.insurance ? ' +Assic' : ''}`;
              }).join('; ') || '',
              'Subtotale Noleggio': subtotalNoleggio.toFixed(2),
              'Assicurazione Items': assicurazioneItems.toFixed(2),
              'Assicurazione Contratto': assicurazioneContratto.toFixed(2),
              'Assicurazione Totale': assicurazioneTotale.toFixed(2),
              'Ricavi Solo Bici': bikeOnlyRevenue.toFixed(2),
              'Prezzo Bloccato': contract.finalAmount ? 'Sì' : 'No',
              'Prezzo Personalizzato': contract.customFinalPrice ? 'Sì' : 'No',
              'Metodo Pagamento': contract.paymentMethod || 'Non specificato',
              'Pagato': contract.paid ? 'Sì' : 'No',
              'Pagamento Completato': contract.paymentCompleted ? 'Sì' : 'No',
              'Data Pagamento': contract.paymentDate ? new Date(contract.paymentDate).toLocaleDateString('it-IT') : '',
              'Location': contract.location?.name || '',
              'Creato Da': contract.createdBy || '',
              'Note': contract.notes || '',
              'Note Pagamento': contract.paymentNotes || ''
            };
          });
          filename = `contratti_${dateRange.from || 'tutti'}_${dateRange.to || 'oggi'}.csv`;
          break;

        case 'bikes':
          const bikesResponse = await api.get('/api/bikes');
          data = bikesResponse.data.map(bike => ({
            'ID': bike._id,
            'Nome': bike.name,
            'Tipo': bike.type,
            'Barcode': bike.barcode,
            'Prezzo Orario': bike.priceHourly,
            'Prezzo Giornaliero': bike.priceDaily,
            'Stato': bike.status,
            'Location': bike.location?.name || '',
            'Foto URL': bike.photoUrl || ''
          }));
          filename = `bici_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'accessories':
          const accessoriesResponse = await api.get('/api/accessories');
          data = accessoriesResponse.data.map(accessory => ({
            'ID': accessory._id,
            'Nome': accessory.name,
            'Barcode': accessory.barcode,
            'Prezzo Orario': accessory.priceHourly,
            'Prezzo Giornaliero': accessory.priceDaily,
            'Stato': accessory.status,
            'Location': accessory.location?.name || '',
            'Foto URL': accessory.photoUrl || ''
          }));
          filename = `accessori_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'summary':
          const summaryResponse = await api.get('/api/reports/summary', {
            params: {
              from: dateRange.from,
              to: dateRange.to
            }
          });
          data = [{
            'Periodo Da': dateRange.from || 'Inizio',
            'Periodo A': dateRange.to || 'Oggi',
            'Totale Incassato': summaryResponse.data.total?.toFixed(2) || '0.00',
            'Contratti Chiusi': summaryResponse.data.count || 0,
            'Location': user?.location?.name || 'Tutte',
            'Data Esportazione': new Date().toLocaleDateString('it-IT')
          }];
          filename = `riepilogo_${dateRange.from || 'tutti'}_${dateRange.to || 'oggi'}.csv`;
          break;

        default:
          throw new Error('Tipo di esportazione non valido');
      }

      if (exportFormat === 'excel') {
        exportToExcel(data, filename);
        const excelFilename = filename.replace('.csv', '.xlsx');
        alert(`✅ Esportazione Excel completata! File: ${excelFilename}`);
      } else {
        exportToCSV(data, filename);
        alert(`✅ Esportazione CSV completata! File: ${filename}`);
      }

    } catch (error) {
      console.error('Errore durante l\'esportazione:', error);
      alert('❌ Errore durante l\'esportazione: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      background: '#f8fafc',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      marginTop: '24px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📥 Esportazione Dati
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <select
          value={exportType}
          onChange={(e) => setExportType(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white'
          }}
        >
          <option value="contracts">📋 Contratti</option>
          <option value="bikes">🚴 Bici</option>
          <option value="accessories">🎒 Accessori</option>
          <option value="summary">📊 Riepilogo</option>
        </select>

        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: 'white'
          }}
        >
          <option value="csv">📄 CSV</option>
          <option value="excel">📊 Excel</option>
        </select>

        <input
          type="date"
          placeholder="Data da"
          value={dateRange.from}
          onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        />

        <input
          type="date"
          placeholder="Data a"
          value={dateRange.to}
          onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            background: isExporting ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isExporting ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isExporting ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff40',
                borderTop: '2px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Esportazione...
            </>
          ) : (
            <>
              📥 Esporta {exportFormat === 'excel' ? 'Excel' : 'CSV'}
            </>
          )}
        </button>

        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          {exportType === 'contracts' && 'Esporta tutti i contratti nel periodo selezionato'}
          {exportType === 'bikes' && 'Esporta l\'elenco completo delle bici'}
          {exportType === 'accessories' && 'Esporta l\'elenco completo degli accessori'}
          {exportType === 'summary' && 'Esporta il riepilogo finanziario del periodo'}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DataExporter;