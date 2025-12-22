import React, { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import LocationLogo from '../Components/LocationLogo.jsx'
import { jwtDecode } from 'jwt-decode'

export default function ContractsTest(){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if(token) {
      try {
        const decoded = jwtDecode(token)
        setUser(decoded)
      } catch(e) {
        console.error('Errore decodifica token:', e)
      }
    }
  }, [])

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
              📋 Test Contratti
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '18px' }}>
              Pagina di test per verificare il funzionamento
            </p>
          </div>
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <h2>Test Componenti</h2>
        <p>User: {user?.username || 'Non autenticato'}</p>
        <p>Location: {user?.location?.name || 'Nessuna location'}</p>
        <p>Role: {user?.role || 'Nessun ruolo'}</p>
        
        <div style={{ marginTop: '20px' }}>
          <h3>Test LocationLogo:</h3>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div>
              <p>Small:</p>
              <LocationLogo locationName="cancano" size="small" />
            </div>
            <div>
              <p>Medium:</p>
              <LocationLogo locationName="arnoga" size="medium" />
            </div>
            <div>
              <p>Large:</p>
              <LocationLogo locationName="campo sportivo" size="large" />
            </div>
            <div>
              <p>Fallback:</p>
              <LocationLogo locationName="test" size="medium" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}