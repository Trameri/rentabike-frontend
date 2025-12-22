import React, { useState, useRef, useEffect } from 'react'

const WebcamTest = () => {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const videoRef = useRef(null)

  const startCamera = async () => {
    try {
      console.log('🎥 Test webcam - avvio...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true
      })
      
      console.log('✅ Stream ottenuto:', mediaStream)
      setStream(mediaStream)
      setError(null)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        console.log('📺 Stream assegnato')
        
        videoRef.current.onloadedmetadata = () => {
          console.log('📊 Metadata caricati')
          videoRef.current.play().then(() => {
            console.log('▶️ Play riuscito')
          }).catch(e => {
            console.log('⚠️ Play fallito:', e)
          })
        }
      }
      
    } catch (err) {
      console.error('❌ Errore:', err)
      setError(err.message)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>🧪 Test Webcam</h2>
      
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          color: '#dc2626'
        }}>
          ❌ Errore: {error}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={startCamera}
          disabled={!!stream}
          style={{
            background: stream ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: stream ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            marginRight: '10px'
          }}
        >
          📷 Avvia Camera
        </button>
        
        <button
          onClick={stopCamera}
          disabled={!stream}
          style={{
            background: !stream ? '#9ca3af' : '#ef4444',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: !stream ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          ❌ Ferma Camera
        </button>
      </div>
      
      <div style={{
        border: '3px solid #10b981',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'inline-block',
        backgroundColor: '#000'
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
            backgroundColor: '#000'
          }}
        />
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
        Apri la console (F12) per vedere i logs dettagliati
      </div>
    </div>
  )
}

export default WebcamTest