import React, { useState, useMemo } from 'react';
import { calculateSeparateTotals } from '../utils/contractCalculations.js';
import dateUtils from '../utils/dateUtils.js';

const CompletedRevenueByDay = ({ contracts = [], selectedDate }) => {
  const [expanded, setExpanded] = useState(false);

  const dayCompletedContracts = useMemo(() => {
    if (!selectedDate) return [];
    const target = dateUtils.startOfDay(selectedDate);
    const targetStr = dateUtils.toInputDate(target);

    return contracts.filter(c => {
      if (c.status !== 'completed' || !c.endAt) return false;
      const localEnd = new Date(new Date(c.endAt).getFullYear(), new Date(c.endAt).getMonth(), new Date(c.endAt).getDate());
      const contractStr = dateUtils.toInputDate(localEnd);
      return contractStr === targetStr;
    });
  }, [contracts, selectedDate]);

  const dayTotals = useMemo(() => {
    return dayCompletedContracts.reduce((sum, contract) => {
      const totals = calculateSeparateTotals(contract);
      return sum + totals.total;
    }, 0);
  }, [dayCompletedContracts]);

  const dayInsuranceTotals = useMemo(() => {
    return dayCompletedContracts.reduce((sum, contract) => {
      const totals = calculateSeparateTotals(contract);
      return sum + totals.insuranceTotal;
    }, 0);
  }, [dayCompletedContracts]);

  const dayBikesTotals = useMemo(() => {
    return dayCompletedContracts.reduce((sum, contract) => {
      const totals = calculateSeparateTotals(contract);
      return sum + totals.bikesTotal;
    }, 0);
  }, [dayCompletedContracts]);

  const toggle = () => setExpanded(prev => !prev);

  const formatCurrency = (amount) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  const formatDate = (date) => date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  if (!selectedDate) return null;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
            📁 Ricavi Contratti Completati del Giorno
          </h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {formatDate(selectedDate)} • {dayCompletedContracts.length} contratti completati
          </div>
        </div>
      </div>

      {dayCompletedContracts.length === 0 ? (
        <div style={{
          background: '#f9fafb',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          border: '1px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Nessun contratto completato in questa data
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                {formatCurrency(dayTotals)}
              </div>
              <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ricavi Totali del Giorno
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                {dayCompletedContracts.length}
              </div>
              <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contratti Completati
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                {dayCompletedContracts.length > 0 ? formatCurrency(dayTotals / dayCompletedContracts.length) : formatCurrency(0)}
              </div>
              <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Media per Contratto
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                {formatCurrency(dayBikesTotals)}
              </div>
              <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Totale Noleggio Bici
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                {formatCurrency(dayInsuranceTotals)}
              </div>
              <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Totale Assicurazioni
              </div>
            </div>
          </div>

          <div
            onClick={toggle}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f3f4f6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px',
              marginBottom: '12px',
              userSelect: 'none'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Dettaglio Contratti ({dayCompletedContracts.length})
            </span>
            <span>{expanded ? '▲ Comprimi' : '▼ Espandi'}</span>
          </div>

          {expanded && (
            <div style={{ display: 'grid', gap: '10px' }}>
              {dayCompletedContracts.map((contract, index) => {
                const totals = calculateSeparateTotals(contract);
                return (
                  <div
                    key={contract._id || index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      background: '#fafafa',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                        👤 {contract.customer?.name || 'Cliente non specificato'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Inizio: {dateUtils.formatDateTime(contract.startAt)}
                        {contract.endAt && <> • Fine: {dateUtils.formatDateTime(contract.endAt)}</>}
                      </div>
                      {contract.items && contract.items.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          {contract.items.map((item, i) => (
                            <span key={i} style={{ marginRight: '8px' }}>
                              {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                              {item.barcode && ` (${item.barcode})`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '8px 14px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      textAlign: 'right'
                    }}>
                      <div style={{ fontWeight: '700', color: '#059669', fontSize: '15px' }}>
                        {formatCurrency(totals.total)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#065f46' }}>
                        🚲 {formatCurrency(totals.bikesTotal)} + 🛡️ {formatCurrency(totals.insuranceTotal)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#065f46' }}>
                        {contract.finalAmount ? `(bloccato)` : 'calcolato'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompletedRevenueByDay;
