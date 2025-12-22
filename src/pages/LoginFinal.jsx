import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../services/api.js'

export default function LoginFinal(){
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault()
    setErr('')
    setLoading(true)
    
    try{
      const response = await api.post('/api/auth/login', { username, password })
      setToken(response.data.token)
      nav('/dashboard')
    }catch(e){
      setErr(e.response?.data?.error || 'Credenziali non valide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '450px'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '40px 30px',
          textAlign: 'center',
          color: 'white'
        }}>
          {/* Logo semplice */}
          <div style={{marginBottom: '16px', fontSize: '48px'}}>
            🚲
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            Rent a Bike
          </h1>
          
          <p style={{
            margin: 0,
            opacity: 0.8,
            fontSize: '16px'
          }}>
            Sistema di Gestione Noleggio
          </p>
        </div>

        {/* Form */}
        <div style={{ padding: '40px 30px' }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                👤 Nome Utente
              </label>
              <input 
                type="text"
                value={username} 
                onChange={e=>setU(e.target.value)}
                placeholder="Inserisci il tuo username"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#374151',
                fontSize: '14px'
              }}>
                🔒 Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={e=>setP(e.target.value)}
                placeholder="Inserisci la tua password"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            {err && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '24px',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ {err}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff40',
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
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}