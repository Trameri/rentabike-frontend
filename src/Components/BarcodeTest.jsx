import React, { useState, useRef, useEffect } from 'react'
import JsBarcode from 'jsbarcode'

export default function BarcodeTest() {
  const [testBarcode, setTestBarcode] = useState('BK202408210001')
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128')
  const canvasRef = useRef(null)
  const svgRef = useRef(null)

  const generateBarcode = () => {
    if (!testBarcode.trim()) return

    try {
      // Genera barcode su canvas per download PNG
      if (canvasRef.current) {
        JsBarcode(canvasRef.current, testBarcode, {
          format: barcodeFormat,
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          textMargin: 8,
          margin: 10
        })
      }

      // Genera barcode su SVG per visualizzazione
      if (svgRef.current) {
        JsBarcode(svgRef.current, testBarcode, {
          format: barcodeFormat,
          width: 3,
          height: 120,
          displayValue: true,
          fontSize: 16,
          textMargin: 10,
          margin: 15
        })
      }
    } catch (error) {
      console.error('Errore generazione barcode:', error)
      alert('Errore nella generazione del barcode: ' + error.message)
    }
  }

  const downloadBarcode = () => {
    if (!canvasRef.current) return

    const link = document.createElement('a')
    link.download = `barcode_${testBarcode}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const generateRandomBarcode = () => {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const newBarcode = `BK${timestamp.slice(-8)}${random}`
    setTestBarcode(newBarcode)
  }

  useEffect(() => {
    generateBarcode()
  }, [testBarcode, barcodeFormat])

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          🏷️ Test Barcode Professionali
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Codice Barcode:
            </label>
            <input
              type="text"
              value={testBarcode}
              onChange={(e) => setTestBarcode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              placeholder="Inserisci codice barcode"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Formato:
            </label>
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="CODE128">CODE128 (Raccomandato)</option>
              <option value="CODE39">CODE39</option>
              <option value="EAN13">EAN13</option>
              <option value="EAN8">EAN8</option>
              <option value="UPC">UPC</option>
            </select>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={generateBarcode}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Genera Barcode
          </button>

          <button
            onClick={generateRandomBarcode}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🎲 Genera Casuale
          </button>

          <button
            onClick={downloadBarcode}
            style={{
              padding: '8px 16px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            📥 Scarica PNG
          </button>
        </div>

        {/* Visualizzazione Barcode */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '2px dashed #cbd5e1'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#6b7280' }}>
              Anteprima Barcode (SVG - Alta Qualità)
            </h3>
            <svg ref={svgRef}></svg>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
              Canvas per Download (PNG)
            </h4>
            <canvas 
              ref={canvasRef} 
              style={{ 
                border: '1px solid #e5e7eb',
                borderRadius: '4px'
              }}
            ></canvas>
          </div>
        </div>

        {/* Informazioni Tecniche */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>
            ℹ️ Informazioni Tecniche
          </h4>
          <div style={{ fontSize: '14px', color: '#1e40af', lineHeight: '1.6' }}>
            <p><strong>Formato Raccomandato:</strong> CODE128 - Supporta caratteri alfanumerici e simboli speciali</p>
            <p><strong>Compatibilità:</strong> Tutti i lettori barcode professionali USB/Bluetooth</p>
            <p><strong>Qualità Stampa:</strong> PNG ad alta risoluzione per etichette professionali</p>
            <p><strong>Dimensioni:</strong> Ottimizzato per etichette 40x20mm e 50x25mm</p>
          </div>
        </div>
      </div>
    </div>
  )
}