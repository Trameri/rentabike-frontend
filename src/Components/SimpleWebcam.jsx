import React, { useState, useRef, useEffect } from 'react'

const SimpleWebcam = ({ onCapture, label = "Scatta Foto", type = "front" }) => {
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🎥 Avvio camera...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      console.log('✅ Stream ottenuto:', stream)
      streamRef.current = stream
      
      if (videoRef.current) {
        console.log('📺 Assegnazione stream al video...')
        videoRef.current.srcObject = stream
        
        // Imposta isActive subito per mostrare il video
        setIsActive(true)
        
        // Aspetta che il video sia pronto e poi fai play
        videoRef.current.onloadedmetadata = async () => {
          console.log('📊 Metadata caricati')
          console.log('📏 Dimensioni video:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight)
          try {
            await videoRef.current.play()
            console.log('▶️ Video in riproduzione')
          } catch (playErr) {
            console.error('❌ Errore play:', playErr)
            // Prova comunque a mostrare il video anche se play fallisce
            console.log('⚠️ Play fallito ma video potrebbe essere visibile')
          }
        }
        
        // Forza il play anche senza aspettare metadata
        setTimeout(async () => {
          if (videoRef.current) {
            try {
              await videoRef.current.play()
              console.log('▶️ Play forzato riuscito')
            } catch (e) {
              console.log('⚠️ Play forzato fallito:', e.message)
            }
          }
        }, 500)
      }
    } catch (err) {
      console.error('❌ Errore camera:', err)
      setError(`Errore: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsActive(false)
    setError(null)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('❌ Errore: elementi non pronti')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Verifica che il video sia in riproduzione
    if (video.readyState < 2) {
      alert('⚠️ Video non pronto, attendi...')
      return
    }

    console.log('📸 Cattura foto...')
    console.log('Video size:', video.videoWidth, 'x', video.videoHeight)

    // Imposta dimensioni canvas
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    // Disegna il frame corrente
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Converti in base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    console.log('✅ Foto catturata, dimensioni:', imageData.length, 'bytes')

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
      {!isActive && !capturedImage && !isLoading && (
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
            {type === 'front' ? '🆔' : '📄'}
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
              fontWeight: '500'
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
          <p>Attivazione camera...</p>
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
            overflow: 'hidden'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '400px',
                height: '300px',
                display: 'block',
                backgroundColor: '#000',
                objectFit: 'cover'
              }}
              onCanPlay={() => {
                console.log('🎬 Video può essere riprodotto')
              }}
              onPlay={() => {
                console.log('▶️ Video sta riproducendo')
              }}
              onTimeUpdate={() => {
                // Log solo una volta per confermare che il video è attivo
                if (!videoRef.current?.hasLoggedUpdate) {
                  console.log('⏰ Video time update - stream attivo!')
                  videoRef.current.hasLoggedUpdate = true
                }
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
                Documento qui
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SimpleWebcam