import React, { useState, useEffect } from 'react'
import { api } from '../services/api.js'

const BarcodeToItemScanner = ({ onItemScanned, loading = false }) => {
  const [barcode, setBarcode] = useState('')
  const [scannerActive, setScannerActive] = useState(true)

  // Auto-focus sul campo quando il componente si monta
  useEffect(() => {
    const input = document.getElementById('barcode-scanner-input')
    if (input && scannerActive) {
      input.focus()
    }
  }, [scannerActive])

  const handleBarcodeChange = (e) => {
    const value = e.target.value
    
    // Gestisce pistola barcode che termina con asterisco (*)
    if (value.endsWith('*')) {
      const cleanBarcode = value.slice(0, -1).trim() // Rimuovi asterisco
      if (cleanBarcode) {
        // Scansione automatica immediata per pistola con asterisco
        handleBarcodeSubmit(cleanBarcode)
        setBarcode('') // Reset campo
      }
      return
    }
    
    setBarcode(value)
  }

  const handleBarcodeSubmit = async (barcodeToScan = null) => {
    const targetBarcode = barcodeToScan || barcode.trim()
    
    if (!targetBarcode) return

    try {
      // Cerca prima nelle bici
      let response = await api.get(`/api/bikes/barcode/${targetBarcode}`)
      if (response.data && response.data.status === 'available') {
        const bike = response.data
        onItemScanned({
          kind: 'bike',
          id: bike._id,
          name: bike.name,
          barcode: bike.barcode,
          priceHourly: bike.priceHourly,
          priceDaily: bike.priceDaily,
          image: bike.image,
          insurance: false,
          insuranceFlat: 0
        })
        
        // Feedback visivo e sonoro
        showSuccessNotification(`✅ Bici aggiunta: ${bike.name}`)
        playSuccessSound()
        
        if (!barcodeToScan) setBarcode('') // Reset solo se non è automatico
        return
      }
    } catch (error) {
      // Se non trovata nelle bici, cerca negli accessori
      try {
        let response = await api.get(`/api/accessories/barcode/${targetBarcode}`)
        if (response.data && response.data.status === 'available') {
          const accessory = response.data
          onItemScanned({
            kind: 'accessory',
            id: accessory._id,
            name: accessory.name,
            barcode: accessory.barcode,
            priceHourly: accessory.priceHourly,
            priceDaily: accessory.priceDaily,
            image: accessory.image
          })
          
          showSuccessNotification(`✅ Accessorio aggiunto: ${accessory.name}`)
          playSuccessSound()
          
          if (!barcodeToScan) setBarcode('') // Reset solo se non è automatico
          return
        }
      } catch (accessoryError) {
        showErrorNotification('❌ Codice a barre non trovato')
      }
    }
    
    if (!barcodeToScan) setBarcode('') // Reset campo in caso di errore
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleBarcodeSubmit()
  }

  const playSuccessSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignora errori audio
    } catch (e) {}
  }

  const showSuccessNotification = (message) => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  const showErrorNotification = (message) => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
      ">
        ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: '2px solid #e5e7eb'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: '#374151',
        fontSize: '18px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🔫 Scanner Barcode Automatico
      </h3>
      
      <form onSubmit={handleFormSubmit} style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <input
          id="barcode-scanner-input"
          type="text"
          value={barcode}
          onChange={handleBarcodeChange}
          placeholder="🔫 Scansiona con pistola o digita barcode (auto con *)"
          style={{
            flex: 1,
            padding: '12px 16px',
            border: loading ? '2px solid #10b981' : '2px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'monospace',
            background: loading ? '#f0fdf4' : 'white',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6'
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = loading ? '#10b981' : '#d1d5db'
            e.target.style.boxShadow = 'none'
          }}
          autoFocus
          disabled={loading}
        />
        
        <button
          type="submit"
          disabled={!barcode.trim() || loading}
          style={{
            padding: '12px 24px',
            background: barcode.trim() && !loading ? 
              'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: barcode.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            minWidth: '100px'
          }}
        >
          {loading ? '⏳ Scansione...' : '➕ Aggiungi'}
        </button>
      </form>
      
      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>💡</span>
        <span>
          La pistola barcode aggiunge automaticamente "*" alla fine - 
          l'inserimento sarà automatico!
        </span>
      </div>
      
      {loading && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#f0fdf4',
          border: '1px solid #10b981',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #10b981',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Ricerca in corso...
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default BarcodeToItemScanner