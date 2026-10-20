import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function MobileBarcodeScanner({ onScan, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const onScanRef = useRef(onScan)
  const hasScannedRef = useRef(false)

  onScanRef.current = onScan

  useEffect(() => {
    if (!isOpen || !videoRef.current) return undefined

    let cancelled = false
    setErrorMessage('')
    hasScannedRef.current = false

    const startScanner = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoRef.current,
          (result) => {
            if (!result || hasScannedRef.current) return
            hasScannedRef.current = true
            const barcode = result.getText().trim()
            controlsRef.current?.stop()
            controlsRef.current = null
            setIsOpen(false)
            if (barcode) onScanRef.current?.(barcode)
          }
        )
        if (cancelled) {
          controls.stop()
        } else {
          controlsRef.current = controls
        }
      } catch (error) {
      if (cancelled) return
      console.error('Errore avvio fotocamera barcode:', error)
      setErrorMessage(
        error.name === 'NotAllowedError'
          ? 'Consenti l’accesso alla fotocamera nelle impostazioni del browser.'
          : 'Fotocamera non disponibile. Controlla i permessi e riprova.'
      )
      }
    }

    startScanner()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        style={{
          padding: '12px 14px',
          background: disabled ? '#cbd5e1' : '#1d4ed8',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}
      >
        📷 Scansiona
      </button>

      {isOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lettore barcode"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(15,23,42,0.85)'
          }}
        >
          <section
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(720px, 100%)',
              padding: '16px',
              borderRadius: '14px',
              background: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
          >
            <header style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>
                Inquadra il codice a barre
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Chiudi lettore"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  border: 0,
                  borderRadius: '8px',
                  background: '#e2e8f0',
                  color: '#1e293b',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >×</button>
            </header>

            <div style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '10px',
              background: '#0f172a'
            }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: '65dvh',
                  objectFit: 'cover'
                }}
              />
              <div aria-hidden="true" style={{
                position: 'absolute',
                left: '8%',
                right: '8%',
                top: '35%',
                height: '30%',
                border: '2px solid #22c55e',
                borderRadius: '8px',
                boxShadow: '0 0 0 999px rgba(15,23,42,0.25)',
                pointerEvents: 'none'
              }} />
            </div>
            <p role={errorMessage ? 'alert' : 'status'} style={{
              margin: '12px 0 0',
              color: errorMessage ? '#b91c1c' : '#475569',
              fontSize: '14px'
            }}>
              {errorMessage || 'Inquadra il barcode nel riquadro: verrà letto automaticamente.'}
            </p>
          </section>
        </div>,
        document.body
      )}
    </>
  )
}
