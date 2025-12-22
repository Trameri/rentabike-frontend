import React, { useRef, useState, useCallback } from 'react';

const DocumentCaptureWithOCR = ({ label, onCapture, onOCRData }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Usa la camera posteriore se disponibile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Errore accesso camera:', err);
      alert('Impossibile accedere alla camera. Verifica i permessi.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    onCapture(imageData);
    stopCamera();

    // Avvia OCR automaticamente
    performOCR(imageData);
  }, [onCapture, stopCamera]);

  const performOCR = async (imageData) => {
    setIsProcessingOCR(true);
    try {
      // Simulazione OCR - In produzione useresti un servizio come Tesseract.js
      // Per ora estraiamo dati mock basati su pattern comuni
      const mockOCRResult = extractMockDataFromImage(imageData);
      setOcrResult(mockOCRResult);
      if (onOCRData) {
        onOCRData(mockOCRResult);
      }
    } catch (error) {
      console.error('Errore OCR:', error);
      setOcrResult({ error: 'Errore nella lettura del documento' });
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // Funzione mock per simulare l'estrazione dati OCR
  const extractMockDataFromImage = (imageData) => {
    // In un'implementazione reale, qui useresti Tesseract.js o un servizio OCR
    // Per ora restituiamo dati di esempio
    const mockData = {
      name: '',
      documentNumber: '',
      birthDate: '',
      issueDate: '',
      expiryDate: '',
      confidence: 0.85,
      rawText: 'Documento di identità rilevato'
    };

    // Simula il riconoscimento di alcuni pattern comuni
    if (Math.random() > 0.5) {
      mockData.name = 'MARIO ROSSI';
      mockData.documentNumber = 'CA' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0') + 'AA';
      mockData.birthDate = '01/01/1990';
      mockData.confidence = 0.92;
    }

    return mockData;
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setOcrResult(null);
    startCamera();
  };

  return (
    <div style={{
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      background: '#f9fafb'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#374151' }}>{label}</h4>
      
      {!isStreaming && !capturedImage && (
        <div>
          <button
            onClick={startCamera}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            📷 Avvia Camera
          </button>
          <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
            Clicca per avviare la camera e scansionare il documento
          </p>
        </div>
      )}

      {isStreaming && (
        <div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}
          />
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={capturePhoto}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              📸 Scatta Foto
            </button>
            <button
              onClick={stopCamera}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ❌ Annulla
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div>
          <img
            src={capturedImage}
            alt="Documento catturato"
            style={{
              width: '100%',
              maxWidth: '300px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '2px solid #10b981'
            }}
          />
          
          {isProcessingOCR && (
            <div style={{
              padding: '16px',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #f59e0b',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span style={{ color: '#92400e', fontWeight: '600' }}>
                  🔍 Lettura documento in corso...
                </span>
              </div>
            </div>
          )}

          {ocrResult && !isProcessingOCR && (
            <div style={{
              padding: '16px',
              background: ocrResult.error ? '#fef2f2' : '#f0fdf4',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <h5 style={{ 
                margin: '0 0 12px 0', 
                color: ocrResult.error ? '#dc2626' : '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {ocrResult.error ? '❌ Errore OCR' : '✅ Dati Estratti'}
                {!ocrResult.error && (
                  <span style={{ 
                    fontSize: '12px', 
                    background: '#dcfce7', 
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {Math.round(ocrResult.confidence * 100)}% accuratezza
                  </span>
                )}
              </h5>
              
              {ocrResult.error ? (
                <p style={{ margin: 0, color: '#dc2626' }}>{ocrResult.error}</p>
              ) : (
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  {ocrResult.name && <div><strong>Nome:</strong> {ocrResult.name}</div>}
                  {ocrResult.documentNumber && <div><strong>Documento:</strong> {ocrResult.documentNumber}</div>}
                  {ocrResult.birthDate && <div><strong>Data nascita:</strong> {ocrResult.birthDate}</div>}
                  {!ocrResult.name && !ocrResult.documentNumber && (
                    <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                      Nessun dato leggibile trovato. Verifica la qualità dell'immagine.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={retakePhoto}
            style={{
              background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Rifai Foto
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DocumentCaptureWithOCR;