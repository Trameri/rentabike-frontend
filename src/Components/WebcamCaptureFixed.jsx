import React, { useState, useRef, useCallback, useEffect } from 'react'

const WebcamCaptureFixed = ({ onCapture, label = "Scatta Foto Documento", type = "front" }) => {
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Cleanup stream quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const checkCameraSupport = () => {
    // Controlla se siamo in un contesto sicuro
    const isSecure = window.isSecureContext || 
                     window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('192.168.') ||
                     window.location.hostname.includes('10.0.') ||
                     window.location.hostname.includes('172.');
    
    // Controlla se getUserMedia è supportato
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasGetUserMedia = !!(navigator.getUserMedia || 
                              navigator.webkitGetUserMedia || 
                              navigator.mozGetUserMedia || 
                              navigator.msGetUserMedia);
    
    return {
      isSecure,
      isSupported: hasMediaDevices || hasGetUserMedia
    };
  };

  const startCamera = async () => {
    setIsLoading(true)
    setError(null)
    
    const { isSecure, isSupported } = checkCameraSupport();
    
    // Verifica supporto browser
    if (!isSupported) {
      setError('Il tuo browser non supporta l\'accesso alla webcam. Usa il caricamento file.')
      setIsLoading(false)
      return
    }

    // Verifica se siamo su HTTPS o localhost
    if (!isSecure) {
      setError('La webcam richiede HTTPS o localhost. Usa il caricamento file o accedi tramite localhost.')
      setIsLoading(false)
      return
    }
    
    try {
      console.log('Tentativo accesso webcam...')
      
      // Prima prova con impostazioni semplici
      const constraints = {
        video: {
          width: { ideal: 1280, min: 320 },
          height: { ideal: 720, min: 240 }
        },
        audio: false
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('Stream ottenuto:', mediaStream)
      console.log('Tracks video:', mediaStream.getVideoTracks())
      
      setStream(mediaStream)
      setIsActive(true)
      
      // Aspetta che il video element sia pronto
      setTimeout(async () => {
        if (videoRef.current && mediaStream) {
          console.log('Assegnazione stream al video element...')
          videoRef.current.srcObject = mediaStream
          
          // Aggiungi event listeners per debug
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata caricati')
            console.log('Dimensioni video:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
            // Forza il refresh del video
            if (videoRef.current.videoWidth === 0) {
              console.log('Dimensioni video zero, riprovo...')
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.load()
                }
              }, 500)
            }
          }
          
          videoRef.current.oncanplay = () => {
            console.log('Video può essere riprodotto')
          }
          
          videoRef.current.onplay = () => {
            console.log('Video in riproduzione')
          }
          
          videoRef.current.onerror = (e) => {
            console.error('Errore video element:', e)
          }
          
          // Forza il play del video
          try {
            await videoRef.current.play()
            console.log('Play riuscito')
          } catch (playError) {
            console.error('Errore play video:', playError)
            // Prova a fare play dopo un breve delay
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.play().catch(e => console.log('Secondo tentativo play fallito:', e))
              }
            }, 1000)
          }
        }
      }, 200)
    } catch (err) {
      console.error('Errore accesso webcam:', err)
      console.error('Nome errore:', err.name)
      console.error('Messaggio errore:', err.message)
      
      let errorMessage = 'Errore sconosciuto'
      
      switch (err.name) {
        case 'NotAllowedError':
          errorMessage = 'Permesso webcam negato. Clicca sull\'icona della camera nella barra degli indirizzi e consenti l\'accesso.'
          break
        case 'NotFoundError':
          errorMessage = 'Nessuna webcam trovata. Verifica che sia collegata e funzionante.'
          break
        case 'NotReadableError':
          errorMessage = 'Webcam in uso da un\'altra applicazione. Chiudi altre app che potrebbero usarla.'
          break
        case 'OverconstrainedError':
          errorMessage = 'Impostazioni webcam non supportate. Provo con impostazioni diverse...'
          // Prova con impostazioni più semplici
          try {
            const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true })
            setStream(simpleStream)
            setIsActive(true)
            setError(null)
            
            if (videoRef.current) {
              videoRef.current.srcObject = simpleStream
              await videoRef.current.play()
            }
            setIsLoading(false)
            return
          } catch (simpleErr) {
            errorMessage = 'Impossibile accedere alla webcam con qualsiasi impostazione.'
          }
          break
        case 'SecurityError':
          errorMessage = 'Errore di sicurezza. Assicurati di essere su HTTPS o localhost.'
          break
        default:
          errorMessage = `Errore webcam: ${err.message}`
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        console.log('Track fermato:', track.kind)
      })
      setStream(null)
    }
    setIsActive(false)
    setError(null)
  }

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Verifica che il video sia in riproduzione
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        alert('⚠️ Video non pronto. Attendi qualche secondo e riprova.')
        return
      }
      
      // Imposta le dimensioni del canvas
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      console.log('Dimensioni video:', video.videoWidth, 'x', video.videoHeight)
      
      // Disegna il frame corrente del video sul canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Converti in base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageData)
      onCapture(imageData)
      
      // Ferma la camera
      stopCamera()
    } else {
      alert('❌ Errore nella cattura. Riprova.')
    }
  }, [onCapture, stream])

  const retakePhoto = () => {
    setCapturedImage(null)
    onCapture(null)
    startCamera()
  }

  const removePhoto = () => {
    setCapturedImage(null)
    onCapture(null)
  }

  return (
    <div style={{
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      background: '#f9fafb'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#374151' }}>
        📷 {label}
      </h4>

      {/* Stato iniziale */}
      {!isActive && !capturedImage && !isLoading && (
        <div>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}>
            {type === 'front' ? '🆔' : '📄'}
          </div>
          <p style={{ 
            margin: '0 0 16px 0', 
            color: '#6b7280',
            fontSize: '14px'
          }}>
            {type === 'front' ? 'Documento fronte' : 'Documento retro'}
          </p>
          
          {/* Info debug */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#0369a1'
          }}>
            <div><strong>Browser:</strong> {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Altro'}</div>
            <div><strong>HTTPS:</strong> {location.protocol === 'https:' ? '✅' : '❌'}</div>
            <div><strong>Localhost:</strong> {location.hostname === 'localhost' ? '✅' : '❌'}</div>
            <div><strong>MediaDevices:</strong> {navigator.mediaDevices ? '✅' : '❌'}</div>
          </div>
          
          <button
            onClick={startCamera}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            📷 Avvia Camera
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Attivazione camera...
          </p>
        </div>
      )}

      {/* Errore */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <p style={{ color: '#dc2626', margin: '0 0 12px 0', fontSize: '14px' }}>
            ⚠️ {error}
          </p>
          
          {/* Fallback: Upload file */}
          <div style={{
            background: '#f0f9ff',
            border: '2px dashed #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <p style={{ color: '#1d4ed8', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500' }}>
              📁 Carica immagine dal dispositivo:
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const imageData = event.target.result;
                    setCapturedImage(imageData);
                    onCapture(imageData);
                    setError(null);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <button
            onClick={startCamera}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '8px'
            }}
          >
            Riprova
          </button>
        </div>
      )}

      {/* Camera attiva */}
      {isActive && !error && (
        <div>
          <p style={{ 
            fontSize: '14px', 
            color: '#10b981', 
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            📹 Camera attiva - Posiziona il documento nel riquadro
          </p>
          
          <div style={{
            position: 'relative',
            display: 'inline-block',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '16px',
            border: '2px solid #10b981'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              style={{
                width: '100%',
                maxWidth: '400px',
                minHeight: '200px',
                height: 'auto',
                display: 'block',
                backgroundColor: '#000',
                borderRadius: '8px',
                objectFit: 'cover'
              }}
              onLoadedMetadata={(e) => {
                console.log('Video metadata caricati (inline)')
                console.log('Video element:', e.target)
                console.log('Dimensioni video:', e.target.videoWidth, 'x', e.target.videoHeight)
                console.log('Stream tracks:', stream?.getVideoTracks())
              }}
              onCanPlay={(e) => {
                console.log('Video può essere riprodotto (inline)')
                console.log('ReadyState:', e.target.readyState)
              }}
              onPlay={(e) => {
                console.log('Video in play (inline)')
              }}
              onTimeUpdate={(e) => {
                // Log solo una volta per evitare spam
                if (!e.target.hasLoggedTimeUpdate) {
                  console.log('Video time update - stream attivo')
                  e.target.hasLoggedTimeUpdate = true
                }
              }}
              onError={(e) => {
                console.error('Errore video element (inline):', e)
                console.error('Error details:', e.target.error)
                setError('Errore nella riproduzione video')
              }}
            />
            
            {/* Overlay guida per documento */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '3px solid #3b82f6',
              borderRadius: '8px',
              width: '80%',
              height: '60%',
              pointerEvents: 'none',
              boxShadow: '0 0 0 2000px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-35px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(59, 130, 246, 0.9)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                Posiziona il documento qui
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={capturePhoto}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
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
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ❌ Annulla
            </button>
          </div>
        </div>
      )}

      {/* Foto catturata */}
      {capturedImage && (
        <div>
          <p style={{ 
            fontSize: '14px', 
            color: '#10b981', 
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            ✅ Foto catturata con successo
          </p>
          
          <div style={{
            marginBottom: '16px',
            display: 'inline-block',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid #10b981'
          }}>
            <img
              src={capturedImage}
              alt="Documento catturato"
              style={{
                width: '100%',
                maxWidth: '300px',
                height: 'auto',
                display: 'block'
              }}
            />
          </div>
          
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
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔄 Rifai Foto
            </button>
            
            <button
              onClick={removePhoto}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🗑️ Rimuovi
            </button>
          </div>
        </div>
      )}

      {/* Canvas nascosto per la cattura */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default WebcamCaptureFixed