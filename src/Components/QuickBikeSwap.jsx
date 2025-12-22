import React, { useState } from 'react'
import { api } from '../services/api.js'
import BarcodeScanner from './BarcodeScanner.jsx'

const QuickBikeSwap = ({ onSwapComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1) // 1: Scan old bike, 2: Scan new bike, 3: Reason, 4: Confirm
  const [contractData, setContractData] = useState(null)
  const [oldBike, setOldBike] = useState(null)
  const [newBike, setNewBike] = useState(null)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)

  const reasons = [
    'Guasto meccanico',
    'Foratura pneumatico', 
    'Problema freni',
    'Problema cambio',
    'Richiesta cliente',
    'Manutenzione preventiva',
    'Bici danneggiata',
    'Upgrade richiesto',
    'Altro'
  ]

  const handleBarcodeScanned = async (barcode) => {
    setLoading(true)
    try {
      if (currentStep === 1) {
        // Cerca il contratto attivo per questa bici
        const { data } = await api.get(`/api/contracts/active-by-barcode/${barcode}`)
        if (data) {
          const bikeInContract = data.items.find(item => 
            item.kind === 'bike' && item.barcode === barcode
          )
          if (bikeInContract) {
            setContractData(data)
            setOldBike(bikeInContract)
            setCurrentStep(2)
          } else {
            alert('❌ Bici non trovata nel contratto')
          }
        } else {
          alert('❌ Nessun contratto attivo trovato per questa bici')
        }
      } else if (currentStep === 2) {
        // Verifica che la nuova bici sia disponibile
        try {
          const { data } = await api.get(`/api/bikes/barcode/${barcode}`)
          if (data.status === 'available') {
            setNewBike(data)
            setCurrentStep(3)
          } else {
            alert(`❌ Bici "${data.name}" non disponibile (stato: ${data.status})`)
          }
        } catch (error) {
          alert('❌ Barcode non trovato o bici non disponibile')
        }
      }
    } catch (error) {
      console.error('Errore scansione:', error)
      alert('❌ Errore durante la scansione')
    } finally {
      setLoading(false)
    }
  }

  const performSwap = async () => {
    if (!reason.trim()) {
      alert('❌ Seleziona un motivo per la sostituzione')
      return
    }

    setLoading(true)
    try {
      const finalReason = reason === 'Altro' ? customReason : reason
      
      const swapData = {
        contractId: contractData._id,
        oldBikeId: oldBike.refId,
        newBikeId: newBike._id,
        reason: finalReason.trim(),
        swapDate: new Date().toISOString()
      }

      await api.post('/api/contracts/swap-bike', swapData)
      
      alert('✅ Sostituzione completata con successo!')
      onSwapComplete && onSwapComplete()
      onClose && onClose()
    } catch (error) {
      console.error('Errore sostituzione:', error)
      alert('❌ Errore durante la sostituzione: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  const resetProcess = () => {
    setCurrentStep(1)
    setContractData(null)
    setOldBike(null)
    setNewBike(null)
    setReason('')
    setCustomReason('')
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1e293b'
          }}>
            ⚡ Sostituzione Rapida
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '24px',
          gap: '8px'
        }}>
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: currentStep >= step ? '#10b981' : '#e5e7eb',
                color: currentStep >= step ? 'white' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {currentStep > step ? '✓' : step}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🚴</div>
            <h3 style={{ marginBottom: '16px' }}>Scansiona Bici da Sostituire</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Scansiona il barcode della bici che vuoi sostituire
            </p>
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              placeholder="Scansiona barcode bici da sostituire"
              autoFocus={true}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
            <h3 style={{ marginBottom: '16px' }}>Scansiona Bici Sostituto</h3>
            
            {/* Info contratto trovato */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                📋 Contratto: {contractData?.customer?.name}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                🚴 Bici: {oldBike?.name} ({oldBike?.barcode})
              </div>
            </div>

            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Scansiona il barcode della bici sostituto
            </p>
            <BarcodeScanner
              onScan={handleBarcodeScanned}
              placeholder="Scansiona barcode bici sostituto"
              autoFocus={true}
            />
            
            <button
              onClick={() => setCurrentStep(1)}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              ← Indietro
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📝</div>
              <h3>Motivo della Sostituzione</h3>
            </div>

            {/* Riepilogo */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                <div><strong>Cliente:</strong> {contractData?.customer?.name}</div>
                <div><strong>Da:</strong> {oldBike?.name} ({oldBike?.barcode})</div>
                <div><strong>A:</strong> {newBike?.name} ({newBike?.barcode})</div>
              </div>
            </div>

            {/* Selezione motivo */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Seleziona motivo:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                <option value="">-- Seleziona motivo --</option>
                {reasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {reason === 'Altro' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Specifica motivo:
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Inserisci motivo personalizzato"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ← Indietro
              </button>
              
              <button
                onClick={() => setCurrentStep(4)}
                disabled={!reason.trim() || (reason === 'Altro' && !customReason.trim())}
                style={{
                  padding: '12px 24px',
                  background: reason.trim() && (reason !== 'Altro' || customReason.trim()) ? 
                    'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: reason.trim() && (reason !== 'Altro' || customReason.trim()) ? 'pointer' : 'not-allowed'
                }}
              >
                Continua →
              </button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔄</div>
            <h3 style={{ marginBottom: '24px' }}>Conferma Sostituzione</h3>

            {/* Riepilogo finale */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #0ea5e9',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#0369a1' }}>Dettagli Sostituzione</h4>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                <div><strong>Cliente:</strong> {contractData?.customer?.name}</div>
                <div><strong>Telefono:</strong> {contractData?.customer?.phone}</div>
                <div><strong>Contratto:</strong> #{contractData?._id?.slice(-8)}</div>
                <div><strong>Bici rimossa:</strong> {oldBike?.name} ({oldBike?.barcode})</div>
                <div><strong>Bici aggiunta:</strong> {newBike?.name} ({newBike?.barcode})</div>
                <div><strong>Motivo:</strong> {reason === 'Altro' ? customReason : reason}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentStep(3)}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ← Modifica
              </button>
              
              <button
                onClick={performSwap}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#d1d5db' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {loading ? '⏳ Elaborazione...' : '✅ Conferma Sostituzione'}
              </button>
            </div>
          </div>
        )}

        {/* Reset button */}
        {currentStep > 1 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={resetProcess}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Ricomincia
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickBikeSwap