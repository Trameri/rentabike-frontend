import React, { useState, useRef, useEffect } from 'react';

const BarcodeScannerSimple = ({ onScan, placeholder = "Inserisci o scansiona barcode" }) => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Focus automatico sull'input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setBarcode(value);
    
    // Clear timeout precedente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Se il valore contiene newline (tipico delle pistole barcode)
    if (value.includes('\n') || value.includes('\r')) {
      const cleanBarcode = value.replace(/[\n\r]/g, '').trim();
      if (cleanBarcode.length >= 3) {
        processScan(cleanBarcode);
      }
      return;
    }

    // Auto-scan dopo un breve delay per pistole che non inviano Enter
    if (value.length >= 6) {
      setIsScanning(true);
      timeoutRef.current = setTimeout(() => {
        if (value.trim().length >= 3) {
          processScan(value.trim());
        }
      }, 300);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (barcode.trim().length >= 3) {
        processScan(barcode.trim());
      }
    }
  };

  const processScan = (scannedCode) => {
    setIsScanning(false);
    if (onScan) {
      onScan(scannedCode);
    }
    // Reset dopo un breve delay
    setTimeout(() => {
      setBarcode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
  };

  const handleManualScan = () => {
    if (barcode.trim().length >= 3) {
      processScan(barcode.trim());
    }
  };

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
        📱 Scanner Barcode
      </h3>

      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: `2px solid ${isScanning ? '#f59e0b' : '#e5e7eb'}`,
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
        />
        
        <button
          onClick={handleManualScan}
          disabled={barcode.trim().length < 3}
          style={{
            padding: '12px 20px',
            background: barcode.trim().length >= 3 ? '#10b981' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: barcode.trim().length >= 3 ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Scansiona
        </button>
      </div>

      {isScanning && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          color: '#92400e',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #f59e0b40',
            borderTop: '2px solid #f59e0b',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Scansione in corso...
        </div>
      )}

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        💡 Suggerimento: Usa la pistola barcode o digita manualmente il codice
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BarcodeScannerSimple;