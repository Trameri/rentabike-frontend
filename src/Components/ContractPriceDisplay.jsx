import React, { useState, useEffect } from 'react';
import { calculateItemPrice, getCalendarDays } from '../utils/contractCalculations.js';

const ContractPriceDisplay = ({ contract, realTimeUpdate = false }) => {
  const [currentPricing, setCurrentPricing] = useState({
    hourlyTotal: 0,
    dailyTotal: 0,
    currentTotal: 0,
    elapsedTime: { hours: 0, minutes: 0 },
    estimatedEnd: null
  });

  useEffect(() => {
    calculateCurrentPricing();
    
    if (realTimeUpdate && contract.status === 'in-use') {
      const interval = setInterval(calculateCurrentPricing, 60000); // Aggiorna ogni minuto
      return () => clearInterval(interval);
    }
  }, [contract, realTimeUpdate]);

  const calculateCurrentPricing = () => {
    if (!contract || !contract.items) return;

    const startTime = new Date(contract.startAt);
    const currentTime = new Date();
    const diffMs = currentTime - startTime;
    const elapsedHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const elapsedMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let hourlyTotal = 0;
    let dailyTotal = 0;

    contract.items.forEach(item => {
      const hourlyPrice = (item.priceHourly || 0) * elapsedHours
      const itemPrice = calculateItemPrice(
        item.priceHourly || 0,
        item.priceDaily || 0,
        startTime,
        currentTime
      )

      hourlyTotal += hourlyPrice
      dailyTotal += itemPrice
    });

    const currentTotal = dailyTotal
    
    const startTimeDate = new Date(contract.startAt)
    const calendarDays = getCalendarDays(startTimeDate, currentTime)
    
    let estimatedEnd = null
    if (calendarDays <= 1) {
      const estimatedDailyBreakeven = contract.items.reduce((acc, item) => {
        if (item.priceHourly && item.priceDaily) {
          const breakeven = Math.ceil(item.priceDaily / item.priceHourly);
          return Math.max(acc, breakeven);
        }
        return acc;
      }, 0);
      estimatedEnd = estimatedDailyBreakeven
    }

    setCurrentPricing({
      hourlyTotal,
      dailyTotal,
      currentTotal,
      elapsedTime: { hours: elapsedHours, minutes: elapsedMinutes },
      estimatedEnd: estimatedDailyBreakeven
    });
  };

  const formatElapsedTime = () => {
    const { hours, minutes } = currentPricing.elapsedTime;
    if (hours === 0) {
      return `${minutes} minuti`;
    } else if (hours < 24) {
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}g ${remainingHours}h ${minutes}m`;
    }
  };

  const getPriceStatus = () => {
    const startTime = new Date(contract.startAt)
    const currentTime = new Date()
    const calendarDays = getCalendarDays(startTime, currentTime)
    
    if (calendarDays > 1) {
      return {
        type: 'daily',
        color: '#3b82f6',
        icon: '📅',
        label: 'Tariffa Giornaliera (multi-giorno)'
      };
    }
    
    if (currentPricing.hourlyTotal <= currentPricing.dailyTotal) {
      return {
        type: 'hourly',
        color: '#10b981',
        icon: '⏱️',
        label: 'Tariffa Oraria Attiva'
      };
    } else {
      return {
        type: 'daily',
        color: '#3b82f6',
        icon: '📅',
        label: 'Tariffa Giornaliera Attiva'
      };
    }
  };

  const status = getPriceStatus();

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💰 Prezzo Contratto
        </h3>
        
        {contract.status === 'in-use' && (
          <div style={{
            background: '#f0fdf4',
            color: '#059669',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            🔄 In corso
          </div>
        )}
      </div>

      {/* Tempo trascorso */}
      <div style={{
        background: '#f8fafc',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
          Tempo trascorso
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#374151' }}>
          {formatElapsedTime()}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          Inizio: {new Date(contract.startAt).toLocaleString('it-IT')}
        </div>
      </div>

      {/* Stato prezzo corrente */}
      <div style={{
        background: `${status.color}15`,
        border: `2px solid ${status.color}30`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '16px',
          color: status.color,
          fontWeight: '600',
          marginBottom: '8px'
        }}>
          {status.icon} {status.label}
        </div>
        <div style={{
          fontSize: '32px',
          fontWeight: '700',
          color: status.color
        }}>
          €{currentPricing.currentTotal.toFixed(2)}
        </div>
      </div>

      {/* Confronto prezzi */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '12px',
          background: status.type === 'hourly' ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${status.type === 'hourly' ? '#bbf7d0' : '#e2e8f0'}`,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Oraria</div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: status.type === 'hourly' ? '#059669' : '#374151'
          }}>
            €{currentPricing.hourlyTotal.toFixed(2)}
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: status.type === 'daily' ? '#f0f9ff' : '#f8fafc',
          border: `1px solid ${status.type === 'daily' ? '#bae6fd' : '#e2e8f0'}`,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Giornaliera</div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: status.type === 'daily' ? '#0369a1' : '#374151'
          }}>
            €{currentPricing.dailyTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Items nel contratto */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151' }}>
          📋 Items nel contratto:
        </h4>
        <div style={{ fontSize: '12px' }}>
          {contract.items?.map((item, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: index < contract.items.length - 1 ? '1px solid #f3f4f6' : 'none'
            }}>
              <div>
                <span style={{ marginRight: '8px' }}>
                  {item.kind === 'bike' ? '🚲' : '🎒'}
                </span>
                {item.name}
                {item.barcode && (
                  <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                    ({item.barcode})
                  </span>
                )}
              </div>
              <div style={{ color: '#6b7280' }}>
                €{item.priceHourly}/h • €{item.priceDaily}/g
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avviso risparmio */}
      {currentPricing.estimatedEnd && currentPricing.elapsedTime.hours < currentPricing.estimatedEnd && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#92400e'
        }}>
          💡 La tariffa giornaliera diventerà più conveniente dopo {currentPricing.estimatedEnd} ore
        </div>
      )}
    </div>
  );
};

export default ContractPriceDisplay;