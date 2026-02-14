import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from '../services/api.js'

export default function LoginSimple(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e){
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try{
      console.log('Tentativo login con:', { username, password })
      const response = await api.post('/api/auth/login', { username, password })
      console.log('Risposta login:', response.data)
      const data = response.data
      
      // Nuovo formato: success + redirectUrl
      if (data.success && data.redirectUrl) {
        setToken(data.token)
        window.location.href = data.redirectUrl
      } 
      // Formato vecchio: solo token (per retrocompatibilità)
      else if (data.token && !data.success) {
        setToken(data.token)
        navigate('/dashboard')
      }
      else {
        // Gestisci errore
        setError(data.error || 'Credenziali non valide')
      }
    }catch(err){
      console.error('Errore login:', err)
      setError(err.response?.data?.error || 'Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <div style={{fontSize: '48px', marginBottom: '16px'}}>🚲</div>
          <h1 style={{margin: 0, color: '#1f2937', fontSize: '24px'}}>
            Rent a Bike
          </h1>
          <p style={{margin: '8px 0 0 0', color: '#6b7280'}}>
            Sistema di Gestione
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom: '20px'}}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Username
            </label>
            <input 
              type="text"
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="Inserisci username"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{marginBottom: '20px'}}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="Inserisci password"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <strong>Credenziali di test:</strong><br/>
          cancano / cancano123<br/>
          arnoga / arnoga123<br/>
          campo-sportivo / campo123
        </div>
      </div>
    </div>
  )
}