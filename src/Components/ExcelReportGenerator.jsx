import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../services/api.js';
import { calculateSeparateTotals } from '../utils/contractCalculations.js';

const ExcelReportGenerator = ({ user }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });



  // Funzione per calcolare il totale di un contratto (usa la funzione separata)
  const calculateContractTotal = (contract) => {
    const totals = calculateSeparateTotals(contract);
    return totals.total;
  };

  const generateExcelReport = async () => {
    setIsGenerating(true);
    try {
      // Carica tutti i dati necessari
      const [contractsResponse, bikesResponse, accessoriesResponse] = await Promise.all([
        api.get('/api/contracts/history', {
          params: {
            dateFrom: dateRange.from,
            dateTo: dateRange.to
          }
        }),
        api.get('/api/bikes'),
        api.get('/api/accessories')
      ]);

      const contracts = contractsResponse.data;
      const bikes = bikesResponse.data;
      const accessories = accessoriesResponse.data;

      // Crea un nuovo workbook
      const workbook = XLSX.utils.book_new();

      // FOGLIO 1: ANALISI BICI PER TIPO
      const bikeAnalysis = [];
      const bikeStats = {};

      // Raggruppa bici per tipo
      bikes.forEach(bike => {
        const type = bike.type === 'electric' ? 'Elettrica' : 'Muscolare';
        if (!bikeStats[type]) {
          bikeStats[type] = {
            totalBikes: 0,
            totalContracts: 0,
            totalRevenue: 0,
            avgRevenuePerBike: 0
          };
        }
        bikeStats[type].totalBikes++;
      });

      // Calcola statistiche per ogni bici
      contracts.forEach(contract => {
        contract.items?.forEach(item => {
          if (item.kind === 'bike') {
            const bike = bikes.find(b => b._id === item.bike);
            if (bike) {
              const type = bike.type === 'electric' ? 'Elettrica' : 'Muscolare';
              const totals = calculateSeparateTotals(contract);
              const itemRevenue = totals.bikesTotal / (contract.items?.filter(i => i.kind === 'bike').length || 1);
              
              bikeStats[type].totalContracts++;
              bikeStats[type].totalRevenue += itemRevenue;
            }
          }
        });
      });

      // Calcola medie
      Object.keys(bikeStats).forEach(type => {
        if (bikeStats[type].totalBikes > 0) {
          bikeStats[type].avgRevenuePerBike = bikeStats[type].totalRevenue / bikeStats[type].totalBikes;
        }
      });

      // Prepara dati per il foglio
      Object.keys(bikeStats).forEach(type => {
        bikeAnalysis.push({
          'Tipo Bici': type,
          'Numero Bici Totali': bikeStats[type].totalBikes,
          'Contratti Totali': bikeStats[type].totalContracts,
          'Ricavo Totale': bikeStats[type].totalRevenue.toFixed(2),
          'Ricavo Medio per Bici': bikeStats[type].avgRevenuePerBike.toFixed(2),
          'Utilizzo Medio': bikeStats[type].totalBikes > 0 ? (bikeStats[type].totalContracts / bikeStats[type].totalBikes).toFixed(2) : '0.00'
        });
      });

      const ws1 = XLSX.utils.json_to_sheet(bikeAnalysis);
      XLSX.utils.book_append_sheet(workbook, ws1, "Analisi Bici per Tipo");

      // FOGLIO 2: CONTRATTI GIORNALIERI
      const dailyContracts = [];
      const dailyStats = {};

      contracts.forEach(contract => {
        const date = new Date(contract.startAt || contract.createdAt).toLocaleDateString('it-IT');
        if (!dailyStats[date]) {
          dailyStats[date] = {
            contracts: [],
            bikeRevenue: 0,
            insuranceRevenue: 0,
            contractCount: 0
          };
        }
        
        const totals = calculateSeparateTotals(contract);
        dailyStats[date].contracts.push(contract);
        dailyStats[date].bikeRevenue += totals.bikesTotal;
        dailyStats[date].insuranceRevenue += totals.insuranceTotal;
        dailyStats[date].contractCount++;
      });

      // Prepara dati giornalieri
      Object.keys(dailyStats).sort().forEach(date => {
        const dayData = dailyStats[date];
        dailyContracts.push({
          'Data': date,
          'Numero Contratti': dayData.contractCount,
          'Ricavo Solo Noleggio Bici': dayData.bikeRevenue.toFixed(2),
          'Ricavo Solo Assicurazioni': dayData.insuranceRevenue.toFixed(2),
          'Totale Giornaliero': (dayData.bikeRevenue + dayData.insuranceRevenue).toFixed(2)
        });
      });

      // Aggiungi riga totali
      const totalDailyBikes = dailyContracts.reduce((sum, day) => sum + parseFloat(day['Ricavo Solo Noleggio Bici']), 0);
      const totalDailyInsurance = dailyContracts.reduce((sum, day) => sum + parseFloat(day['Ricavo Solo Assicurazioni']), 0);
      const totalDailyRevenue = totalDailyBikes + totalDailyInsurance;
      const totalDailyContracts = dailyContracts.reduce((sum, day) => sum + day['Numero Contratti'], 0);

      dailyContracts.push({});
      dailyContracts.push({
        'Data': 'TOTALE PERIODO',
        'Numero Contratti': totalDailyContracts,
        'Ricavo Solo Noleggio Bici': totalDailyBikes.toFixed(2),
        'Ricavo Solo Assicurazioni': totalDailyInsurance.toFixed(2),
        'Totale Giornaliero': totalDailyRevenue.toFixed(2)
      });

      const ws2 = XLSX.utils.json_to_sheet(dailyContracts);
      XLSX.utils.book_append_sheet(workbook, ws2, "Contratti Giornalieri");

      // FOGLIO 3: RIEPILOGO MENSILE 2025
      const monthlyData = [];
      const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
      ];

      const monthlyStats = {};
      months.forEach((month, index) => {
        monthlyStats[index] = {
          month: month,
          totalRevenue: 0,
          contractCount: 0
        };
      });

      // Calcola statistiche mensili per il 2025
      contracts.forEach(contract => {
        const contractDate = new Date(contract.startAt || contract.createdAt);
        if (contractDate.getFullYear() === 2025) {
          const month = contractDate.getMonth();
          const totals = calculateSeparateTotals(contract);
          monthlyStats[month].totalRevenue += totals.total;
          monthlyStats[month].contractCount++;
        }
      });

      // Prepara dati mensili
      months.forEach((month, index) => {
        monthlyData.push({
          'Mese 2025': month,
          'Contratti': monthlyStats[index].contractCount,
          'Ricavo Totale': monthlyStats[index].totalRevenue.toFixed(2)
        });
      });

      // Aggiungi totale annuale
      const yearlyTotal = Object.values(monthlyStats).reduce((sum, month) => sum + month.totalRevenue, 0);
      const yearlyContracts = Object.values(monthlyStats).reduce((sum, month) => sum + month.contractCount, 0);

      monthlyData.push({});
      monthlyData.push({
        'Mese 2025': 'TOTALE ANNO',
        'Contratti': yearlyContracts,
        'Ricavo Totale': yearlyTotal.toFixed(2)
      });

      const ws3 = XLSX.utils.json_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(workbook, ws3, "Riepilogo Mensile 2025");

      // FOGLIO 4: RICAVI MENSILI PER TIPO BICI (SOLO NOLEGGIO)
      const monthlyByType = [];
      const monthlyTypeStats = {};

      months.forEach((month, index) => {
        monthlyTypeStats[index] = {
          month: month,
          elettriche: 0,
          muscolari: 0,
          assicurazioni: 0
        };
      });

      contracts.forEach(contract => {
        const contractDate = new Date(contract.startAt || contract.createdAt);
        if (contractDate.getFullYear() === 2025) {
          const month = contractDate.getMonth();
          const totals = calculateSeparateTotals(contract);
          
          // Aggiungi assicurazioni al mese
          monthlyTypeStats[month].assicurazioni += totals.insuranceTotal;
          
          contract.items?.forEach(item => {
            if (item.kind === 'bike') {
              const bike = bikes.find(b => b._id === item.bike);
              if (bike) {
                const itemRevenue = totals.bikesTotal / (contract.items?.filter(i => i.kind === 'bike').length || 1);
                
                if (bike.type === 'electric') {
                  monthlyTypeStats[month].elettriche += itemRevenue;
                } else {
                  monthlyTypeStats[month].muscolari += itemRevenue;
                }
              }
            }
          });
        }
      });

      months.forEach((month, index) => {
        monthlyByType.push({
          'Mese 2025': month,
          'Noleggio Bici Elettriche': monthlyTypeStats[index].elettriche.toFixed(2),
          'Noleggio Bici Muscolari': monthlyTypeStats[index].muscolari.toFixed(2),
          'Ricavo Assicurazioni': monthlyTypeStats[index].assicurazioni.toFixed(2),
          'Totale Noleggi': (monthlyTypeStats[index].elettriche + monthlyTypeStats[index].muscolari).toFixed(2),
          'Totale Complessivo': (monthlyTypeStats[index].elettriche + monthlyTypeStats[index].muscolari + monthlyTypeStats[index].assicurazioni).toFixed(2)
        });
      });

      // Totali per tipo
      const totalElettric = Object.values(monthlyTypeStats).reduce((sum, month) => sum + month.elettriche, 0);
      const totalMuscular = Object.values(monthlyTypeStats).reduce((sum, month) => sum + month.muscolari, 0);
      const totalInsurance = Object.values(monthlyTypeStats).reduce((sum, month) => sum + month.assicurazioni, 0);

      monthlyByType.push({});
      monthlyByType.push({
        'Mese 2025': 'TOTALE ANNO',
        'Noleggio Bici Elettriche': totalElettric.toFixed(2),
        'Noleggio Bici Muscolari': totalMuscular.toFixed(2),
        'Ricavo Assicurazioni': totalInsurance.toFixed(2),
        'Totale Noleggi': (totalElettric + totalMuscular).toFixed(2),
        'Totale Complessivo': (totalElettric + totalMuscular + totalInsurance).toFixed(2)
      });

      const ws4 = XLSX.utils.json_to_sheet(monthlyByType);
      XLSX.utils.book_append_sheet(workbook, ws4, "Noleggi vs Assicurazioni");

      // FOGLIO 5: TOP BICI PIÙ UTILIZZATE
      const bikeUsage = {};
      
      contracts.forEach(contract => {
        contract.items?.forEach(item => {
          if (item.kind === 'bike') {
            const bike = bikes.find(b => b._id === item.bike);
            if (bike) {
              if (!bikeUsage[bike._id]) {
                bikeUsage[bike._id] = {
                  name: bike.name,
                  type: bike.type === 'electric' ? 'Elettrica' : 'Muscolare',
                  barcode: bike.barcode,
                  usageCount: 0,
                  totalRevenue: 0
                };
              }
              
              bikeUsage[bike._id].usageCount++;
              const totals = calculateSeparateTotals(contract);
              const itemRevenue = totals.bikesTotal / (contract.items?.filter(i => i.kind === 'bike').length || 1);
              bikeUsage[bike._id].totalRevenue += itemRevenue;
            }
          }
        });
      });

      const topBikes = Object.values(bikeUsage)
        .sort((a, b) => b.usageCount - a.usageCount)
        .map(bike => ({
          'Nome Bici': bike.name,
          'Tipo': bike.type,
          'Barcode': bike.barcode,
          'Volte Utilizzata': bike.usageCount,
          'Ricavo Totale': bike.totalRevenue.toFixed(2),
          'Ricavo Medio': bike.usageCount > 0 ? (bike.totalRevenue / bike.usageCount).toFixed(2) : '0.00'
        }));

      const ws5 = XLSX.utils.json_to_sheet(topBikes);
      XLSX.utils.book_append_sheet(workbook, ws5, "Top Bici Utilizzate");

      // FOGLIO 6: DETTAGLIO CONTRATTI COMPLETO
      const contractDetails = contracts.map(contract => {
        const startDate = new Date(contract.startAt || contract.createdAt);
        const endDate = new Date(contract.endAt || new Date());
        const durationHours = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60)));
        const durationDays = Math.max(1, Math.ceil(durationHours / 24));
        const totals = calculateSeparateTotals(contract);
        
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
          'RICAVO SOLO NOLEGGIO BICI': totals.bikesTotal.toFixed(2),
          'RICAVO SOLO ASSICURAZIONI': totals.insuranceTotal.toFixed(2),
          'TOTALE CONTRATTO': totals.total.toFixed(2),
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

      const ws6 = XLSX.utils.json_to_sheet(contractDetails);
      XLSX.utils.book_append_sheet(workbook, ws6, "Dettaglio Contratti");

      // Genera e scarica il file
      const fileName = `Report_Completo_${dateRange.from || 'tutti'}_${dateRange.to || 'oggi'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      alert('✅ Report Excel generato con successo!');

    } catch (error) {
      console.error('Errore generazione report:', error);
      alert('❌ Errore nella generazione del report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        📊 Report Excel Avanzato
      </h3>
      
      <p style={{
        margin: '0 0 20px 0',
        color: '#64748b',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        Genera un file Excel completo con 6 fogli di analisi:
        <br />• Analisi bici per tipo (elettriche vs muscolari)
        <br />• Contratti giornalieri (noleggio e assicurazione separati)
        <br />• Riepilogo mensile 2025
        <br />• Noleggi vs Assicurazioni (separazione completa ricavi)
        <br />• Top bici più utilizzate
        <br />• Dettaglio contratti (NOLEGGIO e ASSICURAZIONE in colonne separate)
      </p>

      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>Da:</label>
          <input 
            type="date" 
            value={dateRange.from} 
            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>A:</label>
          <input 
            type="date" 
            value={dateRange.to} 
            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <button
        onClick={generateExcelReport}
        disabled={isGenerating}
        style={{
          padding: '12px 24px',
          background: isGenerating ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {isGenerating ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid transparent',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Generando Report...
          </>
        ) : (
          <>📊 Genera Report Excel Completo</>
        )}
      </button>
    </div>
  );
};

export default ExcelReportGenerator;