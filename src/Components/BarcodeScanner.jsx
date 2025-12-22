import React, { useState, useEffect, useRef } from 'react';

const BarcodeScanner = ({ onScan, placeholder = "Scansiona o inserisci barcode", autoFocus = true }) => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef(null);
  const scanTimeoutRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Gestisce l'input da pistola barcode
  const handleInputChange = (e) => {
    const value = e.target.value;
    setBarcode(value);
    
    // Gestisce pistola barcode che termina con asterisco (*)
    if (value.endsWith('*')) {
      const cleanBarcode = value.slice(0, -1).trim(); // Rimuovi asterisco
      if (cleanBarcode) {
        setIsScanning(true);
        // Scansione immediata per pistola con asterisco
        setTimeout(() => {
          handleScan(cleanBarcode);
        }, 50);
      }
      return;
    }
    
    // Se il valore termina con Enter (tipico delle pistole barcode)
    if (value.includes('\n') || value.includes('\r')) {
      const cleanBarcode = value.replace(/[\n\r]/g, '').replace(/\*$/, '').trim();
      if (cleanBarcode) {
        handleScan(cleanBarcode);
      }
      return;
    }

    // Auto-scan dopo un breve delay (per pistole che non inviano Enter né asterisco)
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    if (value.length >= 8) { // Barcode minimo 8 caratteri
      setIsScanning(true);
      scanTimeoutRef.current = setTimeout(() => {
        const cleanValue = value.replace(/\*$/, '').trim();
        if (cleanValue) {
          handleScan(cleanValue);
        }
      }, 200); // 200ms delay per dare tempo alla pistola
    }
  };

  const handleScan = (scannedBarcode) => {
    setIsScanning(false);
    if (onScan) {
      onScan(scannedBarcode);
    }
    setBarcode(''); // Reset input
    if (inputRef.current) {
      inputRef.current.focus(); // Mantieni focus per scansioni multiple
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanBarcode = barcode.replace(/\*$/, '').trim(); // Rimuovi asterisco se presente
      if (cleanBarcode) {
        handleScan(cleanBarcode);
      }
    }
  };

  const handleManualScan = () => {
    const cleanBarcode = barcode.replace(/\*$/, '').trim(); // Rimuovi asterisco se presente
    if (cleanBarcode) {
      handleScan(cleanBarcode);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      marginBottom: '16px'
    }}>
      <div style={{
        fontSize: '24px',
        color: isScanning ? '#10b981' : '#6b7280'
      }}>
        {isScanning ? '🔍' : '📱'}
      </div>
      
      <div style={{ flex: 1 }}>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: `2px solid ${isScanning ? '#10b981' : '#d1d5db'}`,
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'monospace',
            background: isScanning ? '#f0fdf4' : 'white',
            transition: 'all 0.2s ease'
          }}
        />
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '4px'
        }}>
          {isScanning ? '🔄 Scansione in corso...' : '💡 Usa pistola barcode o inserisci manualmente'}
        </div>
      </div>

      <button
        onClick={handleManualScan}
        disabled={!barcode.trim()}
        style={{
          padding: '12px 20px',
          background: barcode.trim() ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#e5e7eb',
          color: barcode.trim() ? 'white' : '#9ca3af',
          border: 'none',
          borderRadius: '8px',
          cursor: barcode.trim() ? 'pointer' : 'not-allowed',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
      >
        📊 Scansiona
      </button>
    </div>
  );
};

export default BarcodeScanner;