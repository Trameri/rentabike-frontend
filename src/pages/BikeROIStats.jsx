import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { jwtDecode } from 'jwt-decode';

const BikeROIStats = () => {
  const [bikes, setBikes] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [bikeStats, setBikeStats] = useState([]);
  const [typeStats, setTypeStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState('totalRevenue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [contractsCount, setContractsCount] = useState(0);
  const [newContractsAlert, setNewContractsAlert] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (e) {
        console.error('Errore decodifica token:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Auto-refresh ogni 30 secondi (più frequente)
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 secondi

    return () => clearInterval(interval);
  }, [autoRefresh, user]);

  // Refresh quando la pagina diventa visibile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // Refresh quando la finestra torna in focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 BikeROIStats: Caricamento dati iniziato...');
      
      const [bikesRes, contractsRes] = await Promise.all([
        api.get('/api/bikes'),
        api.get('/api/contracts')
      ]);

      console.log('📊 BikeROIStats: Dati ricevuti:', {
        bikes: bikesRes.data.length,
        contracts: contractsRes.data.length,
        previousContractsCount: contractsCount
      });

      setBikes(bikesRes.data);
      
      // Controlla se ci sono nuovi contratti
      if (contractsCount > 0 && contractsRes.data.length > contractsCount) {
        console.log('🎉 BikeROIStats: Nuovi contratti rilevati!', {
          previous: contractsCount,
          current: contractsRes.data.length,
          new: contractsRes.data.length - contractsCount
        });
        setNewContractsAlert(true);
        setTimeout(() => setNewContractsAlert(false), 5000); // Nasconde dopo 5 secondi
      }
      
      setContracts(contractsRes.data);
      setContractsCount(contractsRes.data.length);
      calculateStats(bikesRes.data, contractsRes.data);
      setLastUpdate(new Date());
      
      console.log('✅ BikeROIStats: Aggiornamento completato');
    } catch (error) {
      console.error('❌ BikeROIStats: Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (startAt, endAt) => {
    if (!startAt || !endAt) return 0;
    const start = new Date(startAt);
    const end = new Date(endAt);
    return Math.max(0, (end - start) / (1000 * 60 * 60));
  };

  const calculateItemRevenue = (contract, item) => {
    console.log('💰 calculateItemRevenue - SOLO BICI (ROI):', {
      contractId: contract._id?.slice(-6),
      itemName: item.name,
      finalAmount: contract.finalAmount,
      itemPriceHourly: item.priceHourly,
      itemPriceDaily: item.priceDaily
    });
    
    // Se c'è finalAmount, calcola la proporzione di questo item sui ricavi totali bici
    if (contract.finalAmount && contract.finalAmount > 0) {
      // Calcola assicurazione totale
      let totalInsurance = 0;
      contract.items?.forEach(contractItem => {
        if (contractItem.insurance) {
          totalInsurance += parseFloat(contractItem.insuranceFlat) || 5;
        }
      });
      if (contract.insuranceFlat) {
        totalInsurance += parseFloat(contract.insuranceFlat);
      }
      
      // Ricavi totali bici = finalAmount - assicurazione
      const totalBikeRevenue = contract.finalAmount - totalInsurance;
      
      // Se c'è un solo item, tutto il ricavo va a lui
      if (contract.items && contract.items.length === 1) {
        console.log('💰 Singolo item - ricavo totale bici:', totalBikeRevenue);
        return Math.max(0, totalBikeRevenue);
      }
      
      // Se ci sono più item, distribuisci proporzionalmente
      const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
      let thisItemValue = 0;
      let totalItemsValue = 0;
      
      contract.items.forEach(contractItem => {
        let itemValue = 0;
        if (hours <= 24) {
          itemValue = (contractItem.priceHourly || 0) * hours;
        } else {
          const days = Math.ceil(hours / 24);
          itemValue = (contractItem.priceDaily || 0) * days;
        }
        
        totalItemsValue += itemValue;
        if (contractItem.name === item.name) {
          thisItemValue = itemValue;
        }
      });
      
      if (totalItemsValue > 0) {
        const proportionalRevenue = (totalBikeRevenue * thisItemValue) / totalItemsValue;
        console.log('💰 Distribuzione proporzionale:', {
          totalBikeRevenue,
          thisItemValue,
          totalItemsValue,
          proportionalRevenue
        });
        return proportionalRevenue;
      }
    }
    
    // Fallback: calcolo dinamico
    const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
    let itemRevenue = 0;
    
    if (hours <= 24) {
      itemRevenue = (item.priceHourly || 0) * hours;
      console.log('💰 Fallback orario:', item.priceHourly, 'x', hours, '=', itemRevenue);
    } else {
      const days = Math.ceil(hours / 24);
      itemRevenue = (item.priceDaily || 0) * days;
      console.log('💰 Fallback giornaliero:', item.priceDaily, 'x', days, '=', itemRevenue);
    }
    
    console.log('💰 Ricavo finale SOLO BICI:', itemRevenue);
    return itemRevenue;
  };

  const calculateStats = (bikesData, contractsData) => {
    console.log('🧮 BikeROIStats: Calcolo statistiche iniziato...', {
      bikes: bikesData.length,
      contracts: contractsData.length
    });
    
    const stats = {};
    const typeStatsData = {
      'ebike-full': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'ebike-front': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'ebike-other': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'muscolare': { count: 0, revenue: 0, hours: 0, repaidCount: 0 },
      'altro': { count: 0, revenue: 0, hours: 0, repaidCount: 0 }
    };

    // Inizializza statistiche per ogni bici
    bikesData.forEach(bike => {
      console.log('🚴 Inizializzazione bici:', {
        id: bike._id?.slice(-6),
        name: bike.name,
        purchasePrice: bike.purchasePrice,
        model: bike.model,
        type: bike.type
      });
      
      stats[bike._id] = {
        ...bike,
        totalRevenue: 0,
        totalRentals: 0,
        totalHours: 0,
        isRepaid: false,
        remainingAmount: bike.purchasePrice || 0,
        roiPercentage: 0,
        avgRevenuePerRental: 0,
        avgHoursPerRental: 0,
        lastRentalDate: null
      };
    });

    // Processa i contratti: includi ricavi in casi reali d'incasso
    let processedContracts = 0;
    let processedItems = 0;
    let matchedBikes = 0;
    
    contractsData.forEach(contract => {
      // Includi anche contratti in-use per vedere i ricavi potenziali
      const statusOk = ['completed', 'returned', 'closed', 'in-use'].includes(contract.status);
      const hasPaymentFlag = contract.paymentCompleted || contract.paid;
      const hasComputedTotals = (contract.finalAmount ?? 0) > 0 || (contract.totals?.grandTotal ?? 0) > 0;
      
      // Per contratti in-use, conta sempre (anche senza pagamento)
      // Per contratti completati, richiedi pagamento o totali
      const countForRevenue = contract.status === 'in-use' ? 
        statusOk : 
        (statusOk && (hasPaymentFlag || hasComputedTotals));
      
      console.log('🔍 Contratto:', {
        id: contract._id?.slice(-6),
        status: contract.status,
        statusOk,
        hasPaymentFlag,
        hasComputedTotals,
        countForRevenue,
        finalAmount: contract.finalAmount,
        grandTotal: contract.totals?.grandTotal,
        itemsCount: contract.items?.length
      });
      
      if (countForRevenue && contract.items) {
        processedContracts++;
        
        contract.items.forEach(item => {
          processedItems++;
          
          console.log('🔍 Item contratto:', {
            kind: item.kind,
            refId: item.refId,
            name: item.name,
            barcode: item.barcode,
            priceHourly: item.priceHourly,
            priceDaily: item.priceDaily
          });
          
          if (item.kind === 'bike') {
            // Cerca la bici per refId o per barcode come fallback
            let bikeId = item.refId;
            let bike = stats[bikeId];
            
            if (!bike && item.barcode) {
              // Cerca per barcode se refId non funziona
              bikeId = Object.keys(stats).find(id => stats[id].barcode === item.barcode);
              bike = stats[bikeId];
            }
            
            console.log('🔍 Ricerca bici:', {
              itemRefId: item.refId,
              itemBarcode: item.barcode,
              foundBikeId: bikeId,
              bikeFound: !!bike,
              bikeName: bike?.name
            });
            
            if (bike) {
              matchedBikes++;
              const hours = calculateHours(contract.startAt, contract.endAt || contract.createdAt);
              const itemRevenue = calculateItemRevenue(contract, item);

              console.log('💰 Calcolo ricavi:', {
                bikeId: bikeId.slice(-6),
                bikeName: bike.name,
                hours,
                itemRevenue,
                previousRevenue: bike.totalRevenue
              });

              bike.totalRevenue += itemRevenue;
              bike.totalRentals += 1;
              bike.totalHours += hours;
              
              // Aggiorna data ultimo noleggio
              const contractDate = new Date(contract.endAt || contract.createdAt);
              if (!bike.lastRentalDate || contractDate > bike.lastRentalDate) {
                bike.lastRentalDate = contractDate;
              }
            }
          }
        });
      }
    });
    
    console.log('📊 Riepilogo elaborazione contratti:', {
      totalContracts: contractsData.length,
      processedContracts,
      processedItems,
      matchedBikes
    });

    // Calcola metriche finali
    Object.keys(stats).forEach(bikeId => {
      const stat = stats[bikeId];
      
      // Calcola se è ripagata
      if (stat.purchasePrice > 0) {
        stat.remainingAmount = Math.max(0, stat.purchasePrice - stat.totalRevenue);
        stat.isRepaid = stat.totalRevenue >= stat.purchasePrice;
        stat.roiPercentage = (stat.totalRevenue / stat.purchasePrice) * 100;
      }

      // Calcola medie
      if (stat.totalRentals > 0) {
        stat.avgRevenuePerRental = stat.totalRevenue / stat.totalRentals;
        stat.avgHoursPerRental = stat.totalHours / stat.totalRentals;
      }

      // Aggiorna statistiche per tipo
      if (typeStatsData[stat.type]) {
        typeStatsData[stat.type].count += stat.totalRentals;
        typeStatsData[stat.type].revenue += stat.totalRevenue;
        typeStatsData[stat.type].hours += stat.totalHours;
        if (stat.isRepaid) {
          typeStatsData[stat.type].repaidCount += 1;
        }
      }
    });

    setBikeStats(Object.values(stats));
    setTypeStats(typeStatsData);
    
    console.log('📈 BikeROIStats: Statistiche calcolate:', {
      totalBikes: Object.keys(stats).length,
      bikesWithRevenue: Object.values(stats).filter(s => s.totalRevenue > 0).length,
      totalRevenue: Object.values(stats).reduce((sum, s) => sum + s.totalRevenue, 0),
      typeStats: typeStatsData
    });
  };

  const getFilteredAndSortedStats = () => {
    let filtered = bikeStats;

    // Filtra per tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(stat => stat.type === filterType);
    }

    // Filtra per stato ripagamento
    if (filterStatus === 'repaid') {
      filtered = filtered.filter(stat => stat.isRepaid);
    } else if (filterStatus === 'not-repaid') {
      filtered = filtered.filter(stat => !stat.isRepaid && stat.purchasePrice > 0);
    } else if (filterStatus === 'no-purchase-data') {
      filtered = filtered.filter(stat => !stat.purchasePrice || stat.purchasePrice === 0);
    }

    // Ordina
    filtered.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'Mai';
    return new Date(date).toLocaleDateString('it-IT');
  };

  const getTypeLabel = (type) => {
    const labels = {
      'ebike-full': 'E-bike Full',
      'ebike-front': 'E-bike Front',
      'ebike-other': 'E-bike Altre',
      'muscolare': 'Muscolare',
      'altro': 'Altro'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>⏳ Caricamento statistiche...</div>
      </div>
    );
  }

  const filteredStats = getFilteredAndSortedStats();

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Alert nuovi contratti */}
      {newContractsAlert && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '20px' }}>🎉</span>
          <span style={{ fontWeight: '600' }}>Nuovi contratti rilevati! Statistiche aggiornate.</span>
          <button
            onClick={() => setNewContractsAlert(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
              marginLeft: '8px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '28px', fontWeight: '700' }}>
          📊 Statistiche ROI Bici
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
          Analisi dettagliata del ritorno sull'investimento per ogni bici
        </p>
      </div>

      {/* Statistiche per tipo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {Object.keys(typeStats).map(type => (
          <div key={type} style={{
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>
              {getTypeLabel(type)}
            </div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '4px' }}>
              {formatCurrency(typeStats[type].revenue)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {typeStats[type].count} noleggi • {typeStats[type].hours.toFixed(0)}h
            </div>
          </div>
        ))}
      </div>

      {/* Filtri e ordinamento */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Tipo Bici
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="all">Tutti i tipi</option>
            <option value="ebike-full">E-bike Full</option>
            <option value="ebike-front">E-bike Front</option>
            <option value="ebike-other">E-bike Altre</option>
            <option value="muscolare">Muscolare</option>
            <option value="altro">Altro</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Stato Ripagamento
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="all">Tutte</option>
            <option value="repaid">Ripagata</option>
            <option value="not-repaid">Non ripagata</option>
            <option value="no-purchase-data">Senza dati acquisto</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Ordina per
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="totalRevenue">Ricavi Totali</option>
            <option value="roiPercentage">ROI %</option>
            <option value="totalRentals">Numero Noleggi</option>
            <option value="totalHours">Ore Totali</option>
            <option value="avgRevenuePerRental">Ricavo Medio</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Ordine
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white'
            }}
          >
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', color: '#374151' }}>
            Aggiornamento
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                padding: '8px 12px',
                background: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center'
              }}
            >
              {loading ? '🔄' : '🔄'} {loading ? 'Caricando...' : 'Aggiorna Ora'}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Auto-refresh (30s)
              </span>
            </div>
            
            {lastUpdate && (
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                📅 {lastUpdate.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabella statistiche */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '16px',
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            Dettaglio Bici ({filteredStats.length})
          </h3>
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
              {filteredStats.map((stat, index) => (
                <tr key={stat._id} style={{ 
                  background: index % 2 === 0 ? 'white' : '#f9fafb',
                  borderBottom: '1px solid #f3f4f6'
                }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1f2937' }}>{stat.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{stat.barcode}</div>
                      {stat.model && (
                        <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{stat.model}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: stat.type.includes('ebike') ? '#dbeafe' : '#f3f4f6',
                      color: stat.type.includes('ebike') ? '#1e40af' : '#374151'
                    }}>
                      {getTypeLabel(stat.type)}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {stat.purchasePrice > 0 ? formatCurrency(stat.purchasePrice) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                    {formatCurrency(stat.totalRevenue)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {stat.purchasePrice > 0 ? (
                      <span style={{
                        color: stat.roiPercentage >= 100 ? '#059669' : '#dc2626',
                        fontWeight: '600'
                      }}>
                        {stat.roiPercentage.toFixed(1)}%
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {stat.purchasePrice > 0 ? (
                      <span style={{
                        color: stat.remainingAmount > 0 ? '#dc2626' : '#059669',
                        fontWeight: '600'
                      }}>
                        {stat.remainingAmount > 0 ? formatCurrency(stat.remainingAmount) : '✅ Ripagata'}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600' }}>{stat.totalRentals}</div>
                    {stat.totalRentals > 0 && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {formatCurrency(stat.avgRevenuePerRental)}/noleggio
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600' }}>{stat.totalHours.toFixed(0)}h</div>
                    {stat.totalRentals > 0 && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {stat.avgHoursPerRental.toFixed(1)}h/noleggio
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                    {formatDate(stat.lastRentalDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStats.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Nessuna bici trovata con i filtri selezionati
          </div>
        )}
      </div>
    </div>
  );
};

export default BikeROIStats;