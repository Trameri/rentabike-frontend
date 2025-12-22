import React, { useState } from 'react'
import WebcamWithPreview from './WebcamWithPreview.jsx'
import DocumentCapture from './DocumentCapture.jsx'

const WebcamTestOptimized = () => {
  const [capturedImages, setCapturedImages] = useState({
    webcam: null,
    documentFront: null,
    documentBack: null
  })

  const handleWebcamCapture = (imageData) => {
    setCapturedImages(prev => ({ ...prev, webcam: imageData }))
  }

  const handleDocumentCapture = (imageData, type) => {
    setCapturedImages(prev => ({ 
      ...prev, 
      [type === 'front' ? 'documentFront' : 'documentBack']: imageData 
    }))
  }

  const clearAll = () => {
    setCapturedImages({
      webcam: null,
      documentFront: null,
      documentBack: null
    })
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '2.5rem',
          fontWeight: '800'
        }}>
          📷 Test Webcam Ottimizzato
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
          Testa tutte le funzionalità della webcam e cattura documenti
        </p>
      </div>

      {/* Test WebcamWithPreview */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          🎥 Test WebcamWithPreview
        </h3>
        
        <WebcamWithPreview
          onCapture={handleWebcamCapture}
          label="Test Webcam Generale"
          type="front"
        />
        
        {capturedImages.webcam && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#059669' }}>
              ✅ Immagine Catturata da WebcamWithPreview
            </h4>
            <img
              src={capturedImages.webcam}
              alt="Cattura webcam"
              style={{
                maxWidth: '300px',
                height: 'auto',
                borderRadius: '8px',
                border: '2px solid #10b981'
              }}
            />
          </div>
        )}
      </div>

      {/* Test DocumentCapture */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          📄 Test DocumentCapture
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          <DocumentCapture
            onCapture={(imageData) => handleDocumentCapture(imageData, 'front')}
            label="Test Documento Fronte"
            type="front"
          />
          
          <DocumentCapture
            onCapture={(imageData) => handleDocumentCapture(imageData, 'back')}
            label="Test Documento Retro"
            type="back"
          />
        </div>
        
        {/* Risultati DocumentCapture */}
        {(capturedImages.documentFront || capturedImages.documentBack) && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px'
          }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#059669' }}>
              ✅ Documenti Catturati
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {capturedImages.documentFront && (
                <div>
                  <h5 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                    📄 Documento Fronte
                  </h5>
                  <img
                    src={capturedImages.documentFront}
                    alt="Documento fronte"
                    style={{
                      width: '100%',
                      maxWidth: '250px',
                      height: 'auto',
                      borderRadius: '8px',
                      border: '2px solid #10b981'
                    }}
                  />
                </div>
              )}
              
              {capturedImages.documentBack && (
                <div>
                  <h5 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                    📄 Documento Retro
                  </h5>
                  <img
                    src={capturedImages.documentBack}
                    alt="Documento retro"
                    style={{
                      width: '100%',
                      maxWidth: '250px',
                      height: 'auto',
                      borderRadius: '8px',
                      border: '2px solid #10b981'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistiche e Controlli */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#374151'
        }}>
          📊 Statistiche Test
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px',
            background: capturedImages.webcam ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${capturedImages.webcam ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
              {capturedImages.webcam ? '✅' : '❌'}
            </div>
            <div style={{
              fontWeight: '600',
              color: capturedImages.webcam ? '#059669' : '#dc2626'
            }}>
              Webcam Generale
            </div>
          </div>
          
          <div style={{
            padding: '16px',
            background: capturedImages.documentFront ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${capturedImages.documentFront ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
              {capturedImages.documentFront ? '✅' : '❌'}
            </div>
            <div style={{
              fontWeight: '600',
              color: capturedImages.documentFront ? '#059669' : '#dc2626'
            }}>
              Documento Fronte
            </div>
          </div>
          
          <div style={{
            padding: '16px',
            background: capturedImages.documentBack ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${capturedImages.documentBack ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>
              {capturedImages.documentBack ? '✅' : '❌'}
            </div>
            <div style={{
              fontWeight: '600',
              color: capturedImages.documentBack ? '#059669' : '#dc2626'
            }}>
              Documento Retro
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={clearAll}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            🗑️ Cancella Tutto
          </button>
        </div>
      </div>

      {/* Info Tecniche */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#f8fafc',
        border: '1px solid #e5e7eb',
        borderRadius: '12px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>
          🔧 Info Tecniche
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
          <li>WebcamWithPreview: Usa anteprima live con overlay guida</li>
          <li>DocumentCapture: Supporta sia webcam che upload file</li>
          <li>Spazio fisso: Layout ottimizzato per evitare spostamenti</li>
          <li>Responsive: Si adatta a schermi di diverse dimensioni</li>
          <li>Fallback: Emoji di backup se le immagini non caricano</li>
        </ul>
      </div>
    </div>
  )
}

export default WebcamTestOptimized