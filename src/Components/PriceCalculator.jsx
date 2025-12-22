import React, { useState, useEffect } from 'react';

const PriceCalculator = ({ 
  items = [], 
  startDate, 
  endDate, 
  onStartDateChange,
  onEndDateChange,
  onPriceCalculated,
  insuranceFlat,
  onInsuranceChange,
  reservationPrepaid,
  onPrepaidChange,
  paymentMethod,
  onPaymentMethodChange
}) => {
  const [pricing, setPricing] = useState({
    hourlyTotal: 0,
    dailyTotal: 0,
    recommendedPrice: 0,
    recommendedType: 'hourly',
    breakdown: []
  });

  useEffect(() => {
    calculatePricing();
  }, [items, startDate, endDate, insuranceFlat, reservationPrepaid]);

  const calculatePricing = () => {
    if (!items.length || !startDate || !endDate) {
      const emptyPricing = {
        hourlyTotal: 0,
        dailyTotal: 0,
        recommendedPrice: 0,
        recommendedType: 'hourly',
        breakdown: []
      };
      setPricing(emptyPricing);
      onPriceCalculated && onPriceCalculated(emptyPricing);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let hourlyTotal = 0;
    let dailyTotal = 0;
    const breakdown = [];

    items.forEach(item => {
      const hourlyPrice = (item.priceHourly || 0) * diffHours;
      const dailyPrice = (item.priceDaily || 0) * diffDays;
      
      // Per ogni item, usa il prezzo più conveniente
      const bestPrice = Math.min(hourlyPrice, dailyPrice);
      const bestType = hourlyPrice <= dailyPrice ? 'hourly' : 'daily';
      
      hourlyTotal += hourlyPrice;
      dailyTotal += dailyPrice;

      breakdown.push({
        id: item._id,
        name: item.name,
        type: item.type || 'bike',
        hourlyPrice,
        dailyPrice,
        bestPrice,
        bestType,
        priceHourly: item.priceHourly || 0,
        priceDaily: item.priceDaily || 0
      });
    });

    // Calcola il prezzo raccomandato (più conveniente)
    const recommendedPrice = Math.min(hourlyTotal, dailyTotal);
    const recommendedType = hourlyTotal <= dailyTotal ? 'hourly' : 'daily';

    // Aggiungi assicurazione e prepagato
    const insurance = insuranceFlat || 0;
    const finalTotal = recommendedPrice + insurance;
    const prepaid = reservationPrepaid ? Math.min(finalTotal * 0.3, finalTotal) : 0;
    const remainingAmount = finalTotal - prepaid;

    const newPricing = {
      hourlyTotal,
      dailyTotal,
      recommendedPrice,
      recommendedType,
      breakdown,
      insurance,
      finalTotal,
      prepaid,
      remainingAmount,
      duration: {
        hours: diffHours,
        days: diffDays
      }
    };

    setPricing(newPricing);
    onPriceCalculated && onPriceCalculated(newPricing);
  };

  const formatDuration = () => {
    if (!pricing.duration) return '';
    const { hours, days } = pricing.duration;
    
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'ora' : 'ore'}`;
    } else {
      return `${days} ${days === 1 ? 'giorno' : 'giorni'} (${hours}h)`;
    }
  };

  if (!items.length) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        color: '#6b7280'
      }}>
        📊 Seleziona bici/accessori per vedere i prezzi
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: '#374151',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        💰 Calcolo Prezzi
      </h3>

      {/* Durata noleggio */}
      {pricing.duration && (
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#0369a1', fontWeight: '600' }}>
            ⏱️ Durata: {formatDuration()}
          </div>
        </div>
      )}

      {/* Breakdown per item */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#374151' }}>
          📋 Dettaglio per Item:
        </h4>
        
        {pricing.breakdown.map(item => (
          <div key={item.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '6px',
            marginBottom: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#374151' }}>
                {item.type === 'bike' ? '🚲' : '🎒'} {item.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                €{item.priceHourly}/h • €{item.priceDaily}/giorno
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: item.bestType === 'hourly' ? '#059669' : '#3b82f6'
              }}>
                €{item.bestPrice.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {item.bestType === 'hourly' ? 'Tariffa oraria' : 'Tariffa giornaliera'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totali */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '16px',
          background: pricing.recommendedType === 'hourly' ? 
            'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
            '#f3f4f6',
          color: pricing.recommendedType === 'hourly' ? 'white' : '#374151',
          borderRadius: '8px',
          textAlign: 'center',
          border: pricing.recommendedType === 'hourly' ? 'none' : '1px solid #d1d5db'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>
            €{pricing.hourlyTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9' }}>
            Tariffa Oraria
          </div>
          {pricing.recommendedType === 'hourly' && (
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              ⭐ Consigliata
            </div>
          )}
        </div>

        <div style={{
          padding: '16px',
          background: pricing.recommendedType === 'daily' ? 
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 
            '#f3f4f6',
          color: pricing.recommendedType === 'daily' ? 'white' : '#374151',
          borderRadius: '8px',
          textAlign: 'center',
          border: pricing.recommendedType === 'daily' ? 'none' : '1px solid #d1d5db'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>
            €{pricing.dailyTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', opacity: '0.9' }}>
            Tariffa Giornaliera
          </div>
          {pricing.recommendedType === 'daily' && (
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              ⭐ Consigliata
            </div>
          )}
        </div>
      </div>

      {/* Prezzo finale raccomandato */}
      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>
          💡 Prezzo Totale Raccomandato
        </div>
        <div style={{ fontSize: '28px', fontWeight: '700' }}>
          €{pricing.recommendedPrice.toFixed(2)}
        </div>
        <div style={{ fontSize: '12px', opacity: '0.9', marginTop: '4px' }}>
          {pricing.recommendedType === 'hourly' ? 
            `Tariffa oraria per ${pricing.duration?.hours || 0} ore` : 
            `Tariffa giornaliera per ${pricing.duration?.days || 0} giorni`
          }
        </div>
      </div>

      {/* Risparmio */}
      {pricing.hourlyTotal !== pricing.dailyTotal && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#059669'
        }}>
          💰 Risparmio di €{Math.abs(pricing.hourlyTotal - pricing.dailyTotal).toFixed(2)} 
          rispetto alla tariffa {pricing.recommendedType === 'hourly' ? 'giornaliera' : 'oraria'}
        </div>
      )}

      {/* Sezione Date */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '1.1rem',
          fontWeight: '700',
          color: '#1e293b'
        }}>
          📅 Date Noleggio
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              🚀 Data/Ora Inizio:
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              🏁 Data/Ora Fine:
            </label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Assicurazione */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{ fontWeight: '700', color: '#92400e', fontSize: '1.1rem' }}>
              🛡️ Assicurazione Opzionale
            </div>
            <div style={{ fontSize: '14px', color: '#a16207' }}>
              Copre danni accidentali e furto
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              value={insuranceFlat || 0}
              onChange={(e) => onInsuranceChange && onInsuranceChange(parseFloat(e.target.value) || 0)}
              style={{
                width: '100px',
                padding: '12px',
                border: '2px solid #fbbf24',
                borderRadius: '8px',
                textAlign: 'right',
                fontSize: '16px',
                fontWeight: '600'
              }}
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <span style={{ color: '#92400e', fontWeight: '700', fontSize: '18px' }}>€</span>
          </div>
        </div>
        
        {pricing.insurance > 0 && (
          <div style={{
            background: 'white',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #fbbf24',
            textAlign: 'center',
            color: '#92400e',
            fontWeight: '600'
          }}>
            ✅ Assicurazione aggiunta: €{pricing.insurance.toFixed(2)}
          </div>
        )}
      </div>

      {/* Pagamento Anticipato */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#e0f2fe',
        border: '1px solid #0ea5e9',
        borderRadius: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontWeight: '700', color: '#0c4a6e', fontSize: '1.1rem' }}>
              💳 Pagamento Anticipato
            </div>
            <div style={{ fontSize: '14px', color: '#0369a1' }}>
              Richiedi un acconto del 30%
            </div>
          </div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={reservationPrepaid || false}
              onChange={(e) => onPrepaidChange && onPrepaidChange(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer'
              }}
            />
            <span style={{ color: '#0c4a6e', fontWeight: '600' }}>
              Richiedi Acconto
            </span>
          </label>
        </div>
        
        {reservationPrepaid && (
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #0ea5e9'
          }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Acconto richiesto (30%)</span>
                <span style={{ fontWeight: '700', color: '#059669' }}>
                  €{pricing.prepaid.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Rimanente alla consegna</span>
                <span style={{ fontWeight: '700', color: '#dc2626' }}>
                  €{pricing.remainingAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metodi di Pagamento */}
      {(reservationPrepaid || pricing.finalTotal > 0) && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px'
        }}>
          <h4 style={{
            margin: '0 0 16px 0',
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#059669'
          }}>
            💰 Metodo di Pagamento
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <button
              onClick={() => onPaymentMethodChange && onPaymentMethodChange('cash')}
              style={{
                padding: '16px',
                background: paymentMethod === 'cash' ? 
                  'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'white',
                color: paymentMethod === 'cash' ? 'white' : '#374151',
                border: '2px solid #bbf7d0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💵</div>
              <div>Contanti</div>
            </button>
            
            <button
              onClick={() => onPaymentMethodChange && onPaymentMethodChange('card')}
              style={{
                padding: '16px',
                background: paymentMethod === 'card' ? 
                  'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'white',
                color: paymentMethod === 'card' ? 'white' : '#374151',
                border: '2px solid #bbf7d0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💳</div>
              <div>Carta</div>
            </button>
            
            <button
              onClick={() => onPaymentMethodChange && onPaymentMethodChange('transfer')}
              style={{
                padding: '16px',
                background: paymentMethod === 'transfer' ? 
                  'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'white',
                color: paymentMethod === 'transfer' ? 'white' : '#374151',
                border: '2px solid #bbf7d0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏦</div>
              <div>Bonifico</div>
            </button>
          </div>
          
          {paymentMethod && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              textAlign: 'center',
              color: '#059669',
              fontWeight: '600'
            }}>
              ✅ Metodo selezionato: {
                paymentMethod === 'cash' ? '💵 Contanti' :
                paymentMethod === 'card' ? '💳 Carta' :
                '🏦 Bonifico'
              }
            </div>
          )}
        </div>
      )}

      {/* Riepilogo Finale */}
      <div style={{
        marginTop: '24px',
        padding: '24px',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '1.3rem',
          fontWeight: '700'
        }}>
          🧾 Riepilogo Finale
        </h3>
        
        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ opacity: '0.9' }}>Noleggio ({pricing.recommendedType})</span>
            <span style={{ fontWeight: '700', fontSize: '18px' }}>
              €{pricing.recommendedPrice.toFixed(2)}
            </span>
          </div>
          
          {pricing.insurance > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: '0.9' }}>🛡️ Assicurazione</span>
              <span style={{ fontWeight: '700', fontSize: '18px' }}>
                €{pricing.insurance.toFixed(2)}
              </span>
            </div>
          )}
          
          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.3)' }} />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            <span>TOTALE</span>
            <span>€{pricing.finalTotal.toFixed(2)}</span>
          </div>
          
          {reservationPrepaid && (
            <>
              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.3)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: '0.9', color: '#10b981' }}>💳 Acconto</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: '#10b981' }}>
                  €{pricing.prepaid.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ opacity: '0.9', color: '#f59e0b' }}>🏁 Rimanente</span>
                <span style={{ fontWeight: '700', fontSize: '18px', color: '#f59e0b' }}>
                  €{pricing.remainingAmount.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceCalculator;