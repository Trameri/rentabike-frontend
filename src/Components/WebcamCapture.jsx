import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

const WebcamCapture = ({ onCapture, label = "Scatta Foto Documento", type = "front", initialImage = null }) => {
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(initialImage)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    setCapturedImage(initialImage)
  }, [initialImage])

  useEffect(() => () => {
    stream?.getTracks().forEach(track => track.stop())
  }, [stream])

  useEffect(() => {
    if (!isActive) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') stopCamera()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isActive, stream])

  const startCamera = async () => {
    const constraintsList = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: true }
    ]

    for (const constraints of constraintsList) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

        setStream(mediaStream)
        setIsActive(true)

        // Aspetta che il componente sia montato prima di assegnare lo stream
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
            videoRef.current.play().catch(e => console.log('Errore play video:', e))
          }
        }, 100)
        return // Success, exit
      } catch (err) {
        console.warn('Tentativo fallito con constraints:', constraints, err)
      }
    }

    // If all attempts fail
    console.error('Impossibile accedere alla webcam con tutti i tentativi')
    alert('Impossibile accedere alla webcam. Verifica i permessi del browser.')
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsActive(false)
  }

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      // Imposta le dimensioni del canvas
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Disegna il frame corrente del video sul canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Converti in base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(imageData)
      onCapture(imageData)
      
      // Ferma la camera
      stopCamera()
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
    <div className="webcam-modal-content" style={{
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      background: '#f9fafb'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#374151' }}>
        📷 {label}
      </h4>

      {!isActive && !capturedImage && (
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

      {isActive && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Fotocamera: ${label}`}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              background: 'rgba(15,23,42,0.82)'
            }}
          >
            <div style={{
              width: 'min(1100px, 96vw)',
              maxHeight: '94dvh',
              overflowY: 'auto',
              padding: '20px',
              borderRadius: '16px',
              background: 'white',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 14px', color: '#059669', fontWeight: 700, fontSize: 18 }}>
                📹 Camera attiva — Posiziona il documento nel riquadro
              </p>
              <div style={{
                position: 'relative',
                width: '100%',
                maxHeight: '70dvh',
                overflow: 'hidden',
                borderRadius: '10px',
                background: '#000'
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxHeight: '70dvh',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(e => console.log('Errore play:', e))
                    }
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: '3px solid #3b82f6',
                  borderRadius: '8px',
                  width: '80%',
                  height: '60%',
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    background: 'rgba(59, 130, 246, 0.95)',
                    color: 'white',
                    padding: '5px 12px',
                    borderRadius: '5px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>Posiziona il documento qui</div>
                </div>
              </div>
              <div className="webcam-modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  onClick={capturePhoto}
                  style={{
                    background: '#10b981', color: 'white', border: 'none',
                    padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '16px', fontWeight: 600
                  }}
                >📸 Scatta Foto</button>
                <button
                  onClick={stopCamera}
                  style={{
                    background: '#ef4444', color: 'white', border: 'none',
                    padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '16px', fontWeight: 600
                  }}
                >❌ Annulla</button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {capturedImage && (
        <div>
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
    </div>
  )
}

export default WebcamCapture