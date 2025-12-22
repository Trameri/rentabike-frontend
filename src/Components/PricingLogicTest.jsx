import React, { useState } from 'react'
import PriceCalculatorOptimized from './PriceCalculatorOptimized.jsx'

const PricingLogicTest = () => {
  const [testScenario, setTestScenario] = useState('scenario1')
  
  // Scenari di test
  const scenarios = {
    scenario1: {
      name: 'Bici Standard - 3 ore',
      items: [
        { id: '1', name: 'Bici Città', kind: 'bike', priceHourly: 5, priceDaily: 20 }
      ],
      startDate: '2024-01-15T09:00',
      endDate: '2024-01-15T12:00',
      description: 'Tariffa oraria: €15 (3h × €5) vs Tariffa giornaliera: €20'
    },
    scenario2: {
      name: 'Bici Standard - 6 ore',
      items: [
        { id: '1', name: 'Bici Città', kind: 'bike', priceHourly: 5, priceDaily: 20 }
      ],
      startDate: '2024-01-15T09:00',
      endDate: '2024-01-15T15:00',
      description: 'Tariffa oraria: €30 (6h × €5) vs Tariffa giornaliera: €20 - Si blocca alla giornaliera!'
    },
    scenario3: {
      name: 'Bici + Accessorio - 4 ore',
      items: [
        { id: '1', name: 'Bici Città', kind: 'bike', priceHourly: 5, priceDaily: 20 },
        { id: '2', name: 'Casco', kind: 'accessory', priceHourly: 2, priceDaily: 5 }
      ],
      startDate: '2024-01-15T10:00',
      endDate: '2024-01-15T14:00',
      description: 'Bici: €20 (giornaliera), Casco: €8 (oraria) - Mix ottimale'
    },
    scenario4: {
      name: 'Prenotazione 2 giorni',
      items: [
        { id: '1', name: 'Bici Mountain', kind: 'bike', priceHourly: 8, priceDaily: 25 },
        { id: '2', name: 'Borraccia', kind: 'accessory', priceHourly: 1, priceDaily: 3 }
      ],
      startDate: '2024-01-20T09:00',
      endDate: '2024-01-22T18:00',
      description: 'Prenotazione: sempre tariffa giornaliera per entrambi'
    }
  }

  const currentScenario = scenarios[testScenario]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '2.5rem',
          fontWeight: '800'
        }}>
          🧮 Test Logica Pricing
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
          Verifica il comportamento del sistema di calcolo prezzi
        </p>
      </div>

      {/* Selezione Scenario */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          🎯 Seleziona Scenario di Test
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {Object.entries(scenarios).map(([key, scenario]) => (
            <label key={key} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              background: testScenario === key ? '#f0fdf4' : '#f8fafc',
              border: `2px solid ${testScenario === key ? '#10b981' : '#e5e7eb'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                name="scenario"
                checked={testScenario === key}
                onChange={() => setTestScenario(key)}
                style={{ width: '18px', height: '18px', marginTop: '2px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  {scenario.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  {scenario.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Test Contratto Normale */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚡ Contratto Attivo - {currentScenario.name}
        </h3>
        
        <PriceCalculatorOptimized
          items={currentScenario.items}
          startDate={currentScenario.startDate}
          endDate={currentScenario.endDate}
          isReservation={false}
          onPriceCalculated={(pricing) => console.log('Contratto:', pricing)}
        />
      </div>

      {/* Test Prenotazione */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📅 Prenotazione - {currentScenario.name}
        </h3>
        
        <PriceCalculatorOptimized
          items={currentScenario.items}
          startDate={currentScenario.startDate}
          endDate={currentScenario.endDate}
          isReservation={true}
          onPriceCalculated={(pricing) => console.log('Prenotazione:', pricing)}
        />
      </div>

      {/* Spiegazione Logica */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          📚 Spiegazione Logica di Business
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '20px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              color: '#059669',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              ⚡ Contratto Attivo
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li>Inizia con <strong>tariffa oraria</strong> dall'attivazione</li>
              <li>Si <strong>blocca automaticamente</strong> alla tariffa giornaliera quando più conveniente</li>
              <li>Ottimizza il costo per il cliente</li>
              <li>Ideale per noleggi di durata variabile</li>
            </ul>
          </div>
          
          <div style={{
            padding: '20px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              color: '#1e40af',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              📅 Prenotazione
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <li>Applica sempre la <strong>tariffa giornaliera</strong></li>
              <li>Garantisce la <strong>disponibilità</strong> degli articoli</li>
              <li>Prezzo fisso e prevedibile</li>
              <li>Ideale per pianificazione anticipata</li>
            </ul>
          </div>
        </div>
        
        {/* Esempi Pratici */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '12px'
        }}>
          <h4 style={{
            margin: '0 0 16px 0',
            color: '#92400e',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            💡 Esempi Pratici
          </h4>
          
          <div style={{
            display: 'grid',
            gap: '12px',
            fontSize: '14px',
            color: '#374151'
          }}>
            <div style={{
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <strong>Scenario 1 (3 ore):</strong> Contratto €15 vs Prenotazione €20 - Il contratto conviene
            </div>
            <div style={{
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <strong>Scenario 2 (6 ore):</strong> Contratto €20 vs Prenotazione €20 - Stesso prezzo, si blocca alla giornaliera
            </div>
            <div style={{
              padding: '12px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #fbbf24'
            }}>
              <strong>Scenario 4 (2 giorni):</strong> Prenotazione garantisce disponibilità con tariffa giornaliera fissa
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingLogicTest