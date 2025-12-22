import React, { useState, useRef, useEffect } from 'react'

const BasicWebcam = ({ onCapture, label = "Scatta Foto", type = "front" }) => {
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    
    try {
      console.log('🎥 Richiesta accesso camera...')
      
      // Controlla se getUserMedia è supportato
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera non supportata da questo browser')
      }
      
      // Richiedi permessi con configurazione migliorata
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Preferisci camera posteriore
        },
        audio: false
      })
      
      console.log('✅ Stream ottenuto:', stream)
      console.log('📹 Tracks video:', stream.getVideoTracks())
      
      streamRef.current = stream
      
      // Assegna lo stream al video IMMEDIATAMENTE
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log('📺 Stream assegnato al video element')
        
        // Mostra il video subito
        setIsActive(true)
        
        // Forza attributi per assicurare la visibilità
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        videoRef.current.autoplay = true
        
        // Prova a fare play
        videoRef.current.play().then(() => {
          console.log('▶️ Video play riuscito')
        }).catch(err => {
          console.log('⚠️ Video play fallito:', err.message)
          // Ma il video potrebbe essere comunque visibile
        })
        
        // Forza play dopo un breve delay
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(e => console.log('Play ritardato fallito:', e.message))
          }
        }, 1000)
      }
      
    } catch (err) {
      console.error('❌ Errore camera:', err)
      let errorMessage = 'Errore sconosciuto'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permesso camera negato. Abilita la camera nelle impostazioni del browser.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Nessuna camera trovata. Collega una webcam e riprova.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera in uso da un\'altra applicazione. Chiudi altre app e riprova.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera non supporta le impostazioni richieste.'
      } else {
        errorMessage = err.message || 'Errore accesso camera'
      }
      
      setError(errorMessage)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('❌ Errore: elementi non pronti')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    console.log('📸 Cattura in corso...')
    console.log('📏 Video dimensions:', video.videoWidth, 'x', video.videoHeight)

    // Usa dimensioni fisse se quelle del video non sono disponibili
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480

    canvas.width = width
    canvas.height = height

    // Disegna il frame corrente
    ctx.drawImage(video, 0, 0, width, height)

    // Converti in base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    console.log('✅ Foto catturata!')

    setCapturedImage(imageData)
    onCapture(imageData)
    stopCamera()
  }

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
      {!isActive && !capturedImage && (
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
            {type === 'front' ? '🆔' : '📄'}
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
            {type === 'front' ? 'Documento fronte' : 'Documento retro'}
          </p>
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
              fontWeight: '500'
            }}
          >
            📷 Avvia Camera
          </button>
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
          <p style={{ color: '#dc2626', margin: 0 }}>⚠️ {error}</p>
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
            📹 Camera attiva - Posiziona il documento
          </p>
          
          <div style={{
            position: 'relative',
            display: 'inline-block',
            marginBottom: '16px',
            border: '3px solid #10b981',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#000'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              controls={false}
              style={{
                width: '400px',
                height: '300px',
                display: 'block',
                objectFit: 'cover',
                backgroundColor: '#000',
                border: 'none'
              }}
              onLoadedMetadata={(e) => {
                console.log('📊 Video metadata loaded')
                console.log('📏 Video size:', e.target.videoWidth, 'x', e.target.videoHeight)
                console.log('🎬 Ready state:', e.target.readyState)
              }}
              onCanPlay={(e) => {
                console.log('🎬 Video can play')
                console.log('📺 Current time:', e.target.currentTime)
              }}
              onPlay={(e) => {
                console.log('▶️ Video is playing')
              }}
              onTimeUpdate={(e) => {
                if (!e.target.hasLoggedTime) {
                  console.log('⏰ Video time update - STREAM ATTIVO!')
                  e.target.hasLoggedTime = true
                }
              }}
              onError={(e) => {
                console.error('❌ Video error:', e.target.error)
              }}
            />
            
            {/* Overlay guida */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '2px dashed #fff',
              borderRadius: '8px',
              width: '80%',
              height: '60%',
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#000',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                Posiziona documento qui
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
                fontWeight: '500'
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
                fontWeight: '500'
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
            ✅ Foto catturata
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
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
                fontWeight: '500'
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
                fontWeight: '500'
              }}
            >
              🗑️ Rimuovi
            </button>
          </div>
        </div>
      )}

      {/* Canvas nascosto */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default BasicWebcam