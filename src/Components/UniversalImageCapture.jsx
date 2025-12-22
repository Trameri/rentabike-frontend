import React, { useState, useRef, useEffect } from 'react';

const UniversalImageCapture = ({ onCapture, label = "Carica Immagine", type = "document" }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUsingCamera, setIsUsingCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [cameraSupport, setCameraSupport] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    checkCameraSupport();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const checkCameraSupport = () => {
    const isSecure = window.isSecureContext || 
                     window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('192.168.') ||
                     window.location.hostname.includes('10.0.') ||
                     window.location.hostname.includes('172.');
    
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    setCameraSupport({
      isSecure,
      hasMediaDevices,
      canUseCamera: isSecure && hasMediaDevices
    });
  };

  const startCamera = async () => {
    if (!cameraSupport?.canUseCamera) {
      setError('Fotocamera non disponibile. Usa il caricamento file.');
      return;
    }

    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: type === 'selfie' ? 'user' : 'environment'
        }
      });

      setStream(mediaStream);
      setIsUsingCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Errore fotocamera:', err);
      setError(`Errore fotocamera: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsUsingCamera(false);
  };

  const capturePhoto = () => {
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
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        setCapturedImage(imageData);
        onCapture(imageData);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setCapturedImage(null);
    onCapture(null);
    setError(null);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    onCapture(null);
    startCamera();
  };

  return (
    <div style={{
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      background: '#f9fafb',
      minHeight: '200px'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#374151' }}>
        📷 {label}
      </h4>

      {/* Immagine catturata */}
      {capturedImage && (
        <div style={{ marginBottom: '16px' }}>
          <img 
            src={capturedImage} 
            alt="Captured" 
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: '8px',
              border: '2px solid #10b981'
            }}
          />
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={retakePhoto}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                margin: '0 4px',
                fontSize: '14px'
              }}
            >
              🔄 Rifai
            </button>
            <button
              onClick={removeImage}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                margin: '0 4px',
                fontSize: '14px'
              }}
            >
              🗑️ Rimuovi
            </button>
          </div>
        </div>
      )}

      {/* Camera attiva */}
      {isUsingCamera && stream && !capturedImage && (
        <div style={{ marginBottom: '16px' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              borderRadius: '8px',
              border: '2px solid #3b82f6'
            }}
          />
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={capturePhoto}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                margin: '0 4px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              📸 Scatta
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
                margin: '0 4px',
                fontSize: '16px'
              }}
            >
              ❌ Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Controlli iniziali */}
      {!capturedImage && !isUsingCamera && (
        <div>
          {/* Info supporto */}
          {cameraSupport && (
            <div style={{
              background: cameraSupport.canUseCamera ? '#f0f9ff' : '#fef3c7',
              border: `1px solid ${cameraSupport.canUseCamera ? '#bae6fd' : '#fcd34d'}`,
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '12px'
            }}>
              <div><strong>🔒 HTTPS:</strong> {cameraSupport.isSecure ? '✅' : '❌'}</div>
              <div><strong>📷 Camera:</strong> {cameraSupport.hasMediaDevices ? '✅' : '❌'}</div>
              <div><strong>🌐 URL:</strong> {window.location.href}</div>
            </div>
          )}

          {/* Errore */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Pulsante fotocamera */}
          {cameraSupport?.canUseCamera && (
            <button
              onClick={startCamera}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '16px',
                display: 'block',
                margin: '0 auto 16px auto'
              }}
            >
              📷 Usa Fotocamera
            </button>
          )}

          {/* Upload file */}
          <div style={{
            background: '#f0f9ff',
            border: '2px dashed #3b82f6',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <p style={{ 
              color: '#1d4ed8', 
              margin: '0 0 8px 0', 
              fontSize: '14px', 
              fontWeight: '500' 
            }}>
              📁 Oppure carica dal dispositivo:
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            />
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default UniversalImageCapture;