import React, { useState } from 'react'
import LocationLogo from '../Components/LocationLogo.jsx'
import { getBackendAppUrl } from '../config/environment.js'
import { api } from '../services/api.js'

export default function LoginBeautiful(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try{
      // Prova multipli path per massima compatibilità con backend (con o senza prefisso /api)
      const candidates = ['/api/auth/login']
      let success = null
      let lastError = null

      for (const path of candidates) {
        try {
          const res = await api.post(path, { username, password }, { withCredentials: true })
          success = res
          break
        } catch (err) {
          lastError = err
          const status = err.response?.status
          // Ritenta con il prossimo path solo se 404/405 (not found/method) o errori di rete
          if (!status || status === 404 || status === 405) {
            continue
          } else {
            break
          }
        }
      }

      if (success) {
        const data = success.data
        console.log('Risposta login:', data)
        
        // Nuovo formato: success + redirectUrl
        if (data.success && data.redirectUrl) {
          localStorage.setItem('token', data.token)
          window.location.href = data.redirectUrl
        } 
        // Formato vecchio: solo token (per retrocompatibilità)
        else if (data.token && !data.success) {
          localStorage.setItem('token', data.token)
          window.location.replace(getBackendAppUrl('/'))
        }
        else {
          const message = data?.error || 'Credenziali non valide'
          setError(message)
        }
      } else {
        const status = lastError?.response?.status
        const data = lastError?.response?.data
        const message = (data && (data.error || data.message)) || (status ? `Errore di login (status ${status})` : 'Server non raggiungibile')
        setError(message)
      }
    }catch(err){
      console.error('Errore:', err)
      setError('Errore di connessione al server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementi decorativi di sfondo */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        animation: 'float 20s ease-in-out infinite',
        pointerEvents: 'none'
      }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        boxShadow: '0 32px 64px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '480px',
        position: 'relative'
      }}>
        {/* Header con gradiente */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '48px 40px',
          textAlign: 'center',
          color: 'white',
          position: 'relative'
        }}>
          {/* Elementi decorativi nell'header */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '50%',
            transform: 'rotate(45deg)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '40px',
            height: '40px',
            border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '50%'
          }} />

          {/* Logo dinamico della location */}
          <div style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              padding: '20px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <LocationLogo
                locationName={username || 'default'}
                size="login"
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
          </div>
          
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '2.5rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            Rent a Bike
          </h1>
          
          <p style={{
            margin: 0,
            opacity: 0.9,
            fontSize: '18px',
            fontWeight: '300',
            letterSpacing: '0.5px'
          }}>
            Sistema di Gestione Noleggio
          </p>

          {/* Indicatore location dinamico */}
          {username && (
            <div style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(96, 165, 250, 0.2)',
              borderRadius: '20px',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              display: 'inline-block'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#60a5fa',
                textTransform: 'capitalize'
              }}>
                📍 {username.replace('-', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <div style={{ padding: '48px 40px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#374151',
                fontSize: '15px',
                letterSpacing: '0.025em'
              }}>
                👤 Nome Utente / Location
              </label>
              <input 
                type="text"
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Inserisci nome utente"
                required
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#fafafa'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.background = '#ffffff'
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.background = '#fafafa'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#374151',
                fontSize: '15px',
                letterSpacing: '0.025em'
              }}>
                🔒 Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="Inserisci la tua password"
                required
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#fafafa'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.background = '#ffffff'
                  e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                  e.target.style.background = '#fafafa'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            
            {error && (
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '28px',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: '500'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading ? 
                  'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : 
                  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '17px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(59, 130, 246, 0.4)',
                transform: loading ? 'none' : 'translateY(0)',
                letterSpacing: '0.025em'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)'
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Accesso in corso...
                </>
              ) : (
                <>
                  🚪 Accedi al Sistema
                </>
              )}
            </button>
          </form>

          {/* Informazioni di sicurezza */}
          <div style={{
            marginTop: '32px',
            padding: '20px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '16px',
            border: '1px solid #0ea5e9',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              🔐
            </div>
            <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#0369a1'
            }}>
              Accesso Riservato al Personale Autorizzato
            </p>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#0284c7',
              opacity: 0.8
            }}>
              Contatta l'amministratore per le credenziali
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  )
}