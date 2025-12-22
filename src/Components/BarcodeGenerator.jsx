import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeGenerator = ({ code, name, type = 'bike', compact = false }) => {
  const canvasRef = useRef(null);
  const downloadLinkRef = useRef(null);

  useEffect(() => {
    if (code && canvasRef.current) {
      try {
        // Genera barcode professionale Code128
        JsBarcode(canvasRef.current, code, {
          format: "CODE128",
          width: compact ? 1.5 : 2,
          height: compact ? 40 : 60,
          displayValue: true,
          fontSize: compact ? 10 : 14,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          fontOptions: "bold",
          font: "monospace",
          background: "#ffffff",
          lineColor: "#000000",
          margin: compact ? 5 : 10
        });

        // Prepara link per download se non compatto
        if (!compact && downloadLinkRef.current) {
          canvasRef.current.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            downloadLinkRef.current.href = url;
            downloadLinkRef.current.download = `${type}_${name}_${code}.png`;
          });
        }
      } catch (error) {
        console.error('Errore generazione barcode:', error);
      }
    }
  }, [code, name, type, compact]);

  const printBarcode = () => {
    if (!canvasRef.current) return;
    
    const printWindow = window.open('', '_blank');
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${code}</title>
        <style>
          @page { 
            size: 4in 2in; 
            margin: 0.2in; 
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            text-align: center;
          }
          .barcode-container {
            border: 2px solid #000;
            padding: 15px;
            background: white;
            border-radius: 8px;
          }
          .barcode-header {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .barcode-image {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
          }
          .barcode-name {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
          }
          .barcode-type {
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <div class="barcode-header">🚲 RENT A BIKE</div>
          <img src="${dataURL}" alt="Barcode ${code}" class="barcode-image" />
          <div class="barcode-name">${name}</div>
          <div class="barcode-type">${type === 'bike' ? 'Bicicletta' : 'Accessorio'}</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      alert('Barcode copiato negli appunti!');
    });
  };

  // Modalità compatta - solo canvas piccolo
  if (compact) {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <canvas 
          ref={canvasRef}
          style={{
            maxWidth: '200px',
            height: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '4px'
          }}
        />
        <div style={{ marginTop: '4px' }}>
          <button
            onClick={printBarcode}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '600'
            }}
            title={`Stampa barcode per ${name}`}
          >
            🖨️ Stampa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '12px'
      }}>
        🚲 RENT A BIKE
      </div>
      
      {/* Barcode professionale */}
      <canvas 
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          height: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          margin: '12px 0'
        }}
      />
      
      {/* Nome item */}
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '8px'
      }}>
        {name}
      </div>
      
      {/* Tipo */}
      <div style={{
        fontSize: '10px',
        color: '#9ca3af',
        textTransform: 'uppercase',
        marginBottom: '16px'
      }}>
        {type === 'bike' ? 'Bicicletta' : 'Accessorio'}
      </div>
      
      {/* Pulsanti azione */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={printBarcode}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          🖨️ Stampa
        </button>
        
        <button
          onClick={copyToClipboard}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          📋 Copia
        </button>
        
        <a
          ref={downloadLinkRef}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          📥 Scarica PNG
        </a>
      </div>
    </div>
  );
};

export default BarcodeGenerator;