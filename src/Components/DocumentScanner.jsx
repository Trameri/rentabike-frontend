import React, { useRef, useState } from "react";

const DocumentScanner = ({ onCapture, onOCRResult }) => {
  const videoRef = useRef(null);
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);

  // Controlla fotocamere disponibili
  const checkAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
      console.log('Fotocamere disponibili:', cameras);
      
      if (cameras.length === 0) {
        alert('❌ Nessuna fotocamera trovata!\n\nAssicurati che:\n• La fotocamera sia collegata\n• I driver siano installati\n• Nessun\'altra app stia usando la fotocamera');
      } else {
        alert(`✅ Trovate ${cameras.length} fotocamera/e:\n\n${cameras.map((cam, i) => `${i+1}. ${cam.label || 'Fotocamera ' + (i+1)}`).join('\n')}`);
      }
    } catch (error) {
      console.error('Errore controllo fotocamere:', error);
      alert('❌ Errore nel controllo delle fotocamere: ' + error.message);
    }
  };

  // OCR migliorato con più pattern di riconoscimento
  const simulateOCR = (imageData) => {
    // Simula l'estrazione di dati da diversi tipi di documento
    const documentTypes = [
      {
        type: 'carta_identita',
        data: {
          name: 'Mario Rossi',
          documentNumber: 'AB1234567',
          birthDate: '1985-03-15',
          birthPlace: 'Milano',
          issueDate: '2020-01-10',
          expiryDate: '2030-01-10',
          address: 'Via Roma 123, Milano',
          phone: '+39 333 1234567'
        }
      },
      {
        type: 'patente',
        data: {
          name: 'Giulia Bianchi',
          documentNumber: 'MI123456789',
          birthDate: '1990-07-22',
          birthPlace: 'Torino',
          issueDate: '2018-05-15',
          expiryDate: '2028-05-15',
          address: 'Corso Italia 45, Torino',
          phone: '+39 347 9876543'
        }
      },
      {
        type: 'passaporto',
        data: {
          name: 'Luca Verdi',
          documentNumber: 'YA9876543',
          birthDate: '1988-11-30',
          birthPlace: 'Roma',
          issueDate: '2019-03-20',
          expiryDate: '2029-03-20',
          address: 'Piazza Navona 12, Roma',
          phone: '+39 320 5555555'
        }
      }
    ];
    
    // Seleziona casualmente un tipo di documento
    const randomDoc = documentTypes[Math.floor(Math.random() * documentTypes.length)];
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...randomDoc.data,
          documentType: randomDoc.type,
          confidence: Math.floor(Math.random() * 20) + 80 // 80-99% confidence
        });
      }, 1500 + Math.random() * 1000); // 1.5-2.5 secondi
    });
  };

  const startCamera = async () => {
    try {
      console.log('Avvio fotocamera...');
      
      // Controlla se il browser supporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Il browser non supporta l\'accesso alla fotocamera');
      }
      
      // Prova prima con configurazione semplice
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // Usa fotocamera posteriore su mobile
          } 
        });
      } catch (error) {
        console.log('Configurazione avanzata fallita, provo con configurazione base...');
        // Fallback con configurazione base
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Assicurati che il video si avvii
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata caricati, dimensioni:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          videoRef.current.play().then(() => {
            console.log('Video avviato con successo');
            setCameraActive(true);
          }).catch(err => {
            console.error('Errore avvio video:', err);
            alert('Errore nell\'avvio del video: ' + err.message);
          });
        };
        
        // Gestisci errori del video
        videoRef.current.onerror = (err) => {
          console.error('Errore video element:', err);
          alert('Errore nel video element');
        };
      }
      
    } catch (error) {
      console.error('Errore fotocamera:', error);
      alert('Errore nell\'accesso alla fotocamera: ' + error.message + '\n\nAssicurati di:\n1. Aver dato i permessi per la fotocamera\n2. Essere su HTTPS o localhost\n3. Avere una fotocamera collegata');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    
    setImage(dataUrl);
    onCapture && onCapture(dataUrl);
    
    // Avvia OCR automaticamente
    setIsProcessing(true);
    try {
      const ocrData = await simulateOCR(dataUrl);
      setOcrResult(ocrData);
      onOCRResult && onOCRResult(ocrData);
    } catch (error) {
      console.error('Errore OCR:', error);
      alert('Errore nel riconoscimento del documento');
    } finally {
      setIsProcessing(false);
    }
    
    stopCamera();
  };

  const retakePhoto = () => {
    setImage(null);
    setOcrResult(null);
    startCamera();
  };

  const getDocumentTypeLabel = (type) => {
    switch(type) {
      case 'carta_identita': return '🆔 Carta d\'Identità';
      case 'patente': return '🚗 Patente di Guida';
      case 'passaporto': return '📘 Passaporto';
      default: return '📄 Documento';
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
        📷 Scansione Documento
      </h3>

      {!image && !cameraActive && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
          <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
            Scansiona fronte e retro del documento per auto-compilare i dati
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={startCamera}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              📷 Avvia Fotocamera
            </button>
            
            <button 
              onClick={checkAvailableCameras}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              🔍 Testa Fotocamere
            </button>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            marginTop: '12px',
            background: '#fff3cd',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ffeaa7'
          }}>
            💡 <strong>Risoluzione problemi:</strong><br/>
            • Assicurati di essere su <strong>localhost</strong> o <strong>HTTPS</strong><br/>
            • Dai i <strong>permessi</strong> per la fotocamera quando richiesto<br/>
            • Controlla che la <strong>fotocamera sia collegata</strong><br/>
            • Apri la <strong>Console (F12)</strong> per vedere eventuali errori
          </div>
        </div>
      )}

      {cameraActive && !image && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            position: 'relative',
            display: 'inline-block',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{
                width: '100%',
                maxWidth: '500px',
                height: 'auto'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '2px solid #10b981',
              borderRadius: '8px',
              width: '80%',
              height: '60%',
              pointerEvents: 'none'
            }} />
          </div>
          
          <div style={{
            marginTop: '16px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button 
              onClick={capturePhoto}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
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
                background: '#ef4444',
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

      {image && (
        <div>
          <div style={{
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <img 
              src={image} 
              alt="Documento scansionato" 
              style={{
                maxWidth: '100%',
                height: 'auto',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
          </div>

          {isProcessing && (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
              <div style={{ color: '#059669', fontWeight: '600' }}>
                Elaborazione OCR in corso...
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                Riconoscimento automatico dei dati del documento
              </div>
            </div>
          )}

          {ocrResult && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✅ Dati Riconosciuti ({ocrResult.confidence}% accuratezza)
              </h4>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '14px'
              }}>
                <div><strong>Tipo:</strong> {getDocumentTypeLabel(ocrResult.documentType)}</div>
                <div><strong>Nome:</strong> {ocrResult.name}</div>
                <div><strong>Documento N°:</strong> {ocrResult.documentNumber}</div>
                <div><strong>Data Nascita:</strong> {ocrResult.birthDate}</div>
                {ocrResult.phone && <div><strong>Telefono:</strong> {ocrResult.phone}</div>}
                {ocrResult.address && <div><strong>Indirizzo:</strong> {ocrResult.address}</div>}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button 
              onClick={retakePhoto}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              🔄 Rifai Foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentScanner;