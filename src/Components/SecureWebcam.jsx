import React, { useState, useRef, useEffect } from 'react';

const SecureWebcam = ({ onCapture, onError }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(false);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    checkSupport();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const checkSupport = () => {
    // Controlla se siamo in un contesto sicuro (HTTPS o localhost)
    const isSecure = window.isSecureContext || 
                     window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
    
    setIsSecureContext(isSecure);

    // Controlla se getUserMedia è supportato
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasGetUserMedia = !!(navigator.getUserMedia || 
                              navigator.webkitGetUserMedia || 
                              navigator.mozGetUserMedia || 
                              navigator.msGetUserMedia);
    
    setIsSupported(hasMediaDevices || hasGetUserMedia);
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      
      let mediaStream;
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Metodo moderno
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // Fotocamera posteriore su mobile
          }
        });
      } else {
        // Fallback per browser più vecchi
        const getUserMedia = navigator.getUserMedia || 
                           navigator.webkitGetUserMedia || 
                           navigator.mozGetUserMedia || 
                           navigator.msGetUserMedia;
        
        if (getUserMedia) {
          mediaStream = await new Promise((resolve, reject) => {
            getUserMedia.call(navigator, 
              { video: true }, 
              resolve, 
              reject
            );
          });
        } else {
          throw new Error('getUserMedia non supportato');
        }
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Errore accesso fotocamera:', error);
      setIsCapturing(false);
      if (onError) {
        onError(`Errore fotocamera: ${error.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (onCapture) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  // Se non è supportato, mostra alternative
  if (!isSupported) {
    return (
      <div className="secure-webcam-error">
        <h3>📷 Fotocamera non disponibile</h3>
        <p>Il tuo browser non supporta l'accesso alla fotocamera.</p>
        <div className="alternatives">
          <h4>Alternative:</h4>
          <ul>
            <li>📱 Usa il browser Chrome o Firefox</li>
            <li>🔒 Accedi tramite HTTPS</li>
            <li>📁 Carica file manualmente</li>
          </ul>
        </div>
      </div>
    );
  }

  // Se non è un contesto sicuro
  if (!isSecureContext) {
    return (
      <div className="secure-webcam-warning">
        <h3>🔒 Connessione non sicura</h3>
        <p>La fotocamera funziona solo su HTTPS o localhost.</p>
        <div className="solutions">
          <h4>Soluzioni:</h4>
          <ul>
            <li>🌐 Usa l'app deployata su HTTPS</li>
            <li>🏠 Accedi tramite localhost</li>
            <li>📁 Carica file manualmente</li>
          </ul>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={(e) => {
            if (e.target.files[0] && onCapture) {
              onCapture(e.target.files[0]);
            }
          }}
          style={{
            margin: '10px 0',
            padding: '10px',
            border: '2px dashed #007bff',
            borderRadius: '5px',
            width: '100%'
          }}
        />
      </div>
    );
  }

  return (
    <div className="secure-webcam">
      {!stream ? (
        <div className="camera-start">
          <button 
            onClick={startCamera}
            disabled={isCapturing}
            style={{
              padding: '15px 30px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            {isCapturing ? '📷 Avvio fotocamera...' : '📷 Avvia Fotocamera'}
          </button>
        </div>
      ) : (
        <div className="camera-active">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: '500px',
              height: 'auto',
              border: '2px solid #007bff',
              borderRadius: '10px'
            }}
          />
          <div className="camera-controls" style={{ margin: '10px 0' }}>
            <button 
              onClick={capturePhoto}
              style={{
                padding: '10px 20px',
                margin: '0 5px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              📸 Scatta Foto
            </button>
            <button 
              onClick={stopCamera}
              style={{
                padding: '10px 20px',
                margin: '0 5px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ⏹️ Stop
            </button>
          </div>
        </div>
      )}
      
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
      />
      
      {/* Fallback per upload manuale */}
      <div className="manual-upload" style={{ marginTop: '20px' }}>
        <h4>📁 Oppure carica un'immagine:</h4>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          onChange={(e) => {
            if (e.target.files[0] && onCapture) {
              onCapture(e.target.files[0]);
            }
          }}
          style={{
            padding: '10px',
            border: '2px dashed #6c757d',
            borderRadius: '5px',
            width: '100%'
          }}
        />
      </div>
    </div>
  );
};

export default SecureWebcam;