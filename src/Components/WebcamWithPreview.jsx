import React, { useState, useRef, useEffect } from 'react'

const WebcamWithPreview = ({ onCapture, label = "Scatta Foto", type = "front" }) => {
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
      console.log('🎥 Avvio camera...')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: type === 'selfie' ? 'user' : 'environment'
        },
        audio: false
      })

      console.log('✅ Stream ottenuto:', stream)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => {
          console.log('Errore play video:', e.message)
          setError('Errore nell\'avvio del video')
        })
      }

      setIsActive(true)

    } catch (err) {
      console.error('❌ Errore camera:', err)
      setError(`Errore fotocamera: ${err.message}`)
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

    // Usa dimensioni del video o fallback
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

      {/* Camera attiva con anteprima */}
      {isActive && !error && (
        <div>
          <p style={{
            fontSize: '14px',
            color: '#10b981',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            📹 Camera attiva - Centra il documento nel riquadro
          </p>

          {/* Video con overlay guida */}
          <div style={{
            position: 'relative',
            border: '3px solid #10b981',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#000',
            width: '100%',
            maxWidth: '400px',
            height: '300px',
            margin: '0 auto 20px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                objectFit: 'cover'
              }}
              onLoadedMetadata={() => {
                console.log('📹 Video metadata caricati')
              }}
            />

            {/* Overlay guida per documento */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '3px dashed #fff',
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
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#000',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                📄 Centra il documento qui
              </div>
            </div>

            {/* Indicatore di stato */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(16, 185, 129, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              🔴 LIVE
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            justifyContent: 'center',
            marginTop: '20px',
            padding: '0 20px'
          }}>
            <button
              onClick={capturePhoto}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
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
                padding: '14px 28px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.3s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              ❌ Annulla
            </button>
          </div>
          
          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            💡 Suggerimento: Posiziona il documento nel riquadro tratteggiato per una cattura ottimale
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

export default WebcamWithPreview