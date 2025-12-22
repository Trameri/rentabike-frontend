import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { jwtDecode } from 'jwt-decode'
import LocationLogo from '../Components/LocationLogo.jsx'

export default function ContractsSimplified(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if(token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
        setLoading(false)
      } catch(e) {
        console.error('Errore decodifica token:', e)
        setError('Errore autenticazione')
        setLoading(false)
      }
    } else {
      setError('Token non trovato')
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        ⏳ Caricamento...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: 'red'
      }}>
        ❌ {error}
      </div>
    )
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
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            padding: '16px',
            backdropFilter: 'blur(10px)'
          }}>
            <LocationLogo 
              locationName={user?.location?.name || user?.username} 
              size="large"
            />
          </div>
          <div>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '2.5rem',
              fontWeight: '800'
            }}>
              📋 Contratti Semplificati
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Versione semplificata per test
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ marginBottom: '20px' }}>✅ Pagina Funzionante</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Informazioni Utente:</h3>
          <p><strong>Nome:</strong> {user?.username}</p>
          <p><strong>Ruolo:</strong> {user?.role}</p>
          <p><strong>Location:</strong> {user?.location?.name || 'N/A'}</p>
        </div>

        <div style={{
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>ℹ️ Stato Sistema</h4>
          <p style={{ margin: 0, color: '#0369a1' }}>
            Questa è una versione semplificata della pagina contratti. 
            Se vedi questo messaggio, significa che gli import base funzionano correttamente.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
        }}>
          <button
            onClick={() => window.location.href = '/contracts'}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            🔄 Prova Versione Completa
          </button>
          
          <button
            onClick={() => window.location.href = '/system-diagnostic'}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            🔧 Diagnostica Sistema
          </button>
          
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            📊 Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}