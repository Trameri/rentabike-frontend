import React, { useState, useMemo } from 'react';
import { calculateSeparateTotals } from '../utils/contractCalculations.js';
import dateUtils from '../utils/dateUtils.js';

const CompletedRevenueByDay = ({ contracts = [], selectedDate, viewMode = 'week', viewDate }) => {
  const [expandedDays, setExpandedDays] = useState({});

  const completedContracts = useMemo(() => {
    const completed = contracts.filter(c => c.status === 'completed' && c.endAt);
    if (!selectedDate || !viewMode || !viewDate) return completed;

    const baseDate = viewMode === 'day' ? selectedDate : viewDate;
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    let rangeStart, rangeEnd;
    if (viewMode === 'day') {
      rangeStart = new Date(year, month, day);
      rangeEnd = new Date(year, month, day);
    } else if (viewMode === 'week') {
      rangeStart = dateUtils.startOfWeek(baseDate);
      rangeEnd = dateUtils.endOfWeek(baseDate);
    } else if (viewMode === 'month') {
      rangeStart = dateUtils.startOfMonth(baseDate);
      const lastDay = new Date(year, month + 1, 0);
      rangeEnd = dateUtils.endOfDay(lastDay);
      rangeStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    } else {
      rangeStart = new Date(year, 0, 1);
      rangeEnd = new Date(year, 11, 31);
    }
    rangeEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

    return completed.filter(contract => {
      const end = new Date(contract.endAt);
      const contractLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return contractLocal >= rangeStart && contractLocal <= rangeEnd;
    });
  }, [contracts, selectedDate, viewMode, viewDate]);

  const revenueByDay = useMemo(() => {
    const map = new Map();

    completedContracts.forEach(contract => {
      const endDate = new Date(contract.endAt);
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          date: new Date(year, month - 1, day),
          contracts: [],
          totalRevenue: 0
        });
      }

      const dayData = map.get(dateKey);
      const totals = calculateSeparateTotals(contract);
      dayData.contracts.push({ ...contract, calculatedTotal: totals.total });
      dayData.totalRevenue += totals.total;
    });

    return Array.from(map.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.date - a.date);
  }, [completedContracts]);

  const grandTotal = useMemo(() => {
    return revenueByDay.reduce((sum, day) => sum + day.totalRevenue, 0);
  }, [revenueByDay]);

  const totalCompleted = completedContracts.length;

  const toggleDay = (dateKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    revenueByDay.forEach(day => {
      allExpanded[day.key] = true;
    });
    setExpandedDays(allExpanded);
  };

  const collapseAll = () => {
    setExpandedDays({});
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (completedContracts.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
          Nessun contratto completato
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          I contratti completati appariranno qui con il relativo ricavo giornaliero
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px' }}>
            📁 Ricavi Contratti Completati per Giorno
          </h2>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Solo contratti con stato "completato" • {totalCompleted} contratti in {revenueByDay.length} giorni
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={expandAll}
            style={{
              padding: '6px 14px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Espandi tutti
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: '6px 14px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Comprimi tutti
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
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
            {formatCurrency(grandTotal)}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ricavi Totali
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
            {totalCompleted}
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
            {revenueByDay.length > 0 ? formatCurrency(grandTotal / revenueByDay.length) : formatCurrency(0)}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Media Giornaliera
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {revenueByDay.map(day => (
          <div key={day.key} style={{
            background: '#fafafa',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div
              onClick={() => toggleDay(day.key)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                cursor: 'pointer',
                background: expandedDays[day.key] ? '#f3f4f6' : 'white',
                transition: 'background 0.15s ease',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>
                <span style={{ fontSize: '18px' }}>
                  {expandedDays[day.key] ? '📂' : '📁'}
                </span>
                <span>{formatDate(day.date)}</span>
                <span style={{
                  background: '#e5e7eb',
                  color: '#4b5563',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {day.contracts.length} {day.contracts.length === 1 ? 'contratto' : 'contratti'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#059669'
                }}>
                  {formatCurrency(day.totalRevenue)}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {expandedDays[day.key] ? '▲ Comprimi' : '▼ Espandi'}
                </div>
              </div>
            </div>

            {expandedDays[day.key] && (
              <div style={{
                borderTop: '1px solid #e5e7eb',
                background: 'white'
              }}>
                {day.contracts.map((contract, index) => (
                  <div
                    key={contract._id || index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 18px',
                      borderBottom: index < day.contracts.length - 1 ? '1px solid #f3f4f6' : 'none'
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
                      padding: '6px 12px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      textAlign: 'right'
                    }}>
                      <div style={{ fontWeight: '700', color: '#059669', fontSize: '15px' }}>
                        {formatCurrency(contract.calculatedTotal)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#065f46' }}>
                        {contract.finalAmount ? `(bloccato: ${formatCurrency(contract.finalAmount)})` : 'calcolato'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompletedRevenueByDay;
