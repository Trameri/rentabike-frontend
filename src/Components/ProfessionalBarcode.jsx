import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function ProfessionalBarcode({ 
  code, 
  name, 
  type = 'bike',
  width = 400, 
  height = 100,
  showDownload = true,
  format = 'CODE128'
}) {
  const canvasRef = useRef(null);
  const downloadLinkRef = useRef(null);

  useEffect(() => {
    if (code && canvasRef.current) {
      try {
        // Genera barcode professionale Code128
        JsBarcode(canvasRef.current, code, {
          format: format,
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          fontOptions: "bold",
          font: "monospace",
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10
        });

        // Prepara link per download
        if (showDownload && downloadLinkRef.current) {
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
  }, [code, name, type, width, height, format, showDownload]);

  if (!code) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px dashed #d1d5db'
      }}>
        Nessun barcode disponibile
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      textAlign: 'center'
    }}>
      <div style={{
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151'
      }}>
        {type === 'bike' ? '🚲' : '🎒'} {name}
      </div>
      
      <canvas 
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          maxWidth: '100%',
          height: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '4px'
        }}
      />
      
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: '#6b7280',
        fontFamily: 'monospace'
      }}>
        {code}
      </div>

      {showDownload && (
        <div style={{ marginTop: '12px' }}>
          <a
            ref={downloadLinkRef}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            📥 Scarica PNG
          </a>
        </div>
      )}
    </div>
  );
}