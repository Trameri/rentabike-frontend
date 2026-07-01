import React, { useState, useEffect } from 'react'

const PriceCalculatorOptimized = ({ 
  items = [], 
  startDate, 
  endDate, 
  onPriceCalculated,
  onStartDateChange,
  onEndDateChange,
  isReservation = false // Nuovo parametro per distinguere prenotazioni
}) => {
  const [pricing, setPricing] = useState({
    subtotal: 0,
    insurance: 0,
    total: 0,
    breakdown: [],
    duration: { hours: 0, days: 0 },
    recommendedType: 'hourly'
  })

  const [insurancePerItem, setInsurancePerItem] = useState({})

  useEffect(() => {
    calculatePricing()
  }, [items, startDate, endDate, insurancePerItem, isReservation])

  const calculatePricing = () => {
    if (!items.length || !startDate || !endDate) {
      const emptyPricing = {
        subtotal: 0,
        insurance: 0,
        total: 0,
        breakdown: [],
        duration: { hours: 0, days: 0 },
        recommendedType: 'hourly'
      }
      setPricing(emptyPricing)
      onPriceCalculated && onPriceCalculated(emptyPricing)
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = Math.max(0, end - start)
    const diffMinutes = diffMs / (1000 * 60)
    const diffHours = Math.max(1, Math.ceil(diffMinutes / 60))
    const diffDays = Math.max(1, Math.ceil(diffHours / 24))

    let subtotal = 0
    let totalInsurance = 0
    const breakdown = []

    items.forEach(item => {
      const priceHourly = item.priceHourly || 0
      const priceDaily = item.priceDaily || 0
      
      // Scatto orario: calcola ore fatturate con Math.ceil(minutes/60)
      const oreFatturate = Math.max(1, Math.ceil(diffMinutes / 60))
      const hourlyPrice = priceHourly * oreFatturate
      
      // Per prenotazioni: usa sempre tariffa giornaliera
      // Per contratti: scatto orario con blocco su giornaliero
      let bestPrice, bestType
      if (isReservation) {
        bestPrice = priceDaily
        bestType = 'daily'
      } else {
        // Blocco giornaliero: minimo tra orario e giornaliero
        bestPrice = Math.min(hourlyPrice, priceDaily)
        bestType = hourlyPrice <= priceDaily ? 'hourly' : 'daily'
      }
      
      subtotal += bestPrice

      // Calcola assicurazione per questo item
      const itemInsurance = insurancePerItem[item.id] || 0
      totalInsurance += itemInsurance

      breakdown.push({
        id: item.id,
        name: item.name,
        kind: item.kind,
        hourlyPrice,
        dailyPrice: priceDaily,
        bestPrice,
        bestType,
        insurance: itemInsurance,
        priceHourly,
        priceDaily,
        oreFatturate
      })
    })

    const total = subtotal + totalInsurance
    const recommendedType = breakdown.length > 0 ? 
      (breakdown.filter(b => b.bestType === 'hourly').length >= breakdown.length / 2 ? 'hourly' : 'daily') : 
      'hourly'

    const newPricing = {
      subtotal,
      insurance: totalInsurance,
      total,
      breakdown,
      duration: { hours: diffHours, days: diffDays },
      recommendedType
    }

    setPricing(newPricing)
    onPriceCalculated && onPriceCalculated(newPricing)
  }

  const toggleInsurance = (itemId, insuranceAmount = 5) => {
    setInsurancePerItem(prev => ({
      ...prev,
      [itemId]: prev[itemId] ? 0 : insuranceAmount
    }))
  }

  const formatDuration = () => {
    const { hours, days } = pricing.duration
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'ora' : 'ore'}`
    } else {
      return `${days} ${days === 1 ? 'giorno' : 'giorni'} (${hours}h totali)`
    }
  }

  if (!items.length) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        textAlign: 'center',
        border: '2px dashed #e5e7eb'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>💰</div>
        <p style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
          Aggiungi articoli per vedere il calcolo dei prezzi
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '2px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💰 Calcolo Prezzi {isReservation ? 'Prenotazione' : 'Contratto'}
        </h3>
        
        <div style={{
          padding: '8px 16px',
          borderRadius: '20px',
          background: isReservation ? 
            'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 
            'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {isReservation ? '📅 PRENOTAZIONE' : '⚡ CONTRATTO ATTIVO'}
        </div>
      </div>

      {/* Spiegazione Logica Pricing */}
      <div style={{
        background: isReservation ? '#eff6ff' : '#f0fdf4',
        border: `1px solid ${isReservation ? '#bfdbfe' : '#bbf7d0'}`,
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '20px',
        fontSize: '14px',
        color: isReservation ? '#1e40af' : '#059669'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          📋 Logica di Calcolo:
        </div>
        {isReservation ? (
          <div>
            🗓️ <strong>Prenotazione</strong>: Viene sempre applicata la tariffa giornaliera per tutti gli articoli
          </div>
        ) : (
          <div>
            ⏱️ <strong>Contratto Attivo</strong>: Tariffa oraria dall'attivazione, si blocca automaticamente alla tariffa giornaliera quando più conveniente
          </div>
        )}
      </div>

      {/* Date Selection */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151',
            fontSize: '14px'
          }}>
            🚀 Data/Ora Inizio
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#374151',
            fontSize: '14px'
          }}>
            🏁 Data/Ora Fine
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
      </div>

      {/* Duration Display */}
      {pricing.duration.hours > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>
            ⏱️ Durata Noleggio: {formatDuration()}
          </div>
        </div>
      )}

      {/* Items Breakdown */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151'
        }}>
          📋 Dettaglio Articoli
        </h4>
        
        <div style={{
          display: 'grid',
          gap: '12px'
        }}>
          {pricing.breakdown.map(item => (
            <div key={item.id} style={{
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              background: '#fafafa'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    {item.kind === 'bike' ? '🚲' : '🎒'} {item.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    €{item.priceHourly}/h • €{item.priceDaily}/giorno
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: item.bestType === 'hourly' ? '#059669' : '#3b82f6'
                  }}>
                    €{item.bestPrice.toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    marginTop: '2px'
                  }}>
                    {item.bestType === 'hourly' ? 
                        '⏱️ Tariffa oraria (scatto orario)' : 
                        '🔒 Bloccata a tariffa giornaliera'
                      }
                  </div>
                  
                  {/* Mostra risparmio se applicabile */}
{!isReservation && item.bestType === 'daily' && item.hourlyPrice > item.dailyPrice && (
                     <div style={{
                      fontSize: '10px',
                      color: '#059669',
                      marginTop: '2px',
                      fontWeight: '600'
                    }}>
                      💰 Risparmio: €{(item.hourlyPrice - item.dailyPrice).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Insurance Toggle */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: insurancePerItem[item.id] ? '#f0fdf4' : '#fef3c7',
                borderRadius: '8px',
                border: `1px solid ${insurancePerItem[item.id] ? '#bbf7d0' : '#fbbf24'}`
              }}>
                <div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: insurancePerItem[item.id] ? '#059669' : '#92400e'
                  }}>
                    🛡️ Assicurazione (+€5)
                  </span>
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={!!insurancePerItem[item.id]}
                    onChange={() => toggleInsurance(item.id, 5)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: insurancePerItem[item.id] ? '#059669' : '#92400e'
                  }}>
                    {insurancePerItem[item.id] ? 'Inclusa' : 'Aggiungi'}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Summary */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        padding: '24px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Subtotale</div>
            <div style={{ fontSize: '20px', fontWeight: '700' }}>
              €{pricing.subtotal.toFixed(2)}
            </div>
          </div>
          
          {pricing.insurance > 0 && (
            <div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Assicurazione</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                €{pricing.insurance.toFixed(2)}
              </div>
            </div>
          )}
          
          <div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>TOTALE</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>
              €{pricing.total.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div style={{
          fontSize: '14px',
          opacity: 0.9,
          borderTop: '1px solid rgba(255,255,255,0.3)',
          paddingTop: '12px'
        }}>
          {isReservation ? 
            `📅 Prenotazione per ${formatDuration()} - Tariffa giornaliera applicata` :
            `⚡ Contratto attivo per ${formatDuration()} - Tariffa ottimizzata automaticamente`
          }
        </div>
      </div>

      {/* Pricing Logic Info */}
      {pricing.breakdown.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: isReservation ? '#eff6ff' : '#f0fdf4',
          border: `1px solid ${isReservation ? '#bfdbfe' : '#bbf7d0'}`,
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          color: isReservation ? '#1e40af' : '#059669'
        }}>
          {isReservation ? (
            <div>
              📅 <strong>Prenotazioni</strong>: Tariffa giornaliera fissa per garantire disponibilità
            </div>
          ) : (
            <div>
              ⚡ <strong>Contratti Attivi</strong>: Tariffa oraria dall'attivazione, si blocca automaticamente alla giornaliera quando più conveniente
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PriceCalculatorOptimized